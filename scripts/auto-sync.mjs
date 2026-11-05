/**
 * AIESEC Nepal Dashboard - Continuous Heartbeat Sync
 * Continuously syncs MC Nepal (112) to keep the dashboard fresh.
 */
import { config } from "dotenv";
import { existsSync } from "fs";

if (existsSync(".env.local")) {
  config({ path: ".env.local" });
} else {
  config();
}

const BASE_URL = process.env.SYNC_BASE_URL || 'http://localhost:3000/api/maintenance/sync';

async function syncRolling() {
    console.log('=== AIESEC NEPAL SYNC WORKER INITIALIZED (MC ID: 112) ===');
    
    while (true) {
        try {
            console.log(`\n--- Starting Nepal Sync Cycle: ${new Date().toLocaleString()} ---`);
            
            const url = `${BASE_URL}?mcId=112&limit=5000`;
            try {
                const res = await fetch(url);
                const data = await res.json();
                if (data.success || data.message) {
                    console.log(`✓ Nepal Synced: ${data.count || 0} updates`);
                } else {
                    console.log(`✗ Error: ${data.error}`);
                }
            } catch (e) {
                console.log(`✗ Request Failed: ${e.message}`);
            }
            
            console.log(`--- Cycle Complete. Resting for 2 minutes ---`);
            await new Promise(r => setTimeout(r, 120000));
        } catch (error) {
            console.error("Critical Loop Error:", error.message);
            await new Promise(r => setTimeout(r, 10000));
        }
    }
}

syncRolling().catch(console.error);
