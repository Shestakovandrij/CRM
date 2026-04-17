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

  return (
    <header
      className="flex items-center gap-4 px-6 py-3.5 shrink-0"
      style={{
        background: "rgba(13, 15, 26, 0.75)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Page title */}
      <h1 className="text-base font-semibold text-[var(--text)] min-w-[120px]">{title}</h1>

      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Пошук..."
          className="w-full pl-9 pr-4 py-2 text-sm rounded-xl text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none transition-all duration-200"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(79,142,247,0.5)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
        />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Notifications */}
        <button
          className="relative w-8 h-8 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <Bell size={15} />
          <span
            className="absolute top-1 right-1 w-2 h-2 rounded-full"
            style={{ background: "var(--orange)", boxShadow: "0 0 6px rgba(249,115,22,0.8)" }}
          />
        </button>

        {/* Avatar */}
        <div className="flex items-center gap-2.5">
          <span className="text-sm text-[var(--text-muted)] hidden sm:block">Hi, Admin</span>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white"
            style={{
              background: "linear-gradient(135deg, #4f8ef7, #7c3aed)",
              boxShadow: "0 0 14px rgba(79,142,247,0.5)",
            }}
          >
            A
          </div>
        </div>
      </div>
    </header>
  );
}
