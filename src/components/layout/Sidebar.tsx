"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Users, Briefcase, CheckSquare,
  Kanban, Send, LogOut, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobileMenu } from "@/lib/useMobileMenu";

const nav = [
  { href: "/",          icon: LayoutDashboard, label: "Overview" },
  { href: "/leads",     icon: Users,           label: "Leads" },
  { href: "/pipeline",  icon: Kanban,          label: "Pipeline" },
  { href: "/clients",   icon: Briefcase,       label: "Clients" },
  { href: "/tasks",     icon: CheckSquare,     label: "Tasks" },
  { href: "/campaigns", icon: Send,            label: "Campaigns" },
];

const glassStyle: React.CSSProperties = {
  background: "rgba(6, 6, 6, 0.98)",
  backdropFilter: "blur(28px) saturate(180%)",
  WebkitBackdropFilter: "blur(28px) saturate(180%)",
  borderRight: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "4px 0 40px rgba(0,0,0,0.5), 1px 0 0 rgba(255,255,255,0.04) inset",
};

function NavContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const path = usePathname();

  return (
    <>
      {/* Logo */}
      <div style={{ padding: "24px 20px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 28, flexShrink: 0 }}>
          {[10, 18, 14, 22, 16, 20, 12].map((h, i) => (
            <div
              key={i}
              style={{
                width: 3, height: h,
                borderRadius: 999,
                background: "var(--accent)",
                boxShadow: "0 0 6px var(--accent-glow)",
              }}
            />
          ))}
        </div>
        <div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            SHSTKV
          </span>
          <span style={{ fontSize: 9, display: "block", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-dim)", lineHeight: 1.2 }}>
            CRM
          </span>
        </div>
      </div>

      {/* Menu label */}
      <div style={{ padding: "0 20px 6px" }}>
        <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-dim)" }}>
          Menu
        </span>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: "0 10px", overflowY: "auto" }}>
        {nav.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onLinkClick}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 12,
                marginBottom: 2,
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
                transition: "all 0.15s",
                ...(active
                  ? { background: "var(--accent)", color: "#000", boxShadow: "0 0 16px var(--accent-glow)" }
                  : { color: "var(--text-muted)" }
                ),
              }}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: "16px 10px", borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: "auto" }}>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 12px", width: "100%", borderRadius: 12,
            fontSize: 14, fontWeight: 500, background: "none", border: "none",
            color: "var(--text-muted)", cursor: "pointer", transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.background = "rgba(248,113,113,0.06)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "none"; }}
        >
          <LogOut size={15} />
          Log out
        </button>
      </div>
    </>
  );
}

export default function Sidebar() {
  const { isOpen, close } = useMobileMenu();

  return (
    <>
      {/* Desktop sidebar — CSS class показує лише на lg+ */}
      <aside className="sidebar-desktop" style={glassStyle}>
        <NavContent />
      </aside>

      {/* Mobile overlay — CSS class показує лише на mobile */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer — CSS class ховає на desktop, JS керує transform */}
      <aside
        className="sidebar-mobile-drawer"
        style={{
          ...glassStyle,
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        {/* Close button */}
        <button
          onClick={close}
          style={{
            position: "absolute", top: 16, right: 16,
            width: 28, height: 28, borderRadius: 8,
            background: "rgba(255,255,255,0.06)", border: "none",
            color: "var(--text-muted)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <X size={16} />
        </button>

        <NavContent onLinkClick={close} />
      </aside>
    </>
  );
}
