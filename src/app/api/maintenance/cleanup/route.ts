import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, writeBatch, limit } from "firebase/firestore";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const secret = searchParams.get("secret") || request.headers.get("authorization")?.replace("Bearer ", "");
        const expectedSecret = process.env.CRON_SECRET;
        
        if (expectedSecret && secret !== expectedSecret) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const cutoff = searchParams.get("cutoff") || "2025-02-01";
        const colls = ["signups", "applied", "accepted", "approved", "realized", "finished", "completed"];

        let totalDeleted = 0;
        let details: any = {};

        for (const collName of colls) {
            let deletedInColl = 0;
            // Process in smaller batches to avoid Vercel/Next timeout
            const q = query(
                collection(db, collName),
                where("date", "<", cutoff),
                limit(100)
            );

            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const batch = writeBatch(db);
                snapshot.docs.forEach(d => batch.delete(d.ref));
                await batch.commit();
                deletedInColl = snapshot.size;
            }

            details[collName] = deletedInColl;
            totalDeleted += deletedInColl;
        }

        return NextResponse.json({
            success: true,
            totalDeleted,
            details,
            message: totalDeleted > 0 ? `Deleted ${totalDeleted} records. Call again to delete more if needed.` : "Cleanup complete. No more records found before " + cutoff
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
