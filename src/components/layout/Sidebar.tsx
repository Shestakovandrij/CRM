"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CheckSquare,
  Kanban,
  Send,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", icon: LayoutDashboard, label: "Overview" },
  { href: "/leads", icon: Users, label: "Leads" },
  { href: "/pipeline", icon: Kanban, label: "Pipeline" },
  { href: "/clients", icon: Briefcase, label: "Clients" },
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/campaigns", icon: Send, label: "Campaigns" },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside
      className="w-52 shrink-0 flex flex-col h-full"
      style={{
        background: "rgba(10, 12, 22, 0.80)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #4f8ef7, #7c3aed)",
            boxShadow: "0 0 16px rgba(79,142,247,0.5)",
          }}
        >
          <span className="text-xs font-bold text-white">C</span>
        </div>
        <span className="text-sm font-semibold text-[var(--text)] tracking-wide">CRM</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200",
                active ? "text-white" : "text-[var(--text-muted)] hover:text-[var(--text)]"
              )}
              style={
                active
                  ? {
                      background: "rgba(79,142,247,0.15)",
                      borderLeft: "2px solid var(--accent)",
                      boxShadow: "inset 0 0 20px rgba(79,142,247,0.08)",
                    }
                  : { borderLeft: "2px solid transparent" }
              }
            >
              <Icon
                size={15}
                style={active ? { color: "var(--accent)", filter: "drop-shadow(0 0 6px var(--accent-glow))" } : {}}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors duration-150"
          style={{ borderLeft: "2px solid transparent" }}
        >
          <LogOut size={15} />
          Log out
        </button>
      </div>
    </aside>
  );
}
