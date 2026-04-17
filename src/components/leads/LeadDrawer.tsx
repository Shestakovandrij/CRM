"use client";

import { useState, useEffect, useCallback } from "react";
import { X, AtSign, Phone, Mail, Plus, CheckSquare, Clock, MessageSquare, AlertCircle, Briefcase } from "lucide-react";
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
  phone: string | null;
  email: string | null;
  comment: string | null;
  source: string | null;
  status: string;
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
  const [showTask, setShowTask] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchLead = useCallback(async () => {
    const res = await fetch(`/api/leads/${leadId}`);
    setLead(await res.json());
  }, [leadId]);

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
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="ml-auto w-full max-w-xl bg-[var(--surface)] flex items-center justify-center">
          <span className="text-[var(--text-muted)] text-sm">Завантаження...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="ml-auto w-full max-w-xl bg-[var(--surface)] border-l border-[var(--border)] flex flex-col h-full overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between px-5 py-4 border-b border-[var(--border)]">
            <div>
              <h2 className="font-semibold text-[var(--text)]">{lead.name}</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Створено {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true, locale: uk })}
              </p>
            </div>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors cursor-pointer">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Info */}
            <div className="space-y-2">
              {lead.instagram && (
                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  <AtSign size={14} /><span>{lead.instagram}</span>
                </div>
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
