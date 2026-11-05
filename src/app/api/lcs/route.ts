import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { NEPAL_LCS } from "@/lib/data";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const mcId = searchParams.get("mcId") || "112";

        const lcsRef = collection(db, "lcs");
        const numId = parseInt(mcId);
        const matchValues = isNaN(numId) ? [mcId] : [mcId, numId];
        const q = query(lcsRef, where("mc_id", "in", matchValues));
        const querySnapshot = await getDocs(q);
        
        let lcs = querySnapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
        
        if (lcs.length === 0 && (mcId === "112" || mcId === "nepal")) {
            lcs = NEPAL_LCS as any;
        }

        return NextResponse.json(lcs);
    } catch (error: any) {
        return NextResponse.json(NEPAL_LCS);
    }
}
