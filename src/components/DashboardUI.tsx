"use client";

import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, ArrowUpRight, ArrowDownRight, LucideIcon } from "lucide-react";

interface KpiCardProps {
    label: string;
    value: string | number;
    sub: string;
    icon: LucideIcon;
    color: string;
    delay?: number;
    trend?: number;
}

export const KpiCard = ({ label, value, sub, icon: Icon, color, delay = 0, trend }: KpiCardProps) => (
    <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.45 }}
        className="card"
        style={{ flex: 1, borderBottom: `3px solid ${color}`, position: "relative" }}
    >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", color }}>
                <Icon size={20} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
        </div>
        <div style={{ fontSize: 38, fontWeight: 900, color: "var(--text-primary)", fontFamily: "Raleway", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
            <TrendingUp size={11} /> {sub}
        </div>
        {trend !== undefined && (
            <div style={{
                position: "absolute", top: 16, right: 16, fontSize: 11, fontWeight: 900,
                padding: "3px 8px", borderRadius: 6,
                background: trend >= 0 ? "#ecfdf5" : "#fef2f2",
                color: trend >= 0 ? "#059669" : "#dc2626",
                display: "flex", alignItems: "center", gap: 3
            }}>
                {trend >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {Math.abs(trend)}%
            </div>
        )}
    </motion.div>
);

interface SectionCardProps {
    title: string;
    subtitle: string;
    icon?: LucideIcon;
    children: React.ReactNode;
    span?: number;
    accent?: string;
}

export const SectionCard = ({ title, subtitle, icon: Icon, children, span = 1, accent }: SectionCardProps) => (
    <div className={`card ${span === 2 ? 'span-2' : ''}`} style={{ position: "relative" }}>
        {accent && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent }} />}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
                <h3 style={{ fontSize: 16, fontWeight: 900, color: "var(--text-primary)", marginBottom: 4 }}>{title}</h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>{subtitle}</p>
            </div>
            {Icon && (
                <div style={{ padding: 10, background: accent ? `${accent}18` : "var(--accent-soft)", borderRadius: 10, color: accent || "var(--accent)" }}>
                    <Icon size={18} />
                </div>
            )}
        </div>
        {children}
    </div>
);

export const LoadingScreen = ({ label = "Loading Data..." }: { label?: string }) => (
    <div style={{ height: "60vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div className="animate-spin" style={{ width: 40, height: 40, border: "4px solid var(--accent-soft)", borderRadius: "50%", borderTopColor: "var(--accent)" }} />
        <div style={{ color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
    </div>
);

export const tooltipStyle = {
    contentStyle: {
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        boxShadow: "var(--shadow-lg)",
        fontSize: 12,
        fontWeight: 700,
    }
};
