/**
 * AIESEC Nepal Analytics - Database Reset & Fresh Sync (2022-Feb-01 to Present)
 * 1. Clears all operational collections in Firestore
 * 2. Re-seeds Nepal MC & LCs
 * 3. Pulls all fresh data from EXPA GraphQL (2022-02-01 till Now)
 */
import { config } from "dotenv";
import { existsSync } from "fs";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  limit,
  writeBatch,
  doc,
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
const START_DATE = "2022-02-01";
const END_DATE = new Date().toISOString().split("T")[0];

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

const COLLECTIONS_TO_CLEAR = [
  "signups",
  "applied",
  "accepted",
  "approved",
  "realized",
  "finished",
  "completed",
  "meta"
];

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
      console.warn(`    ⚠️  GraphQL retry ${attempt}/${retries} failed (${err.message}). Waiting 2s...`);
      await sleep(2000);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: CLEAR FIRESTORE
// ─────────────────────────────────────────────────────────────────────────────
async function clearCollections() {
  console.log("\n============================================================");
  console.log("STEP 1: CLEARING FIRESTORE OPERATIONAL COLLECTIONS");
  console.log("============================================================");

  for (const collName of COLLECTIONS_TO_CLEAR) {
    let deletedCount = 0;
    while (true) {
      const q = query(collection(db, collName), limit(400));
      const snap = await getDocs(q);
      if (snap.empty) break;

      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();

      deletedCount += snap.size;
      process.stdout.write(`  🗑️  Deleting '${collName}': ${deletedCount} docs deleted... \r`);
      await sleep(150);
    }
    console.log(`  ✓ Collection '${collName}' is completely empty (${deletedCount} deleted).`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: SEED NEPAL MC & LCS
// ─────────────────────────────────────────────────────────────────────────────
async function seedNepalTopology() {
  console.log("\n============================================================");
  console.log("STEP 2: SEEDING NEPAL MC & LOCAL COMMITTEES (TOPOLOGY)");
  console.log("============================================================");

  const query = `
    query {
      committee(id: ${NEPAL_MC_ID}) {
        id
        name
        full_name
        tag
        suboffices {
          id
          name
          full_name
          tag
        }
      }
    }
  `;

  const data = await fetchGraphQL(query);
  const mc = data?.committee;
  if (!mc) throw new Error("Failed to load MC Nepal from EXPA");

  // Save MC Nepal
  await setDoc(doc(db, "mcs", String(mc.id)), {
    id: String(mc.id),
    name: mc.name,
    full_name: mc.full_name,
    region: "Asia Pacific",
    region_id: "1627",
    updated_at: new Date().toISOString()
  }, { merge: true });
  console.log(`  ✓ Saved MC Nepal (ID: ${mc.id})`);

  const lcs = (mc.suboffices || []).filter((l) => l.name && l.name !== ".");
  const lcBatch = writeBatch(db);

  for (const lc of lcs) {
    const region = lc.name.includes("Kathmandu") || lc.name === "Patan"
      ? "Bagmati"
      : lc.name === "Pokhara"
      ? "Gandaki"
      : lc.name === "Lumbini"
      ? "Lumbini"
      : "National";

    lcBatch.set(doc(db, "lcs", String(lc.id)), {
      id: String(lc.id),
      name: lc.name,
      full_name: lc.full_name,
      mc_id: String(mc.id),
      mc_name: mc.name,
      region,
      updated_at: new Date().toISOString()
    }, { merge: true });
  }

  await lcBatch.commit();
  console.log(`  ✓ Saved ${lcs.length} Nepal LCs: ${lcs.map(l => l.name).join(", ")}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3: SYNC SIGNUPS FOR NEPAL
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
        full_name: p.full_name || "Unknown",
        type: "SIGNUP",
        created_at: p.created_at,
        date: p.created_at,
        home_lc: p.home_lc?.name || "National",
        home_lc_id: p.home_lc?.id ? String(p.home_lc.id) : null,
        home_mc: p.home_lc?.parent?.name || p.home_mc?.name || "Nepal",
        home_mc_id: String(NEPAL_MC_ID),
        mc_ids: [String(NEPAL_MC_ID)],
        updated_at: new Date().toISOString()
      }, { merge: true });
    }

    await batch.commit();
    totalSaved += people.length;
    process.stdout.write(`    Synced ${totalSaved} signups... \r`);

    if (people.length < perPage) break;
    page++;
    await sleep(400);
  }

  return totalSaved;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4: SYNC APPLICATIONS (ICX & OGX) FOR NEPAL
// ─────────────────────────────────────────────────────────────────────────────
async function syncNepalApplications(status, startDate, endDate) {
  const dateFilterKey =
    status === "applied" ? "created_at" :
    status === "accepted" ? "date_matched" :
    status === "approved" ? "date_approved" :
    status === "realized" ? "date_realized" :
    "experience_end_date";

  let totalSaved = 0;

  // Process both iCX (Nepal host) and oGX (Nepal home)
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
          date: a[status + "_at"] || a.created_at || a.date_approved || null,
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
      await sleep(400);
    }
  }

  return totalSaved;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("============================================================");
  console.log(`AIESEC NEPAL (MC 112) FULL FRESH SYNC`);
  console.log(`Window: ${START_DATE} to ${END_DATE}`);
  console.log("============================================================");

  // 1. Wipe old data
  await clearCollections();

  // 2. Re-seed Nepal entities
  await seedNepalTopology();

  // 3. Chunk time into 6-month windows from 2022 to Now
  console.log("\n============================================================");
  console.log("STEP 3: PULLING FRESH HISTORICAL DATA (CHUNKED 2022 -> NOW)");
  console.log("============================================================");

  const periods = [];
  let pStart = new Date(START_DATE);
  const now = new Date();

  while (pStart < now) {
    const pEnd = new Date(pStart);
    pEnd.setMonth(pEnd.getMonth() + 6);
    if (pEnd > now) pEnd.setTime(now.getTime());

    periods.push({
      from: pStart.toISOString().split("T")[0],
      to: pEnd.toISOString().split("T")[0]
    });

    pStart = new Date(pEnd);
    pStart.setDate(pStart.getDate() + 1);
  }

  console.log(`Splitting into ${periods.length} time chunks of ~6 months each.`);

  let grandTotalSignups = 0;
  const statusTotals = {
    applied: 0,
    accepted: 0,
    approved: 0,
    realized: 0,
    finished: 0,
    completed: 0
  };

  for (let idx = 0; idx < periods.length; idx++) {
    const { from, to } = periods[idx];
    console.log(`\n▶ [Chunk ${idx + 1}/${periods.length}] Range: ${from} to ${to}`);

    // A. Sync Signups
    process.stdout.write(`  • Fetching Signups... `);
    const signupsCount = await syncNepalSignups(from, to);
    grandTotalSignups += signupsCount;
    console.log(`✓ ${signupsCount} signups`);

    // B. Sync Each Application Status
    const statuses = ["applied", "accepted", "approved", "realized", "finished", "completed"];
    for (const status of statuses) {
      process.stdout.write(`  • Fetching ${status.padEnd(10)}... `);
      const count = await syncNepalApplications(status, from, to);
      statusTotals[status] += count;
      console.log(`✓ ${count} records`);
      await sleep(300);
    }
  }

  // 4. Update Meta Status
  await setDoc(doc(db, "meta", "sync_status"), {
    last_success: new Date().toISOString(),
    mc_id: String(NEPAL_MC_ID),
    mc_name: "Nepal",
    date_range: { from: START_DATE, to: END_DATE },
    totals: {
      signups: grandTotalSignups,
      ...statusTotals
    },
    status: "healthy"
  }, { merge: true });

  await setDoc(doc(db, "meta", `sync_status_${NEPAL_MC_ID}`), {
    last_success: new Date().toISOString(),
    last_count: grandTotalSignups + Object.values(statusTotals).reduce((a, b) => a + b, 0),
    status: "healthy"
  }, { merge: true });

  console.log("\n============================================================");
  console.log("🎉 NEPAL FRESH DATA SYNC COMPLETED SUCCESSFULLY!");
  console.log("============================================================");
  console.log(`Total Sign-ups:  ${grandTotalSignups}`);
  for (const [st, ct] of Object.entries(statusTotals)) {
    console.log(`Total ${st.padEnd(10)}: ${ct}`);
  }
  console.log("============================================================\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("FATAL ERROR in main sync:", err);
  process.exit(1);
});
