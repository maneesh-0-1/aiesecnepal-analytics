import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { mcList } from "@/lib/data";

export async function GET() {
    try {
        const mcsRef = collection(db, "mcs");
        const querySnapshot = await getDocs(mcsRef);
        
        let mcs = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        if (mcs.length === 0) {
            mcs = mcList as any;
        }
        
        return NextResponse.json(mcs);
    } catch (error: any) {
        return NextResponse.json(mcList);
    }
}
