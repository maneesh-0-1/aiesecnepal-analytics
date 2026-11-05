/**
 * AIESEC Nepal Dashboard - Automated Backfill
 * Fetches data for MC Nepal (ID: 112) in chunks to ensure completeness.
 */
import { config } from "dotenv";
import { existsSync } from "fs";

if (existsSync(".env.local")) {
    config({ path: ".env.local" });
} else {
    config();
}

const BASE_URL = process.env.SYNC_BASE_URL || 'http://localhost:3000/api/maintenance/sync';
const START_DATE = '2025-02-01';
const STATUSES = ['signups', 'applied', 'accepted', 'approved', 'realized', 'finished', 'completed'];

async function runNepalSync() {
    console.log("=== Initializing Nepal Data Refresh (MC ID: 112) ===");
    console.log(`Target Start Date: ${START_DATE}`);

    let currentEnd = new Date();
    const targetStart = new Date(START_DATE);

    while (currentEnd > targetStart) {
        let currentStart = new Date(currentEnd);
        currentStart.setDate(currentStart.getDate() - 180);
        if (currentStart < targetStart) currentStart = targetStart;

        const fromStr = currentStart.toISOString().split('T')[0];
        const toStr = currentEnd.toISOString().split('T')[0];

        console.log(`\n>>> PERIOD: ${fromStr} to ${toStr}`);

        for (const status of STATUSES) {
            const url = `${BASE_URL}?status=${status}&from=${fromStr}&to=${toStr}&mcId=112&force=true&limit=10000`;
            try {
                process.stdout.write(`  > Syncing ${status.padEnd(10)}... `);
                const res = await fetch(url);
                const data = await res.json();
                if (data.success || data.message) {
                    process.stdout.write(`✓ (${data.count || 0} records synced)\n`);
                } else {
                    console.error(`✗ Error: ${data.error}`);
                }
            } catch (e) {
                console.error(`✗ Request Failed: ${e.message}`);
            }
            await new Promise(r => setTimeout(r, 800));
        }

        if (currentStart.getTime() <= targetStart.getTime()) break;
        currentEnd = currentStart;
    }

    console.log("\n=== NEPAL DATA REFRESH COMPLETE ===");
}

runNepalSync().catch(console.error);
