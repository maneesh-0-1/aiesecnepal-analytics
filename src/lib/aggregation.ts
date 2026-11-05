import { LC_NAME_MAP, REGION_MAP, mcList } from "./data";

export interface DashboardData {
    ENTITY_KPIS: Record<string, any[]>;
    NATIONAL_KPIS: Record<string, any[]>;
    TIME_SERIES: any[];
    BREAKDOWN: any[];
    LOCAL_COMMITTEES: any[];
    TOTALS: {
        realized: number;
        approved: number;
        applications: number;
        signups: number;
        finished: number;
        completed: number;
        entityCount: number;
        efficiency: string;
        growth: number;
        last_sync: string;
    };
    REGIONS: Record<string, { re: number; appr: number }>;
}

const MC_NAME_TO_ID = Object.fromEntries(mcList.map(mc => [mc.name.toLowerCase(), mc.id]));
const MC_ID_TO_REGION = Object.fromEntries(mcList.map(mc => [mc.id, mc.region]));
const MC_NAME_TO_REGION = Object.fromEntries(mcList.map(mc => [mc.name.toLowerCase(), mc.region]));

export function aggregateApplications(
    allApps: any[],
    lastSync: string,
    from?: string | null,
    to?: string | null,
    level: "global" | "mc" = "mc",
    targetMcId?: string
): DashboardData {
    const breakdownMap: Record<string, any> = {};
    const timeSeriesMap: Record<string, Record<string, number>> = {};
    const regionsMap: Record<string, { re: number; appr: number }> = {};

    let kpis: any = {
        iGV: { su: 0, app: 0, acc: 0, appr: 0, re: 0, fin: 0, comp: 0 },
        iGTa: { su: 0, app: 0, acc: 0, appr: 0, re: 0, fin: 0, comp: 0 },
        iGTe: { su: 0, app: 0, acc: 0, appr: 0, re: 0, fin: 0, comp: 0 },
        oGV: { su: 0, app: 0, acc: 0, appr: 0, re: 0, fin: 0, comp: 0 },
        oGTa: { su: 0, app: 0, acc: 0, appr: 0, re: 0, fin: 0, comp: 0 },
        oGTe: { su: 0, app: 0, acc: 0, appr: 0, re: 0, fin: 0, comp: 0 },
    };

    let totalSignUps = 0;

    const createEntity = (id: string, name: string, region: string) => {
        if (!breakdownMap[id]) {
            breakdownMap[id] = {
                id: id,
                name: name,
                region: region,
                signups: 0, applications: 0, accepted: 0, approved: 0, realized: 0, finished: 0, completed: 0,
                products: {
                    iGV: { app: 0, acc: 0, appr: 0, re: 0, fin: 0, comp: 0 },
                    iGTa: { app: 0, acc: 0, appr: 0, re: 0, fin: 0, comp: 0 },
                    iGTe: { app: 0, acc: 0, appr: 0, re: 0, fin: 0, comp: 0 },
                    oGV: { app: 0, acc: 0, appr: 0, re: 0, fin: 0, comp: 0 },
                    oGTa: { app: 0, acc: 0, appr: 0, re: 0, fin: 0, comp: 0 },
                    oGTe: { app: 0, acc: 0, appr: 0, re: 0, fin: 0, comp: 0 },
                }
            };
        }
        return breakdownMap[id];
    };

    const isInRange = (dateStr: string | null | undefined) => {
        if (!dateStr) return false;
        const date = dateStr.split('T')[0];
        const startDate = from ? from.split('T')[0] : "2000-01-01";
        const endDate = to ? to.split('T')[0] : "2100-01-01";
        return date >= startDate && date <= endDate;
    };

    const seenIds = new Set<string>();

    const incrementTimeSeries = (dateStr: string | null | undefined, prefix: string, progKey: string) => {
        if (dateStr) {
            const month = new Date(dateStr).toLocaleString('default', { month: 'short' });
            if (!timeSeriesMap[month]) {
                timeSeriesMap[month] = {
                    app_iGV: 0, app_iGTa: 0, app_iGTe: 0, app_oGV: 0, app_oGTa: 0, app_oGTe: 0,
                    acc_iGV: 0, acc_iGTa: 0, acc_iGTe: 0, acc_oGV: 0, acc_oGTa: 0, acc_oGTe: 0,
                    appr_iGV: 0, appr_iGTa: 0, appr_iGTe: 0, appr_oGV: 0, appr_oGTa: 0, appr_oGTe: 0,
                    re_iGV: 0, re_iGTa: 0, re_iGTe: 0, re_oGV: 0, re_oGTa: 0, re_oGTe: 0,
                    fin_iGV: 0, fin_iGTa: 0, fin_iGTe: 0, fin_oGV: 0, fin_oGTa: 0, fin_oGTe: 0,
                    comp_iGV: 0, comp_iGTa: 0, comp_iGTe: 0, comp_oGV: 0, comp_oGTa: 0, comp_oGTe: 0,
                };
            }
            timeSeriesMap[month][`${prefix}_${progKey}`] = (timeSeriesMap[month][`${prefix}_${progKey}`] || 0) + 1;
        }
    };

    allApps.forEach((app: any) => {
        if (seenIds.has(app.id)) return;
        seenIds.add(app.id);

        // 1. Unified KPI & Product Attribution (Unique per application)
        if (app.type === 'SIGNUP') {
            if (isInRange(app.created_at)) totalSignUps++;
        } else {
            const rawProd = String(app.product || "").toUpperCase();
            let prod = "GTe";
            if (rawProd === "7" || rawProd === "GV" || rawProd.includes("VOLUNTEER")) prod = "GV";
            else if (rawProd === "8" || rawProd === "GTA" || rawProd === "GT" || rawProd.includes("TALENT")) prod = "GTa";
            else if (rawProd === "9" || rawProd === "GTE" || rawProd === "GE" || rawProd.includes("TEACHER")) prod = "GTe";

            const isIcxForMC = targetMcId && (String(app.host_mc_id) === targetMcId || (app.host_mc && MC_NAME_TO_ID[app.host_mc.toLowerCase().replace(/^AIESEC in\s+/i, '').trim()] === targetMcId));
            const isOgxForMC = targetMcId && (String(app.home_mc_id) === targetMcId || (app.home_mc && MC_NAME_TO_ID[app.home_mc.toLowerCase().replace(/^AIESEC in\s+/i, '').trim()] === targetMcId));

            const processGlobalKpis = (isIcxSide: boolean) => {
                const pk = (isIcxSide ? 'i' : 'o') + prod;
                if (isInRange(app.applied_at)) {
                    if (kpis[pk]) kpis[pk].app++;
                    incrementTimeSeries(app.applied_at, "app", pk);
                }
                if (isInRange(app.accepted_at)) {
                    if (kpis[pk]) kpis[pk].acc++;
                    incrementTimeSeries(app.accepted_at, "acc", pk);
                }
                if (isInRange(app.approved_at)) {
                    if (kpis[pk]) kpis[pk].appr++;
                    incrementTimeSeries(app.approved_at, "appr", pk);
                }
                if (isInRange(app.realized_at)) {
                    if (kpis[pk]) kpis[pk].re++;
                    incrementTimeSeries(app.realized_at, "re", pk);
                }
                if (isInRange(app.finished_at)) {
                    if (kpis[pk]) kpis[pk].fin++;
                    incrementTimeSeries(app.finished_at, "fin", pk);
                }
                if (isInRange(app.completed_at)) {
                    if (kpis[pk]) kpis[pk].comp++;
                    incrementTimeSeries(app.completed_at, "comp", pk);
                }
            };

            if (level === "global") {
                if (app.home_mc) processGlobalKpis(false);
                if (app.host_mc) processGlobalKpis(true);
            } else {
                if (isIcxForMC) processGlobalKpis(true);
                if (isOgxForMC) processGlobalKpis(false);
            }

            // 2. Entity Attribution
            const processForEntity = (entId: string, entName: string, entRegion: string, isIcxSide: boolean) => {
                const lowerName = entName.toLowerCase();
                if (lowerName.includes('closed') || lowerName.includes('terminated') || lowerName.includes('inactive') ||
                    lowerName.includes('management') || lowerName.includes('test') || lowerName.includes('office') ||
                    lowerName.includes('direction') || lowerName.includes('expansion') || lowerName === 'ai' || entName.length < 2) return;

                const entity = createEntity(entId, entName, entRegion);
                const pk = (isIcxSide ? 'i' : 'o') + prod;

                if (isInRange(app.applied_at)) {
                    entity.applications++;
                    if (entity.products[pk]) entity.products[pk].app++;
                }
                if (isInRange(app.accepted_at)) {
                    entity.accepted++;
                    if (entity.products[pk]) entity.products[pk].acc++;
                }
                if (isInRange(app.approved_at)) {
                    entity.approved++;
                    if (entity.products[pk]) entity.products[pk].appr++;
                }
                if (isInRange(app.realized_at)) {
                    entity.realized++;
                    if (entity.products[pk]) entity.products[pk].re++;
                }
                if (isInRange(app.finished_at)) {
                    entity.finished++;
                    if (entity.products[pk]) entity.products[pk].fin++;
                }
                if (isInRange(app.completed_at)) {
                    entity.completed++;
                    if (entity.products[pk]) entity.products[pk].comp++;
                }
            };

            if (level === "global") {
                // Outgoing Side (Home MC)
                const homeName = (app.home_mc || "").replace(/^AIESEC in\s+/i, '').trim();
                if (homeName) {
                    const homeId = String(app.home_mc_id || MC_NAME_TO_ID[homeName.toLowerCase()] || homeName.toLowerCase().replace(/\s+/g, "-"));
                    const homeRegion = MC_ID_TO_REGION[homeId] || MC_NAME_TO_REGION[homeName.toLowerCase()] || "Other";
                    processForEntity(homeId, homeName, homeRegion, false);
                }
                // Incoming Side (Host MC)
                const hostName = (app.host_mc || "").replace(/^AIESEC in\s+/i, '').trim();
                if (hostName) {
                    const hostId = String(app.host_mc_id || MC_NAME_TO_ID[hostName.toLowerCase()] || hostName.toLowerCase().replace(/\s+/g, "-"));
                    const hostRegion = MC_ID_TO_REGION[hostId] || MC_NAME_TO_REGION[hostName.toLowerCase()] || "Other";
                    processForEntity(hostId, hostName, hostRegion, true);
                }
            } else {
                // MC Level - Nepal LC Attribution
                if (isIcxForMC) {
                    const lcName = (app.host_lc || "").replace(/^AIESEC in\s+/i, '').trim();
                    if (lcName) {
                        const lcId = String(app.host_lc_id || lcName.toLowerCase().replace(/\s+/g, "-"));
                        const region = REGION_MAP[lcName] || "Bagmati";
                        processForEntity(lcId, lcName, region, true);
                    }
                }
                if (isOgxForMC) {
                    const lcName = (app.home_lc || "").replace(/^AIESEC in\s+/i, '').trim();
                    if (lcName) {
                        const lcId = String(app.home_lc_id || lcName.toLowerCase().replace(/\s+/g, "-"));
                        const region = REGION_MAP[lcName] || "Bagmati";
                        processForEntity(lcId, lcName, region, false);
                    }
                }
            }
        }
    });

    // Process Signups (Special Case)
    seenIds.clear(); // Reuse for signups
    allApps.filter(a => a.type === 'SIGNUP').forEach(app => {
        if (!isInRange(app.created_at)) return;

        const mcName = (app.home_mc || "").replace(/^AIESEC in\s+/i, '').trim();
        const lcName = (app.home_lc || "").replace(/^AIESEC in\s+/i, '').trim();
        const mcId = String(app.home_mc_id || (mcName ? MC_NAME_TO_ID[mcName.toLowerCase()] : ""));

        if (level === "global") {
            if (mcName) {
                const id = mcId || mcName.toLowerCase().replace(/\s+/g, "-");
                const region = MC_ID_TO_REGION[id] || MC_NAME_TO_REGION[mcName.toLowerCase()] || "Other";
                const entity = createEntity(id, mcName, region);
                entity.signups++;
            }
        } else if (!targetMcId || mcId === targetMcId || mcName.toLowerCase().includes("nepal")) {
            if (lcName) {
                const id = String(app.home_lc_id || lcName.toLowerCase().replace(/\s+/g, "-"));
                const region = REGION_MAP[lcName] || "Bagmati";
                const entity = createEntity(id, lcName, region);
                entity.signups++;
            }
        }
    });

    const ENTITY_KPIS: Record<string, any[]> = {};
    Object.keys(kpis).forEach(key => {
        ENTITY_KPIS[key] = [
            { label: "Sign-ups", value: kpis[key].su, target: kpis[key].su > 0 ? kpis[key].su * 1.5 : 50 },
            { label: "Applications", value: kpis[key].app, target: kpis[key].app + 20 },
            { label: "Accepted", value: kpis[key].acc, target: kpis[key].acc + 15 },
            { label: "Approved", value: kpis[key].appr, target: kpis[key].appr + 10 },
            { label: "Realized", value: kpis[key].re, target: kpis[key].re + 5 },
            { label: "Finished", value: kpis[key].fin, target: kpis[key].fin + 3 },
            { label: "Completed", value: kpis[key].comp, target: kpis[key].comp + 2 },
        ];
    });

    const sortedMonths = ["Aug", "Sep", "Sept", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
    const TIME_SERIES = Object.keys(timeSeriesMap).map(month => ({
        month,
        ...timeSeriesMap[month]
    })).sort((a, b) => sortedMonths.indexOf(a.month) - sortedMonths.indexOf(b.month));

    const totalApps = Object.values(kpis).reduce((s: number, k: any) => s + k.app, 0);
    const totalApprs = Object.values(kpis).reduce((s: number, k: any) => s + k.appr, 0);
    const totalREs = Object.values(kpis).reduce((s: number, k: any) => s + k.re, 0);
    const totalFins = Object.values(kpis).reduce((s: number, k: any) => s + k.fin, 0);
    const totalComps = Object.values(kpis).reduce((s: number, k: any) => s + k.comp, 0);

    Object.values(breakdownMap).forEach((ent: any) => {
        const r = ent.region || "Other";
        if (!regionsMap[r]) regionsMap[r] = { re: 0, appr: 0 };
        regionsMap[r].re += ent.realized;
        regionsMap[r].appr += ent.approved;
    });

    return {
        ENTITY_KPIS,
        NATIONAL_KPIS: ENTITY_KPIS,
        TIME_SERIES,
        BREAKDOWN: Object.values(breakdownMap),
        LOCAL_COMMITTEES: Object.values(breakdownMap),
        TOTALS: {
            realized: totalREs,
            approved: totalApprs,
            applications: totalApps,
            signups: totalSignUps,
            finished: totalFins,
            completed: totalComps,
            entityCount: Object.keys(breakdownMap).length,
            efficiency: totalApps > 0 ? ((totalREs / totalApps) * 100).toFixed(1) : "0.0",
            growth: 12,
            last_sync: lastSync
        },
        REGIONS: regionsMap
    };
}
