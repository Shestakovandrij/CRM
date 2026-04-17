import { db } from "@/lib/db";
import Link from "next/link";

async function getStats() {
  const [totalLeads, totalDeals, totalTasks, recentLeads, overdueTasks] = await Promise.all([
    db.lead.count(),
    db.deal.count(),
    db.task.count({ where: { status: { not: "DONE" } } }),
    db.lead.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, status: true, instagram: true, createdAt: true } }),
    db.task.count({ where: { status: { not: "DONE" }, deadline: { lt: new Date() } } }),
  ]);

  const wonLeads = await db.lead.count({ where: { status: "WON" } });
  const conversion = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  return { totalLeads, totalDeals, totalTasks, recentLeads, overdueTasks, conversion };
}

const statusColors: Record<string, string> = {
  NEW: "bg-blue-500/15 text-blue-400",
  CONTACTED: "bg-yellow-500/15 text-yellow-400",
  NEGOTIATION: "bg-purple-500/15 text-purple-400",
  WON: "bg-green-500/15 text-green-400",
  LOST: "bg-red-500/15 text-red-400",
};

const glassCard = {
  background: "rgba(20, 20, 36, 0.82)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 4px 28px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
} as React.CSSProperties;

export default async function DashboardPage() {
  const stats = await getStats();

  const cards = [
    { label: "Всього лідів", value: stats.totalLeads, href: "/leads", color: "text-blue-400" },
    { label: "Клієнти (deals)", value: stats.totalDeals, href: "/clients", color: "text-purple-400" },
    { label: "Активні задачі", value: stats.totalTasks, href: "/tasks", color: "text-yellow-400" },
    { label: "Прострочено", value: stats.overdueTasks, href: "/tasks", color: stats.overdueTasks > 0 ? "text-red-400" : "text-green-400" },
    { label: "Конверсія", value: `${stats.conversion}%`, href: "/pipeline", color: "text-green-400" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-[var(--text)]">Dashboard</h1>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">Огляд CRM</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-2xl p-4 hover:scale-[1.02] transition-transform duration-200 cursor-pointer"
            style={glassCard}
          >
            <p className="text-xs text-[var(--text-muted)]">{c.label}</p>
            <p className={`text-2xl font-semibold mt-1 ${c.color}`}>{c.value}</p>
          </Link>
        ))}
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={glassCard}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <p className="text-sm font-medium text-[var(--text)]">Останні ліди</p>
          <Link
            href="/leads"
            className="text-xs text-[var(--accent)] hover:opacity-80 transition-opacity"
            style={{ textShadow: "0 0 12px var(--accent-glow)" }}
          >
            Переглянути всіх →
          </Link>
        </div>
        <div>
          {stats.recentLeads.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)] text-sm">
              Немає лідів.{" "}
              <Link href="/leads" className="text-[var(--accent)]">
                Додати першого
              </Link>
            </div>
          ) : (
            stats.recentLeads.map((lead: (typeof stats.recentLeads)[number]) => (
              <Link
                key={lead.id}
                href="/leads"
                className="flex items-center justify-between px-5 py-3 transition-colors duration-150"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
              >
                <div>
                  <p className="text-sm text-[var(--text)]">{lead.name}</p>
                  {lead.instagram && (
                    <p className="text-xs text-[var(--text-muted)]">{lead.instagram}</p>
                  )}
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-lg ${statusColors[lead.status] ?? "bg-zinc-500/15 text-zinc-400"}`}
                >
                  {lead.status}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
