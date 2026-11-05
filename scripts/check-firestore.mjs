import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, limit } from "firebase/firestore";
import { config } from "dotenv";
import { existsSync } from "fs";

if (existsSync(".env.local")) {
  config({ path: ".env.local" });
} else {
  config();
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

async function checkCounts() {
    const collections = ["signups", "applied", "accepted", "approved", "realized", "finished", "completed"];
    for (const c of collections) {
        const snap = await getDocs(collection(db, c));
        console.log(`Collection ${c}: ${snap.size} documents`);
        if (snap.size > 0) {
            console.log(`  Sample doc:`, JSON.stringify(snap.docs[0].data(), null, 2));
        }
    }
}

checkCounts().catch(console.error);
