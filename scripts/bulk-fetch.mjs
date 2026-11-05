/**
 * AIESEC Global Dashboard - Automated Global Backfill
 * Fetches data globally in 15-day chunks to ensure completeness.
 * Best used with an International Access Token.
 */
import { config } from "dotenv";
import { existsSync } from "fs";

if (existsSync(".env.local")) {
    config({ path: ".env.local" });
} else {
    config();
}

const BASE_URL = 'http://localhost:3000/api/maintenance/sync';
const START_DATE = '2025-02-01';
const STATUSES = ['signups', 'applied', 'accepted', 'approved', 'realized', 'finished', 'completed'];

async function runGlobalSync() {
    console.log("=== Initializing Global Data Refresh (15-Day Chunking) ===");
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
            // mcId=global triggers the efficient global fetch in the backend
            const url = `${BASE_URL}?status=${status}&from=${fromStr}&to=${toStr}&mcId=global&force=true&limit=25000`;
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
            // Rate limit protection
            await new Promise(r => setTimeout(r, 1000));
        }

        if (currentStart.getTime() <= targetStart.getTime()) break;
        currentEnd = currentStart;
    }

    console.log("\n=== GLOBAL DATA REFRESH COMPLETE ===");
}

runGlobalSync().catch(console.error);
