"use client";

import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function AutoSync() {
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    const triggerSync = async () => {
        if (syncing) return;
        setSyncing(true);
        try {
            const res = await fetch("/api/sync", { method: "POST" });
            if (res.ok) {
                setLastSync(new Date());
                window.dispatchEvent(new CustomEvent('sync-complete'));
            }
        } catch (error) {
            console.error("AutoSync failed:", error);
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        // Only set initial time; do not hammer the EXPA API every 60s from every client browser
        setLastSync(new Date());
    }, []);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: syncing ? 'var(--accent-soft)' : 'var(--bg-app)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                transition: 'all 0.3s ease'
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ 
                    width: 20, 
                    height: 20, 
                    borderRadius: '50%', 
                    background: syncing ? 'var(--accent)' : 'var(--bg-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: syncing ? '0 0 8px var(--accent)' : 'none',
                    transition: 'all 0.3s ease'
                }}>
                    <AnimatePresence mode="wait">
                        {syncing ? (
                            <motion.div
                                key="syncing"
                                initial={{ rotate: 0 }}
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                            >
                                <RefreshCw size={10} color="white" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="online"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                            >
                                <CheckCircle size={10} color="var(--success)" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ 
                        fontSize: 10, 
                        fontWeight: 800, 
                        color: syncing ? 'var(--accent)' : 'var(--text-primary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        lineHeight: 1
                    }}>
                        {syncing ? "Synchronizing" : "Systems Online"}
                    </span>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, fontWeight: 600 }}>
                        {syncing ? "EXPA Core v2.1" : lastSync ? `Updated ${lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "Idle"}
                    </span>
                </div>
            </div>
            {!syncing && (
                <motion.button 
                    whileHover={{ rotate: 180 }}
                    transition={{ duration: 0.4 }}
                    onClick={triggerSync}
                    style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: 'var(--accent)', 
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <RefreshCw size={12} />
                </motion.button>
            )}
        </motion.div>
    );
}
