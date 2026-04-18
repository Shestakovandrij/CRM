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
  telegram: string;
  phone: string;
  email: string;
  comment: string;
  source: string;
  geo: string;
  niche: string;
  amount: string;
  status: string;
}

const STATUSES = [
  { value: "NEW", label: "Новий" },
  { value: "CONTACTED", label: "Контакт" },
  { value: "NEGOTIATION", label: "Переговори" },
  { value: "WON", label: "Виграно" },
  { value: "LOST", label: "Програно" },
];

const SOURCES = ["Instagram", "Telegram", "Реклама", "Сайт", "Реферал", "Інше"];

const fieldCls =
  "w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--text-dim)]";
const labelCls = "block text-xs font-medium text-[var(--text-muted)] mb-1";

export function LeadForm({ onSave, onCancel, initial }: LeadFormProps) {
  const [data, setData] = useState<LeadFormData>({
    name: initial?.name ?? "",
    instagram: initial?.instagram ?? "",
    telegram: initial?.telegram ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    comment: initial?.comment ?? "",
    source: initial?.source ?? "",
    geo: initial?.geo ?? "",
    niche: initial?.niche ?? "",
    amount: initial?.amount ?? "",
    status: initial?.status ?? "NEW",
  });
  const [saving, setSaving] = useState(false);

  const set =
    (k: keyof LeadFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setData((d) => ({ ...d, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(data);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Name */}
      <div>
        <label className={labelCls}>Ім'я *</label>
        <input
          value={data.name}
          onChange={set("name")}
          required
          autoFocus
          className={fieldCls}
          placeholder="Іван Петренко"
        />
      </div>

      {/* Social */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>
            <span style={{ color: "#E4405F" }}>■</span> Instagram
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] text-sm select-none">
              @
            </span>
            <input
              value={data.instagram}
              onChange={set("instagram")}
              className={`${fieldCls} pl-7`}
              placeholder="username"
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>
            <span style={{ color: "#26A5E4" }}>■</span> Telegram
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] text-sm select-none">
              @
            </span>
            <input
              value={data.telegram}
              onChange={set("telegram")}
              className={`${fieldCls} pl-7`}
              placeholder="username"
            />
          </div>
        </div>
      </div>

      {/* Phone + Email */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Телефон</label>
          <input
            value={data.phone}
            onChange={set("phone")}
            className={fieldCls}
            placeholder="+380..."
          />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input
            value={data.email}
            onChange={set("email")}
            type="email"
            className={fieldCls}
            placeholder="email@..."
          />
        </div>
      </div>

      {/* Source + Status */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Джерело</label>
          <select value={data.source} onChange={set("source")} className={`${fieldCls} cursor-pointer`}>
            <option value="">— не вказано —</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Статус</label>
          <select value={data.status} onChange={set("status")} className={`${fieldCls} cursor-pointer`}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Geo + Niche + Amount */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Гео</label>
          <input value={data.geo} onChange={set("geo")} className={fieldCls} placeholder="UA, PL, US..." />
        </div>
        <div>
          <label className={labelCls}>Ніша</label>
          <input value={data.niche} onChange={set("niche")} className={fieldCls} placeholder="e-commerce..." />
        </div>
        <div>
          <label className={labelCls}>Сума ($)</label>
          <input
            value={data.amount}
            onChange={set("amount")}
            type="number"
            min="0"
            step="0.01"
            className={fieldCls}
            placeholder="0"
          />
        </div>
      </div>

      {/* Comment */}
      <div>
        <label className={labelCls}>Коментар</label>
        <textarea
          value={data.comment}
          onChange={set("comment")}
          rows={2}
          className={`${fieldCls} resize-none`}
          placeholder="Нотатки..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
        >
          Скасувати
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer text-black"
          style={{ background: "var(--accent)" }}
        >
          {saving ? "Збереження..." : "Зберегти"}
        </button>
      </div>
    </form>
  );
}
