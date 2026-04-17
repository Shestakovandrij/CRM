"use client";

import { useState } from "react";

interface TaskFormProps {
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

export function TaskForm({ onSave, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ title, description, deadline: deadline || null, priority, status: "TODO" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs text-[var(--text-muted)]">Назва *</label>
        <input
          value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus
          className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
          placeholder="Назва задачі"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-[var(--text-muted)]">Опис</label>
        <textarea
          value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
          className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
          placeholder="Деталі..."
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-[var(--text-muted)]">Дедлайн</label>
          <input
            type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[var(--text-muted)]">Пріоритет</label>
          <select
            value={priority} onChange={(e) => setPriority(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors cursor-pointer"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors cursor-pointer">
          Скасувати
        </button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer">
          {saving ? "..." : "Зберегти"}
        </button>
      </div>
    </form>
  );
}
