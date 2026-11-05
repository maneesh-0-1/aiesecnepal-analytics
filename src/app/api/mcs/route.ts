import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

export async function GET() {
    try {
        const mcsRef = collection(db, "mcs");
        const q = query(mcsRef, orderBy("name"));
        const querySnapshot = await getDocs(q);
        
        const mcs = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        return NextResponse.json(mcs);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
