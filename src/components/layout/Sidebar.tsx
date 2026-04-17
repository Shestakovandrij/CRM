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
  Zap,
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
      className="w-56 shrink-0 flex flex-col h-full relative z-10"
      style={{
        background: "rgba(3, 9, 5, 0.96)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRight: "1px solid rgba(0,229,160,0.08)",
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: "linear-gradient(135deg, #00e5a0, #00c070)",
            boxShadow: "0 0 20px rgba(0,229,160,0.45), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          <Zap size={15} className="text-black" strokeWidth={2.5} />
        </div>
        <div>
          <span className="text-sm font-bold text-[var(--text)] tracking-wide">CRM</span>
          <span
            className="text-xs block font-medium"
            style={{ color: "var(--accent)", lineHeight: 1 }}
          >
            SHSTKV
          </span>
        </div>
      </div>

      {/* Section label */}
      <div className="px-5 mb-2">
        <span className="text-[10px] font-semibold tracking-widest text-[var(--text-dim)] uppercase">
          Menu
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer",
                active
                  ? "text-[var(--accent)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/[0.03]"
              )}
              style={
                active
                  ? {
                      background: "rgba(0,229,160,0.10)",
                      boxShadow: "inset 0 0 24px rgba(0,229,160,0.05)",
                      border: "1px solid rgba(0,229,160,0.14)",
                    }
                  : { border: "1px solid transparent" }
              }
            >
              <Icon
                size={16}
                style={
                  active
                    ? {
                        color: "var(--accent)",
                        filter: "drop-shadow(0 0 6px rgba(0,229,160,0.6))",
                      }
                    : {}
                }
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div
        className="px-3 py-4 mt-auto"
        style={{ borderTop: "1px solid rgba(0,229,160,0.06)" }}
      >
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-red-500/[0.06] transition-all duration-150 cursor-pointer"
          style={{ border: "1px solid transparent" }}
        >
          <LogOut size={16} />
          Log out
        </button>
      </div>
    </aside>
  );
}
