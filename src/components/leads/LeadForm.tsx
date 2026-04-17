"use client";

import { useState } from "react";

interface LeadFormProps {
  onSave: (data: LeadFormData) => Promise<void>;
  onCancel: () => void;
  initial?: Partial<LeadFormData>;
}

export interface LeadFormData {
  name: string;
  instagram: string;
  phone: string;
  email: string;
  comment: string;
  source: string;
  status: string;
}

const statuses = ["NEW", "CONTACTED", "NEGOTIATION", "WON", "LOST"];

export function LeadForm({ onSave, onCancel, initial }: LeadFormProps) {
  const [data, setData] = useState<LeadFormData>({
    name: initial?.name ?? "",
    instagram: initial?.instagram ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    comment: initial?.comment ?? "",
    source: initial?.source ?? "",
    status: initial?.status ?? "NEW",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof LeadFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setData((d) => ({ ...d, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try { await onSave(data); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <label className="text-xs text-[var(--text-muted)]">Ім'я *</label>
          <input
            value={data.name} onChange={set("name")} required autoFocus
            className="input w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
            placeholder="Іван Петренко"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[var(--text-muted)]">Instagram</label>
          <input
            value={data.instagram} onChange={set("instagram")}
            className="input w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
            placeholder="@username"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[var(--text-muted)]">Телефон</label>
          <input
            value={data.phone} onChange={set("phone")}
            className="input w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
            placeholder="+380..."
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[var(--text-muted)]">Email</label>
          <input
            value={data.email} onChange={set("email")} type="email"
            className="input w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
            placeholder="email@example.com"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[var(--text-muted)]">Джерело</label>
          <input
            value={data.source} onChange={set("source")}
            className="input w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
            placeholder="Instagram, реклама..."
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[var(--text-muted)]">Статус</label>
          <select
            value={data.status} onChange={set("status")}
            className="input w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors cursor-pointer"
          >
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="col-span-2 space-y-1">
          <label className="text-xs text-[var(--text-muted)]">Коментар</label>
          <textarea
            value={data.comment} onChange={set("comment")} rows={2}
            className="input w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
            placeholder="Нотатки про ліда..."
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors cursor-pointer">
          Скасувати
        </button>
        <button
          type="submit" disabled={saving}
          className="px-4 py-2 text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving ? "Збереження..." : "Зберегти"}
        </button>
      </div>
    </form>
  );
}
