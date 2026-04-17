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
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
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
      className="w-56 shrink-0 flex flex-col h-full"
      style={{
        background: "rgba(8, 8, 16, 0.65)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div
        className="px-5 py-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white"
            style={{ background: "var(--accent)", boxShadow: "0 0 16px var(--accent-glow)" }}
          >
            C
          </div>
          <span className="text-base font-semibold tracking-tight text-[var(--text)]">CRM</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer group",
                active
                  ? "text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              )}
              style={
                active
                  ? {
                      background: "rgba(124,58,237,0.2)",
                      borderLeft: "2px solid var(--accent)",
                      boxShadow: "inset 0 0 20px rgba(124,58,237,0.1)",
                    }
                  : { borderLeft: "2px solid transparent" }
              }
            >
              <Icon
                size={15}
                className={active ? "text-[var(--accent)]" : ""}
                style={active ? { filter: "drop-shadow(0 0 6px var(--accent-glow))" } : {}}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors duration-150 cursor-pointer"
          style={{ borderLeft: "2px solid transparent" }}
        >
          <LogOut size={15} />
          Log out
        </button>
      </div>
    </aside>
  );
}
