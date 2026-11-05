import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const mcId = searchParams.get("mcId");

        if (!mcId) {
            return NextResponse.json({ error: "mcId is required" }, { status: 400 });
        }

        const lcsRef = collection(db, "lcs");
        const numId = parseInt(mcId);
        const matchValues = isNaN(numId) ? [mcId] : [mcId, numId];
        const q = query(lcsRef, where("mc_id", "in", matchValues));
        const querySnapshot = await getDocs(q);
        
        const lcs = querySnapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
        
        return NextResponse.json(lcs);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
