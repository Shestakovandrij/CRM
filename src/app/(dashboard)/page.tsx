import { db } from "@/lib/db";
import Link from "next/link";
import { Users, Briefcase, CheckSquare, TrendingUp, ArrowUpRight } from "lucide-react";
import {
  LeadDonutChart,
  TaskProgressRing,
  DealBarChart,
  MiniLineChart,
  CARD,
} from "@/components/dashboard/DashboardCharts";

async function getStats() {
  const [
    totalLeads,
    totalDeals,
    totalTasks,
    taskDone,
    recentLeads,
    overdueTasks,
    leadsByStatus,
    dealsByStatus,
  ] = await Promise.all([
    db.lead.count(),
    db.deal.count(),
    db.task.count({ where: { status: { not: "DONE" } } }),
    db.task.count({ where: { status: "DONE" } }),
    db.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, status: true, instagram: true, createdAt: true },
    }),
    db.task.count({ where: { status: { not: "DONE" }, deadline: { lt: new Date() } } }),
    db.lead.groupBy({ by: ["status"], _count: { status: true } }),
    db.deal.groupBy({ by: ["status"], _count: { status: true } }),
  ]);

  const wonLeads = await db.lead.count({ where: { status: "WON" } });
  const conversion = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  return {
    totalLeads, totalDeals, totalTasks, taskDone, recentLeads,
    overdueTasks, leadsByStatus, dealsByStatus, conversion,
  };
}

const STATUS_COLORS: Record<string, string> = {
  NEW: "text-blue-400 bg-blue-400/10",
  CONTACTED: "text-cyan-400 bg-cyan-400/10",
  NEGOTIATION: "text-violet-400 bg-violet-400/10",
  WON: "text-emerald-400 bg-emerald-400/10",
  LOST: "text-red-400 bg-red-400/10",
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "Новий", CONTACTED: "Контакт", NEGOTIATION: "Переговори", WON: "Виграно", LOST: "Програно",
};

export default async function DashboardPage() {
  const stats = await getStats();
  const taskTotal = stats.taskDone + stats.totalTasks;

  const topCards = [
    {
      label: "Всього лідів",
      value: stats.totalLeads,
      icon: Users,
      href: "/leads",
      color: "#4f8ef7",
      glow: "rgba(79,142,247,0.4)",
      trend: "+12%",
    },
    {
      label: "Активні угоди",
      value: stats.totalDeals,
      icon: Briefcase,
      href: "/clients",
      color: "#a78bfa",
      glow: "rgba(167,139,250,0.4)",
      trend: "+5%",
    },
    {
      label: "Задачі",
      value: stats.totalTasks,
      icon: CheckSquare,
      href: "/tasks",
      color: "#22d3ee",
      glow: "rgba(34,211,238,0.4)",
      trend: stats.overdueTasks > 0 ? `-${stats.overdueTasks} прострочено` : "Все вчасно",
    },
    {
      label: "Конверсія",
      value: `${stats.conversion}%`,
      icon: TrendingUp,
      href: "/pipeline",
      color: "#34d399",
      glow: "rgba(52,211,153,0.4)",
      trend: "WON / всього",
    },
  ];

  // Fake sparkline data proportional to real counts (visual only)
  const sparklines = [
    [2, 4, 3, 6, 5, 8, stats.totalLeads],
    [1, 3, 2, 4, 3, 5, stats.totalDeals],
    [3, 2, 4, 3, 5, 4, stats.totalTasks],
    [10, 20, 15, 30, 25, 40, stats.conversion],
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Top stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {topCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <Link key={c.label} href={c.href} className="block group" style={CARD}>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: `${c.color}20`, border: `1px solid ${c.color}30` }}
                  >
                    <Icon size={16} style={{ color: c.color }} />
                  </div>
                  <ArrowUpRight
                    size={14}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: c.color }}
                  />
                </div>
                <p className="text-xs text-[var(--text-muted)] mb-1">{c.label}</p>
                <p
                  className="text-3xl font-bold mb-3"
                  style={{ color: c.color, textShadow: `0 0 20px ${c.glow}` }}
                >
                  {c.value}
                </p>
                <div className="mb-3">
                  <MiniLineChart points={sparklines[i]} />
                </div>
                <p className="text-xs" style={{ color: `${c.color}aa` }}>{c.trend}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lead status donut */}
        <div style={CARD} className="p-5">
          <p className="text-sm font-semibold text-[var(--text)] mb-1">Статуси лідів</p>
          <p className="text-xs text-[var(--text-muted)] mb-5">Розподіл за статусом</p>
          <LeadDonutChart data={stats.leadsByStatus} />
        </div>

        {/* Deal pipeline bar */}
        <div style={CARD} className="p-5">
          <p className="text-sm font-semibold text-[var(--text)] mb-1">Pipeline угод</p>
          <p className="text-xs text-[var(--text-muted)] mb-4">По стадіях</p>
          <DealBarChart data={stats.dealsByStatus} />
        </div>

        {/* Task progress ring */}
        <div style={CARD} className="p-5 flex flex-col">
          <p className="text-sm font-semibold text-[var(--text)] mb-1">Задачі</p>
          <p className="text-xs text-[var(--text-muted)] mb-4">Виконання</p>
          <div className="flex-1 flex items-center justify-center">
            <TaskProgressRing done={stats.taskDone} total={taskTotal} />
          </div>
        </div>
      </div>

      {/* Recent leads */}
      <div style={CARD} className="overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">Останні ліди</p>
            <p className="text-xs text-[var(--text-muted)]">Нещодавно додані контакти</p>
          </div>
          <Link
            href="/leads"
            className="text-xs font-medium transition-opacity hover:opacity-80"
            style={{ color: "var(--accent)", textShadow: "0 0 10px var(--accent-glow)" }}
          >
            Переглянути всіх →
          </Link>
        </div>

        {stats.recentLeads.length === 0 ? (
          <div className="text-center py-10 text-[var(--text-muted)] text-sm">
            Немає лідів.{" "}
            <Link href="/leads" style={{ color: "var(--accent)" }}>
              Додати першого
            </Link>
          </div>
        ) : (
          <div>
            {stats.recentLeads.map((lead, i) => (
              <Link
                key={lead.id}
                href="/leads"
                className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.03] transition-colors"
                style={i < stats.recentLeads.length - 1 ? { borderBottom: "1px solid rgba(255,255,255,0.05)" } : {}}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-semibold text-white shrink-0"
                    style={{ background: "rgba(79,142,247,0.2)", border: "1px solid rgba(79,142,247,0.3)" }}
                  >
                    {lead.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text)] font-medium">{lead.name}</p>
                    {lead.instagram && (
                      <p className="text-xs text-[var(--text-muted)]">@{lead.instagram}</p>
                    )}
                  </div>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium ${STATUS_COLORS[lead.status] ?? "bg-zinc-500/10 text-zinc-400"}`}
                >
                  {STATUS_LABELS[lead.status] ?? lead.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
