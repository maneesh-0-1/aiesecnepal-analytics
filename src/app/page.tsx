"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Target, Zap,
  ArrowUpRight, ArrowDownRight,
  Activity, Globe,
  FileText, CheckCircle2, Award, Trophy,
  BarChart3, ShieldCheck, Layers
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart as RePie, Pie, Legend,
  ScatterChart, Scatter
} from "recharts";
import { TermSelector } from "@/components/TermSelector";
import { KpiCard, SectionCard, LoadingScreen, tooltipStyle } from "@/components/DashboardUI";
import { PRODUCTS, PRODUCT_COLORS, STAGE_KEYS, STAGE_COLORS, fmt, pct } from "@/lib/constants";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

export default function GlobalOverview() {
  const router = useRouter();

  const now = new Date();
  const currentYear = now.getFullYear();
  const isAfterJul = now.getMonth() >= 7;
  const termStartYear = isAfterJul ? currentYear : currentYear - 1;

  const [from, setFrom] = useState(`${termStartYear}-08-01`);
  const [to, setTo] = useState(`${termStartYear + 1}-07-31`);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState("Total");
  const [metric, setMetric] = useState<'realized' | 'approved'>('approved');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?from=${from}&to=${to}&level=global`);
      const d = await res.json();
      setData(d);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, [from, to]);

  const totals = useMemo(() => {
    if (!data?.TOTALS) return {};
    if (selectedProduct === "Total") return data.TOTALS;
    const p = data.TOTALS.products?.[selectedProduct] || {};
    return {
      ...p,
      signups: data.TOTALS.signups,
      realized: p.re || 0,
      approved: p.appr || 0,
      applications: p.app || 0,
      finished: p.fin || 0,
      completed: p.comp || 0,
      efficiency: p.app > 0 ? (((p.re || 0) / p.app) * 100).toFixed(1) : "0.0"
    };
  }, [data, selectedProduct]);

  const kpis = data?.ENTITY_KPIS ?? {};
  const timeSeries = data?.TIME_SERIES ?? [];
  const breakdownList = data?.BREAKDOWN ?? [];

  const globalFunnel = useMemo(() => {
    return STAGE_KEYS.map((label, si) => {
      const total = selectedProduct === "Total"
        ? PRODUCTS.reduce((sum, p) => sum + (kpis[p]?.[si + 1]?.value ?? 0), 0)
        : (kpis[selectedProduct]?.[si + 1]?.value ?? 0);
      return { label, value: total, color: STAGE_COLORS[si] };
    });
  }, [kpis, selectedProduct]);

  const conversions = useMemo(() => {
    const f = globalFunnel;
    return [
      { from: "APL", to: "ACC", rate: pct(f[1]?.value, f[0]?.value) },
      { from: "ACC", to: "APD", rate: pct(f[2]?.value, f[1]?.value) },
      { from: "APD", to: "RE", rate: pct(f[3]?.value, f[2]?.value) },
      { from: "RE", to: "FN", rate: pct(f[4]?.value, f[3]?.value) },
      { from: "FN", to: "CO", rate: pct(f[5]?.value, f[4]?.value) },
      { from: "APL", to: "RE", rate: pct(f[3]?.value, f[0]?.value) },
    ];
  }, [globalFunnel]);

  const productMix = useMemo(() => {
    const mIdx = metric === 'realized' ? 4 : 3;
    return PRODUCTS.map(p => ({
      name: p,
      value: kpis[p]?.[mIdx]?.value ?? 0,
      color: PRODUCT_COLORS[p],
    })).sort((a, b) => b.value - a.value);
  }, [kpis, metric]);

  const mcPerformance = useMemo(() => {
    const mKey = metric === 'realized' ? 'realized' : 'approved';
    const pKey = metric === 'realized' ? 're' : 'appr';

    return [...breakdownList].sort((a: any, b: any) => {
      if (selectedProduct === "Total") return (b[mKey] || 0) - (a[mKey] || 0);
      return (b.products?.[selectedProduct]?.[pKey] || 0) - (a.products?.[selectedProduct]?.[pKey] || 0);
    }).slice(0, 15);
  }, [breakdownList, metric, selectedProduct]);

  if (loading && !data) return <LoadingScreen label="Syncing Global Network..." />;

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={container}
      style={{ display: 'flex', flexDirection: 'column', gap: 32, padding: "20px 0" }}
    >

      {/* ── Header Section ─────────────────────────────────────────── */}
      <motion.div variants={item} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div className="section-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
              <div style={{ padding: '4px 12px', background: 'var(--aiesec-blue)', color: 'white', borderRadius: 100, fontSize: 10, fontWeight: 900, letterSpacing: '0.1em' }}>GLOBAL NETWORK OVERVIEW</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 800, color: "var(--text-muted)", background: "var(--bg-card)", border: "1px solid var(--border)", padding: "4px 12px", borderRadius: 100 }}>
                <Globe size={12} /> {breakdownList.length} MEMBER COMMITTEES
              </div>
            </div>
            <h1 className="section-title" style={{ fontSize: 40, fontWeight: 900, lineHeight: 1 }}>Network <span style={{ color: 'var(--accent)' }}>Dashboard</span></h1>
            <p className="section-subtitle" style={{ fontSize: 16, marginTop: 8 }}>Real-time Global Operations Status • AIESEC International</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }} className="desktop-only">
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Global Term Period</div>
            <TermSelector from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
          </div>
        </div>

        <div className="mobile-only" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Global Term Period</div>
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
            SYSTEM HEALTH: OPTIMAL
          </div>
        </div>

      </motion.div>

      {/* Executive Summary Grid */}
      <motion.section variants={item}>
        <div className="stats-grid">
          <KpiCard label="Global SU" value={fmt(totals.signups)} sub="New Users" icon={Users} color="var(--aiesec-blue)" delay={0.1} />
          <KpiCard label="Global APL" value={fmt(totals.applications)} sub="Applicants" icon={FileText} color="#0CB9C1" delay={0.2} />
          <KpiCard label={metric === 'realized' ? "Global RE" : "Global APD"} value={fmt(metric === 'realized' ? totals.realized : totals.approved)} sub={metric === 'realized' ? "Realizations" : "Approvals"} icon={metric === 'realized' ? Zap : Target} color={metric === 'realized' ? "var(--aiesec-jade)" : "var(--aiesec-orange)"} delay={0.3} />
          <KpiCard label="Global FN" value={fmt(totals.finished)} sub="End Dates" icon={CheckCircle2} color="var(--aiesec-purple)" delay={0.4} />
          <KpiCard label="Global CO" value={fmt(totals.completed)} sub="Completions" icon={Award} color="var(--aiesec-sun)" delay={0.5} />
          <KpiCard label="Conversion" value={(totals.efficiency || 0) + "%"} sub="APL to RE" icon={Activity} color="var(--text-muted)" delay={0.6} />
        </div>
      </motion.section>

      {/* Main Grid ───────────────────────────────────────────────── */}
      <motion.div variants={item} className="responsive-grid two-cols">

        {/* 1. Global Time Series */}
        <SectionCard title="Global Performance Trend" subtitle={`Consolidated network ${metric === 'realized' ? 'realizations' : 'approvals'} over time`} icon={Activity}>
          <div style={{ height: 320 }}>
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
                  <Area type="monotone" dataKey={(v: any) => (v[`${metric === 'realized' ? 're' : 'appr'}_iGV`] || 0) + (v[`${metric === 'realized' ? 're' : 'appr'}_oGV`] || 0)} name="GV (Global)" stroke={STAGE_COLORS[0]} fill={`url(#grad-GV)`} strokeWidth={2.5} />
                )}
                {(selectedProduct === "Total" || selectedProduct.endsWith("GTa")) && (
                  <Area type="monotone" dataKey={(v: any) => (v[`${metric === 'realized' ? 're' : 'appr'}_iGTa`] || 0) + (v[`${metric === 'realized' ? 're' : 'appr'}_oGTa`] || 0)} name="GTa (Global)" stroke={STAGE_COLORS[1]} fill={`url(#grad-GTa)`} strokeWidth={2.5} />
                )}
                {(selectedProduct === "Total" || selectedProduct.endsWith("GTe")) && (
                  <Area type="monotone" dataKey={(v: any) => (v[`${metric === 'realized' ? 're' : 'appr'}_iGTe`] || 0) + (v[`${metric === 'realized' ? 're' : 'appr'}_oGTe`] || 0)} name="GTe (Global)" stroke={STAGE_COLORS[2]} fill={`url(#grad-GTe)`} strokeWidth={2.5} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* 2. Product Volume Breakdown */}
        <SectionCard title="Product Mix" subtitle={`Global ${metric} distribution across programmes`} icon={Layers}>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RePie>
                <Pie
                  data={productMix}
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {productMix.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip {...tooltipStyle} />
              </RePie>
            </ResponsiveContainer>
          </div>
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            {productMix.slice(0, 3).map(p => (
              <div key={p.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{p.name}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 900, fontFamily: "monospace" }}>{fmt(p.value)}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </motion.div>

      {/* ── Rankings and Efficiency ────────────────────────────────── */}
      <motion.div variants={item} className="responsive-grid two-cols">

        {/* 3. Global MC Rankings */}
        <SectionCard
          title="Global Performance Matrix"
          subtitle={`Top Member Committees by ${selectedProduct} ${metric} volume`}
          icon={Trophy}
          accent="var(--aiesec-sun)"
        >
          <div className="table-container">
            <table className="pro-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Member Committee</th>
                  <th style={{ textAlign: 'center' }}>APD</th>
                  <th style={{ textAlign: 'center' }}>RE</th>
                  <th style={{ textAlign: 'center' }}>Conv %</th>
                  <th style={{ textAlign: 'right' }}>Volume</th>
                </tr>
              </thead>
              <tbody>
                {mcPerformance.map((mc: any, idx) => {
                  const mKey = metric === 'realized' ? 'realized' : 'approved';
                  const pKey = metric === 'realized' ? 're' : 'appr';
                  const val = selectedProduct === "Total" ? mc[mKey] : mc.products?.[selectedProduct]?.[pKey];
                  const apps = selectedProduct === "Total" ? mc.applications : mc.products?.[selectedProduct]?.app;
                  const conv = pct(val, apps);

                  return (
                    <tr key={mc.id}>
                      <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ color: "var(--text-muted)", fontSize: 10, width: 14 }}>{idx + 1}</span>
                          {mc.name}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{fmt(mc.approved)}</td>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: "var(--aiesec-jade)" }}>{fmt(mc.realized)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ padding: "2px 6px", borderRadius: 4, background: Number(conv) > 10 ? "var(--success-soft)" : "var(--bg-app)", color: Number(conv) > 10 ? "var(--success)" : "inherit", fontSize: 11, fontWeight: 800 }}>
                          {conv}%
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                          <span style={{ fontSize: 13, fontWeight: 900 }}>{fmt(val)}</span>
                          <div style={{ width: 40, height: 4, background: "var(--border-muted)", borderRadius: 10 }}>
                            <div style={{ height: "100%", background: "var(--accent)", width: `${Math.min(100, (val / (mcPerformance[0] as any)[mKey]) * 100)}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* 4. Global Funnel & Stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <SectionCard title="Network Funnel" subtitle="Average conversion across all MCs" icon={Target}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {globalFunnel.map((stage, i) => {
                const maxVal = globalFunnel[0]?.value || 1;
                const rate = i > 0 ? conversions[i - 1].rate : null;
                return (
                  <div key={stage.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 800 }}>{stage.label}</span>
                      <div style={{ display: "flex", gap: 10 }}>
                        {rate && <span style={{ fontSize: 10, fontWeight: 900, color: "var(--accent)" }}>{rate}%</span>}
                        <span style={{ fontSize: 13, fontWeight: 900 }}>{fmt(stage.value)}</span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: "var(--border-muted)", borderRadius: 10 }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(stage.value / maxVal) * 100}%` }}
                        style={{ height: "100%", background: stage.color, borderRadius: 10 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Volume Efficiency" subtitle="MC performance clustering" icon={BarChart3}>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-muted)" />
                  <XAxis type="number" dataKey="x" name="Volume" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} label={{ value: 'VOLUME', position: 'insideBottom', offset: -5, fontSize: 9, fontWeight: 900 }} />
                  <YAxis type="number" dataKey="y" name="Efficiency" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} label={{ value: 'CONV%', angle: -90, position: 'insideLeft', fontSize: 9, fontWeight: 900 }} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} {...tooltipStyle} />
                  <Scatter name="MCs" data={breakdownList.map((mc: any) => ({
                    x: mc.realized || 0,
                    y: (mc.realized / (mc.applications || 1)) * 100,
                    name: mc.name
                  }))} fill="var(--aiesec-blue)" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

      </motion.div>

      {/* Analytics Footer */}
      <footer style={{
        padding: '40px 0',
        borderTop: '1px solid var(--border-muted)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20
      }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
          Global Operations Dashboard • Generated on {new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>v4.0.0-GLOBAL</span>
        </div>
      </footer>
    </motion.div>
  );
}
