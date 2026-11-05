import { config } from "dotenv";
import { existsSync } from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, writeBatch } from "firebase/firestore";

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

async function syncNepalNetwork() {
  console.log("=== Syncing AIESEC in Nepal Entity Network (MC ID: 112) ===");
  const query = `
    query {
      committee(id: 112) {
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

  const result = await fetchPage(query);
  if (!result?.committee) {
    console.error("Failed to fetch Nepal Committee from EXPA!");
    return;
  }

  const mc = result.committee;
  console.log(`Found MC: ${mc.full_name} (${mc.id}) with ${mc.suboffices?.length || 0} suboffices.`);

  // 1. Save MC Nepal
  const mcRef = doc(db, "mcs", String(mc.id));
  await setDoc(mcRef, {
    id: String(mc.id),
    name: mc.name,
    full_name: mc.full_name,
    region: "Asia Pacific",
    region_id: "1627",
    updated_at: new Date().toISOString()
  }, { merge: true });
  console.log("✓ Saved MC Nepal into Firestore 'mcs' collection.");

  // 2. Filter valid LCs (ignore '.' placeholder if any)
  const lcs = (mc.suboffices || []).filter(l => l.name && l.name !== ".");
  const lcBatch = writeBatch(db);

  for (const lc of lcs) {
    const lcRef = doc(db, "lcs", String(lc.id));
    const region = lc.name.includes("Kathmandu") || lc.name === "Patan"
      ? "Bagmati"
      : lc.name === "Pokhara"
      ? "Gandaki"
      : lc.name === "Lumbini"
      ? "Lumbini"
      : "National";

    lcBatch.set(lcRef, {
      id: String(lc.id),
      name: lc.name,
      full_name: lc.full_name,
      mc_id: String(mc.id),
      mc_name: mc.name,
      region: region,
      updated_at: new Date().toISOString()
    }, { merge: true });
  }

  await lcBatch.commit();
  console.log(`✓ Synced ${lcs.length} Nepal Local Committees into Firestore 'lcs' collection.`);
  console.log("Nepal network sync completed successfully!");
  process.exit(0);
}

syncNepalNetwork().catch(e => {
  console.error(e);
  process.exit(1);
});
