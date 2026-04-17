"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, AtSign, Phone, Mail, Pencil, Trash2, ChevronRight } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { LeadForm, type LeadFormData } from "@/components/leads/LeadForm";
import LeadDrawer from "@/components/leads/LeadDrawer";
import { formatDistanceToNow } from "date-fns";
import { uk } from "date-fns/locale";

interface Lead {
  id: string;
  name: string;
  instagram: string | null;
  phone: string | null;
  email: string | null;
  comment: string | null;
  source: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count: { tasks: number; deals: number };
}

const STATUS_FILTERS = ["Всі", "NEW", "CONTACTED", "NEGOTIATION", "WON", "LOST"];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Всі");
  const [showCreate, setShowCreate] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [openLead, setOpenLead] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (statusFilter !== "Всі") params.set("status", statusFilter);
    const res = await fetch(`/api/leads?${params}`);
    const data = await res.json();
    setLeads(data);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(fetchLeads, 200);
    return () => clearTimeout(t);
  }, [fetchLeads]);

  async function createLead(data: LeadFormData) {
    await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setShowCreate(false);
    fetchLeads();
  }

  async function updateLead(data: LeadFormData) {
    if (!editLead) return;
    await fetch(`/api/leads/${editLead.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setEditLead(null);
    fetchLeads();
  }

  async function deleteLead(id: string) {
    if (!confirm("Видалити ліда?")) return;
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
    fetchLeads();
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text)]">Leads</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{leads.length} контактів</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm rounded-lg transition-colors cursor-pointer"
        >
          <Plus size={15} />
          Новий лід
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук..."
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
        <div className="flex gap-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                statusFilter === s
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Ім'я</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Контакти</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Статус</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Джерело</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Оновлено</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-[var(--text-muted)]">Завантаження...</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-[var(--text-muted)]">Лідів немає</td></tr>
            ) : (
              leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
                  onClick={() => setOpenLead(lead.id)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--text)]">{lead.name}</div>
                    {lead.comment && (
                      <div className="text-xs text-[var(--text-muted)] truncate max-w-[180px]">{lead.comment}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      {lead.instagram && (
                        <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                          <AtSign size={11} />{lead.instagram}
                        </span>
                      )}
                      {lead.phone && (
                        <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                          <Phone size={11} />{lead.phone}
                        </span>
                      )}
                      {lead.email && (
                        <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                          <Mail size={11} />{lead.email}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge value={lead.status} /></td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{lead.source ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true, locale: uk })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setEditLead(lead)}
                        className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-colors cursor-pointer"
                      ><Pencil size={13} /></button>
                      <button
                        onClick={() => deleteLead(lead.id)}
                        className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--border)] transition-colors cursor-pointer"
                      ><Trash2 size={13} /></button>
                      <ChevronRight size={13} className="text-[var(--text-muted)]" />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Новий лід">
        <LeadForm onSave={createLead} onCancel={() => setShowCreate(false)} />
      </Modal>

      <Modal open={!!editLead} onClose={() => setEditLead(null)} title="Редагувати ліда">
        {editLead && (
          <LeadForm
            onSave={updateLead}
            onCancel={() => setEditLead(null)}
            initial={{
              ...editLead,
              instagram: editLead.instagram ?? undefined,
              phone: editLead.phone ?? undefined,
              email: editLead.email ?? undefined,
              comment: editLead.comment ?? undefined,
              source: editLead.source ?? undefined,
            }}
          />
        )}
      </Modal>

      {openLead && (
        <LeadDrawer
          leadId={openLead}
          onClose={() => setOpenLead(null)}
          onUpdate={fetchLeads}
        />
      )}
    </div>
  );
}
