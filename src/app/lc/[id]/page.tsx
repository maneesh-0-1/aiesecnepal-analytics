"use client";
import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft, Users, Target, Zap, Activity, Trophy,
    TrendingUp, TrendingDown, Star, BarChart3, Layers,
    ChevronRight, Globe, Flame, FileText, AlertTriangle, ArrowUpRight
} from "lucide-react";
import {
    BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Legend, PieChart as RePie, Pie, RadarChart, Radar, PolarGrid, PolarAngleAxis,
    ComposedChart, Line
} from "recharts";
import { TermSelector } from "@/components/TermSelector";
import { motion, AnimatePresence } from "framer-motion";
import { KpiCard, SectionCard, LoadingScreen, tooltipStyle } from "@/components/DashboardUI";
import { PRODUCTS, PRODUCT_COLORS, STAGE_KEYS, STAGE_COLORS, fmt, pct } from "@/lib/constants";

const STAGE_FIELD_MAP: Record<string, string> = {
    "APL": "app", "Accepted": "acc", "APD": "appr", "RE": "re", "FN": "fin", "CO": "comp"
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

function LCDetailPageContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const lcId = params.id as string;
    const mcId = searchParams.get("mcId") || "112";

    const now = new Date();
    const currentYear = now.getFullYear();
    const isAfterFeb = now.getMonth() >= 1; 
    const startYear = isAfterFeb ? currentYear : currentYear - 1;

    const [from, setFrom] = useState(`${startYear}-02-01`);
    const [to, setTo] = useState(`${startYear + 1}-01-31`);
    const [metric, setMetric] = useState<'realized' | 'approved'>('approved');
    const [selectedProduct, setSelectedProduct] = useState<string>("Total");
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/dashboard?from=${from}&to=${to}&mcId=${mcId}`);
            const current = await res.json();
            setData(current);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
        window.addEventListener("sync-complete", fetchData);
        return () => window.removeEventListener("sync-complete", fetchData);
    }, [from, to, mcId]);

    const ranking = useMemo(() => {
        if (!data?.LOCAL_COMMITTEES) return null;
        const all = [...data.LOCAL_COMMITTEES];

        const getRank = (list: any[], field: string, prod: string) => {
            let sorted;
            if (prod === "Total") {
                sorted = [...list].sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0));
            } else {
                const pKey = field === 'realized' ? 're' : (field === 'approved' ? 'appr' : (field === 'applications' ? 'app' : field));
                sorted = [...list].sort((a, b) => (b.products?.[prod]?.[pKey] ?? 0) - (a.products?.[prod]?.[pKey] ?? 0));
            }
            return sorted.findIndex(l => l.id === lcId) + 1;
        };

        return {
            realized: getRank(all, "realized", selectedProduct),
            approved: getRank(all, "approved", selectedProduct),
            applicants: getRank(all, "applications", selectedProduct),
            signups: getRank(all, "signups", selectedProduct),
            total: all.length
        };
    }, [data, lcId, selectedProduct]);

    const lc = useMemo(() => {
        if (!data?.LOCAL_COMMITTEES) return null;
        return data.LOCAL_COMMITTEES.find((l: any) => l.id === lcId) || null;
    }, [data, lcId]);

    const rankInfo = useMemo(() => {
        if (!data?.LOCAL_COMMITTEES || !lc) return null;
        const all = data.LOCAL_COMMITTEES;

        const reRank = ranking?.realized ?? 0;
        const appRank = ranking?.applicants ?? 0;
        const approvedRank = ranking?.approved ?? 0;
        const signupRank = ranking?.signups ?? 0;

        const mKey = metric === 'realized' ? 'realized' : 'approved';
        const pKey = metric === 'realized' ? 're' : 'appr';

        const byConv = [...all]
            .filter((l: any) => {
                const apps = selectedProduct === "Total" ? l.applications : (l.products?.[selectedProduct]?.app ?? 0);
                return apps >= 3;
            })
            .sort((a: any, b: any) => {
                let ca, cb;
                if (selectedProduct === "Total") {
                    ca = (a[mKey] ?? 0) / Math.max(a.applications, 1);
                    cb = (b[mKey] ?? 0) / Math.max(b.applications, 1);
                } else {
                    ca = (a.products?.[selectedProduct]?.[pKey] ?? 0) / Math.max(a.products?.[selectedProduct]?.app, 1);
                    cb = (b.products?.[selectedProduct]?.[pKey] ?? 0) / Math.max(b.products?.[selectedProduct]?.app, 1);
                }
                return cb - ca;
            });
        const convRank = byConv.findIndex((l: any) => l.id === lcId) + 1;

        return {
            rank: metric === 'realized' ? reRank : approvedRank,
            reRank,
            appRank, approvedRank, signupRank,
            total: all.length,
            convRank: convRank > 0 ? convRank : null,
            convTotal: byConv.length
        };
    }, [data, lc, lcId, metric, ranking, selectedProduct]);

    const productPipeline = useMemo(() => {
        if (!lc) return [];
        const prods = selectedProduct === "Total" ? PRODUCTS : [selectedProduct as any];
        return prods.map(p => ({
            product: p,
            app: lc.products?.[p]?.app ?? 0,
            acc: lc.products?.[p]?.acc ?? 0,
            appr: lc.products?.[p]?.appr ?? 0,
            re: lc.products?.[p]?.re ?? 0,
            fin: lc.products?.[p]?.fin ?? 0,
            comp: lc.products?.[p]?.comp ?? 0,
        }));
    }, [lc, selectedProduct]);

    const stageFunnel = useMemo(() => {
        if (!lc) return [];
        return STAGE_KEYS.map((label, i) => {
            const field = STAGE_FIELD_MAP[label];
            const total = selectedProduct === "Total"
                ? PRODUCTS.reduce((s, p) => s + (lc.products?.[p]?.[field] ?? 0), 0)
                : (lc.products?.[selectedProduct]?.[field] ?? 0);
            return { label, value: total, color: STAGE_COLORS[i] };
        });
    }, [lc, selectedProduct]);

    const programSplit = useMemo(() => {
        if (!lc) return [];
        const mKey = metric === 'realized' ? 're' : 'appr';
        const iVal = ["iGV", "iGTa", "iGTe"].reduce((s, p) => s + (lc.products?.[p]?.[mKey] ?? 0), 0);
        const oVal = ["oGV", "oGTa", "oGTe"].reduce((s, p) => s + (lc.products?.[p]?.[mKey] ?? 0), 0);
        return [
            { name: "iCX (Incoming)", value: iVal, color: PRODUCT_COLORS.iGV },
            { name: "oGX (Outgoing)", value: oVal, color: PRODUCT_COLORS.oGV },
        ];
    }, [lc, metric]);

    const conversions = useMemo(() => {
        const f = stageFunnel;
        return [
            { label: "APL → ACC", rate: pct(f[1]?.value ?? 0, f[0]?.value ?? 0), from: f[0]?.value ?? 0, to: f[1]?.value ?? 0, drop: (f[0]?.value ?? 0) - (f[1]?.value ?? 0) },
            { label: "ACC → APD", rate: pct(f[2]?.value ?? 0, f[1]?.value ?? 0), from: f[1]?.value ?? 0, to: f[2]?.value ?? 0, drop: (f[1]?.value ?? 0) - (f[2]?.value ?? 0) },
            { label: "APD → RE", rate: pct(f[3]?.value ?? 0, f[2]?.value ?? 0), from: f[2]?.value ?? 0, to: f[3]?.value ?? 0, drop: (f[2]?.value ?? 0) - (f[3]?.value ?? 0) },
            { label: "RE → FN", rate: pct(f[4]?.value ?? 0, f[3]?.value ?? 0), from: f[3]?.value ?? 0, to: f[4]?.value ?? 0, drop: (f[3]?.value ?? 0) - (f[4]?.value ?? 0) },
            { label: "FN → CO", rate: pct(f[5]?.value ?? 0, f[4]?.value ?? 0), from: f[4]?.value ?? 0, to: f[5]?.value ?? 0, drop: (f[4]?.value ?? 0) - (f[5]?.value ?? 0) },
            { label: `Overall (APL → ${metric === 'realized' ? 'RE' : 'APD'})`, rate: pct(f[metric === 'realized' ? 3 : 2]?.value ?? 0, f[0]?.value ?? 0), from: f[0]?.value ?? 0, to: f[metric === 'realized' ? 3 : 2]?.value ?? 0, drop: null },
        ];
    }, [stageFunnel, metric]);

    const radarData = useMemo(() => {
        if (!lc || !data?.LOCAL_COMMITTEES) return [];
        const allLCs = data.LOCAL_COMMITTEES;
        const mKey = metric === 'realized' ? 're' : 'appr';
        const prods = selectedProduct === "Total" ? PRODUCTS : [selectedProduct as any];
        return prods.map(p => {
            const myVal = lc.products?.[p]?.[mKey] ?? 0;
            const maxVal = Math.max(...allLCs.map((l: any) => l.products?.[p]?.[mKey] ?? 0), 1);
            const score = Math.round((myVal / maxVal) * 100);
            const networkAvg = allLCs.reduce((s: number, l: any) => s + (l.products?.[p]?.[mKey] ?? 0), 0) / Math.max(allLCs.length, 1);
            const avgScore = Math.round((networkAvg / maxVal) * 100);
            return { product: p, score, avgScore };
        });
    }, [lc, data, metric, selectedProduct]);

    const productRealized = useMemo(() => {
        return productPipeline.map(r => ({
            name: r.product,
            RE: r.re,
            APR: r.appr,
            APP: r.app,
            color: PRODUCT_COLORS[r.product as keyof typeof PRODUCT_COLORS],
        }));
    }, [productPipeline]);

    const peers = useMemo(() => {
        if (!data?.LOCAL_COMMITTEES || !lc) return [];
        const mKey = metric === 'realized' ? 're' : 'appr';
        const mKeyLC = metric === 'realized' ? 'realized' : 'approved';
        const sorted = [...data.LOCAL_COMMITTEES].sort((a: any, b: any) => {
            if (selectedProduct === "Total") return (b[mKeyLC] ?? 0) - (a[mKeyLC] ?? 0);
            return (b.products?.[selectedProduct]?.[mKey] ?? 0) - (a.products?.[selectedProduct]?.[mKey] ?? 0);
        });
        const myIdx = sorted.findIndex((l: any) => l.id === lcId);
        const start = Math.max(0, myIdx - 2);
        const end = Math.min(sorted.length, myIdx + 3);
        return sorted.slice(start, end).map((l: any, i: number) => {
            const val = selectedProduct === "Total" ? l[mKeyLC] : (l.products?.[selectedProduct]?.[mKey] ?? 0);
            const apps = selectedProduct === "Total" ? l.applications : (l.products?.[selectedProduct]?.app ?? 0);
            return {
                ...l,
                isMe: l.id === lcId,
                rank: start + i + 1,
                displayVal: val,
                displayApps: apps
            };
        });
    }, [data, lc, lcId, metric, selectedProduct]);

    const productRanks = useMemo(() => {
        if (!data?.LOCAL_COMMITTEES || !lc) return {};
        const ranks: Record<string, { rank: number; total: number; topLC: any }> = {};
        const mKey = metric === 'realized' ? 're' : 'appr';
        PRODUCTS.forEach(p => {
            const sorted = [...data.LOCAL_COMMITTEES].sort((a: any, b: any) =>
                (b.products?.[p]?.[mKey] ?? 0) - (a.products?.[p]?.[mKey] ?? 0)
            );
            const rank = sorted.findIndex((l: any) => l.id === lcId) + 1;
            ranks[p] = { rank, total: sorted.length, topLC: sorted[0] };
        });
        return ranks;
    }, [data, lc, lcId, metric]);

    const waterfallData = useMemo(() => {
        if (!stageFunnel.length) return [];
        const app = stageFunnel[0]?.value ?? 0;
        return stageFunnel.map((s, i) => ({
            label: s.label,
            value: s.value,
            lost: i === 0 ? 0 : (stageFunnel[i - 1]?.value ?? 0) - s.value,
            color: s.color,
            pct: i === 0 ? 100 : parseFloat(pct(s.value, app)),
        }));
    }, [stageFunnel]);

    const vsNational = useMemo(() => {
        if (!data?.LOCAL_COMMITTEES || !lc) return [];
        const allLCs = data.LOCAL_COMMITTEES;
        const n = allLCs.length;
        const mKey = metric === 'realized' ? 're' : 'appr';
        const prods = selectedProduct === "Total" ? PRODUCTS : [selectedProduct as any];
        return prods.map(p => {
            const myVal = lc.products?.[p]?.[mKey] ?? 0;
            const avgVal = allLCs.reduce((s: number, l: any) => s + (l.products?.[p]?.[mKey] ?? 0), 0) / Math.max(n, 1);
            return {
                name: p,
                mine: myVal,
                avg: parseFloat(avgVal.toFixed(1)),
                color: PRODUCT_COLORS[p as keyof typeof PRODUCT_COLORS],
                delta: myVal - avgVal,
            };
        });
    }, [lc, data, metric, selectedProduct]);

    if (loading && !data) return <LoadingScreen label="Accessing LC Neural Core…" />;

    return (
        <motion.div 
            initial="hidden"
            animate="show"
            variants={container}
            style={{ display: "flex", flexDirection: "column", gap: 32, padding: "40px 0 80px" }}
        >

            {/* ── Header Section ─────────────────────────────────────────── */}
            <motion.div variants={item} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div className="section-header">
                    <div>
                        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                            <div style={{ background: "var(--accent-soft)", color: "var(--accent)", padding: "4px 12px", borderRadius: 100, fontSize: 10, fontWeight: 900, letterSpacing: "0.1em" }}>LC PERFORMANCE INTELLIGENCE</div>
                            {rankInfo && (
                                <div style={{ background: rankInfo.rank <= 3 ? "#FFD700" : "var(--accent-soft)", color: rankInfo.rank <= 3 ? "#333" : "var(--accent)", padding: "4px 12px", borderRadius: 100, fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", gap: 6, border: rankInfo.rank <= 3 ? "1px solid #eab308" : "1px solid transparent" }}>
                                    <Trophy size={11} /> #{rankInfo.rank} NATIONAL ({metric === 'realized' ? 'RE' : 'APD'})
                                </div>
                            )}
                        </div>
                        <h1 className="section-title" style={{ fontSize: 40, fontWeight: 900, lineHeight: 1 }}>AIESEC in <span style={{ color: "var(--accent)" }}>{lc?.name}</span></h1>
                        <p className="section-subtitle" style={{ fontSize: 16, marginTop: 8 }}>Entity Performance Control Center • Detailed Analytics</p>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }} className="desktop-only">
                        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Analysis Period</div>
                        <TermSelector from={from} to={to} type="LC" onChange={(f, t) => { setFrom(f); setTo(t); }} />
                    </div>
                </div>

                <div className="mobile-only" style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Analysis Period</div>
                    <TermSelector from={from} to={to} type="LC" onChange={(f, t) => { setFrom(f); setTo(t); }} />
                </div>

                {/* ── Filter Toolbar ────────────────────────────────────────── */}
                <div className="filter-toolbar">
                    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                        <div className="filter-group">
                            <span style={{ fontSize: 9, fontWeight: 900, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", paddingLeft: 4 }}>Focus Product</span>
                            <div className="filter-options">
                                {["Total", ...PRODUCTS].map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setSelectedProduct(p)}
                                        style={{
                                            padding: "6px 14px", borderRadius: 7, border: "none", fontSize: 10, fontWeight: 900, cursor: "pointer",
                                            background: selectedProduct === p ? (p === "Total" ? "var(--accent)" : PRODUCT_COLORS[p as keyof typeof PRODUCT_COLORS]) : "transparent",
                                            color: selectedProduct === p ? "white" : "var(--text-muted)",
                                            transition: "all 0.2s"
                                        }}>
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="filter-separator" />

                        <div className="filter-group">
                            <span style={{ fontSize: 9, fontWeight: 900, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", paddingLeft: 4 }}>Analyze by</span>
                            <div className="filter-options">
                                <button
                                    onClick={() => setMetric('approved')}
                                    style={{
                                        padding: "6px 16px", borderRadius: 7, border: "none", fontSize: 10, fontWeight: 900, cursor: "pointer",
                                        background: metric === 'approved' ? "var(--accent)" : "transparent",
                                        color: metric === 'approved' ? "white" : "var(--text-muted)",
                                        transition: "all 0.2s"
                                    }}>
                                    APPROVALS
                                </button>
                                <button
                                    onClick={() => setMetric('realized')}
                                    style={{
                                        padding: "6px 16px", borderRadius: 7, border: "none", fontSize: 10, fontWeight: 900, cursor: "pointer",
                                        background: metric === 'realized' ? "var(--accent)" : "transparent",
                                        color: metric === 'realized' ? "white" : "var(--text-muted)",
                                        transition: "all 0.2s"
                                    }}>
                                    REALISATIONS
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--success)", fontSize: 11, fontWeight: 800 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", boxShadow: "0 0 8px var(--success)" }} />
                        ENTITY STATUS: ACTIVE
                    </div>
                </div>
            </motion.div>

            {/* ── KPI Row ─────────────────────────────────────────────────── */}
            <motion.div variants={item}>
                <div className="stats-grid">
                    <KpiCard label="SU" value={fmt(lc?.signups)} sub="LC Signups" icon={Users} color="var(--aiesec-blue)" delay={0.05} />
                    <KpiCard label="APL" value={fmt(selectedProduct === "Total" ? lc?.applications : lc?.products?.[selectedProduct]?.app)} sub="Applicants" icon={FileText} color="var(--aiesec-jade)" delay={0.10} />
                    <KpiCard label="APD" value={fmt(selectedProduct === "Total" ? lc?.approved : lc?.products?.[selectedProduct]?.appr)} sub="Approvals" icon={Target} color="var(--aiesec-sun)" delay={0.15} />
                    <KpiCard label="RE" value={fmt(selectedProduct === "Total" ? lc?.realized : lc?.products?.[selectedProduct]?.re)} sub="Realizations" icon={Zap} color="var(--aiesec-jade)" delay={0.20} />
                </div>
            </motion.div>

            {/* ── Main Performance Grid ───────────────────────────────────── */}
            <motion.div variants={item} className="responsive-grid two-cols">

                {/* 1. Product-wise Realized Bar */}
                <SectionCard title={`${metric === 'realized' ? 'Realized' : 'Approved'} Exchanges by Product`} subtitle={`Exchange ${metric === 'realized' ? 'completions' : 'confirmations'} across all 6 program types`} icon={BarChart3}>
                    <div style={{ height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={productRealized} barCategoryGap="30%">
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-muted)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: "var(--text-secondary)" }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "var(--text-muted)" }} />
                                <Tooltip {...tooltipStyle} />
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 800 }} />
                                <Bar dataKey="APP" name="APL" radius={[4, 4, 0, 0]}>
                                    {productRealized.map((e, i) => <Cell key={i} fill={`${e.color}22`} />)}
                                </Bar>
                                <Bar dataKey="APR" name="APD" radius={[4, 4, 0, 0]}>
                                    {productRealized.map((e, i) => <Cell key={i} fill={`${e.color}55`} />)}
                                </Bar>
                                <Bar dataKey="RE" name="RE" radius={[4, 4, 0, 0]}>
                                    {productRealized.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </SectionCard>

                {/* 2. Programme Split pie */}
                <SectionCard title="Programme Split" subtitle={`Incoming vs Outgoing ${metric === 'realized' ? 'realized' : 'approved'} exchanges`} icon={Layers}>
                    <div style={{ height: 180 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <RePie>
                                <Pie data={programSplit} innerRadius={50} outerRadius={78} paddingAngle={6} dataKey="value"
                                    label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`} labelLine={false}>
                                    {programSplit.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip {...tooltipStyle} />
                            </RePie>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 10 }}>
                        {programSplit.map(s => (
                            <div key={s.name} style={{ flex: "1 1 120px", padding: 12, background: "var(--bg-app)", borderRadius: 10, border: "1px solid var(--border)" }}>
                                <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, marginBottom: 6 }} />
                                <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text-secondary)" }}>{s.name}</div>
                                <div style={{ fontSize: 20, fontWeight: 900, fontFamily: "Raleway", color: "var(--text-primary)" }}>{fmt(s.value)}</div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            </motion.div>

            {/* ── Second Grid: Funnel, Conversions, Radar ───────────────── */}
            <motion.div variants={item} className="responsive-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}>

                {/* 3. Stage Funnel with conversion badges */}
                <SectionCard title="Pipeline Funnel" subtitle="Stage-by-stage momentum for this LC" icon={Target}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 4 }}>
                        {stageFunnel.map((stage, i) => {
                            const maxVal = stageFunnel[0]?.value || 1;
                            const convFromPrev = i > 0 ? parseFloat(pct(stage.value, stageFunnel[i - 1]?.value ?? 1)) : 100;
                            return (
                                <div key={stage.label}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                                        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-primary)" }}>{stage.label}</span>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            {i > 0 && (
                                                <span style={{
                                                    fontSize: 10, fontWeight: 900, padding: "2px 6px", borderRadius: 4,
                                                    color: convFromPrev >= 70 ? "#00C16E" : convFromPrev >= 35 ? "#F48924" : "#F85A40",
                                                    background: convFromPrev >= 70 ? "#00C16E15" : convFromPrev >= 35 ? "#F4892415" : "#F85A4015",
                                                }}>{convFromPrev}%</span>
                                            )}
                                            <span style={{ fontSize: 13, fontWeight: 900, color: stage.color, fontFamily: "Raleway" }}>{fmt(stage.value)}</span>
                                        </div>
                                    </div>
                                    <div style={{ height: 7, background: "var(--border-muted)", borderRadius: 8, overflow: "hidden" }}>
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(stage.value / maxVal) * 100}%` }}
                                            transition={{ duration: 0.9, delay: i * 0.08 }}
                                            style={{ height: "100%", background: stage.color, borderRadius: 8 }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </SectionCard>

                {/* 4. Conversion Analysis */}
                <SectionCard title="Conversion Analysis" subtitle="Stage transition efficiency with EP leakage" icon={Activity}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                        {conversions.map((c, i) => {
                            const rate = parseFloat(c.rate);
                            const color = rate >= 70 ? "#00C16E" : rate >= 35 ? "#F48924" : "#F85A40";
                            const isOverall = i === conversions.length - 1;
                            return (
                                <div key={i} style={{
                                    display: "flex", alignItems: "center", gap: 10,
                                    padding: "10px 14px", background: isOverall ? "var(--accent-soft)" : "var(--bg-app)",
                                    borderRadius: 10, border: `1px solid ${isOverall ? "var(--accent)" : "var(--border)"}`,
                                    marginTop: isOverall ? 4 : 0
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 10, fontWeight: 800, color: isOverall ? "var(--accent)" : "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.label}</div>
                                        {c.drop !== null && c.drop !== undefined && c.drop > 0 && (
                                            <div style={{ fontSize: 10, color: "#F85A40", marginTop: 1, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                                                <TrendingDown size={9} /> −{fmt(c.drop)} EPs lost
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 17, fontWeight: 900, fontFamily: "Raleway", color: isOverall ? "var(--accent)" : color }}>{c.rate}%</div>
                                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: isOverall ? "var(--accent)" : color, flexShrink: 0 }} />
                                </div>
                            );
                        })}
                    </div>
                </SectionCard>

                {/* 5. Radar: Product Strength vs Network */}
                <SectionCard title="Product Strength" subtitle={`LC score vs national average (% of national peak ${metric === 'realized' ? 'RE' : 'APD'})`} icon={Star}>
                    <div style={{ height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarData} outerRadius={90}>
                                <PolarGrid stroke="var(--border-muted)" />
                                <PolarAngleAxis dataKey="product" tick={{ fontSize: 11, fontWeight: 800, fill: "var(--text-secondary)" }} />
                                <Radar name="This LC" dataKey="score" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.18} strokeWidth={2} />
                                <Radar name="Nat. Avg" dataKey="avgScore" stroke="#037EF3" fill="#037EF3" fillOpacity={0.08} strokeWidth={1.5} strokeDasharray="4 2" />
                                <Tooltip {...tooltipStyle} formatter={(val: any, name: any) => [`${val}% of national peak`, String(name)]} />
                                <Legend iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 800 }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </SectionCard>
            </motion.div>

            {/* ── LC vs National Average Comparison ───────────────────────── */}
            <motion.section variants={item}>
                <SectionCard title="This LC vs Network Average" subtitle={`${metric === 'realized' ? 'Realized' : 'Approved'} exchanges per product — your LC (bars) vs network average (line)`} icon={BarChart3} accent="#0CB9C1">
                    <div style={{ height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={vsNational}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-muted)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 800, fill: "var(--text-secondary)" }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "var(--text-muted)" }} />
                                <Tooltip {...tooltipStyle} content={({ payload, label }: any) => {
                                    if (!payload?.length) return null;
                                    const mine = payload.find((p: any) => p.dataKey === "mine");
                                    const avg = payload.find((p: any) => p.dataKey === "avg");
                                    const delta = (mine?.value ?? 0) - (avg?.value ?? 0);
                                    return (
                                        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", fontSize: 12, fontWeight: 700 }}>
                                            <div style={{ fontWeight: 900, marginBottom: 4 }}>{label}</div>
                                            <div>This LC: <strong>{mine?.value ?? 0}</strong></div>
                                            <div>Network avg: <strong>{avg?.value ?? 0}</strong></div>
                                            <div style={{ color: delta >= 0 ? "#00C16E" : "#F85A40", marginTop: 4 }}>
                                                {delta >= 0 ? "+" : ""}{delta.toFixed(1)} vs avg
                                            </div>
                                        </div>
                                    );
                                }} />
                                <Bar dataKey="mine" name="This LC" radius={[5, 5, 0, 0]}>
                                    {vsNational.map((e, i) => (
                                        <Cell key={i} fill={e.delta >= 0 ? e.color : `${e.color}55`} />
                                    ))}
                                </Bar>
                                <Line
                                    type="monotone"
                                    dataKey="avg"
                                    name="Network Avg"
                                    stroke="#037EF3"
                                    strokeWidth={2}
                                    strokeDasharray="5 4"
                                    dot={{ fill: "#037EF3", r: 4, strokeWidth: 0 }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Deltas row */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10, marginTop: 16 }}>
                        {vsNational.map(p => (
                            <div key={p.name} style={{
                                padding: "10px 12px", borderRadius: 10, textAlign: "center",
                                background: p.delta >= 0 ? "#00C16E0A" : "#F85A400A",
                                border: `1px solid ${p.delta >= 0 ? "#00C16E25" : "#F85A4025"}`
                            }}>
                                <div style={{ fontSize: 11, fontWeight: 900, color: p.color, marginBottom: 4 }}>{p.name}</div>
                                <div style={{ fontSize: 16, fontWeight: 900, fontFamily: "Raleway", color: p.delta >= 0 ? "#00C16E" : "#F85A40", display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                                    {p.delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                    {p.delta >= 0 ? "+" : ""}{p.delta.toFixed(1)}
                                </div>
                                <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700 }}>vs avg</div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            </motion.section>

            {/* ── Product × Stage Matrix + Product Ranks ───────────────── */}
            <motion.div variants={item} className="responsive-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))" }}>

                <SectionCard title="Product Performance Matrix" subtitle="Full pipeline breakdown by exchange product" icon={Trophy}>
                    <div style={{ overflowX: "auto", margin: "0 -16px", padding: "0 16px" }} className="hide-scrollbar">
                        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 500 }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 10, fontWeight: 900, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "2px solid var(--border)" }}>Product</th>
                                    {STAGE_KEYS.map((s, i) => (
                                        <th key={s} style={{ textAlign: "center", padding: "10px 8px", fontSize: 10, fontWeight: 900, color: STAGE_COLORS[i], textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "2px solid var(--border)" }}>{s}</th>
                                    ))}
                                    <th style={{ textAlign: "center", padding: "10px 8px", fontSize: 10, fontWeight: 900, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "2px solid var(--border)" }}>Conv. %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productPipeline.map((row) => {
                                    const conv = pct(metric === 'realized' ? row.re : row.appr, row.app);
                                    const convColor = parseFloat(conv) >= 20 ? "#00C16E" : parseFloat(conv) >= 10 ? "#F48924" : "#F85A40";
                                    return (
                                        <tr key={row.product} className="table-row-premium">
                                            <td style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                    <div style={{ width: 10, height: 10, borderRadius: 3, background: PRODUCT_COLORS[row.product as keyof typeof PRODUCT_COLORS] }} />
                                                    <span style={{ fontWeight: 900, fontSize: 14 }}>{row.product}</span>
                                                </div>
                                            </td>
                                            {[row.app, row.acc, row.appr, row.re, row.fin, row.comp].map((val, i) => (
                                                <td key={i} style={{ textAlign: "center", padding: "14px 8px", borderBottom: "1px solid var(--border)", fontFamily: "monospace", fontSize: 14, fontWeight: 800, color: val > 0 ? STAGE_COLORS[i] : "var(--text-muted)", opacity: val > 0 ? 1 : 0.3 }}>
                                                    {fmt(val)}
                                                </td>
                                            ))}
                                            <td style={{ textAlign: "center", padding: "14px 8px", borderBottom: "1px solid var(--border)", fontFamily: "monospace", fontSize: 14, fontWeight: 900, color: convColor }}>
                                                {conv}%
                                            </td>
                                        </tr>
                                    );
                                })}
                                <tr style={{ background: "var(--bg-app)" }}>
                                    <td style={{ padding: "12px 16px", fontWeight: 900, fontSize: 13, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total</td>
                                    {[
                                        productPipeline.reduce((s, r) => s + r.app, 0),
                                        productPipeline.reduce((s, r) => s + r.acc, 0),
                                        productPipeline.reduce((s, r) => s + r.appr, 0),
                                        productPipeline.reduce((s, r) => s + r.re, 0),
                                        productPipeline.reduce((s, r) => s + r.fin, 0),
                                        productPipeline.reduce((s, r) => s + r.comp, 0),
                                    ].map((val, i) => (
                                        <td key={i} style={{ textAlign: "center", padding: "12px 8px", fontFamily: "monospace", fontSize: 15, fontWeight: 900, color: STAGE_COLORS[i] }}>
                                            {fmt(val)}
                                        </td>
                                    ))}
                                    <td style={{ textAlign: "center", padding: "12px 8px", fontFamily: "monospace", fontSize: 14, fontWeight: 900, color: "var(--accent)" }}>
                                        {pct(metric === 'realized' ? lc?.realized : lc?.approved, lc?.applications)}%
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </SectionCard>

                {/* Product National Ranks */}
                <SectionCard title="Product National Ranks" subtitle={`National ranking per program (by ${metric === 'realized' ? 'RE' : 'APD'})`} icon={Flame} accent="#F48924">
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {PRODUCTS.map(p => {
                            const info = productRanks[p];
                            const mKey = metric === 'realized' ? 're' : 'appr';
                            const myVal = lc?.products?.[p]?.[mKey] ?? 0;
                            const color = PRODUCT_COLORS[p as keyof typeof PRODUCT_COLORS];
                            const isTop = (info?.rank ?? 99) <= 3;
                            return (
                                <motion.div 
                                    key={p} 
                                    whileHover={{ x: 4 }}
                                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: isTop ? `${color}08` : "var(--bg-app)", borderRadius: 10, border: `1px solid ${isTop ? `${color}30` : "var(--border)"}` }}
                                >
                                    <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 12, fontWeight: 900, color }}>
                                            {p}
                                        </div>
                                        <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, marginTop: 1 }}>
                                            {fmt(myVal)} {metric === 'realized' ? 'RE' : 'APD'}
                                        </div>
                                    </div>
                                    {info ? (
                                        <div style={{ textAlign: "right" }}>
                                            <div style={{
                                                fontSize: 15, fontWeight: 900, fontFamily: "Raleway",
                                                color: info.rank <= 3 ? "#FFD700" : info.rank <= 10 ? "#037EF3" : "var(--text-muted)"
                                            }}>
                                                #{info.rank}
                                            </div>
                                            <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700 }}>of {info.total}</div>
                                        </div>
                                    ) : <span style={{ color: "var(--text-muted)", fontSize: 11 }}>—</span>}
                                </motion.div>
                            );
                        })}
                    </div>
                </SectionCard>
            </motion.div>

            {/* ── Waterfall: EP Journey ────────────────────────────────────── */}
            <motion.section variants={item}>
                <SectionCard title="EP Journey — Pipeline Waterfall" subtitle="How many EPs enter and survive each stage of the pipeline" icon={Activity}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24, marginBottom: 24 }}>
                        <div style={{ textAlign: "left" }}>
                            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 4 }}>National Rank</div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                                <span style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)" }}>#{metric === 'realized' ? ranking?.realized : ranking?.approved || '-'}</span>
                                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>/ {ranking?.total || '-'}</span>
                            </div>
                        </div>
                        <div style={{ width: 1, height: 32, background: "var(--border)" }} className="desktop-only" />
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                            {[
                                { label: metric === 'realized' ? 'APD' : 'RE', rank: metric === 'realized' ? ranking?.approved : ranking?.realized },
                                { label: 'APL', rank: ranking?.applicants },
                                { label: 'SU', rank: ranking?.signups },
                            ].map(r => (
                                <div key={r.label}>
                                    <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>{r.label} Rank</div>
                                    <div style={{ fontSize: 14, fontWeight: 800 }}>#{r.rank}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 0, alignItems: "flex-end", height: 180, padding: "0 8px", overflowX: "auto" }} className="hide-scrollbar">
                        {waterfallData.map((stage, i) => {
                            const maxVal = waterfallData[0]?.value || 1;
                            const barH = (stage.value / maxVal) * 140;
                            const pctVal = stage.pct;
                            return (
                                <div key={stage.label} style={{ flex: 1, minWidth: 60, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                                    <div style={{ fontSize: 13, fontWeight: 900, color: stage.color, fontFamily: "Raleway" }}>{fmt(stage.value)}</div>
                                    <div style={{ display: "flex", alignItems: "flex-end", height: 140, width: "80%", maxWidth: 60, position: "relative" }}>
                                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "100%", background: "var(--border-muted)", borderRadius: "4px 4px 0 0" }} />
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: barH }}
                                            transition={{ duration: 0.8, delay: i * 0.1 }}
                                            style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: stage.color, borderRadius: "4px 4px 0 0" }}
                                        />
                                    </div>
                                    <div style={{ fontSize: 9, fontWeight: 900, color: "var(--text-muted)", textAlign: "center" }}>{stage.label}</div>
                                    <div style={{ fontSize: 9, fontWeight: 800, color: pctVal === 100 ? "var(--text-muted)" : pctVal >= 50 ? "#00C16E" : pctVal >= 25 ? "#F48924" : "#F85A40" }}>{pctVal.toFixed(0)}%</div>
                                </div>
                            );
                        })}
                    </div>
                </SectionCard>
            </motion.section>

            {/* ── Peer Context ─────────────────────────────────────────── */}
            {
                peers.length > 0 && (
                    <motion.section variants={item}>
                        <SectionCard title="National Ranking Context" subtitle={`Your position among neighbouring LCs by ${metric === 'realized' ? 'realization' : 'approval'}`} icon={Globe}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                                {peers.map((peer: any) => {
                                    const conv = pct(peer.displayVal, peer.displayApps || 1);
                                    const maxVal = Math.max(...peers.map((p: any) => p.displayVal), 1);
                                    return (
                                        <Link key={peer.id} href={`/lc/${peer.id}`} style={{ textDecoration: "none" }}>
                                            <motion.div 
                                                whileHover={{ x: 6, background: "var(--bg-app)" }}
                                                style={{
                                                    display: "flex", alignItems: "center", gap: 16, padding: "14px 16px",
                                                    background: peer.isMe ? "var(--accent-soft)" : "transparent",
                                                    borderRadius: 10, border: peer.isMe ? "1px solid var(--accent)" : "1px solid transparent",
                                                    marginBottom: 6, transition: "background 0.2s", cursor: "pointer"
                                                }}
                                            >
                                                <div style={{
                                                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                                    background: peer.rank === 1 ? "#FFD700" : peer.rank === 2 ? "#E5E4E2" : peer.rank === 3 ? "#CD7F32" : "var(--border)",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    fontWeight: 900, fontSize: 13,
                                                    color: peer.rank <= 2 ? (peer.rank === 1 ? "#8B6900" : "#52565E") : "var(--text-secondary)"
                                                }}>
                                                    {peer.rank}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: peer.isMe ? 900 : 700, fontSize: 14, color: peer.isMe ? "var(--accent)" : "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 8 }}>
                                                        {peer.name}
                                                        {peer.isMe && <span style={{ fontSize: 10, fontWeight: 900, background: "var(--accent)", color: "white", padding: "1px 6px", borderRadius: 4 }}>YOU</span>}
                                                    </div>
                                                    <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, marginTop: 1 }}>{peer.region}</div>
                                                </div>
                                                <div style={{ flex: 1, maxWidth: 120 }}>
                                                    <div style={{ height: 6, background: "var(--border-muted)", borderRadius: 4, overflow: "hidden" }}>
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${(peer.displayVal / maxVal) * 100}%` }}
                                                            transition={{ duration: 0.7 }}
                                                            style={{ height: "100%", background: peer.isMe ? "var(--accent)" : "#037EF3", borderRadius: 4 }}
                                                        />
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: "right", minWidth: 60 }}>
                                                    <div style={{ fontWeight: 900, fontSize: 16, fontFamily: "Raleway", color: peer.isMe ? "var(--accent)" : "#00C16E" }}>{fmt(peer.displayVal)}</div>
                                                    <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700 }}>{metric === 'realized' ? 'RE' : 'APD'} · {conv}%</div>
                                                </div>
                                            </motion.div>
                                        </Link>
                                    );
                                })}
                            </div>
                            <div style={{ marginTop: 16, textAlign: "right" }}>
                                <Link href="/lc" style={{ fontSize: 12, fontWeight: 800, color: "var(--accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                                    View full leaderboard <ChevronRight size={14} />
                                </Link>
                            </div>
                        </SectionCard>
                    </motion.section>
                )
            }

        </motion.div >
    );
}

export default function LCDetailPage() {
    return (
        <Suspense fallback={<LoadingScreen label="Accessing LC Neural Core..." />}>
            <LCDetailPageContent />
        </Suspense>
    );
}
