import { db } from '../src/lib/firebase.js'; // Note: Node might need a different path or setup
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';

const COLLECTIONS = ['signups', 'applied', 'accepted', 'approved', 'realized', 'finished', 'completed'];
const CUTOFF_DATE = '2025-02-01';

async function cleanup() {
    console.log(`=== Starting Cleanup: Deleting all data before ${CUTOFF_DATE} ===`);

    for (const collName of COLLECTIONS) {
        console.log(`\nCleaning collection: ${collName}...`);
        let deletedCount = 0;

        while (true) {
            const q = query(
                collection(db, collName),
                where("date", "<", CUTOFF_DATE),
                where("date", ">=", "2000-01-01"), // Add lower bound to use index
            );

            const snapshot = await getDocs(q);
            if (snapshot.empty) break;

            const batch = writeBatch(db);
            snapshot.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();

            deletedCount += snapshot.size;
            console.log(`  - Deleted ${deletedCount} docs...`);

            // Safety break to prevent infinite loops if something goes wrong
            if (snapshot.size < 10) break;
        }
        console.log(`✓ Collection ${collName} cleaned.`);
    }

    console.log("\n=== Cleanup Complete! Firestore is now empty before Feb 2025. ===");
    process.exit(0);
}

cleanup().catch(e => {
    console.error("Cleanup failed:", e);
    process.exit(1);
});
