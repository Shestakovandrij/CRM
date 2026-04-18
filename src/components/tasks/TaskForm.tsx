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
  const [remindAt, setRemindAt] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [assignee, setAssignee] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ title, description, deadline: deadline || null, remindAt: remindAt || null, priority, status: "TODO", assignee: assignee || null });
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
            <option value="LOW">Низький</option>
            <option value="MEDIUM">Середній</option>
            <option value="HIGH">Високий</option>
            <option value="URGENT">Терміново</option>
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-[var(--text-muted)]">Відповідальний</label>
        <div className="flex gap-2">
          {["Андрій", "Лідусик"].map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setAssignee(assignee === name ? "" : name)}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              style={{
                background: assignee === name ? "var(--accent)" : "var(--surface-2)",
                color: assignee === name ? "#000" : "var(--text-muted)",
                border: `1px solid ${assignee === name ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs flex items-center gap-1" style={{ color: "#4285F4" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          Нагадування в Telegram
        </label>
        <input
          type="datetime-local"
          value={remindAt}
          onChange={(e) => setRemindAt(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border text-[var(--text)] text-sm focus:outline-none transition-colors"
          style={{ borderColor: remindAt ? "rgba(66,133,244,0.5)" : "var(--border)" }}
        />
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
