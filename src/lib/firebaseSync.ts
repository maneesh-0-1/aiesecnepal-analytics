import { db } from "./firebase";
import { collection, doc, writeBatch, setDoc, getDoc, getDocs, limit as firestoreLimit, query } from "firebase/firestore";
import { fetchICXByStatus, fetchOGXByStatus, fetchSignUps, fetchPeopleByIDs, fetchApplicationsByIDs } from "./expaSync";

export async function syncByIDRange(type: 'people' | 'apps', startId: number, endId: number) {
    console.log(`Starting ID-based sync for ${type}: ${startId} to ${endId}`);
    const BATCH_SIZE = 50; // Smaller batches for ID-based aliasing if needed, or filter-based
    let totalProcessed = 0;

    for (let i = startId; i <= endId; i += BATCH_SIZE) {
        const currentBatchIds = Array.from({ length: Math.min(BATCH_SIZE, endId - i + 1) }, (_, idx) => i + idx);

        try {
            const result = type === 'people'
                ? await fetchPeopleByIDs(currentBatchIds)
                : await fetchApplicationsByIDs(currentBatchIds);

            if (result.data.length > 0) {
                const batch = writeBatch(db);
                result.data.forEach((item: any) => {
                    const collectionName = type === 'people' ? 'signups' : (item.status === 'applied' ? 'applied' : item.status);
                    const docRef = doc(collection(db, collectionName || 'applications'), String(item.id));

                    const dataToSave = {
                        ...item,
                        mc_ids: item.mc_ids || [String(item.home_mc_id), String(item.host_mc_id)].filter(id => id && id !== "null" && id !== "undefined"),
                        updated_at: new Date().toISOString()
                    };

                    batch.set(docRef, dataToSave, { merge: true });
                });
                await batch.commit();
                totalProcessed += result.data.length;
                process.stdout.write(`  Synced ${totalProcessed} ${type}... \r`);
            }
        } catch (e: any) {
            console.error(`Error in ID batch ${i}:`, e.message);
        }
    }

    console.log(`\nFinished ID-based sync for ${type}. Total: ${totalProcessed}`);
    return { success: true, count: totalProcessed };
}

export async function syncExpaToFirestore(startDate?: string, endDate?: string, mcId: number | null = null, limit = 2000, targetStatus?: string, force = false, iterateAll = false) {
    const mcLabel = mcId === null ? 'GLOBAL' : mcId;
    console.log(`Starting MC ${mcLabel} sync (Limit: ${limit}, Type: ${targetStatus || 'all'}, Force: ${force})...`);

    // Only iterate if explicitly requested. Otherwise, use efficient Global fetch.
    if (mcId === null && iterateAll) {
        return syncAllMCs(startDate, endDate, limit, targetStatus, force);
    }

    // 1. Get last sync metadata to perform incremental sync (unless forced)
    let lastSyncDate = "2025-02-01";
    if (!startDate || !force) {
        try {
            const metaRef = doc(db, "meta", `sync_status_${mcLabel}`);
            const metaSnap = await getDoc(metaRef);
            if (metaSnap.exists() && metaSnap.data().last_success) {
                // Buffer of 2 days to catch delayed status updates in EXPA
                const date = new Date(metaSnap.data().last_success);
                date.setDate(date.getDate() - 2);
                lastSyncDate = date.toISOString().split('T')[0];
            }
        } catch (e) {
            console.error("Meta fetch failed, falling back to 2025:", e);
        }
    }

    const start = startDate || lastSyncDate;
    const end = endDate || new Date().toISOString();

    console.log(`Syncing MC ${mcLabel} from ${start} to ${end}...`);

    try {
        let totalProcessed = 0;

        // 2. Process Sign-ups
        if (!targetStatus || targetStatus === 'signups') {
            const signups = await fetchSignUps(start, end, mcId, limit);
            const BATCH_SIZE = 500;

            for (let i = 0; i < signups.data.length; i += BATCH_SIZE) {
                const batch = writeBatch(db);
                const currentBatch = signups.data.slice(i, i + BATCH_SIZE);
                currentBatch.forEach((s: any) => {
                    const docRef = doc(collection(db, "signups"), String(s.id));
                    batch.set(docRef, {
                        ...s,
                        mc_ids: [String(s.home_mc_id)].filter(id => id && id !== "null" && id !== "undefined"),
                        updated_at: new Date().toISOString()
                    }, { merge: true });
                });
                await batch.commit();
            }
            console.log(`Synced ${signups.data.length} Sign-ups for MC ${mcLabel}.`);
            totalProcessed += signups.data.length;
        }

        // 3. Process Applications by Status
        const allStatuses = ['applied', 'accepted', 'approved', 'realized', 'finished', 'completed'];
        const statuses = targetStatus && targetStatus !== 'signups' ? [targetStatus] : (targetStatus === 'signups' ? [] : allStatuses);
        const BATCH_SIZE = 500;

        for (const statusType of statuses) {
            console.log(`Step: Processing ${statusType} status for MC ${mcLabel}...`);

            // Fetch both ICX and OGX
            const [icx, ogx] = await Promise.all([
                fetchICXByStatus(statusType, start, end, mcId, limit),
                fetchOGXByStatus(statusType, start, end, mcId, limit)
            ]);

            const combinedMap = new Map<string, any>();

            icx.data.forEach((a: any) => {
                combinedMap.set(String(a.id), { ...a, type: 'iCX' });
            });

            ogx.data.forEach((a: any) => {
                const existing = combinedMap.get(String(a.id));
                if (existing) {
                    combinedMap.set(String(a.id), { ...existing, ...a });
                } else {
                    combinedMap.set(String(a.id), { ...a, type: 'oGX' });
                }
            });

            const combined = Array.from(combinedMap.values());

            for (let i = 0; i < combined.length; i += BATCH_SIZE) {
                const batch = writeBatch(db);
                const currentBatch = combined.slice(i, i + BATCH_SIZE);

                currentBatch.forEach((a: any) => {
                    const docRef = doc(collection(db, statusType), String(a.id));

                    const dataToSave: any = {
                        id: a.id,
                        person_id: a.person_id,
                        status: a.status,
                        type: a.type,
                        product: a.product,
                        source: statusType,
                        applied_at: a.applied_at || null,
                        accepted_at: a.accepted_at || null,
                        approved_at: a.approved_at || null,
                        realized_at: a.realized_at || null,
                        finished_at: a.finished_at || null,
                        completed_at: a.completed_at || null,
                        date: a[statusType + '_at'] || a.applied_at || null,
                        home_lc: a.home_lc || "Unknown LC",
                        home_lc_id: a.home_lc_id || null,
                        home_mc: a.home_mc || "Unknown MC",
                        home_mc_id: a.home_mc_id || null,
                        host_lc: a.host_lc || "Unknown LC",
                        host_lc_id: a.host_lc_id || null,
                        host_mc: a.host_mc || "Unknown MC",
                        host_mc_id: a.host_mc_id || null,
                        mc_ids: [String(a.home_mc_id), String(a.host_mc_id)].filter(id => id && id !== "null" && id !== "undefined"),
                        updated_at: new Date().toISOString()
                    };

                    batch.set(docRef, dataToSave, { merge: true });
                });

                await batch.commit();
            }
            console.log(`Synced ${combined.length} records into ${statusType} collection for MC ${mcLabel}.`);
            totalProcessed += combined.length;
        }

        const timestamp = new Date().toISOString();
        const metaRef = doc(db, "meta", `sync_status_${mcLabel}`);
        await setDoc(metaRef, {
            last_success: timestamp,
            last_count: totalProcessed,
            status: "healthy",
            recent_sync_range: { start, end }
        }, { merge: true });

        return { success: true, count: totalProcessed };
    } catch (error: any) {
        console.error(`Sync failed for MC ${mcLabel}:`, error);
        throw error;
    }
}

async function syncAllMCs(startDate?: string, endDate?: string, limit = 2000, targetStatus?: string, force = false) {
    console.log("=== STARTING FULL NETWORK SYNC (Iterating all MCs) ===");

    // Fetch MCs from Firestore
    const mcsSnap = await getDocs(collection(db, "mcs"));
    const mcs = mcsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    console.log(`Found ${mcs.length} MCs to sync.`);

    let totalCount = 0;
    const errors: string[] = [];

    for (const mc of mcs) {
        try {
            console.log(`\n[${mcs.indexOf(mc) + 1}/${mcs.length}] Syncing ${mc.name} (ID: ${mc.id})...`);
            const result = await syncExpaToFirestore(startDate, endDate, parseInt(mc.id), limit, targetStatus, force);
            totalCount += result.count || 0;
        } catch (e: any) {
            console.error(`Error syncing MC ${mc.name}:`, e.message);
            errors.push(`${mc.name}: ${e.message}`);
        }
        // Small delay to avoid hitting EXPA rate limits too hard
        await new Promise(r => setTimeout(r, 500));
    }

    console.log(`\n=== FULL NETWORK SYNC COMPLETE ===`);
    console.log(`Total records processed: ${totalCount}`);
    if (errors.length > 0) {
        console.log(`Encountered ${errors.length} errors.`);
    }

    return {
        success: true,
        count: totalCount,
        mcCount: mcs.length,
        errors: errors.length > 0 ? errors : undefined
    };
}
