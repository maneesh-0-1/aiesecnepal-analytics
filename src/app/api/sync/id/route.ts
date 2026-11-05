import { NextResponse } from "next/server";
import { syncByIDRange } from "@/lib/firebaseSync";

export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = (searchParams.get("type") || "people") as "people" | "apps";
        const startId = parseInt(searchParams.get("start") || "0");
        const endId = parseInt(searchParams.get("end") || "0");

        if (!startId || !endId) {
            throw new Error("Missing start or end ID");
        }

        const result = await syncByIDRange(type, startId, endId);
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
