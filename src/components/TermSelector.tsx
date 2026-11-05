"use client";
import React from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import {
    format,
    startOfMonth,
    endOfMonth,
    subMonths,
    subDays,
} from 'date-fns';

interface TermSelectorProps {
    from: string;
    to: string;
    onChange: (from: string, to: string) => void;
    type?: 'LC' | 'MC';
}

export const TermSelector = ({ from, to, onChange, type = 'MC' }: TermSelectorProps) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    let termStartYear: number;
    let thisTermStart: Date;
    let thisTermEnd: Date;
    let lastTermStart: Date;
    let lastTermEnd: Date;

    if (type === 'LC') {
        const isAfterFeb = now.getMonth() >= 1; // Feb is 1
        termStartYear = isAfterFeb ? currentYear : currentYear - 1;
        thisTermStart = new Date(termStartYear, 1, 1);
        thisTermEnd = new Date(termStartYear + 1, 0, 31);
        lastTermStart = new Date(termStartYear - 1, 1, 1);
        lastTermEnd = new Date(termStartYear, 0, 31);
    } else {
        const isAfterJul = now.getMonth() >= 7; // Aug is 7
        termStartYear = isAfterJul ? currentYear : currentYear - 1;
        thisTermStart = new Date(termStartYear, 7, 1);
        thisTermEnd = new Date(termStartYear + 1, 6, 31);
        lastTermStart = new Date(termStartYear - 1, 7, 1);
        lastTermEnd = new Date(termStartYear, 6, 31);
    }

    const PRESETS = [
        { label: 'This Term', from: format(thisTermStart, 'yyyy-MM-dd'), to: format(thisTermEnd, 'yyyy-MM-dd') },
        { label: 'Last Term', from: format(lastTermStart, 'yyyy-MM-dd'), to: format(lastTermEnd, 'yyyy-MM-dd') },
        { label: '30D', from: format(subDays(now, 30), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') },
        { label: '90D', from: format(subDays(now, 90), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') },
    ];

    return (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Presets Toggle */}
            <div style={{
                display: 'flex',
                background: 'var(--bg-card)',
                padding: '4px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)'
            }}>
                {PRESETS.map((p) => {
                    const isActive = p.from === from && p.to === to;
                    return (
                        <button
                            key={p.label}
                            onClick={() => onChange(p.from, p.to)}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                padding: '6px 12px',
                                fontSize: 11,
                                fontWeight: 800,
                                borderRadius: 'var(--radius-sm)',
                                position: 'relative',
                                transition: '0.2s',
                                textTransform: 'uppercase',
                                letterSpacing: '0.02em'
                            }}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="active-preset"
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'var(--accent)',
                                        borderRadius: 'var(--radius-sm)',
                                        zIndex: 0
                                    }}
                                />
                            )}
                            <span style={{ position: 'relative', zIndex: 1, color: isActive ? 'white' : 'inherit' }}>
                                {p.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Custom Date Picker */}
            <motion.div 
                whileHover={{ borderColor: 'var(--accent)' }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '6px 16px',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'border-color 0.2s'
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Calendar size={14} style={{ color: 'var(--accent)' }} />
                    <input
                        type="date"
                        value={from}
                        onChange={(e) => onChange(e.target.value, to)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-primary)',
                            fontSize: 12,
                            fontWeight: 700,
                            outline: 'none',
                            fontFamily: 'inherit'
                        }}
                    />
                </div>
                <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                <input
                    type="date"
                    value={to}
                    onChange={(e) => onChange(from, e.target.value)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        fontSize: 12,
                        fontWeight: 700,
                        outline: 'none',
                        fontFamily: 'inherit'
                    }}
                />
            </motion.div>
        </div>
    );
};
