/**
 * AIESEC Global Dashboard - Rolling Network Heartbeat
 * Continuously syncs all MCs one by one to keep the global dashboard fresh.
 */
import { config } from "dotenv";
import { existsSync } from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

if (existsSync(".env.local")) {
  config({ path: ".env.local" });
} else {
  config();
}

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const BASE_URL = 'http://localhost:3000/api/maintenance/sync';
const CYCLE_DELAY = 1000; // Delay between MC syncs

async function syncRolling() {
    console.log('=== AIESEC GLOBAL ROLLING SYNC WORKER INITIALIZED ===');
    
    while (true) {
        try {
            console.log(`\n--- Starting New Network Cycle: ${new Date().toLocaleString()} ---`);
            
            // Fetch MCs afresh each cycle in case new ones were added
            const mcsSnap = await getDocs(collection(db, "mcs"));
            const mcs = mcsSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
            
            for (const mc of mcs) {
                process.stdout.write(`  Syncing ${mc.name} (${mc.id})... `);
                
                // Sync without date constraints (incremental based on meta)
                const url = `${BASE_URL}?mcId=${mc.id}&limit=5000`;
                try {
                    const res = await fetch(url);
                    const data = await res.json();
                    if (data.success) {
                        process.stdout.write(`✓ (${data.count || 0} updates)\n`);
                    } else {
                        process.stdout.write(`✗ Error: ${data.error}\n`);
                    }
                } catch (e) {
                    process.stdout.write(`✗ Failed: ${e.message}\n`);
                }
                
                await new Promise(r => setTimeout(r, CYCLE_DELAY));
            }
            
            console.log(`--- Cycle Complete. Resting for 60s ---`);
            await new Promise(r => setTimeout(r, 60000));
        } catch (error) {
            console.error("Critical Loop Error:", error.message);
            await new Promise(r => setTimeout(r, 10000));
        }
    }
}

syncRolling().catch(console.error);
