"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format } from "date-fns";
import { uk } from "date-fns/locale";

interface Deal {
  id: string;
  company: string | null;
  description: string | null;
  budget: number | null;
  deadline: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  lead: { id: string; name: string; instagram: string | null };
  _count: { tasks: number };
}

const STATUSES = ["PLANNING", "DESIGN", "DEVELOPMENT", "TESTING", "COMPLETED"];

function DealForm({
  onSave, onCancel, leads, initial,
}: {
  onSave: (d: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  leads: { id: string; name: string }[];
  initial?: Partial<Deal>;
}) {
  const [data, setData] = useState({
    leadId: initial?.lead?.id ?? "",
    company: initial?.company ?? "",
    description: initial?.description ?? "",
    budget: initial?.budget?.toString() ?? "",
    deadline: initial?.deadline ? initial.deadline.slice(0, 10) : "",
    status: initial?.status ?? "PLANNING",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setData((d) => ({ ...d, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...data, budget: data.budget ? parseFloat(data.budget) : null, deadline: data.deadline || null });
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs text-[var(--text-muted)]">Лід *</label>
        <select value={data.leadId} onChange={set("leadId")} required
          className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors cursor-pointer">
          <option value="">Оберіть ліда</option>
          {leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-[var(--text-muted)]">Компанія / Ім'я</label>
          <input value={data.company} onChange={set("company")} autoFocus
            className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
            placeholder="Назва клієнта" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[var(--text-muted)]">Бюджет ($)</label>
          <input type="number" value={data.budget} onChange={set("budget")}
            className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
            placeholder="0" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[var(--text-muted)]">Дедлайн</label>
          <input type="date" value={data.deadline} onChange={set("deadline")}
            className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[var(--text-muted)]">Статус</label>
          <select value={data.status} onChange={set("status")}
            className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors cursor-pointer">
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-[var(--text-muted)]">Опис проєкту</label>
        <textarea value={data.description} onChange={set("description")} rows={2}
          className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
          placeholder="Деталі проєкту..." />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors cursor-pointer">Скасувати</button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer">
          {saving ? "..." : "Зберегти"}
        </button>
      </div>
    </form>
  );
}

export default function ClientsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [leads, setLeads] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Всі");
  const [showCreate, setShowCreate] = useState(false);
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (statusFilter !== "Всі") params.set("status", statusFilter);
    const [dealsRes, leadsRes] = await Promise.all([
      fetch(`/api/deals?${params}`),
      fetch("/api/leads"),
    ]);
    setDeals(await dealsRes.json());
    setLeads(await leadsRes.json());
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(fetchAll, 200);
    return () => clearTimeout(t);
  }, [fetchAll]);

  async function createDeal(data: Record<string, unknown>) {
    await fetch("/api/deals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setShowCreate(false);
    fetchAll();
  }

  async function updateDeal(data: Record<string, unknown>) {
    if (!editDeal) return;
    await fetch(`/api/deals/${editDeal.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setEditDeal(null);
    fetchAll();
  }

  async function deleteDeal(id: string) {
    if (!confirm("Видалити клієнта?")) return;
    await fetch(`/api/deals/${id}`, { method: "DELETE" });
    fetchAll();
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text)]">Clients</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{deals.length} клієнтів</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm rounded-lg transition-colors cursor-pointer">
          <Plus size={15} />Новий клієнт
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Пошук..."
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors" />
        </div>
        <div className="flex gap-1">
          {["Всі", ...STATUSES].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${statusFilter === s ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Клієнт</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Лід</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Статус</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Бюджет</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Дедлайн</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Оновлено</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-[var(--text-muted)]">Завантаження...</td></tr>
            ) : deals.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-[var(--text-muted)]">Клієнтів немає</td></tr>
            ) : (
              deals.map((deal) => (
                <tr key={deal.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--text)]">{deal.company ?? "Без назви"}</div>
                    {deal.description && <div className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">{deal.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{deal.lead.name}</td>
                  <td className="px-4 py-3"><Badge value={deal.status} /></td>
                  <td className="px-4 py-3 text-sm text-[var(--text)]">
                    {deal.budget ? `$${deal.budget.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {deal.deadline ? format(new Date(deal.deadline), "d MMM yyyy", { locale: uk }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {formatDistanceToNow(new Date(deal.updatedAt), { addSuffix: true, locale: uk })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditDeal(deal)}
                        className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-colors cursor-pointer"><Pencil size={13} /></button>
                      <button onClick={() => deleteDeal(deal.id)}
                        className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--border)] transition-colors cursor-pointer"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Новий клієнт">
        <DealForm onSave={createDeal} onCancel={() => setShowCreate(false)} leads={leads} />
      </Modal>
      <Modal open={!!editDeal} onClose={() => setEditDeal(null)} title="Редагувати клієнта">
        {editDeal && <DealForm onSave={updateDeal} onCancel={() => setEditDeal(null)} leads={leads} initial={editDeal} />}
      </Modal>
    </div>
  );
}
