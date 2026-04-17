"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
} from "recharts";

const CARD = {
  background: "rgba(19, 22, 40, 0.85)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  border: "1px solid rgba(255,255,255,0.09)",
  boxShadow: "0 4px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
  borderRadius: 16,
} as React.CSSProperties;

interface LeadStatus {
  status: string;
  _count: { status: number };
}

interface DealStatus {
  status: string;
  _count: { status: number };
}

interface Props {
  leadsByStatus: LeadStatus[];
  dealsByStatus: DealStatus[];
  taskDone: number;
  taskTotal: number;
  totalLeads: number;
  conversion: number;
}

const STATUS_COLORS: Record<string, string> = {
  NEW: "#4f8ef7",
  CONTACTED: "#22d3ee",
  NEGOTIATION: "#a78bfa",
  WON: "#34d399",
  LOST: "#f87171",
};

const DEAL_COLORS: Record<string, string> = {
  PLANNING: "#4f8ef7",
  DESIGN: "#22d3ee",
  DEVELOPMENT: "#a78bfa",
  TESTING: "#fbbf24",
  COMPLETED: "#34d399",
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "Новий",
  CONTACTED: "Контакт",
  NEGOTIATION: "Переговори",
  WON: "Виграно",
  LOST: "Програно",
  PLANNING: "Планування",
  DESIGN: "Дизайн",
  DEVELOPMENT: "Розробка",
  TESTING: "Тестування",
  COMPLETED: "Завершено",
};

export function LeadDonutChart({ data }: { data: LeadStatus[] }) {
  const chartData = data.map((d) => ({
    name: STATUS_LABELS[d.status] ?? d.status,
    value: d._count.status,
    color: STATUS_COLORS[d.status] ?? "#6b7a99",
  }));

  const total = chartData.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
        Немає даних
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-36 h-36 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={60}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "rgba(19,22,40,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                color: "#e8eaf6",
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-[var(--text)]">{total}</span>
          <span className="text-xs text-[var(--text-muted)]">лідів</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 min-w-0">
        {chartData.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="text-[var(--text-muted)] truncate">{d.name}</span>
            <span className="ml-auto font-medium text-[var(--text)]">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TaskProgressRing({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative">
        <svg width={128} height={128} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={64} cy={64} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={10} />
          <circle
            cx={64}
            cy={64}
            r={r}
            fill="none"
            stroke="url(#ring-grad)"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
          <defs>
            <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4f8ef7" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-3xl font-bold"
            style={{ color: "#4f8ef7", textShadow: "0 0 20px rgba(79,142,247,0.6)" }}
          >
            {pct}%
          </span>
        </div>
      </div>
      <p className="text-xs text-[var(--text-muted)]">{done} з {total} виконано</p>
    </div>
  );
}

export function DealBarChart({ data }: { data: DealStatus[] }) {
  const chartData = data.map((d) => ({
    name: STATUS_LABELS[d.status] ?? d.status,
    value: d._count.status,
    fill: DEAL_COLORS[d.status] ?? "#6b7a99",
  }));

  if (chartData.every((d) => d.value === 0)) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
        Немає даних
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={130}>
      <BarChart data={chartData} barSize={28}>
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: "#6b7a99" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide allowDecimals={false} />
        <Tooltip
          cursor={{ fill: "rgba(79,142,247,0.05)" }}
          contentStyle={{
            background: "rgba(19,22,40,0.95)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            color: "#e8eaf6",
            fontSize: 12,
          }}
        />
        <Bar dataKey="value" name="Deals" radius={[6, 6, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.fill} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MiniLineChart({ points }: { points: number[] }) {
  const data = points.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={60}>
      <LineChart data={data}>
        <defs>
          <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4f8ef7" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <Line
          type="monotone"
          dataKey="v"
          stroke="url(#line-grad)"
          strokeWidth={2.5}
          dot={false}
          strokeLinecap="round"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export { CARD };
