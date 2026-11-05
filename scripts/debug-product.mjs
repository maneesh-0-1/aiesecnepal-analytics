import { fetchICXByStatus } from "./src/lib/expaSync.js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function debug() {
    console.log("Fetching latest OGX Realized to check product data...");
    // Use status 'realized' as it's likely to have complete data
    const result = await fetchICXByStatus("realized", "2024-01-01", "2026-04-25", 10);

    result.data.forEach(app => {
        console.log(`App ID: ${app.id}, Product: ${app.product}, Raw Status: ${app.status}`);
    });
}

debug().catch(console.error);
