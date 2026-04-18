"use client";

import { usePathname } from "next/navigation";
import { Search, Bell, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { useMobileMenu } from "@/lib/useMobileMenu";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/leads": "Leads",
  "/pipeline": "Pipeline",
  "/clients": "Clients",
  "/tasks": "Tasks",
  "/campaigns": "Campaigns",
};

export default function Header() {
  const path = usePathname();
  const [search, setSearch] = useState("");
  const [time, setTime] = useState("");
  const { toggle } = useMobileMenu();

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const title = Object.entries(pageTitles)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([href]) => (href === "/" ? path === "/" : path.startsWith(href)))?.[1] ?? "CRM";

  const segments = title === "Dashboard" ? ["Dashboard"] : ["Dashboard", title];

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        flexShrink: 0,
        position: "relative",
        zIndex: 10,
        background: "rgba(6, 6, 6, 0.88)",
        backdropFilter: "blur(24px) saturate(160%)",
        WebkitBackdropFilter: "blur(24px) saturate(160%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset",
      }}
    >
      {/* Hamburger — CSS клас ховає на desktop */}
      <button
        onClick={toggle}
        className="hamburger-btn"
        aria-label="Відкрити меню"
        style={{
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          color: "var(--text-muted)",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <Menu size={18} />
      </button>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, flexShrink: 0 }}>
        {segments.map((seg, i) => (
          <span key={seg} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {i > 0 && <span style={{ color: "var(--text-dim)" }}>/</span>}
            <span style={{ fontWeight: i === segments.length - 1 ? 600 : 400, color: i === segments.length - 1 ? "var(--text)" : "var(--text-muted)" }}>
              {seg}
            </span>
          </span>
        ))}
      </div>

      {/* Search — прихований на дуже малих екранах через flex shrink */}
      <div style={{ flex: 1, maxWidth: 280, position: "relative" }}>
        <Search
          size={13}
          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          style={{
            width: "100%",
            padding: "6px 16px 6px 36px",
            fontSize: 13,
            borderRadius: 10,
            color: "var(--text)",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            outline: "none",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "rgba(201,140,10,0.40)";
            e.currentTarget.style.background = "rgba(201,140,10,0.05)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
          }}
        />
      </div>

      {/* Clock — прихований через CSS на мобільному */}
      <div className="header-clock" style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 600, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
        {time}
      </div>

      {/* Date — прихований через CSS на мобільному */}
      <div className="header-date" style={{ fontSize: 11, fontWeight: 500, color: "var(--accent)", whiteSpace: "nowrap" }}>
        {dateStr}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
        {/* Bell */}
        <button
          style={{
            position: "relative",
            width: 36, height: 36,
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 10,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          <Bell size={14} />
          <span
            style={{
              position: "absolute", top: 6, right: 6,
              width: 6, height: 6, borderRadius: "50%",
              background: "var(--accent)",
              boxShadow: "0 0 6px var(--accent-glow)",
            }}
          />
        </button>

        {/* Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <div
            className="header-user-name"
            style={{ textAlign: "right" }}
          >
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>Admin</p>
            <p style={{ fontSize: 10, color: "var(--text-muted)" }}>SHSTKV CRM</p>
          </div>
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: "#000", flexShrink: 0,
              background: "var(--accent)",
              boxShadow: "0 0 14px var(--accent-glow)",
            }}
          >
            S
          </div>
        </div>
      </div>
    </header>
  );
}
