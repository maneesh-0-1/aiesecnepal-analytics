/**
 * AIESEC Nepal Analytics — Smart Gap Sync
 * 
 * Automatically detects the latest record in Firestore for each stage
 * and ONLY pulls the missing gap from EXPA up to today.
 * 
 * Usage:
 *   npm run sync:missing
 *   or
 *   node scripts/sync-missing.mjs
 */
import { config } from "dotenv";
import { existsSync } from "fs";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
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
const DEFAULT_FALLBACK_START = "2022-02-01";

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

/**
 * Find the latest date stored in a Firestore collection
 */
async function getLatestDateInCollection(collName) {
  try {
    const q = query(collection(db, collName), orderBy("date", "desc"), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const data = snap.docs[0].data();
    return data.date || data.created_at || null;
  } catch (err) {
    console.warn(`    ⚠️ Could not read latest date for ${collName}: ${err.message}`);
    return null;
  }
}

/**
 * Pull and save missing Nepal signups
 */
async function syncMissingSignups(startDate, endDate) {
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

/**
 * Pull and save missing Nepal applications (iCX & oGX)
 */
async function syncMissingApplications(status, startDate, endDate) {
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
// MAIN SMART GAP DETECTOR
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("============================================================");
  console.log("🇳🇵 AIESEC NEPAL — SMART GAP SYNC");
  console.log("Checking Firestore for missing dates in each collection...");
  console.log("============================================================\n");

  const todayStr = new Date().toISOString().split("T")[0];
  const STAGES = ["signups", "applied", "accepted", "approved", "realized", "finished", "completed"];
  let totalNewRecords = 0;

  for (const stage of STAGES) {
    process.stdout.write(`🔍 Inspecting [${stage.padEnd(10)}]... `);
    const latestDate = await getLatestDateInCollection(stage);

    let fromDate = DEFAULT_FALLBACK_START;
    if (latestDate) {
      // Step back 2 days from the latest date to ensure no timezone or boundary edges were missed
      const d = new Date(latestDate);
      d.setDate(d.getDate() - 2);
      fromDate = d.toISOString().split("T")[0];
    }

    if (fromDate >= todayStr) {
      console.log(`✓ Already up to date! (Latest: ${latestDate?.split("T")[0] || "today"})`);
      continue;
    }

    console.log(`Missing gap: ${fromDate} ➔ ${todayStr}`);
    process.stdout.write(`   • Fetching missing ${stage}... `);

    let count = 0;
    if (stage === "signups") {
      count = await syncMissingSignups(fromDate, todayStr);
    } else {
      count = await syncMissingApplications(stage, fromDate, todayStr);
    }

    totalNewRecords += count;
    console.log(`✓ Pulled & saved ${count} records!`);
    await sleep(200);
  }

  // Update sync status metadata
  await setDoc(doc(db, "meta", "sync_status"), {
    status: "healthy",
    last_success: new Date().toISOString(),
    mc_id: NEPAL_MC_ID,
    mc_name: "Nepal",
    smart_gap_sync: true,
    new_records_synced: totalNewRecords,
    updated_at: new Date().toISOString()
  }, { merge: true });

  console.log("\n============================================================");
  console.log(`🎉 SMART GAP SYNC COMPLETE! Added ${totalNewRecords} missing records.`);
  console.log("Your database is now fully up to date!");
  console.log("============================================================");
  process.exit(0);
}

main().catch(err => {
  console.error("\n❌ Fatal Error:", err.message);
  process.exit(1);
});
