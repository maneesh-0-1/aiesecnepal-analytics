import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, query, where, orderBy, limit } from "firebase/firestore";
import { aggregateApplications } from "@/lib/aggregation";
import { ServerCache } from "@/lib/server-cache";
import { mcList } from "@/lib/data";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const from = searchParams.get("from") || "2025-02-01";
        const to = searchParams.get("to") || new Date().toISOString();
        const level = (searchParams.get("level") || "mc") as "global" | "mc";
        const mcId = searchParams.get("mcId") || "1585"; // Default to India for now
        const forceRefresh = searchParams.get("refresh") === "true";

        if (forceRefresh) {
            ServerCache.clearEvents();
        }

        // Find MC name for fallback filtering
        const targetMc = mcList.find(m => m.id === mcId);
        const targetMcName = targetMc?.name?.toLowerCase();

        // 1. Get current sync metadata from Firestore to show on UI
        const metaRef = doc(db, "meta", "sync_status");
        const metaSnap = await getDoc(metaRef);
        const meta = metaSnap.data();
        ServerCache.setSyncStatus(meta);

        // 2. Determine if we need a full fetch or incremental
        const lastFetch = ServerCache.getLastFetch();
        const collections = ["signups", "applied", "accepted", "approved", "realized", "finished", "completed"];

        let newEventsCount = 0;
        const fetchStartTime = new Date().toISOString();

        if (!lastFetch) {
            // INITIAL FETCH: Get everything within a reasonable initial window
            console.log(`CACHE MISS: Performing initial data load from Firestore...`);

            const snapshots = await Promise.all(
                collections.map(c => {
                    return getDocs(query(collection(db, c), where("date", ">=", from)));
                })
            );

            snapshots.forEach((snap, i) => {
                const collName = collections[i];
                const events = snap.docs.map(d => ({
                    ...d.data(),
                    id: d.id,
                    type: collName === 'signups' ? 'SIGNUP' : (d.data().type || 'oGX')
                }));
                ServerCache.updateEvents(events);
                newEventsCount += events.length;
            });
        } else {
            // INCREMENTAL FETCH: Only get docs updated since last fetch
            console.log(`CACHE HIT: Searching for updates since ${lastFetch}...`);
            const snapshots = await Promise.all(
                collections.map(c => {
                    return getDocs(query(collection(db, c), where("updated_at", ">", lastFetch)));
                })
            );

            snapshots.forEach((snap, i) => {
                const collName = collections[i];
                const events = snap.docs.map(d => ({
                    ...d.data(),
                    id: d.id,
                    type: collName === 'signups' ? 'SIGNUP' : (d.data().type || 'oGX')
                }));
                ServerCache.updateEvents(events);
                newEventsCount += events.length;
            });
        }

        // Update last fetch timestamp
        ServerCache.setLastFetch(fetchStartTime);

        // 3. Aggregate all cached events
        const cachedEvents = ServerCache.getEvents();

        // Robust filtering for MC level
        const filteredEvents = level === "mc"
            ? cachedEvents.filter(e => {
                // Check IDs
                const asArray = Array.isArray(e.mc_ids) ? e.mc_ids.map(String) : [];
                if (asArray.includes(mcId) || String(e.home_mc_id) === mcId || String(e.host_mc_id) === mcId) return true;
                
                // Fallback to name-based matching if IDs are missing
                if (targetMcName) {
                    const homeMc = String(e.home_mc || "").toLowerCase();
                    const hostMc = String(e.host_mc || "").toLowerCase();
                    if (homeMc.includes(targetMcName) || hostMc.includes(targetMcName)) return true;
                }
                
                return false;
            })
            : cachedEvents;

        const dashboardData = aggregateApplications(
            filteredEvents,
            meta?.last_success || new Date().toISOString(),
            from,
            to,
            level,
            mcId
        );

        // Add context metadata
        (dashboardData as any).context = {
            level,
            mcId,
            total_records: cachedEvents.length,
            filtered_records: filteredEvents.length,
            new_records: newEventsCount,
            last_fetch: fetchStartTime
        };

        return NextResponse.json(dashboardData);

    } catch (error: any) {
        console.error("Dashboard API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
