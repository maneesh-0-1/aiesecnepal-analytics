"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BarChart3,
  Trophy,
  Globe,
  Search,
  MapPin,
  Building,
  X
} from "lucide-react";
import { AutoSync } from "@/components/AutoSync";

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean, onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [mcs, setMcs] = useState<any[]>([]);
  const [lcs, setLcs] = useState<any[]>([]);

  // ... (rest of the state and effects)

  // Default to India for mc pages, but home is global
  const mcIdParam = searchParams.get("mcId");
  const currentMcId = mcIdParam || "1585";

  useEffect(() => {
    fetch('/api/mcs').then(res => res.json()).then(data => {
      if (Array.isArray(data)) setMcs(data);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    fetch(`/api/lcs?mcId=${currentMcId}`).then(res => res.json()).then(data => {
      if (Array.isArray(data)) setLcs(data);
    }).catch(console.error);
  }, [currentMcId]);

  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname?.startsWith(path)) return true;
    return false;
  };

  const filteredMCs = mcs.filter(mc => mc.name.toLowerCase().includes(search.toLowerCase()));
  const filteredLCs = lcs.filter(lc => lc.name.toLowerCase().includes(search.toLowerCase()));
  const showResults = search.length > 0 && isSearchFocused;

  const currentMcName = mcs.find(m => String(m.id) === currentMcId)?.name || (mcIdParam ? "Entity" : "GLOBAL");

  const NavItem = ({ href, icon: Icon, label, active }: { href: string, icon: any, label: string, active: boolean }) => (
    <motion.div
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        onClick={() => onClose?.()}
    >
        <Link href={href} className={`nav-item ${active ? 'active' : ''}`}>
            <Icon size={18} />
            <span>{label}</span>
        </Link>
    </motion.div>
  );

  return (
    <aside className={`cockpit-sidebar ${isOpen ? 'open' : ''}`}>
      {/* Mobile Close Button */}
      <button 
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          padding: 8,
          background: 'var(--bg-app)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        className="mobile-only-flex"
      >
        <X size={18} />
      </button>

      {/* Brand Logo Section */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => router.push(`/`)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '0 12px',
          marginBottom: 32,
          cursor: 'pointer'
        }}>
        <div style={{
          width: 36,
          height: 36,
          background: 'var(--aiesec-blue)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          boxShadow: '0 4px 12px rgba(3, 126, 243, 0.25)'
        }}>
          <Globe size={20} strokeWidth={2.5} />
        </div>
        <div>
          <div style={{
            fontFamily: 'Raleway',
            fontWeight: 900,
            fontSize: 18,
            lineHeight: 1,
            color: 'var(--aiesec-blue)',
            letterSpacing: '-0.02em'
          }}>
            AIESEC <span style={{ color: 'var(--text-primary)' }}>PORTAL</span>
          </div>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginTop: 2
          }}>
            Operational Cockpit
          </div>
        </div>
      </motion.div>

      {/* Global Search / Entity Selector */}
      <div style={{ marginBottom: 24, padding: '0 8px', position: 'relative' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--bg-app)',
          padding: '10px 14px',
          borderRadius: 12,
          border: '1px solid var(--border)',
          transition: 'all 0.2s',
          boxShadow: isSearchFocused ? '0 0 0 2px var(--accent-soft)' : 'none'
        }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search Entities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontWeight: 600,
              width: '100%',
              outline: 'none'
            }}
          />
        </div>

        <AnimatePresence>
            {showResults && (
            <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 8,
                    right: 8,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.1)',
                    zIndex: 100,
                    maxHeight: 380,
                    overflowY: 'auto',
                    padding: '10px 6px',
                    backdropFilter: 'blur(12px)',
                }}
            >
                {filteredMCs.length > 0 && (
                <div style={{ marginBottom: filteredLCs.length > 0 ? 12 : 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', padding: '6px 10px', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Building size={10} /> Member Committees
                    </div>
                    {filteredMCs.map(mc => (
                    <motion.div
                        key={mc.id}
                        whileHover={{ x: 4, background: 'var(--accent-soft)' }}
                        onMouseDown={(e) => {
                        e.preventDefault();
                        router.push(`/mc?mcId=${mc.id}`);
                        setSearch("");
                        setIsSearchFocused(false);
                        onClose?.();
                        }}
                        style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px',
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        }}
                    >
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
                        {mc.name}
                    </motion.div>
                    ))}
                </div>
                )}
                {filteredLCs.length > 0 && (
                <div>
                    <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', padding: '6px 10px', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={10} /> Local Entities
                    </div>
                    {filteredLCs.map(lc => (
                    <motion.div
                        key={lc.id}
                        whileHover={{ x: 4, background: 'var(--accent-soft)' }}
                        onMouseDown={(e) => {
                        e.preventDefault();
                        router.push(`/lc/${lc.id}?mcId=${currentMcId}`);
                        setSearch("");
                        setIsSearchFocused(false);
                        onClose?.();
                        }}
                        style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px',
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        }}
                    >
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--aiesec-blue)' }} />
                        {lc.name}
                    </motion.div>
                    ))}
                </div>
                )}
                {filteredMCs.length === 0 && filteredLCs.length === 0 && (
                <div style={{ padding: '24px 12px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>Zero matches found</div>
                </div>
                )}
            </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* Navigation Groups */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 24, flex: 1 }}>
        <div>
          <div style={{
            fontSize: 11,
            fontWeight: 800,
            color: 'var(--text-muted)',
            padding: '0 16px 12px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}>
            Intelligence
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <NavItem href="/" icon={Globe} label="Global Network" active={pathname === "/"} />

            <div style={{ padding: '8px 0' }} />

            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key={currentMcName}
                style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', padding: '0 16px 8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              ENTITY: {currentMcName}
            </motion.div>

            <NavItem href={`/mc?mcId=${currentMcId}`} icon={BarChart3} label="National Term" active={pathname === "/mc"} />
            <NavItem href={`/lc?mcId=${currentMcId}`} icon={Trophy} label="Local Entities" active={pathname === "/lc"} />
          </div>
        </div>
      </nav>

      {/* Bottom Section */}
      <div style={{
        marginTop: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        paddingTop: 24,
        borderTop: '1px solid var(--border-muted)'
      }}>
        <AutoSync />
      </div>
    </aside>
  );
}
