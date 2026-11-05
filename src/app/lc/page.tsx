"use client";
import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    Trophy, Activity, Users,
    Search, ArrowUpDown, Target, Zap,
    CheckCircle2, Star,
    FileText, Info, ArrowUpRight, TrendingUp,
    Globe, BarChart3, Award, TrendingDown
} from "lucide-react";
import { TermSelector } from "@/components/TermSelector";
import {
    BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import { motion } from "framer-motion";
import { SectionCard, LoadingScreen, tooltipStyle } from "@/components/DashboardUI";
import { PRODUCTS, PRODUCT_COLORS, STAGE_CONFIG, REGION_COLORS, fmt, pct } from "@/lib/constants";

const COL_WIDTHS = {
    rank: 60,
    name: 240,
    signups: 100,
    product: 65,
    total: 110
};

function LCTermStatsContent() {
    const searchParams = useSearchParams();
    const mcId = searchParams.get("mcId") || "1585";

    const now = new Date();
    const currentYear = now.getFullYear();
    const isAfterFeb = now.getMonth() >= 1;
    const termStartYear = isAfterFeb ? currentYear : currentYear - 1;

    const [from, setFrom] = useState(`${termStartYear}-02-01`);
    const [to, setTo] = useState(`${termStartYear + 1}-01-31`);
    const [metric, setMetric] = useState<'realized' | 'approved'>('approved');
    const [selectedProduct, setSelectedProduct] = useState<string>("Total");
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc', type?: string }>({ key: 'realized', direction: 'desc' });

    useEffect(() => {
        setSortConfig(prev => ({ ...prev, key: metric }));
    }, [metric]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/dashboard?from=${from}&to=${to}&level=mc&mcId=${mcId}`);
            const d = await res.json();
            setData(d);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const handleSort = (key: string, type?: string) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig.key === key && sortConfig.type === type && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction, type });
    };

    useEffect(() => {
        fetchData();
    }, [from, to, mcId]);

    const processedLCs = useMemo(() => {
        let lcsList = (data?.LOCAL_COMMITTEES || []).filter((lc: any) =>
            lc.name.toLowerCase().includes(search.toLowerCase())
        );

        return lcsList.sort((a: any, b: any) => {
            let valA, valB;
            if (sortConfig.type) {
                valA = a.products?.[sortConfig.type]?.[sortConfig.key] || 0;
                valB = b.products?.[sortConfig.type]?.[sortConfig.key] || 0;
            } else {
                if (selectedProduct !== "Total" && (sortConfig.key === "realized" || sortConfig.key === "approved")) {
                    const pKey = sortConfig.key === "realized" ? "re" : "appr";
                    valA = a.products?.[selectedProduct]?.[pKey] || 0;
                    valB = b.products?.[selectedProduct]?.[pKey] || 0;
                } else {
                    valA = a[sortConfig.key] || 0;
                    valB = b[sortConfig.key] || 0;
                }
            }

            if (valA === valB) return 0;
            if (typeof valA === 'string') {
                return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        });
    }, [data, search, sortConfig, selectedProduct]);

    const maxValues = useMemo(() => {
        if (!data?.LOCAL_COMMITTEES) return {};
        const maxes: any = {};
        ['app', 'acc', 'appr', 're', 'fin', 'comp'].forEach(k => {
            maxes[k] = Math.max(...(data.LOCAL_COMMITTEES || []).map((lc: any) =>
                Math.max(...PRODUCTS.map(p => lc.products?.[p]?.[k] || 0))
            ), 1);
        });
        return maxes;
    }, [data]);


    const SortIcon = ({ sortKey, type }: { sortKey: string, type?: string }) => {
        const isActive = sortConfig.key === sortKey && sortConfig.type === type;
        return <ArrowUpDown size={10} style={{ marginLeft: 4, opacity: isActive ? 1 : 0.2, color: isActive ? 'var(--text-primary)' : 'inherit' }} />;
    };

    const getHeatmapColor = (val: number, max: number, rgb: { r: number, g: number, b: number }) => {
        if (val === 0) return 'transparent';
        const opacity = Math.min(Math.max((val / max) * 0.4, 0.05), 0.4);
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    };

    const regionSummary = useMemo(() => {
        const map: Record<string, { val: number; app: number; lcs: number }> = {};
        const mKey = metric === 'realized' ? 'realized' : 'approved';
        const pKey = metric === 'realized' ? 're' : 'appr';

        (data?.LOCAL_COMMITTEES || []).forEach((lc: any) => {
            const r = lc.region || 'Other';
            if (!map[r]) map[r] = { val: 0, app: 0, lcs: 0 };
            if (selectedProduct === "Total") {
                map[r].val += lc[mKey] ?? 0;
                map[r].app += lc.applications ?? 0;
            } else {
                map[r].val += lc.products?.[selectedProduct]?.[pKey] ?? 0;
                map[r].app += lc.products?.[selectedProduct]?.app ?? 0;
            }
            map[r].lcs += 1;
        });
        return Object.entries(map).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.val - a.val);
    }, [data, metric, selectedProduct]);

    const topConverters = useMemo(() => {
        const mKey = metric === 'realized' ? 'realized' : 'approved';
        const pKey = metric === 'realized' ? 're' : 'appr';

        return [...(data?.LOCAL_COMMITTEES || [])]
            .filter((lc: any) => {
                const apps = selectedProduct === "Total" ? lc.applications : (lc.products?.[selectedProduct]?.app ?? 0);
                return apps >= 3;
            })
            .sort((a: any, b: any) => {
                let ca, cb;
                if (selectedProduct === "Total") {
                    ca = a.applications > 0 ? (a[mKey] / a.applications) : 0;
                    cb = b.applications > 0 ? (b[mKey] / b.applications) : 0;
                } else {
                    ca = (a.products?.[selectedProduct]?.app > 0) ? (a.products?.[selectedProduct]?.[pKey] / a.products?.[selectedProduct]?.app) : 0;
                    cb = (b.products?.[selectedProduct]?.app > 0) ? (b.products?.[selectedProduct]?.[pKey] / b.products?.[selectedProduct]?.app) : 0;
                }
                return cb - ca;
            }).slice(0, 5);
    }, [data, metric, selectedProduct]);

    const productReachData = useMemo(() => {
        const mKey = metric === 'realized' ? 're' : 'appr';
        const mKeyLC = metric === 'realized' ? 'realized' : 'approved';
        return [...(data?.LOCAL_COMMITTEES || [])]
            .map((lc: any) => {
                const val = selectedProduct === "Total" ? lc[mKeyLC] : (lc.products?.[selectedProduct]?.[mKey] ?? 0);
                return {
                    name: lc.name,
                    id: lc.id,
                    breadth: PRODUCTS.filter(p => (lc.products?.[p]?.[mKey] ?? 0) > 0).length,
                    val: val
                };
            })
            .sort((a, b) => selectedProduct === "Total" ? (b.breadth - a.breadth || b.val - a.val) : (b.val - a.val || b.breadth - a.breadth))
            .slice(0, 8);
    }, [data, metric, selectedProduct]);

    if (loading && !data) return <LoadingScreen label="Accessing LC Neural Core…" />;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, padding: '20px 0 60px' }}>

            {/* ── Header Section ─────────────────────────────────────────── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div className="section-header">
                    <div>
                        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                            <div style={{ background: 'var(--aiesec-jade)', color: 'white', padding: '4px 12px', borderRadius: 100, fontSize: 10, fontWeight: 900, letterSpacing: '0.1em' }}>NETWORK ANALYTICS</div>
                            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)", padding: "4px 12px", borderRadius: 100, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
                                <Globe size={12} />
                                {data?.LOCAL_COMMITTEES?.length || 0} ACTIVE ENTITIES
                            </div>
                        </div>
                        <h1 className="section-title" style={{ fontSize: 40, fontWeight: 900, lineHeight: 1 }}>LC <span style={{ color: 'var(--accent)' }}>Command</span> Center</h1>
                        <p className="section-subtitle" style={{ fontSize: 16, marginTop: 8 }}>Tactical oversight of Local Committee operational performance</p>
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
                    <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, width: '100%' }}>
                        <div style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
                            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Find an entity..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{
                                    padding: '10px 16px 10px 42px',
                                    background: 'var(--bg-app)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 10,
                                    fontSize: 13,
                                    fontWeight: 700,
                                    width: '100%',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                }}
                            />
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                            <div className="filter-group">
                                <span style={{ fontSize: 9, fontWeight: 900, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", paddingLeft: 4 }}>Focus Product</span>
                                <div className="filter-options">
                                    {["Total", ...PRODUCTS].map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setSelectedProduct(p)}
                                            style={{
                                                padding: "6px 12px", borderRadius: 7, border: "none", fontSize: 10, fontWeight: 900, cursor: "pointer",
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
                                <span style={{ fontSize: 9, fontWeight: 900, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", paddingLeft: 4 }}>Rank by</span>
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
                    </div>

                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }} className="mobile-only-flex">
                        <div style={{ color: "var(--accent)", fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>
                            Sorted by: {sortConfig.key} {sortConfig.type ? `(${sortConfig.type})` : ""}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Region Summary Strip ─────────────────────────────────── */}
            {regionSummary.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 14 }}>
                    {regionSummary.map((r) => {
                        const color = REGION_COLORS[r.name] || '#037EF3';
                        return (
                            <motion.div key={r.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className="card" style={{ padding: '16px 18px', borderTop: `3px solid ${color}` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                                    <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{r.name}</span>
                                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, marginLeft: 'auto' }}>{r.lcs} LCs</span>
                                </div>
                                <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'Raleway', color, lineHeight: 1 }}>{r.val.toLocaleString()}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, marginTop: 4 }}>{selectedProduct} {metric === 'realized' ? 'Realizations' : 'Approvals'}</div>
                                <div style={{ marginTop: 8, height: 4, background: 'var(--border-muted)', borderRadius: 4, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', background: color, borderRadius: 4, width: `${r.app > 0 ? Math.min(100, (r.val / r.app) * 100) : 0}%`, transition: 'width 0.8s ease' }} />
                                </div>
                                <div style={{ fontSize: 10, color: color, fontWeight: 800, marginTop: 4 }}>{r.app > 0 ? ((r.val / r.app) * 100).toFixed(1) : '0.0'}% conv</div>
                            </motion.div>
                        );
                    })}
                </div>
            )}


            <div className="card" style={{ padding: 0, overflow: 'hidden', border: 'none', background: 'transparent' }}>
                <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 200px)', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }} className="hide-scrollbar no-sticky-mobile">
                    <table className="pro-table" style={{ minWidth: 2800, borderSpacing: 0, borderCollapse: 'separate' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-card)', position: 'sticky', top: 0, zIndex: 100 }}>
                                <th rowSpan={2} style={{
                                    width: COL_WIDTHS.rank,
                                    textAlign: 'center',
                                    position: 'sticky',
                                    left: 0,
                                    top: 0,
                                    zIndex: 110,
                                    background: 'var(--bg-card)',
                                    borderRight: '1px solid var(--border)',
                                    borderBottom: '2px solid var(--border)',
                                    fontSize: 10,
                                    color: 'var(--text-muted)',
                                    height: 92
                                }}>RANK</th>
                                <th rowSpan={2} onClick={() => handleSort('name')} style={{
                                    minWidth: COL_WIDTHS.name,
                                    cursor: 'pointer',
                                    position: 'sticky',
                                    left: COL_WIDTHS.rank,
                                    top: 0,
                                    zIndex: 110,
                                    background: 'var(--bg-card)',
                                    borderRight: '2px solid var(--border)',
                                    borderBottom: '2px solid var(--border)',
                                    paddingLeft: 24,
                                    height: 92
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        LOCAL COMMITTEE <SortIcon sortKey="name" />
                                    </div>
                                </th>
                                <th rowSpan={2} onClick={() => handleSort('signups')} style={{
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    borderRight: '2px solid var(--border)',
                                    background: 'var(--bg-card)',
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 100,
                                    borderBottom: '2px solid var(--border)',
                                    color: STAGE_CONFIG.signups.color,
                                    padding: '0 20px',
                                    height: 92
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                        <Users size={14} />
                                        <span style={{ fontSize: 10 }}>SIGNUPS</span>
                                        <SortIcon sortKey="signups" />
                                    </div>
                                </th>

                                {Object.entries(STAGE_CONFIG).slice(1).map(([key, config]) => (
                                    <th key={key} colSpan={7} onClick={() => handleSort(key === 'applicants' ? 'applications' : key)}
                                        style={{
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            borderBottom: '1px solid var(--border)',
                                            borderRight: '2px solid var(--border)',
                                            background: `rgba(${config.r}, ${config.g}, ${config.b}, 0.05)`,
                                            color: config.color,
                                            position: 'sticky',
                                            top: 0,
                                            zIndex: 90,
                                            padding: '0 8px',
                                            height: 52
                                        }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                            <span style={{ fontWeight: 900, letterSpacing: '0.05em' }}>{config.label.toUpperCase()}</span>
                                            <SortIcon sortKey={key === 'applicants' ? 'applications' : key} />
                                        </div>
                                    </th>
                                ))}
                            </tr>
                            <tr style={{ background: 'var(--bg-card)' }}>
                                {Object.keys(STAGE_CONFIG).slice(1).map((stage) => (
                                    <React.Fragment key={`sub-${stage}`}>
                                        {PRODUCTS.map((p, idx) => {
                                            const sortK = stage === 'applicants' ? 'app' : stage === 'approved' ? 'appr' : stage === 'realized' ? 're' : stage === 'finished' ? 'fin' : stage === 'completed' ? 'comp' : 'acc';
                                            return (
                                                <th key={`${stage}-${p}`} onClick={() => handleSort(sortK, p)}
                                                    style={{
                                                        fontSize: 9,
                                                        cursor: 'pointer',
                                                        textAlign: 'center',
                                                        padding: '0 4px',
                                                        borderRight: idx === 5 ? '1px solid var(--border-muted)' : 'none',
                                                        fontWeight: 900,
                                                        color: 'var(--text-muted)',
                                                        borderBottom: '2px solid var(--border)',
                                                        textTransform: 'uppercase',
                                                        width: COL_WIDTHS.product,
                                                        position: 'sticky',
                                                        top: 52,
                                                        zIndex: 95,
                                                        background: 'var(--bg-card)',
                                                        height: 40
                                                    }}>
                                                    {p}
                                                </th>
                                            );
                                        })}
                                        <th
                                            onClick={() => {
                                                const totalKey = stage === 'applicants' ? 'applications' : stage;
                                                handleSort(totalKey);
                                            }}
                                            style={{
                                                fontSize: 10,
                                                textAlign: 'center',
                                                padding: '0 8px',
                                                fontWeight: 900,
                                                cursor: 'pointer',
                                                background: 'var(--bg-app)',
                                                borderRight: '2px solid var(--border)',
                                                borderBottom: '2px solid var(--border)',
                                                color: (STAGE_CONFIG as any)[stage].color,
                                                width: COL_WIDTHS.total,
                                                position: 'sticky',
                                                top: 52,
                                                zIndex: 95,
                                                height: 40
                                            }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                                                TOTAL
                                                <SortIcon sortKey={stage === 'applicants' ? 'applications' : stage} />
                                            </div>
                                        </th>
                                    </React.Fragment>
                                ))}
                            </tr>
                            {/* Network Aggregate (Opaque and Sticky at top) */}
                            {data?.LOCAL_COMMITTEES && (
                                <tr style={{ background: 'var(--aiesec-blue)' }}>
                                    <th style={{
                                        textAlign: 'center',
                                        position: 'sticky',
                                        left: 0,
                                        top: 92,
                                        background: 'var(--aiesec-blue)',
                                        color: 'white',
                                        zIndex: 85,
                                        borderRight: '1px solid rgba(255,255,255,0.2)',
                                        height: 48,
                                        fontSize: 10
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'center' }}><Target size={18} /></div>
                                    </th>
                                    <th style={{
                                        position: 'sticky',
                                        left: COL_WIDTHS.rank,
                                        top: 92,
                                        background: 'var(--aiesec-blue)',
                                        color: 'white',
                                        zIndex: 85,
                                        fontWeight: 900,
                                        fontSize: 14,
                                        borderRight: '2px solid rgba(255,255,255,0.2)',
                                        paddingLeft: 24,
                                        height: 48,
                                        textAlign: 'left'
                                    }}>
                                        NETWORK AGGREGATE
                                    </th>
                                    <th className="mono" style={{
                                        textAlign: 'center',
                                        fontWeight: 900,
                                        fontSize: 16,
                                        color: 'white',
                                        borderRight: '2px solid rgba(255,255,255,0.2)',
                                        background: '#043673', // Opaque dark blue
                                        position: 'sticky',
                                        top: 92,
                                        zIndex: 80
                                    }}>
                                        {lcsTotal(data?.LOCAL_COMMITTEES || [], 'signups')?.toLocaleString()}
                                    </th>
                                    {['applicants', 'accepted', 'approved', 'realized', 'finished', 'completed'].map((stage) => {
                                        const totalKey = stage === 'applicants' ? 'applications' : stage;
                                        return (
                                            <React.Fragment key={`agg-${stage}`}>
                                                {PRODUCTS.map(p => {
                                                    const pKey = stage === 'applicants' ? 'app' : stage === 'approved' ? 'appr' : stage === 'realized' ? 're' : stage === 'finished' ? 'fin' : stage === 'completed' ? 'comp' : 'acc';
                                                    const pVal = (data?.LOCAL_COMMITTEES || []).reduce((acc: number, curr: any) => acc + (curr.products?.[p]?.[pKey] || 0), 0);
                                                    return (
                                                        <th key={`agg-${stage}-${p}`} className="mono" style={{
                                                            textAlign: 'center',
                                                            fontWeight: 800,
                                                            fontSize: 13,
                                                            color: 'rgba(255,255,255,0.9)',
                                                            background: '#04428d', // Opaque blue
                                                            position: 'sticky',
                                                            top: 92,
                                                            zIndex: 80
                                                        }}>
                                                            {pVal}
                                                        </th>
                                                    );
                                                })}
                                                <th className="mono" style={{
                                                    textAlign: 'center',
                                                    fontSize: 16,
                                                    fontWeight: 900,
                                                    background: '#022855', // Opaque darker blue
                                                    borderRight: '2px solid rgba(255,255,255,0.2)',
                                                    color: 'white',
                                                    position: 'sticky',
                                                    top: 92,
                                                    zIndex: 80
                                                }}>
                                                    {lcsTotal(data?.LOCAL_COMMITTEES || [], totalKey)?.toLocaleString()}
                                                </th>
                                            </React.Fragment>
                                        );
                                    })}
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {/* Entity Rows */}
                            {processedLCs.map((lcItem: any, i: number) => {
                                const isTop3 = i < 3 && !search;
                                return (
                                    <motion.tr
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        key={lcItem.id}
                                        style={{ transition: 'background 0.2s' }}
                                        className="table-row-premium"
                                    >
                                        <td style={{ textAlign: 'center', position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 10, borderRight: '1px solid var(--border)', fontSize: 12, fontWeight: 900 }}>
                                            {isTop3 ? (
                                                <div style={{
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: 8,
                                                    background: i === 0 ? '#FFD700' : i === 1 ? '#E5E4E2' : '#CD7F32',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: i === 1 ? '#52565E' : 'white',
                                                    margin: '0 auto',
                                                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                                    fontSize: 14
                                                }}>
                                                    {i + 1}
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                                            )}
                                        </td>
                                        <td style={{ position: 'sticky', left: COL_WIDTHS.rank, background: 'var(--bg-card)', zIndex: 10, borderRight: '1px solid var(--border)', fontWeight: 800, fontSize: 15, paddingLeft: 24 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <Link
                                                    href={`/lc/${lcItem.id}?mcId=${mcId}`}
                                                    style={{
                                                        color: 'var(--text-primary)',
                                                        textDecoration: 'none',
                                                        fontWeight: 800,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                        transition: 'color 0.15s',
                                                    }}
                                                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                                                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                                                >
                                                    {lcItem.name}
                                                    <ArrowUpRight size={12} style={{ opacity: 0.4, flexShrink: 0 }} />
                                                </Link>
                                                {isTop3 && <Star size={14} fill="#FFD700" color="#FFD700" style={{ filter: 'drop-shadow(0 2px 4px rgba(255,215,0,0.4))' }} />}
                                            </div>
                                        </td>
                                        <td className="mono" style={{ textAlign: 'center', fontWeight: 900, color: STAGE_CONFIG.signups.color, borderRight: '2px solid var(--border)', background: `rgba(${STAGE_CONFIG.signups.r}, ${STAGE_CONFIG.signups.g}, ${STAGE_CONFIG.signups.b}, 0.03)`, fontSize: 14 }}>
                                            {lcItem.signups?.toLocaleString() || 0}
                                        </td>

                                        {['applicants', 'accepted', 'approved', 'realized', 'finished', 'completed'].map((stage) => {
                                            const productKey = stage === 'applicants' ? 'app' : stage === 'approved' ? 'appr' : stage === 'realized' ? 're' : stage === 'finished' ? 'fin' : stage === 'completed' ? 'comp' : 'acc';
                                            const totalKey = stage === 'applicants' ? 'applications' : stage;
                                            const config = (STAGE_CONFIG as any)[stage];

                                            return (
                                                <React.Fragment key={`${lcItem.id}-${stage}`}>
                                                    {PRODUCTS.map(p => {
                                                        const val = lcItem.products?.[p]?.[productKey] || 0;
                                                        return (
                                                            <td key={`${lcItem.id}-${stage}-${p}`} className="mono" style={{
                                                                textAlign: 'center',
                                                                fontSize: 13,
                                                                fontWeight: 700,
                                                                color: val > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                                                                background: getHeatmapColor(val, maxValues[productKey], config),
                                                                opacity: val > 0 ? 1 : 0.15
                                                            }}>
                                                                {val}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="mono" style={{
                                                        textAlign: 'center',
                                                        fontSize: 14,
                                                        fontWeight: 900,
                                                        background: `rgba(${config.r}, ${config.g}, ${config.b}, 0.08)`,
                                                        borderRight: '2px solid var(--border)',
                                                        color: config.color,
                                                        padding: '6px 0'
                                                    }}>
                                                        <div>{lcItem[totalKey]?.toLocaleString() || 0}</div>
                                                    </td>
                                                </React.Fragment>
                                            );
                                        })}
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card" style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Info size={18} color="var(--text-muted)" />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Performance heatmap intensity relative to highest product volume per stage.</span>
                </div>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--aiesec-blue)', opacity: 0.1 }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>LOW VOLUME</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--aiesec-blue)', opacity: 0.4 }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>PEAK PERFORMANCE</span>
                    </div>
                </div>
            </div>

            {/* ── Bottom Analytical Panel ───────────────────────────── */}
            <div className="responsive-grid two-cols">

                {/* Top Converters */}
                <SectionCard title="Top Conversion Efficiency" subtitle={`LCs with highest App → ${metric === 'realized' ? 'Realized' : 'Approved'} rate (min. 3 apps)`} icon={Award} accent="#00C16E">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {topConverters.map((lcItem: any, i: number) => {
                            const mKey = metric === 'realized' ? 'realized' : 'approved';
                            const pKey = metric === 'realized' ? 're' : 'appr';
                            let conv, apps, val;
                            if (selectedProduct === "Total") {
                                apps = lcItem.applications;
                                val = lcItem[mKey];
                            } else {
                                apps = lcItem.products?.[selectedProduct]?.app || 0;
                                val = lcItem.products?.[selectedProduct]?.[pKey] || 0;
                            }
                            conv = apps > 0 ? ((val / apps) * 100).toFixed(1) : '0.0';
                            const color = parseFloat(conv) >= 20 ? '#00C16E' : parseFloat(conv) >= 10 ? '#F48924' : '#F85A40';
                            const medal = i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--border)';
                            return (
                                <div key={lcItem.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', background: i === 0 ? '#00C16E08' : 'var(--bg-app)', borderRadius: 10, border: `1px solid ${i === 0 ? '#00C16E25' : 'var(--border)'}` }}>
                                    <div style={{ width: 26, height: 26, borderRadius: 6, background: medal, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: i < 2 ? (i === 0 ? '#8B6900' : '#52565E') : 'var(--text-secondary)', flexShrink: 0 }}>{i + 1}</div>
                                    <Link href={`/lc/${lcItem.id}?mcId=${mcId}`} style={{ flex: 1, textDecoration: 'none' }}>
                                        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>{lcItem.name}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, marginTop: 1 }}>{apps} apps → {val} {metric === 'realized' ? 'realized' : 'approved'}</div>
                                    </Link>
                                    <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'Raleway', color }}>{conv}%</div>
                                </div>
                            );
                        })}
                    </div>
                </SectionCard>

                {/* Product Breadth Bar */}
                <SectionCard title="Product Reach" subtitle={`Number of products with at least 1 ${metric === 'realized' ? 'realization' : 'approval'} per LC`} icon={BarChart3}>
                    <div style={{ height: 240 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={productReachData} layout="vertical" barSize={12}>
                                <XAxis type="number" domain={[0, 6]} ticks={[0, 1, 2, 3, 4, 5, 6]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--text-muted)' }} label={{ value: 'Products', position: 'insideBottom', offset: -2, fontSize: 10, fill: 'var(--text-muted)', fontWeight: 700 }} />
                                <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: 'var(--text-secondary)' }} />
                                <Tooltip
                                    content={({ payload }: any) => {
                                        if (!payload?.length) return null;
                                        const d = payload[0]?.payload;
                                        return (
                                            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 700 }}>
                                                <div style={{ fontWeight: 900, marginBottom: 2 }}>{d.name}</div>
                                                <div>{d.breadth}/6 products active</div>
                                                <div style={{ color: '#00C16E' }}>{d.val} {metric === 'realized' ? 'realizations' : 'approvals'}</div>
                                            </div>
                                        );
                                    }}
                                />
                                <Bar dataKey="breadth" name="Active Products" radius={[0, 5, 5, 0]}>
                                    {productReachData.map((e, i) => (
                                        <Cell key={i} fill={e.breadth === 6 ? '#00C16E' : e.breadth >= 4 ? '#037EF3' : e.breadth >= 2 ? '#F48924' : '#F85A40'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                        {[{ label: 'Full portfolio (6)', color: '#00C16E' }, { label: '4–5 products', color: '#037EF3' }, { label: '2–3 products', color: '#F48924' }, { label: '1 product', color: '#F85A40' }].map(l => (
                            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>{l.label}</span>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            </div>
        </div>
    );
}

function lcsTotal(lcs: any[], key: string) {
    if (!lcs || !Array.isArray(lcs)) return 0;
    return lcs.reduce((acc, curr) => acc + (curr[key] || 0), 0);
}

export default function LCTermStats() {
    return (
        <Suspense fallback={<LoadingScreen label="Accessing LC Tactical Grid..." />}>
            <LCTermStatsContent />
        </Suspense>
    );
}
