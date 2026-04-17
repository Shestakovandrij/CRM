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

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  NEW:         { label: "Новий",       cls: "text-[#00e5a0] bg-[#00e5a0]/10 border border-[#00e5a0]/20" },
  CONTACTED:   { label: "Контакт",    cls: "text-cyan-400 bg-cyan-400/10 border border-cyan-400/20" },
  NEGOTIATION: { label: "Переговори", cls: "text-violet-400 bg-violet-400/10 border border-violet-400/20" },
  WON:         { label: "Виграно",    cls: "text-[#00e5a0] bg-[#00e5a0]/10 border border-[#00e5a0]/20" },
  LOST:        { label: "Програно",   cls: "text-red-400 bg-red-400/10 border border-red-400/20" },
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
      color: "#00e5a0",
      glow: "rgba(0,229,160,0.45)",
      trend: "+12% цього місяця",
    },
    {
      label: "Активні угоди",
      value: stats.totalDeals,
      icon: Briefcase,
      href: "/clients",
      color: "#22d3ee",
      glow: "rgba(34,211,238,0.40)",
      trend: "+5% нових",
    },
    {
      label: "Задачі",
      value: stats.totalTasks,
      icon: CheckSquare,
      href: "/tasks",
      color: "#a78bfa",
      glow: "rgba(167,139,250,0.40)",
      trend: stats.overdueTasks > 0 ? `-${stats.overdueTasks} прострочено` : "Все вчасно",
    },
    {
      label: "Конверсія",
      value: `${stats.conversion}%`,
      icon: TrendingUp,
      href: "/pipeline",
      color: "#00e5a0",
      glow: "rgba(0,229,160,0.45)",
      trend: "WON / всього лідів",
    },
  ];

  const sparklines = [
    [2, 4, 3, 6, 5, 8, stats.totalLeads],
    [1, 3, 2, 4, 3, 5, stats.totalDeals],
    [3, 2, 4, 3, 5, 4, stats.totalTasks],
    [10, 20, 15, 30, 25, 40, stats.conversion],
  ];

  return (
    <div className="p-6 space-y-5 relative z-10">

      {/* Top stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {topCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <Link key={c.label} href={c.href} className="block group cursor-pointer" style={CARD}>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      background: `${c.color}18`,
                      border: `1px solid ${c.color}28`,
                    }}
                  >
                    <Icon size={16} style={{ color: c.color }} />
                  </div>
                  <ArrowUpRight
                    size={14}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: c.color }}
                  />
                </div>

                <p className="text-xs text-[var(--text-muted)] mb-1 font-medium">{c.label}</p>
                <p
                  className="text-3xl font-bold mb-3"
                  style={{ color: c.color, textShadow: `0 0 24px ${c.glow}` }}
                >
                  {c.value}
                </p>

                <div className="mb-2.5">
                  <MiniLineChart points={sparklines[i]} />
                </div>

                <p className="text-xs" style={{ color: `${c.color}99` }}>{c.trend}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lead status donut */}
        <div style={CARD} className="p-5">
          <p className="text-sm font-semibold text-[var(--text)] mb-0.5">Статуси лідів</p>
          <p className="text-xs text-[var(--text-muted)] mb-5">Розподіл за статусом</p>
          <LeadDonutChart data={stats.leadsByStatus} />
        </div>

        {/* Deal pipeline bar */}
        <div style={CARD} className="p-5">
          <p className="text-sm font-semibold text-[var(--text)] mb-0.5">Pipeline угод</p>
          <p className="text-xs text-[var(--text-muted)] mb-4">По стадіях</p>
          <DealBarChart data={stats.dealsByStatus} />
        </div>

        {/* Task progress ring */}
        <div style={CARD} className="p-5 flex flex-col">
          <p className="text-sm font-semibold text-[var(--text)] mb-0.5">Задачі</p>
          <p className="text-xs text-[var(--text-muted)] mb-4">Прогрес виконання</p>
          <div className="flex-1 flex items-center justify-center">
            <TaskProgressRing done={stats.taskDone} total={taskTotal} />
          </div>
        </div>
      </div>

      {/* Recent leads */}
      <div style={CARD} className="overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(0,229,160,0.07)" }}
        >
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">Останні ліди</p>
            <p className="text-xs text-[var(--text-muted)]">Нещодавно додані контакти</p>
          </div>
          <Link
            href="/leads"
            className="text-xs font-semibold transition-opacity hover:opacity-80"
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
                className="flex items-center justify-between px-5 py-3.5 hover:bg-[rgba(0,229,160,0.03)] transition-colors cursor-pointer"
                style={
                  i < stats.recentLeads.length - 1
                    ? { borderBottom: "1px solid rgba(0,229,160,0.05)" }
                    : {}
                }
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: "rgba(0,229,160,0.12)",
                      border: "1px solid rgba(0,229,160,0.20)",
                      color: "var(--accent)",
                    }}
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
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium ${STATUS_BADGE[lead.status]?.cls ?? "bg-zinc-500/10 text-zinc-400 border border-zinc-400/20"}`}
                >
                  {STATUS_BADGE[lead.status]?.label ?? lead.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
