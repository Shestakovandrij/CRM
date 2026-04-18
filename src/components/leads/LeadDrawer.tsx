"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Phone, Mail, Plus, CheckSquare, Clock, MessageSquare, AlertCircle, Briefcase, MapPin, Tag, DollarSign, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { TaskForm } from "@/components/tasks/TaskForm";
import { formatDistanceToNow, format } from "date-fns";
import { uk } from "date-fns/locale";

interface Activity {
  id: string;
  type: string;
  content: string;
  createdAt: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  deadline: string | null;
}

interface Deal {
  id: string;
  company: string | null;
  status: string;
  budget: number | null;
}

interface LeadDetail {
  id: string;
  name: string;
  instagram: string | null;
  telegram: string | null;
  phone: string | null;
  email: string | null;
  comment: string | null;
  source: string | null;
  geo: string | null;
  niche: string | null;
  amount: number | null;
  status: string;
  remindAt: string | null;
  remindSent: boolean;
  createdAt: string;
  tasks: Task[];
  activities: Activity[];
  deals: Deal[];
}

const STATUSES = ["NEW", "CONTACTED", "NEGOTIATION", "WON", "LOST"];
const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  NOTE: <MessageSquare size={12} />,
  STATUS_CHANGE: <AlertCircle size={12} />,
  TASK_CREATED: <CheckSquare size={12} />,
  TASK_DONE: <CheckSquare size={12} />,
  DEAL_CREATED: <Briefcase size={12} />,
  DEFAULT: <Clock size={12} />,
};

export default function LeadDrawer({
  leadId,
  onClose,
  onUpdate,
}: {
  leadId: string;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [note, setNote] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [savingRemind, setSavingRemind] = useState(false);
  const [showTask, setShowTask] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchLead = useCallback(async () => {
    const res = await fetch(`/api/leads/${leadId}`);
    const data: LeadDetail = await res.json();
    setLead(data);
    if (data.remindAt) {
      setRemindAt(data.remindAt.slice(0, 16));
    }
  }, [leadId]);

  async function saveRemind() {
    if (!remindAt) return;
    setSavingRemind(true);
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remindAt: new Date(remindAt).toISOString(), remindSent: false }),
    });
    setSavingRemind(false);
    fetchLead();
  }

  useEffect(() => { fetchLead(); }, [fetchLead]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function changeStatus(status: string) {
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchLead();
    onUpdate();
  }

  async function addNote() {
    if (!note.trim()) return;
    setSaving(true);
    await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, content: note }),
    });
    setNote("");
    setSaving(false);
    fetchLead();
  }

  async function toggleTask(taskId: string, current: string) {
    const next = current === "DONE" ? "TODO" : "DONE";
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    fetchLead();
  }

  async function createTask(data: Record<string, unknown>) {
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, leadId }),
    });
    setShowTask(false);
    fetchLead();
  }

  if (!lead) {
    return (
      <div className="fixed inset-0 z-40 flex">
        <div className="absolute inset-0 bg-black/40 z-0" onClick={onClose} />
        <div className="relative z-10 ml-auto w-full max-w-xl bg-[var(--surface)] flex items-center justify-center">
          <span className="text-[var(--text-muted)] text-sm">Завантаження...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex">
        <div className="absolute inset-0 bg-black/40 z-0" onClick={onClose} />
        <div className="relative z-10 ml-auto w-full max-w-xl bg-[var(--surface)] border-l border-[var(--border)] flex flex-col h-full overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between px-5 py-4 border-b border-[var(--border)]">
            <div>
              <h2 className="font-semibold text-[var(--text)]">{lead.name}</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Створено {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true, locale: uk })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Зустріч з ${lead.name}`)}&details=${encodeURIComponent(`CRM Lead: ${lead.name}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Створити Google Meet"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80 cursor-pointer"
                style={{
                  background: "rgba(66,133,244,0.12)",
                  border: "1px solid rgba(66,133,244,0.25)",
                  color: "#4285F4",
                }}
              >
                <Video size={13} />
                Meet
              </a>
              <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Info */}
            <div className="space-y-2">
              {/* Social links */}
              {lead.instagram && (
                <a
                  href={`https://instagram.com/${lead.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm hover:opacity-75 transition-opacity"
                  style={{ color: "#E4405F" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  @{lead.instagram}
                </a>
              )}
              {lead.telegram && (
                <a
                  href={`https://t.me/${lead.telegram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm hover:opacity-75 transition-opacity"
                  style={{ color: "#26A5E4" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                  @{lead.telegram}
                </a>
              )}
              {lead.phone && (
                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  <Phone size={14} /><span>{lead.phone}</span>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  <Mail size={14} /><span>{lead.email}</span>
                </div>
              )}
              {/* Meta info */}
              <div className="flex flex-wrap gap-3 pt-1">
                {lead.source && (
                  <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    <Tag size={11} />{lead.source}
                  </span>
                )}
                {lead.geo && (
                  <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    <MapPin size={11} />{lead.geo}
                  </span>
                )}
                {lead.niche && (
                  <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    {lead.niche}
                  </span>
                )}
                {lead.amount && (
                  <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--accent)" }}>
                    <DollarSign size={11} />{lead.amount.toLocaleString()}
                  </span>
                )}
              </div>
              {lead.comment && (
                <p className="text-sm text-[var(--text)] bg-[var(--surface-2)] px-3 py-2 rounded-lg">
                  {lead.comment}
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <p className="text-xs font-medium text-[var(--text-muted)] mb-2 uppercase tracking-wide">Статус</p>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => changeStatus(s)}
                    className={`px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                      lead.status === s
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Deals */}
            {lead.deals.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)] mb-2 uppercase tracking-wide">Клієнти</p>
                <div className="space-y-1.5">
                  {lead.deals.map((d) => (
                    <div key={d.id} className="flex items-center justify-between bg-[var(--surface-2)] px-3 py-2 rounded-lg">
                      <span className="text-sm text-[var(--text)]">{d.company ?? "Без назви"}</span>
                      <div className="flex items-center gap-2">
                        {d.budget && <span className="text-xs text-[var(--text-muted)]">${d.budget.toLocaleString()}</span>}
                        <Badge value={d.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Задачі</p>
                <button
                  onClick={() => setShowTask(true)}
                  className="flex items-center gap-1 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors cursor-pointer"
                >
                  <Plus size={12} />Додати
                </button>
              </div>
              {lead.tasks.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">Задач немає</p>
              ) : (
                <div className="space-y-1.5">
                  {lead.tasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-2.5 bg-[var(--surface-2)] px-3 py-2 rounded-lg">
                      <button
                        onClick={() => toggleTask(task.id, task.status)}
                        className={`mt-0.5 shrink-0 w-4 h-4 rounded border cursor-pointer transition-colors ${
                          task.status === "DONE"
                            ? "bg-[var(--success)] border-[var(--success)]"
                            : "border-[var(--border)] hover:border-[var(--accent)]"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${task.status === "DONE" ? "line-through text-[var(--text-muted)]" : "text-[var(--text)]"}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge value={task.priority} />
                          {task.deadline && (
                            <span className="text-xs text-[var(--text-muted)]">
                              {format(new Date(task.deadline), "d MMM", { locale: uk })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div>
              <p className="text-xs font-medium text-[var(--text-muted)] mb-2 uppercase tracking-wide">Timeline</p>
              <div className="relative pl-5 space-y-3">
                <div className="absolute left-1.5 top-0 bottom-0 w-px bg-[var(--border)]" />
                {lead.activities.map((a) => (
                  <div key={a.id} className="relative">
                    <div className="absolute -left-3.5 top-1 w-3 h-3 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]">
                      {ACTIVITY_ICONS[a.type] ?? ACTIVITY_ICONS.DEFAULT}
                    </div>
                    <div>
                      <p className="text-sm text-[var(--text)]">{a.content}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true, locale: uk })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Remind */}
          <div
            className="px-5 py-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
          >
            <p className="text-xs mb-1.5 flex items-center gap-1" style={{ color: "#4285F4" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              Нагадування в Telegram
              {lead.remindAt && lead.remindSent && (
                <span className="text-[#22c55e] text-xs ml-1">· відправлено</span>
              )}
            </p>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={remindAt}
                onChange={(e) => setRemindAt(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg text-sm focus:outline-none transition-colors"
                style={{
                  background: "var(--surface-2)",
                  border: remindAt ? "1px solid rgba(66,133,244,0.5)" : "1px solid var(--border)",
                  color: "var(--text)",
                }}
              />
              <button
                onClick={saveRemind}
                disabled={!remindAt || savingRemind}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-40 cursor-pointer"
                style={{ background: "rgba(66,133,244,0.15)", border: "1px solid rgba(66,133,244,0.3)", color: "#4285F4" }}
              >
                {savingRemind ? "..." : "Зберегти"}
              </button>
            </div>
          </div>

          {/* Add note */}
          <div className="px-5 py-4 border-t border-[var(--border)]">
            <div className="flex gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addNote(); } }}
                placeholder="Додати нотатку... (Enter)"
                className="flex-1 px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
              <button
                onClick={addNote}
                disabled={!note.trim() || saving}
                className="px-3 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal open={showTask} onClose={() => setShowTask(false)} title="Нова задача" size="sm">
        <TaskForm onSave={createTask} onCancel={() => setShowTask(false)} />
      </Modal>
    </>
  );
}
