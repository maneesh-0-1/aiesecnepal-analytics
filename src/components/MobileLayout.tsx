"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Menu, Globe } from "lucide-react";

export function MobileLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="cockpit-container">
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="mobile-only"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 90,
          }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="cockpit-main">
        {/* Mobile Header */}
        <header className="cockpit-header mobile-only-flex">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button 
              onClick={() => setIsSidebarOpen(true)}
              style={{
                padding: 8,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              <Menu size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28,
                height: 28,
                background: 'var(--aiesec-blue)',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}>
                <Globe size={16} />
              </div>
              <span style={{ fontWeight: 900, fontSize: 14, fontFamily: 'Raleway' }}>AIESEC PORTAL</span>
            </div>
          </div>
        </header>

        <div className="cockpit-content">
          {children}
        </div>
      </div>
    </div>
  );
}
