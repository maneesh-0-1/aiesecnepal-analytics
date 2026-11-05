import { config } from "dotenv";
import { existsSync } from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, writeBatch } from "firebase/firestore";

if (existsSync(".env.local")) {
  config({ path: ".env.local" });
} else {
  config();
}

const ACCESS_TOKEN = process.env.AIESEC_ACCESS_TOKEN;
const GRAPHQL_URL = "https://gis-api.aiesec.org/graphql";

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

async function fetchPage(query) {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": ACCESS_TOKEN
    },
    body: JSON.stringify({ query })
  });

  const json = await res.json();
  if (json.errors) {
      console.error(JSON.stringify(json.errors, null, 2));
      return null;
  }
  return json.data;
}

async function syncNetwork() {
  console.log("Fetching Regions...");
  const regionQuery = `
    query {
      committee(id: 1626) {
        suboffices {
          id
          name
        }
      }
    }
  `;
  const regionData = await fetchPage(regionQuery);
  if (!regionData) return;

  const regions = regionData.committee.suboffices;
  console.log(`Found ${regions.length} regions.`);

  for (const region of regions) {
    console.log(`Processing Region: ${region.name}...`);
    const mcQuery = `
      query {
        committee(id: ${region.id}) {
          suboffices {
            id
            name
            full_name
          }
        }
      }
    `;
    const mcData = await fetchPage(mcQuery);
    if (!mcData) continue;

    const mcs = mcData.committee.suboffices;
    console.log(`  Found ${mcs.length} MCs in ${region.name}.`);

    const mcBatch = writeBatch(db);
    for (const mc of mcs) {
      const mcRef = doc(db, "mcs", String(mc.id));
      mcBatch.set(mcRef, {
        id: mc.id,
        name: mc.name,
        full_name: mc.full_name,
        region: region.name,
        region_id: region.id,
        updated_at: new Date().toISOString()
      }, { merge: true });
    }
    await mcBatch.commit();
    console.log(`  Synced MCs for ${region.name}.`);

    for (const mc of mcs) {
      console.log(`    Fetching LCs for MC: ${mc.name}...`);
      const lcQuery = `
        query {
          committee(id: ${mc.id}) {
            suboffices {
              id
              name
              full_name
            }
          }
        }
      `;
      const lcData = await fetchPage(lcQuery);
      if (!lcData) continue;

      const lcs = lcData.committee.suboffices;
      if (lcs.length === 0) continue;

      const lcBatch = writeBatch(db);
      for (const lc of lcs) {
        const lcRef = doc(db, "lcs", String(lc.id));
        lcBatch.set(lcRef, {
          id: String(lc.id),
          name: lc.name,
          full_name: lc.full_name,
          mc_id: String(mc.id),
          mc_name: mc.name,
          region: region.name,
          updated_at: new Date().toISOString()
        }, { merge: true });
      }
      await lcBatch.commit();
      console.log(`      Synced ${lcs.length} LCs for ${mc.name}.`);
    }
  }

  console.log("Network sync completed!");
}

syncNetwork().catch(console.error);
