"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell
} from "recharts";
import {
    TrendingUp, Users, Target, Zap, CheckCircle2,
    ChevronDown, ChevronUp, Search, Filter, ArrowRight,
    MapPin, Globe, Award
} from "lucide-react";
import { PRODUCTS, PRODUCT_COLORS, fmt, pct } from "@/lib/constants";
import { LoadingScreen } from "@/components/DashboardUI";

export default function ExchangeOverview() {
    const [activeView, setActiveView] = useState<"iCX" | "oGX">("oGX");
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/dashboard")
            .then(res => res.json())
            .then(d => {
                setData(d);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const currentProgs = activeView === "iCX"
        ? PRODUCTS.filter(p => p.startsWith("i"))
        : PRODUCTS.filter(p => !p.startsWith("i"));

    const summaryCards = data?.NATIONAL_KPIS ? currentProgs.map(p => ({
        id: p,
        title: p,
        kpis: data.NATIONAL_KPIS[p] || [],
        color: PRODUCT_COLORS[p as keyof typeof PRODUCT_COLORS]
    })) : [];

    const lcs = data?.LOCAL_COMMITTEES || [];

    if (loading) return <LoadingScreen label="Initializing dashboard..." />;

    return (
        <div style={{ paddingBottom: 40 }}>
            {/* View Switcher */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
                        Exchange Performance
                    </h1>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Across all {activeView} operations</p>
                </div>
                <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", padding: 4, borderRadius: 12, border: "1px solid var(--border)", width: '100%', maxWidth: 360 }}>
                    <button onClick={() => setActiveView("oGX")}
                        style={{
                            flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer",
                            background: activeView === "oGX" ? "var(--bg-elevated)" : "transparent",
                            color: activeView === "oGX" ? "var(--accent)" : "var(--text-secondary)",
                            boxShadow: activeView === "oGX" ? "0 4px 12px rgba(0,0,0,0.2)" : "none"
                        }}>
                        oGX (Outgoing)
                    </button>
                    <button onClick={() => setActiveView("iCX")}
                        style={{
                            flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer",
                            background: activeView === "iCX" ? "var(--bg-elevated)" : "transparent",
                            color: activeView === "iCX" ? "var(--accent)" : "var(--text-secondary)",
                            boxShadow: activeView === "iCX" ? "0 4px 12px rgba(0,0,0,0.2)" : "none"
                        }}>
                        iCX (Incoming)
                    </button>
                </div>
            </div>

            {/* Programme Cards */}
            <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", marginBottom: 24 }}>
                {summaryCards.map((card, i) => (
                    <motion.div key={card.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                        className="glass-card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                        {(() => {
                            const dKey = card.title.includes("GV") ? "GV" : card.title.includes("GTa") ? "GTa" : "GTe";
                            return (
                                <>
                                    <div style={{ padding: 20 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <div style={{ width: 10, height: 10, borderRadius: 3, background: card.color }} />
                                                <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>{card.title}</span>
                                            </div>
                                            <Link href={`/exchange/${card.title.toLowerCase()}`} className="nav-link" style={{ fontSize: 11, padding: "4px 8px" }}>
                                                View Details <ArrowRight size={12} />
                                            </Link>
                                        </div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                            {card.kpis.slice(0, 4).map((kpi: any) => (
                                                <div key={kpi.label}>
                                                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>{kpi.label}</div>
                                                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>
                                                        {fmt(kpi.value)}{kpi.unit}
                                                    </div>
                                                    <div className="progress-track" style={{ height: 4, marginTop: 4 }}>
                                                        <div className="progress-fill" style={{ width: `${(kpi.value / (kpi.target || 1)) * 100}%`, background: card.color }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ marginTop: "auto", height: 80, background: `linear-gradient(180deg, transparent 0%, ${card.color}08 100%)`, borderTop: "1px solid rgba(255,255,255,0.03)", padding: "0 10px", display: "flex", alignItems: "flex-end", width: '100%', minWidth: 0 }}>
                                        <ResponsiveContainer width="100%" height={60} minWidth={0}>
                                            <BarChart data={data.TIME_SERIES}>
                                                <Bar dataKey={dKey} fill={card.color} radius={[3, 3, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </>
                            );
                        })()}
                    </motion.div>
                ))}
            </div>

            {/* Performance Matrix */}
            <div className="glass-card" style={{ padding: 0 }}>
                <div style={{ padding: 20, borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>Performance Matrix</div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Entity-wise engagement breakdown</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", width: '100%', maxWidth: 500 }}>
                        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                            <input type="text" placeholder="Search LC..." style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px 6px 32px", fontSize: 13, color: "var(--text-primary)", width: '100%' }} />
                        </div>
                        <button style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", fontSize: 13, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
                            <Filter size={14} /> Filter
                        </button>
                    </div>
                </div>
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ paddingLeft: 20 }}>Local Committee</th>
                                <th>Region</th>
                                <th>Applications</th>
                                <th>Approved</th>
                                <th>Realized</th>
                                <th>Completed</th>
                                <th>Growth</th>
                                <th style={{ textAlign: "right", paddingRight: 20 }}>Performance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lcs.map((lc: any) => (
                                <tr key={lc.id}>
                                    <td style={{ paddingLeft: 20 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>
                                                {(lc.city || lc.name).substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 700 }}>{lc.name}</div>
                                                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{lc.city}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: 11, background: "rgba(255,255,255,0.04)", padding: "2px 8px", borderRadius: 4, color: "var(--text-secondary)" }}>{lc.region}</span>
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{fmt(lc.applications)}</td>
                                    <td>{fmt(lc.approved)}</td>
                                    <td style={{ color: "var(--accent)", fontWeight: 700 }}>{fmt(lc.realized)}</td>
                                    <td>{fmt(lc.completed)}</td>
                                    <td><span style={{ color: "#10B981", fontSize: 12 }}>+12%↑</span></td>
                                    <td style={{ textAlign: "right", paddingRight: 20 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                                            <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.03)", borderRadius: 2 }}>
                                                <div style={{ height: "100%", width: `${Math.min(100, (lc.realized / 200) * 100)}%`, background: "var(--accent)", borderRadius: 2 }} />
                                            </div>
                                            <span style={{ fontSize: 12, fontWeight: 700 }}>{((lc.realized / 200) * 100).toFixed(0)}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
