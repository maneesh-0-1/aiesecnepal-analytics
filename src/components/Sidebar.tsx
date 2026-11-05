"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Trophy,
  MapPin,
  Search,
  Sparkles,
  Layers,
  X
} from "lucide-react";
import { AutoSync } from "@/components/AutoSync";
import { NEPAL_LCS } from "@/lib/data";

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [lcs, setLcs] = useState<any[]>(NEPAL_LCS);

  const NEPAL_MC_ID = "112";

  useEffect(() => {
    fetch(`/api/lcs?mcId=${NEPAL_MC_ID}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setLcs(data);
      })
      .catch(() => setLcs(NEPAL_LCS));
  }, []);

  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname?.startsWith(path)) return true;
    return false;
  };

  const filteredLCs = lcs.filter(lc =>
    lc.name.toLowerCase().includes(search.toLowerCase())
  );
  const showResults = search.length > 0 && isSearchFocused;

  const NavItem = ({ href, icon: Icon, label, active }: { href: string; icon: any; label: string; active: boolean }) => (
    <motion.div
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={() => onClose?.()}
    >
      <Link href={href} className={`nav-item ${active ? "active" : ""}`}>
        <Icon size={18} />
        <span>{label}</span>
      </Link>
    </motion.div>
  );

  return (
    <aside className={`cockpit-sidebar ${isOpen ? "open" : ""}`}>
      {/* Mobile Close Button */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          padding: 8,
          background: "var(--bg-app)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          color: "var(--text-secondary)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "0 12px",
          marginBottom: 28,
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            background: "linear-gradient(135deg, #037EF3 0%, #00C16E 100%)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            boxShadow: "0 4px 14px rgba(3, 126, 243, 0.3)",
          }}
        >
          <Sparkles size={20} strokeWidth={2.5} />
        </div>
        <div>
          <div
            style={{
              fontFamily: "Raleway",
              fontWeight: 900,
              fontSize: 18,
              lineHeight: 1,
              color: "var(--aiesec-blue)",
              letterSpacing: "-0.02em",
            }}
          >
            AIESEC <span style={{ color: "var(--text-primary)" }}>NEPAL</span>
          </div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginTop: 3,
            }}
          >
            National Cockpit
          </div>
        </div>
      </motion.div>

      {/* Local Committees Quick Search */}
      <div style={{ marginBottom: 24, padding: "0 8px", position: "relative" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "var(--bg-app)",
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            transition: "all 0.2s",
            boxShadow: isSearchFocused ? "0 0 0 2px var(--accent-soft)" : "none",
          }}
        >
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search Nepal LCs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-primary)",
              fontSize: 13,
              fontWeight: 600,
              width: "100%",
              outline: "none",
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
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 8,
                right: 8,
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                boxShadow:
                  "0 10px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.1)",
                zIndex: 100,
                maxHeight: 280,
                overflowY: "auto",
                padding: "8px 6px",
                backdropFilter: "blur(12px)",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  color: "var(--text-muted)",
                  padding: "6px 10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <MapPin size={10} /> Nepal Local Committees
              </div>
              {filteredLCs.map((lc) => (
                <motion.div
                  key={lc.id}
                  whileHover={{ x: 4, background: "var(--accent-soft)" }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    router.push(`/lc/${lc.id}`);
                    setSearch("");
                    setIsSearchFocused(false);
                    onClose?.();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--aiesec-blue)",
                    }}
                  />
                  {lc.name}
                </motion.div>
              ))}
              {filteredLCs.length === 0 && (
                <div style={{ padding: "16px 12px", textAlign: "center" }}>
                  <div style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 600 }}>
                    No matching LC found
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Groups */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: "var(--text-muted)",
              padding: "0 16px 10px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Analytics & Operations
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <NavItem
              href="/"
              icon={BarChart3}
              label="National Cockpit"
              active={pathname === "/" || pathname === "/mc"}
            />
            <NavItem
              href="/lc"
              icon={Trophy}
              label="Local Committees"
              active={pathname === "/lc"}
            />
            <NavItem
              href="/exchange"
              icon={Layers}
              label="Exchange Operations"
              active={pathname?.startsWith("/exchange") || false}
            />
          </div>
        </div>

        {/* LCs Quick List */}
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "var(--text-muted)",
              padding: "0 16px 8px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Local Entities ({lcs.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 8px" }}>
            {lcs.map((lc) => {
              const active = pathname === `/lc/${lc.id}`;
              return (
                <Link
                  key={lc.id}
                  href={`/lc/${lc.id}`}
                  onClick={() => onClose?.()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "7px 10px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: active ? 800 : 600,
                    color: active ? "var(--accent)" : "var(--text-secondary)",
                    background: active ? "var(--accent-soft)" : "transparent",
                    textDecoration: "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  <MapPin size={13} color={active ? "var(--accent)" : "var(--text-muted)"} />
                  <span>{lc.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Bottom Status Section */}
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          paddingTop: 20,
          borderTop: "1px solid var(--border-muted)",
        }}
      >
        <AutoSync />
      </div>
    </aside>
  );
}
