import { NextResponse } from "next/server";
import { syncExpaToFirestore } from "@/lib/firebaseSync";

export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const start = searchParams.get("start") || undefined;
        const end = searchParams.get("end") || undefined;
        const mcId = searchParams.get("mcId") ? parseInt(searchParams.get("mcId")!) : 112; // Default to Nepal (112)

        const result = await syncExpaToFirestore(start, end, mcId);
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
