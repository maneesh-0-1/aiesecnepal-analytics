import { RefreshCw, Users, Target, Zap, CheckCircle2 } from "lucide-react";
import React from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";

// Force dynamic rendering so it doesn't fail at build time
export const dynamic = 'force-dynamic';

// Server-side fetching function from Firestore
async function getOGXData() {
    try {
        const q = query(
            collection(db, "applications"),
            where("type", "==", "oGX"),
            limit(50)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a: any, b: any) => (b.updated_at || "").localeCompare(a.updated_at || ""));
    } catch (e) {
        console.error("Management fetch error:", e);
        return [];
    }
}

export default async function OGXManagementPage() {
    const applications = await getOGXData();

    const stats = {
        total: applications.length,
        approved: applications.filter((a: any) => a.status === 'approved').length,
        realized: applications.filter((a: any) => a.status === 'realized').length,
        rejected: applications.filter((a: any) => a.status === 'rejected').length,
    };

    return (
        <div style={{ paddingBottom: 40 }}>
            <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                        oGX Management Dashboard
                    </h1>
                    <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>
                        Detailed application tracker reading from Firebase Firestore
                    </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
                        Firestore Live
                    </div>
                </div>
            </div>

            <div className="stats-grid" style={{ marginBottom: 24 }}>
                {[
                    { label: "Total Apps", value: stats.total, icon: Users, color: "#3B82F6" },
                    { label: "Approved", value: stats.approved, icon: Zap, color: "#A78BFA" },
                    { label: "Realized", value: stats.realized, icon: CheckCircle2, color: "#10B981" },
                    { label: "Rejected", value: stats.rejected, icon: Target, color: "#EF4444" },
                ].map((s, i) => (
                    <div key={i} className="glass-card" style={{ padding: 20 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{s.label}</div>
                                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>{s.value}</div>
                            </div>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center", color: s.color }}>
                                <s.icon size={20} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="glass-card" style={{ overflow: "hidden" }}>
                <div style={{ padding: 20, borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>Application Details</div>
                    <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Showing latest 50 apps from Firestore</div>
                    </div>
                </div>
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>EP Name</th>
                                <th>Home LC</th>
                                <th>Opportunity Title</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {applications.map((app: any) => (
                                <tr key={app.id}>
                                    <td style={{ fontWeight: 600 }}>{app.person_name || 'N/A'}</td>
                                    <td style={{ color: "var(--text-secondary)" }}>{app.home_lc || 'N/A'}</td>
                                    <td>{app.host_lc || 'N/A'}</td>
                                    <td>
                                        <span style={{
                                            padding: "4px 8px",
                                            borderRadius: 6,
                                            fontSize: 10,
                                            fontWeight: 800,
                                            textTransform: "uppercase",
                                            background: app.status === 'realized' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
                                            color: app.status === 'realized' ? '#10B981' : '#3B82F6',
                                            border: `1px solid ${app.status === 'realized' ? '#10B98130' : '#3B82F630'}`
                                        }}>
                                            {app.status}
                                        </span>
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
