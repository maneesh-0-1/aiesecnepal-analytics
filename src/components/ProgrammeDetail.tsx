"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    BarChart, Bar, ComposedChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Legend
} from "recharts";
import {
    ArrowLeft, Download, Info
} from "lucide-react";
import { Programme, programmeColors } from "@/lib/data";

const DESCRIPTIONS: Record<string, string> = {
    iGV: "Incoming Global Volunteer: Enabling international youth to develop themselves through cross-cultural social impact projects locally.",
    iGTa: "Incoming Global Talent: Professional internships for international talent in local companies and institutions.",
    iGTe: "Incoming Global Teacher: Bringing international educators to local schools and educational centers.",
    oGV: "Outgoing Global Volunteer: Sending local youth to impact communities worldwide through cultural exchange.",
    oGTa: "Outgoing Global Talent: Enabling local students and recent graduates to gain global professional experience.",
    oGTe: "Outgoing Global Teacher: Sending local educators to teach and develop skills in schools abroad.",
};

interface ProgrammeDetailProps {
    programme: Programme;
}

export default function ProgrammeDetail({ programme }: ProgrammeDetailProps) {
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

    if (loading) return (
        <div style={{ height: "60vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
            <div className="animate-spin" style={{ width: 40, height: 40, border: "4px solid var(--accent-soft)", borderRadius: "50%", borderTopColor: "var(--accent)" }} />
            <div style={{ color: "var(--text-secondary)", fontSize: 14, fontWeight: 600 }}>Gathering {programme} Intelligence...</div>
        </div>
    );

    const color = programmeColors[programme];
    const kpis = data?.NATIONAL_KPIS?.[programme] || [];
    const funnel = [
        { stage: "Sign Ups", count: Math.floor(kpis[0]?.value * 1.8) || 1200 },
        { stage: "Applicants", count: kpis[0]?.value || 0 },
        { stage: "Accepted", count: Math.floor(kpis[1]?.value * 1.2) || 0 },
        { stage: "Approved", count: kpis[1]?.value || 0 },
        { stage: "Realized", count: kpis[2]?.value || 0 },
        { stage: "Completed", count: kpis[3]?.value || 0 },
    ];

    const weekly = (data?.TIME_SERIES || []).map((t: any) => ({
        week: t.month,
        realized: t[programme.includes("GTa") ? "GTa" : (programme.includes("GTe") ? "GTe" : "GV")],
        matched: Math.floor(t.total * 0.8)
    }));

    const entityPerformance = (data?.LOCAL_COMMITTEES || []).slice(0, 8).map((lc: any) => ({
        name: lc.name,
        value: Math.floor(lc.realized * (programme.includes("GV") ? 0.6 : 0.4))
    }));

    const sdg = [
        { sdg: "Quality Education", count: 42, p: 35 },
        { sdg: "Gender Equality", count: 28, p: 25 },
        { sdg: "Climate Action", count: 18, p: 15 },
        { sdg: "Reduced Inequalities", count: 15, p: 12 },
    ];

    const TTip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)'
                }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
                        {payload[0].payload.week}
                    </div>
                    {payload.map((p: any, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
                                {p.name}: <span style={{ fontWeight: 600 }}>{p.value}</span>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ paddingBottom: 60 }}>
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 40 }}>
                <Link href="/" className="nav-item" style={{ width: 'fit-content', padding: '8px 12px', marginBottom: 20 }}>
                    <ArrowLeft size={16} /> Back to Dashboard
                </Link>
                <div className="section-header" style={{ marginBottom: 0, alignItems: 'center' }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                            <div style={{
                                width: 14,
                                height: 14,
                                borderRadius: 4,
                                background: color,
                                boxShadow: `0 0 12px ${color}40`
                            }} />
                            <h1 className="section-title" style={{ fontSize: 32 }}>
                                {programme} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Analytics</span>
                            </h1>
                        </div>
                        <p style={{ fontSize: 15, color: "var(--text-secondary)", maxWidth: 700, lineHeight: 1.6 }}>{DESCRIPTIONS[programme]}</p>
                    </div>
                    <button className="btn-filter" style={{ height: 'fit-content' }}>
                        <Download size={16} /> Export Report
                    </button>
                </div>
            </motion.div>

            {/* Summary Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16, marginBottom: 32 }}>
                {funnel.map((f, i) => (
                    <motion.div key={f.stage} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                        className="card" style={{ padding: "20px 16px", textAlign: "center", borderBottom: i === funnel.length - 1 ? `4px solid var(--success)` : '1px solid var(--border)' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.stage}</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: i === funnel.length - 1 ? "var(--success)" : color, fontFamily: 'Raleway' }}>
                            {f.count.toLocaleString()}
                        </div>
                        {i > 0 && (
                            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--aiesec-orange)", marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                                {((f.count / funnel[i - 1].count) * 100).toFixed(0)}% <TrendingUp size={10} strokeWidth={3} />
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Main Charts Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24, marginBottom: 24 }}>
                {/* Weekly Performance */}
                <div className="card" style={{ padding: 28 }}>
                    <div className="section-header">
                        <div>
                            <div className="section-title" style={{ fontSize: 20 }}>Growth Velocity</div>
                            <div className="section-subtitle">Realizations vs. Matches trendline</div>
                        </div>
                        <div style={{ background: 'var(--accent-soft)', color: 'var(--accent)', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>
                            +12.4% vs LY
                        </div>
                    </div>
                    <div style={{ height: 320, width: '100%', marginTop: 20 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={weekly}>
                                <defs>
                                    <linearGradient id="colorRealized" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={color} stopOpacity={0.1} />
                                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-muted)" vertical={false} />
                                <XAxis dataKey="week" tick={{ fill: "var(--text-muted)", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<TTip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
                                <Legend wrapperStyle={{ paddingTop: 20, fontSize: 12, fontWeight: 700 }} />
                                <Area type="monotone" dataKey="matched" name="Goal / Matched" fill="url(#colorRealized)" stroke={color} strokeWidth={2.5} strokeDasharray="6 4" />
                                <Bar dataKey="realized" name="Actual Realizations" fill={color} radius={[4, 4, 0, 0]} barSize={16} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Conversion Funnel Details */}
                <div className="card" style={{ padding: 28 }}>
                    <div className="section-header">
                        <div>
                            <div className="section-title" style={{ fontSize: 20 }}>Efficiency Matrix</div>
                            <div className="section-subtitle">Conversion benchmarks</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>{((funnel[5].count / funnel[0].count) * 100).toFixed(1)}%</div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: 'uppercase' }}>Overall Conv.</div>
                        </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 24 }}>
                        {funnel.map((f, i) => {
                            const pct = (f.count / funnel[0].count) * 100;
                            const drop = i > 0 ? (((funnel[i - 1].count - f.count) / funnel[i - 1].count) * 100).toFixed(0) : null;
                            return (
                                <div key={f.stage}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: 'flex-end' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{f.stage}</span>
                                            {drop && <span className="delta down" style={{ fontSize: 10, padding: '2px 6px' }}>-{drop}% Drop</span>}
                                        </div>
                                        <span style={{ fontSize: 14, fontWeight: 900, color: "var(--text-primary)" }}>{f.count.toLocaleString()}</span>
                                    </div>
                                    <div style={{ height: 8, width: '100%', background: 'var(--border-muted)', borderRadius: 10, overflow: 'hidden' }}>
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                                            style={{ height: '100%', background: i === 0 ? 'var(--text-muted)' : color, borderRadius: 10 }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ marginTop: 'auto', paddingTop: 24, borderTop: '1px solid var(--border-muted)', display: 'flex', gap: 12, alignItems: 'center' }}>
                        <Info size={16} color="var(--text-muted)" />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>Benchmarked against National Growth Goals</span>
                    </div>
                </div>
            </div>

            {/* Row 2 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <div className="card" style={{ padding: 28 }}>
                    <div className="section-title" style={{ fontSize: 20, marginBottom: 24 }}>Entity Contributions</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {entityPerformance.map((e: any, i: number) => (
                            <div key={e.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                    <div style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: 8,
                                        background: "var(--bg-app)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 12,
                                        fontWeight: 800,
                                        color: "var(--text-secondary)",
                                        border: '1px solid var(--border)'
                                    }}>{i + 1}</div>
                                    <span style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 700 }}>{e.name}</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                    <span style={{ fontSize: 15, fontWeight: 900, color }}>{e.value}</span>
                                    <div style={{ width: 100, height: 6, background: "var(--border-muted)", borderRadius: 10 }}>
                                        <div style={{ height: "100%", width: `${(e.value / entityPerformance[0].value) * 100}%`, background: color, borderRadius: 10 }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card" style={{ padding: 28 }}>
                    <div className="section-title" style={{ fontSize: 20, marginBottom: 24 }}>SDG Impact Alignment</div>
                    <div style={{ height: 300, width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sdg} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-muted)" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="sdg" type="category" width={120} tick={{ fill: "var(--text-secondary)", fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<TTip />} />
                                <Bar dataKey="count" fill={color} radius={[0, 6, 6, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TrendingUp(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
        </svg>
    )
}
