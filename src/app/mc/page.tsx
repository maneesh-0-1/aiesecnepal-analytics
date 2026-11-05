"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
    Zap, Users, Target, Activity,
    CheckCircle2, Trophy, FileText,
    BarChart3, Globe, Award, Layers, AlertTriangle,
    Flag
} from "lucide-react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, PieChart as RePie, Pie, Legend
} from "recharts";
import { TermSelector } from "@/components/TermSelector";
import { motion, AnimatePresence } from "framer-motion";
import { KpiCard, SectionCard, LoadingScreen, tooltipStyle } from "@/components/DashboardUI";
import { PRODUCTS, PRODUCT_COLORS, STAGE_KEYS, STAGE_COLORS, REGION_COLORS, fmt, pct } from "@/lib/constants";

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

function MCTermStatsContent() {
    const searchParams = useSearchParams();
    const mcId = searchParams.get("mcId") || "1585";

    const now = new Date();
    const isAfterJul = now.getMonth() >= 7;
    const startYear = isAfterJul ? now.getFullYear() : now.getFullYear() - 1;

    const [from, setFrom] = useState(`${startYear}-08-01`);
    const [to, setTo] = useState(`${startYear + 1}-07-31`);
    const [metric, setMetric] = useState<'applications' | 'accepted' | 'approved' | 'realized' | 'finished' | 'completed'>('approved');
    const [selectedProduct, setSelectedProduct] = useState<string>("Total");
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [mcList, setMcList] = useState<any[]>([]);

    useEffect(() => {
        fetch('/api/mcs').then(res => res.json()).then(data => {
            if (Array.isArray(data)) setMcList(data);
        }).catch(console.error);
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/dashboard?from=${from}&to=${to}&level=mc&mcId=${mcId}`);
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

    const kpis = data?.ENTITY_KPIS ?? {};
    const timeSeries = data?.TIME_SERIES ?? [];
    const lcsRaw = data?.LOCAL_COMMITTEES ?? [];

    const totals = useMemo(() => {
        const prods = selectedProduct === "Total" ? PRODUCTS : [selectedProduct as any];
        return {
            signups: data?.TOTALS?.signups || 0,
            applications: prods.reduce((sum: number, p: string) => sum + (kpis[p]?.[1]?.value || 0), 0),
            accepted: prods.reduce((sum: number, p: string) => sum + (kpis[p]?.[2]?.value || 0), 0),
            approved: prods.reduce((sum: number, p: string) => sum + (kpis[p]?.[3]?.value || 0), 0),
            realized: prods.reduce((sum: number, p: string) => sum + (kpis[p]?.[4]?.value || 0), 0),
            finished: prods.reduce((sum: number, p: string) => sum + (kpis[p]?.[5]?.value || 0), 0),
            completed: prods.reduce((sum: number, p: string) => sum + (kpis[p]?.[6]?.value || 0), 0),
        };
    }, [data, selectedProduct, kpis]);

    const getMetricLabel = (m: string) => {
        switch (m) {
            case 'applications': return 'Applications';
            case 'accepted': return 'Acceptances';
            case 'approved': return 'Approvals';
            case 'realized': return 'Realizations';
            case 'finished': return 'Finished';
            case 'completed': return 'Completed';
            default: return 'Exchanges';
        }
    };

    const getMetricPrefix = (m: string) => {
        switch (m) {
            case 'applications': return 'app';
            case 'accepted': return 'acc';
            case 'approved': return 'appr';
            case 'realized': return 're';
            case 'finished': return 'fin';
            case 'completed': return 'comp';
            default: return 're';
        }
    };

    const metricPrefix = getMetricPrefix(metric);
    const metricLabel = getMetricLabel(metric);

    const nationalFunnel = useMemo(() => {
        return STAGE_KEYS.map((label, si) => {
            const total = selectedProduct === "Total"
                ? PRODUCTS.reduce((sum, p) => sum + (kpis[p]?.[si + 1]?.value ?? 0), 0)
                : (kpis[selectedProduct]?.[si + 1]?.value ?? 0);
            return { label, value: total, color: STAGE_COLORS[si] };
        });
    }, [kpis, selectedProduct]);

    const conversions = useMemo(() => {
        const f = nationalFunnel;
        return [
            { from: "APL", to: "ACC", rate: pct(f[1]?.value, f[0]?.value), drop: (f[0]?.value ?? 0) - (f[1]?.value ?? 0) },
            { from: "ACC", to: "APD", rate: pct(f[2]?.value, f[1]?.value), drop: (f[1]?.value ?? 0) - (f[2]?.value ?? 0) },
            { from: "APD", to: "RE", rate: pct(f[3]?.value, f[2]?.value), drop: (f[2]?.value ?? 0) - (f[3]?.value ?? 0) },
            { from: "RE", to: "FN", rate: pct(f[4]?.value, f[3]?.value), drop: (f[3]?.value ?? 0) - (f[4]?.value ?? 0) },
            { from: "FN", to: "CO", rate: pct(f[5]?.value, f[4]?.value), drop: (f[4]?.value ?? 0) - (f[5]?.value ?? 0) },
            { from: "APL", to: "RE", rate: pct(f[3]?.value, f[0]?.value), drop: null },
        ];
    }, [nationalFunnel]);

    const bottleneck = useMemo(() => {
        const drops = conversions.slice(0, 5).map((c, i) => ({
            ...c,
            idx: i,
            dropPct: 100 - parseFloat(c.rate),
        }));
        return drops.sort((a, b) => b.dropPct - a.dropPct)[0];
    }, [conversions]);

    const regionData = useMemo(() => {
        const map: Record<string, number> = {};
        lcsRaw.forEach((l: any) => {
            const r = l.region || "Other";
            let val = 0;
            if (selectedProduct === "Total") {
                PRODUCTS.forEach(p => {
                    val += (l.products?.[p]?.[metricPrefix] ?? 0);
                });
            } else {
                val = (l.products?.[selectedProduct]?.[metricPrefix] ?? 0);
            }
            map[r] = (map[r] || 0) + val;
        });
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [metricPrefix, selectedProduct, lcsRaw]);

    const programSplit = useMemo(() => {
        let mIdx = 4;
        if (metric === 'applications') mIdx = 1;
        else if (metric === 'accepted') mIdx = 2;
        else if (metric === 'approved') mIdx = 3;
        else if (metric === 'finished') mIdx = 5;
        else if (metric === 'completed') mIdx = 6;

        let icx = 0;
        let ogx = 0;
        const prods = selectedProduct === "Total" ? PRODUCTS : [selectedProduct as any];

        prods.forEach(p => {
            const val = kpis[p]?.[mIdx]?.value ?? 0;
            if (p.startsWith('i')) icx += val;
            else ogx += val;
        });

        return [
            { name: "iCX (Incoming)", value: icx, color: "var(--aiesec-blue)" },
            { name: "oGX (Outgoing)", value: ogx, color: "var(--aiesec-carrot)" },
        ];
    }, [kpis, selectedProduct, metric]);

    const productPipeline = useMemo(() => {
        const prods = selectedProduct === "Total" ? PRODUCTS : [selectedProduct as any];
        return prods.map(p => ({
            product: p,
            app: kpis[p]?.[1]?.value ?? 0,
            acc: kpis[p]?.[2]?.value ?? 0,
            appr: kpis[p]?.[3]?.value ?? 0,
            re: kpis[p]?.[4]?.value ?? 0,
            fin: kpis[p]?.[5]?.value ?? 0,
            comp: kpis[p]?.[6]?.value ?? 0,
        }));
    }, [kpis, selectedProduct]);

    const currentMcName = useMemo(() => {
        const found = mcList.find(mc => String(mc.id) === mcId);
        if (found) return found.name;
        if (mcId === "1585") return "India";
        return `MC (ID: ${mcId})`;
    }, [mcList, mcId]);

    const getMetricTotal = (m: string) => {
        switch (m) {
            case 'applications': return totals.applications;
            case 'accepted': return totals.accepted;
            case 'approved': return totals.approved;
            case 'realized': return totals.realized;
            case 'finished': return totals.finished;
            case 'completed': return totals.completed;
            default: return totals.realized;
        }
    };

    if (loading && !data) return <LoadingScreen label="Accessing National Term..." />;

    return (
        <motion.div 
            initial="hidden"
            animate="show"
            variants={container}
            style={{ display: "flex", flexDirection: "column", gap: 32, padding: "20px 0 80px" }}
        >

            {/* ── Header Section ─────────────────────────────────────────── */}
            <motion.div variants={item} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div className="section-header">
                    <div>
                        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                            <div style={{ background: "var(--aiesec-blue)", color: "white", padding: "4px 12px", borderRadius: 100, fontSize: 10, fontWeight: 900, letterSpacing: "0.1em" }}>NATIONAL TERM PERFORMANCE</div>
                            {bottleneck && (
                                <div style={{ background: "#fef2f2", color: "#dc2626", padding: "4px 12px", borderRadius: 100, fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", gap: 6, border: "1px solid #fecaca" }}>
                                    <AlertTriangle size={12} />
                                    BOTTLENECK: {bottleneck.from} → {bottleneck.to} ({bottleneck.dropPct.toFixed(0)}% drop)
                                </div>
                            )}
                        </div>
                        <h1 className="section-title" style={{ fontSize: 40, fontWeight: 900, lineHeight: 1 }}>AIESEC in <span style={{ color: "var(--accent)" }}>{currentMcName}</span></h1>
                        <p className="section-subtitle" style={{ fontSize: 16, marginTop: 8 }}>National Entity Strategy & Execution Monitoring</p>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }} className="desktop-only">
                        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Analysis Period</div>
                        <TermSelector from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
                    </div>
                </div>

                <div className="mobile-only" style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Analysis Period</div>
                    <TermSelector from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
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
                            <span style={{ fontSize: 9, fontWeight: 900, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", paddingLeft: 4 }}>Primary Metric</span>
                            <div className="filter-options">
                                {['applications', 'accepted', 'approved', 'realized', 'finished', 'completed'].map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setMetric(m as any)}
                                        style={{
                                            padding: "6px 12px", borderRadius: 7, border: "none", fontSize: 9, fontWeight: 900, cursor: "pointer",
                                            background: metric === m ? "var(--accent)" : "transparent",
                                            color: metric === m ? "white" : "var(--text-muted)",
                                            transition: "all 0.2s",
                                            textTransform: "uppercase"
                                        }}>
                                        {getMetricLabel(m)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--success)", fontSize: 11, fontWeight: 800 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", boxShadow: "0 0 8px var(--success)" }} />
                        LIVE DATA
                    </div>
                </div>
            </motion.div>

            {/* ── KPI Row ─────────────────────────────────────────────────── */}
            <motion.div variants={item}>
                <div className="stats-grid">
                    <KpiCard label="SU" value={fmt(totals.signups)} sub="Registrations" icon={Users} color="var(--text-muted)" delay={0.05} />
                    <KpiCard label="APL" value={fmt(totals.applications)} sub="Applied" icon={FileText} color="var(--aiesec-blue)" delay={0.10} />
                    <KpiCard label="ACC" value={fmt(totals.accepted)} sub="Accepted" icon={CheckCircle2} color="#0CB9C1" delay={0.15} />
                    <KpiCard label="APD" value={fmt(totals.approved)} sub="Approved" icon={Target} color="#F48924" delay={0.20} />
                    <KpiCard label="RE" value={fmt(totals.realized)} sub="Realized" icon={Zap} color="var(--aiesec-jade)" delay={0.25} />
                    <KpiCard label="FN" value={fmt(totals.finished)} sub="Finished" icon={Flag} color="#E84C3D" delay={0.30} />
                    <KpiCard label="CO" value={fmt(totals.completed)} sub="Completed" icon={Award} color="#7B52CC" delay={0.35} />
                </div>
            </motion.div>

            {/* ── Main Performance Grid ───────────────────────────────────── */}
            <motion.div variants={item} className="responsive-grid two-cols">
                {/* 1. Time Series */}
                <SectionCard title={`${selectedProduct === "Total" ? "Overall" : selectedProduct} ${metricLabel} Trendline`} subtitle={`Monthly exchange ${metricLabel.toLowerCase()}`} icon={Activity}>
                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timeSeries}>
                                <defs>
                                    {["GV", "GTa", "GTe"].map((k, i) => (
                                        <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={STAGE_COLORS[i]} stopOpacity={0.18} />
                                            <stop offset="95%" stopColor={STAGE_COLORS[i]} stopOpacity={0} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-muted)" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "var(--text-muted)" }} dy={8} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "var(--text-muted)" }} />
                                <Tooltip {...tooltipStyle} />
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 800 }} />
                                {(selectedProduct === "Total" || selectedProduct.endsWith("GV")) && (
                                    <Area type="monotone" dataKey={(v: any) => (v[`${metricPrefix}_iGV`] || 0) + (v[`${metricPrefix}_oGV`] || 0)} name="iGV / oGV" stroke={STAGE_COLORS[0]} fill={`url(#grad-GV)`} strokeWidth={2.5} />
                                )}
                                {(selectedProduct === "Total" || selectedProduct.endsWith("GTa")) && (
                                    <Area type="monotone" dataKey={(v: any) => (v[`${metricPrefix}_iGTa`] || 0) + (v[`${metricPrefix}_oGTa`] || 0)} name="iGTa / oGTa" stroke={STAGE_COLORS[1]} fill={`url(#grad-GTa)`} strokeWidth={2.5} />
                                )}
                                {(selectedProduct === "Total" || selectedProduct.endsWith("GTe")) && (
                                    <Area type="monotone" dataKey={(v: any) => (v[`${metricPrefix}_iGTe`] || 0) + (v[`${metricPrefix}_oGTe`] || 0)} name="iGTe / oGTe" stroke={STAGE_COLORS[2]} fill={`url(#grad-GTe)`} strokeWidth={2.5} />
                                )}
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </SectionCard>

                {/* 2. iCX vs oGX Split */}
                <SectionCard title="Programme Split" subtitle={`Incoming vs Outgoing ${metricLabel.toLowerCase()}`} icon={Layers}>
                    <div style={{ height: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <RePie>
                                <Pie data={programSplit} innerRadius={55} outerRadius={82} paddingAngle={6} dataKey="value" label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`} labelLine={false}>
                                    {programSplit.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip {...tooltipStyle} />
                            </RePie>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 12 }}>
                        {programSplit.map(s => (
                            <div key={s.name} style={{ flex: "1 1 120px", padding: 12, background: "var(--bg-app)", borderRadius: 10, border: "1px solid var(--border)" }}>
                                <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, marginBottom: 6 }} />
                                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-secondary)" }}>{s.name}</div>
                                <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "Raleway", color: "var(--text-primary)" }}>{fmt(s.value)}</div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            </motion.div>

            {/* ── Funnel + Leakage + Region ────────────────────────────────── */}
            <motion.div variants={item} className="responsive-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}>

                {/* 3. Pipeline Funnel */}
                <SectionCard title="National Pipeline" subtitle="Stage-by-stage momentum across products" icon={Target}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
                        {nationalFunnel.map((stage, i) => {
                            const maxVal = nationalFunnel[0]?.value || 1;
                            const convFromPrev = i > 0 ? parseFloat(pct(stage.value, nationalFunnel[i - 1]?.value)) : 100;
                            return (
                                <div key={stage.label}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                                        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-primary)" }}>{stage.label}</span>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            {i > 0 && (
                                                <span style={{ fontSize: 10, fontWeight: 900, color: convFromPrev >= 60 ? "#00C16E" : convFromPrev >= 30 ? "#F48924" : "#F85A40", background: convFromPrev >= 60 ? "#00C16E15" : convFromPrev >= 30 ? "#F4892415" : "#F85A4015", padding: "2px 6px", borderRadius: 4 }}>
                                                    {convFromPrev}%
                                                </span>
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
                <SectionCard title="Conversion Analysis" subtitle="Stage transition efficiency metrics" icon={BarChart3}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                        {conversions.map((c, i) => {
                            const rate = parseFloat(c.rate);
                            const isOverall = i === conversions.length - 1;
                            const color = isOverall ? "var(--accent)" : rate >= 70 ? "var(--aiesec-jade)" : rate >= 40 ? "var(--aiesec-sun)" : "var(--aiesec-orange)";
                            return (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: isOverall ? "var(--accent-soft)" : "var(--bg-app)", borderRadius: 10, border: `1px solid ${isOverall ? "var(--accent)" : "var(--border)"}` }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 10, fontWeight: 800, color: isOverall ? "var(--accent)" : "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.from} → {c.to}</div>
                                        {c.drop !== null && c.drop !== undefined && (
                                            <div style={{ fontSize: 10, color: "#F85A40", marginTop: 1, fontWeight: 700 }}>−{fmt(c.drop)} EPs lost</div>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 18, fontWeight: 900, fontFamily: "Raleway", color }}>{c.rate}%</div>
                                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                                </div>
                            );
                        })}
                    </div>
                </SectionCard>

                {/* 5. Regional Breakdown */}
                <SectionCard title={`Regional ${metricLabel}`} subtitle={`${metricLabel} by geography`} icon={Globe}>
                    {regionData.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
                            {regionData.map((r, i) => {
                                const maxVal = regionData[0]?.value || 1;
                                const rColor = REGION_COLORS[r.name as keyof typeof REGION_COLORS] || STAGE_COLORS[i % STAGE_COLORS.length];
                                return (
                                    <div key={r.name}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <div style={{ width: 8, height: 8, borderRadius: 2, background: rColor }} />
                                                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-primary)" }}>{r.name}</span>
                                            </div>
                                            <span style={{ fontSize: 13, fontWeight: 900, color: rColor, fontFamily: "Raleway" }}>{fmt(r.value)}</span>
                                        </div>
                                        <div style={{ height: 7, background: "var(--border-muted)", borderRadius: 8, overflow: "hidden" }}>
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(r.value / maxVal) * 100}%` }}
                                                transition={{ duration: 0.9, delay: i * 0.1 }}
                                                style={{ height: "100%", background: rColor, borderRadius: 8 }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>No regional data available</div>
                    )}
                </SectionCard>
            </motion.div>

            {/* ── Product Performance Matrix ────────────────────────────── */}
            <motion.section variants={item}>
                <SectionCard title="Product Performance Matrix" subtitle="Detailed pipeline view by programme" icon={Trophy}>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: "left", padding: "12px 16px", borderBottom: "2px solid var(--border)", fontSize: 10, fontWeight: 900, color: "var(--text-muted)", textTransform: "uppercase" }}>Product</th>
                                    {STAGE_KEYS.map((s, i) => (
                                        <th key={s} style={{ textAlign: "center", padding: "12px 8px", borderBottom: "2px solid var(--border)", fontSize: 10, fontWeight: 900, color: STAGE_COLORS[i], textTransform: "uppercase" }}>{s}</th>
                                    ))}
                                    <th style={{ textAlign: "center", padding: "12px 8px", borderBottom: "2px solid var(--border)", fontSize: 10, fontWeight: 900, color: "var(--text-muted)", textTransform: "uppercase" }}>Conv. %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productPipeline.map((row) => {
                                    const conv = pct(metric === 'realized' ? row.re : row.appr, row.app);
                                    const convColor = parseFloat(conv) >= 20 ? "#00C16E" : parseFloat(conv) >= 10 ? "#F48924" : "#F85A40";
                                    return (
                                        <tr key={row.product} className="table-row-premium">
                                            <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
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
                                    <td style={{ padding: "16px 16px", fontWeight: 900, fontSize: 13, color: "var(--text-secondary)" }}>TOTAL NATIONAL</td>
                                    {[
                                        productPipeline.reduce((s, r) => s + r.app, 0),
                                        productPipeline.reduce((s, r) => s + r.acc, 0),
                                        productPipeline.reduce((s, r) => s + r.appr, 0),
                                        productPipeline.reduce((s, r) => s + r.re, 0),
                                        productPipeline.reduce((s, r) => s + r.fin, 0),
                                        productPipeline.reduce((s, r) => s + r.comp, 0),
                                    ].map((val, i) => (
                                        <td key={i} style={{ textAlign: "center", padding: "16px 8px", fontFamily: "monospace", fontSize: 15, fontWeight: 900, color: STAGE_COLORS[i] }}>
                                            {fmt(val)}
                                        </td>
                                    ))}
                                    <td style={{ textAlign: "center", padding: "12px 8px", fontFamily: "monospace", fontSize: 14, fontWeight: 900, color: "var(--accent)" }}>
                                        {pct(getMetricTotal(metric), totals.applications)}%
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            </motion.section>

        </motion.div>
    );
}

export default function MCTermStats() {
    return (
        <Suspense fallback={<LoadingScreen label="Accessing National Performance Center..." />}>
            <MCTermStatsContent />
        </Suspense>
    );
}
