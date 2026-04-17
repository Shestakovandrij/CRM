"use client";

import { usePathname } from "next/navigation";
import { Search, Bell } from "lucide-react";
import { useState } from "react";

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

  const title = Object.entries(pageTitles)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([href]) => (href === "/" ? path === "/" : path.startsWith(href)))?.[1] ?? "CRM";

  const segments = title === "Dashboard" ? ["Dashboard"] : ["Dashboard", title];

  return (
    <header
      className="flex items-center gap-4 px-6 py-3 shrink-0 relative z-10"
      style={{
        background: "rgba(3, 9, 5, 0.80)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(0,229,160,0.07)",
      }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm min-w-0 shrink-0">
        {segments.map((seg, i) => (
          <span key={seg} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-[var(--text-dim)]">/</span>}
            <span
              className={
                i === segments.length - 1
                  ? "font-semibold text-[var(--text)]"
                  : "text-[var(--text-muted)]"
              }
            >
              {seg}
            </span>
          </span>
        ))}
      </div>

      {/* Search */}
      <div className="flex-1 max-w-sm relative">
        <Search
          size={13}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full pl-9 pr-4 py-2 text-sm rounded-xl text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none transition-all duration-200"
          style={{
            background: "rgba(0,229,160,0.04)",
            border: "1px solid rgba(0,229,160,0.08)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "rgba(0,229,160,0.30)";
            e.currentTarget.style.background = "rgba(0,229,160,0.07)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "rgba(0,229,160,0.08)";
            e.currentTarget.style.background = "rgba(0,229,160,0.04)";
          }}
        />
      </div>

      <div className="flex items-center gap-2.5 ml-auto">
        {/* Notification bell */}
        <button
          className="relative w-8 h-8 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
          style={{
            background: "rgba(0,229,160,0.05)",
            border: "1px solid rgba(0,229,160,0.09)",
          }}
        >
          <Bell size={14} />
          <span
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
            style={{
              background: "var(--accent)",
              boxShadow: "0 0 6px var(--accent-glow)",
            }}
          />
        </button>

        {/* Divider */}
        <div
          className="h-5 w-px"
          style={{ background: "rgba(0,229,160,0.10)" }}
        />

        {/* Avatar */}
        <div className="flex items-center gap-2.5 cursor-pointer group">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-[var(--text)]">Admin</p>
            <p className="text-[10px] text-[var(--text-muted)]">CRM SHSTKV</p>
          </div>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-black shrink-0 transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #00e5a0, #00c070)",
              boxShadow: "0 0 14px rgba(0,229,160,0.40)",
            }}
          >
            A
          </div>
        </div>
      </div>
    </header>
  );
}
