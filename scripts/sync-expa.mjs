/**
 * AIESEC Nepal Analytics - EXPA Direct Sync Script
 * 
 * Usage:
 *   node scripts/sync-expa.mjs                   # Syncs last 60 days (default)
 *   node scripts/sync-expa.mjs --days 30         # Syncs last 30 days
 *   node scripts/sync-expa.mjs --from 2026-01-01 --to 2026-11-06
 *   node scripts/sync-expa.mjs --status approved # Syncs only a specific status
 */
import { config } from "dotenv";
import { existsSync } from "fs";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  writeBatch,
  setDoc
} from "firebase/firestore";

if (existsSync(".env.local")) {
  config({ path: ".env.local" });
} else {
  config();
}

const ACCESS_TOKEN = process.env.AIESEC_ACCESS_TOKEN;
const GRAPHQL_URL = "https://gis-api.aiesec.org/graphql";
const NEPAL_MC_ID = 112;

if (!ACCESS_TOKEN) {
  console.error("❌ ERROR: AIESEC_ACCESS_TOKEN is missing in .env.local!");
  process.exit(1);
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Parse CLI Arguments
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.findIndex(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (idx === -1) return null;
  if (args[idx].includes("=")) return args[idx].split("=")[1];
  return args[idx + 1] || null;
}

const daysArg = getArg("days");
const fromArg = getArg("from");
const toArg = getArg("to");
const statusFilterArg = getArg("status");

const today = new Date();
const toDateStr = toArg || today.toISOString().split("T")[0];

let fromDateStr;
if (fromArg) {
  fromDateStr = fromArg;
} else {
  const days = daysArg ? parseInt(daysArg, 10) : 60;
  const d = new Date(today);
  d.setDate(d.getDate() - days);
  fromDateStr = d.toISOString().split("T")[0];
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchGraphQL(query, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: ACCESS_TOKEN
        },
        body: JSON.stringify({ query })
      });

      const json = await res.json();
      if (json.errors) {
        throw new Error(JSON.stringify(json.errors));
      }
      return json.data;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`    ⚠️  GraphQL retry ${attempt}/${retries} failed (${err.message}). Retrying in 2s...`);
      await sleep(2000);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. SYNC NEPAL SIGNUPS
// ─────────────────────────────────────────────────────────────────────────────
async function syncNepalSignups(startDate, endDate) {
  let page = 1;
  const perPage = 400;
  let totalSaved = 0;

  while (true) {
    const query = `
      query {
        people(
          filters: {
            home_committee: ${NEPAL_MC_ID}
            registered: { from: "${startDate}", to: "${endDate}" }
          },
          page: ${page},
          per_page: ${perPage}
        ) {
          data {
            id
            full_name
            email
            created_at
            home_lc { id name parent { id name } }
            home_mc { id name }
          }
        }
      }
    `;

    const result = await fetchGraphQL(query);
    const people = result?.people?.data || [];
    if (people.length === 0) break;

    const batch = writeBatch(db);
    for (const p of people) {
      const docRef = doc(collection(db, "signups"), String(p.id));
      batch.set(docRef, {
        id: String(p.id),
        name: p.full_name,
        email: p.email,
        date: p.created_at,
        created_at: p.created_at,
        home_lc: p.home_lc?.name || "Unknown LC",
        home_lc_id: p.home_lc?.id ? String(p.home_lc.id) : null,
        home_mc: p.home_mc?.name || "Nepal",
        home_mc_id: String(NEPAL_MC_ID),
        mc_ids: [String(NEPAL_MC_ID)],
        source: "signups",
        type: "SIGNUP",
        updated_at: new Date().toISOString()
      }, { merge: true });
    }

    await batch.commit();
    totalSaved += people.length;

    if (people.length < perPage) break;
    page++;
    await sleep(300);
  }

  return totalSaved;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SYNC NEPAL APPLICATIONS (iCX & oGX)
// ─────────────────────────────────────────────────────────────────────────────
async function syncNepalApplications(status, startDate, endDate) {
  const dateFilterKey =
    status === "applied" ? "created_at" :
    status === "accepted" ? "date_matched" :
    status === "approved" ? "date_approved" :
    status === "realized" ? "date_realized" :
    "experience_end_date";

  let totalSaved = 0;

  for (const isIcx of [true, false]) {
    const mcFilter = isIcx ? `opportunity_home_mc: ${NEPAL_MC_ID}` : `person_home_mc: ${NEPAL_MC_ID}`;
    let page = 1;
    const perPage = 400;

    while (true) {
      const query = `
        query {
          allOpportunityApplication(
            filters: {
              ${mcFilter}
              ${dateFilterKey}: { from: "${startDate}", to: "${endDate}" }
            },
            page: ${page},
            per_page: ${perPage}
          ) {
            data {
              id
              status
              created_at
              date_matched
              date_approved
              date_realized
              experience_end_date
              person {
                id
                full_name
                home_lc { id name parent { id name } }
                home_mc { id name }
              }
              opportunity {
                id
                title
                host_lc { id name parent { id name } }
                programme { id short_name_display }
              }
            }
          }
        }
      `;

      const result = await fetchGraphQL(query);
      const apps = result?.allOpportunityApplication?.data || [];
      if (apps.length === 0) break;

      const batch = writeBatch(db);
      for (const a of apps) {
        const docRef = doc(collection(db, status), String(a.id));
        const itemType = isIcx ? "iCX" : "oGX";

        const rawProd = a.opportunity?.programme?.short_name_display || String(a.opportunity?.programme?.id || "");
        let prod = "GTe";
        const up = rawProd.toUpperCase();
        if (up === "7" || up.includes("GV") || up.includes("VOLUNTEER")) prod = "GV";
        else if (up === "8" || up.includes("GTA") || up.includes("TALENT")) prod = "GTa";
        else if (up === "9" || up.includes("GTE") || up.includes("TEACHER")) prod = "GTe";

        const homeLcName = a.person?.home_lc?.name || "Unknown LC";
        const homeMcName = a.person?.home_lc?.parent?.name || a.person?.home_mc?.name || "Unknown MC";
        const hostLcName = a.opportunity?.host_lc?.name || "Unknown LC";
        const hostMcName = a.opportunity?.host_lc?.parent?.name || "Unknown MC";

        const statusDate =
          status === "applied" ? a.created_at :
          status === "accepted" ? (a.date_matched || a.created_at) :
          status === "approved" ? (a.date_approved || a.date_matched || a.created_at) :
          status === "realized" ? (a.date_realized || a.date_approved || a.created_at) :
          (a.experience_end_date || a.date_realized || a.created_at);

        batch.set(docRef, {
          id: String(a.id),
          person_id: a.person?.id ? String(a.person.id) : null,
          person_name: a.person?.full_name || null,
          status: a.status,
          type: itemType,
          product: prod,
          source: status,
          applied_at: a.created_at || null,
          accepted_at: a.date_matched || null,
          approved_at: a.date_approved || null,
          realized_at: a.date_realized || null,
          finished_at: a.experience_end_date || null,
          completed_at: a.status === "completed" ? a.experience_end_date : null,
          date: statusDate || a.created_at || null,
          home_lc: homeLcName,
          home_lc_id: a.person?.home_lc?.id ? String(a.person.home_lc.id) : null,
          home_mc: homeMcName,
          home_mc_id: String(a.person?.home_lc?.parent?.id || a.person?.home_mc?.id || ""),
          host_lc: hostLcName,
          host_lc_id: a.opportunity?.host_lc?.id ? String(a.opportunity.host_lc.id) : null,
          host_mc: hostMcName,
          host_mc_id: String(a.opportunity?.host_lc?.parent?.id || ""),
          mc_ids: [String(NEPAL_MC_ID), String(a.person?.home_lc?.parent?.id || ""), String(a.opportunity?.host_lc?.parent?.id || "")].filter(Boolean),
          updated_at: new Date().toISOString()
        }, { merge: true });
      }

      await batch.commit();
      totalSaved += apps.length;

      if (apps.length < perPage) break;
      page++;
      await sleep(300);
    }
  }

  return totalSaved;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN RUNNER
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("============================================================");
  console.log("🇳🇵 AIESEC NEPAL — EXPA NUMBER SYNC");
  console.log(`Target MC: Nepal (ID: ${NEPAL_MC_ID})`);
  console.log(`Date Range: ${fromDateStr} to ${toDateStr}`);
  if (statusFilterArg) console.log(`Filter Status: ${statusFilterArg}`);
  console.log("============================================================\n");

  let totalSignups = 0;
  const statusCounts = {};

  // 1. Sync Signups
  if (!statusFilterArg || statusFilterArg === "signups") {
    process.stdout.write("• Fetching Sign-ups... ");
    totalSignups = await syncNepalSignups(fromDateStr, toDateStr);
    console.log(`✓ ${totalSignups} signups`);
  }

  // 2. Sync Application Stages
  const allStatuses = ["applied", "accepted", "approved", "realized", "finished", "completed"];
  const statuses = statusFilterArg && statusFilterArg !== "signups" ? [statusFilterArg] : (statusFilterArg === "signups" ? [] : allStatuses);

  for (const st of statuses) {
    process.stdout.write(`• Fetching ${st.padEnd(12)}... `);
    const cnt = await syncNepalApplications(st, fromDateStr, toDateStr);
    statusCounts[st] = cnt;
    console.log(`✓ ${cnt} records`);
    await sleep(200);
  }

  // 3. Update Sync Metadata in Firestore
  const totalRecords = totalSignups + Object.values(statusCounts).reduce((a, b) => a + b, 0);
  await setDoc(doc(db, "meta", "sync_status"), {
    status: "healthy",
    last_success: new Date().toISOString(),
    mc_id: NEPAL_MC_ID,
    mc_name: "Nepal",
    range: `${fromDateStr} to ${toDateStr}`,
    records_synced: totalRecords,
    updated_at: new Date().toISOString()
  }, { merge: true });

  console.log("\n============================================================");
  console.log(`✅ SYNC COMPLETE! Total records processed: ${totalRecords}`);
  console.log("============================================================");
  process.exit(0);
}

main().catch(err => {
  console.error("\n❌ Fatal Sync Error:", err);
  process.exit(1);
});
