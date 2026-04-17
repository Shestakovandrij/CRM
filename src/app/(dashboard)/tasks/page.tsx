"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { TaskForm } from "@/components/tasks/TaskForm";
import { format, isPast } from "date-fns";
import { uk } from "date-fns/locale";

interface Task {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: string;
  priority: string;
  lead: { id: string; name: string } | null;
  deal: { id: string; company: string | null } | null;
}

const STATUS_FILTERS = ["Всі", "TODO", "IN_PROGRESS", "DONE"];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Всі");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter !== "Всі") params.set("status", statusFilter);
    const res = await fetch(`/api/tasks?${params}`);
    const data: Task[] = await res.json();
    const filtered = search
      ? data.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
      : data;
    setTasks(filtered);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(fetchTasks, 200);
    return () => clearTimeout(t);
  }, [fetchTasks]);

  async function createTask(data: Record<string, unknown>) {
    await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setShowCreate(false);
    fetchTasks();
  }

  async function toggleTask(task: Task) {
    const next = task.status === "DONE" ? "TODO" : "DONE";
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    fetchTasks();
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    fetchTasks();
  }

  const overdue = tasks.filter((t) => t.status !== "DONE" && t.deadline && isPast(new Date(t.deadline)));
  const rest = tasks.filter((t) => !(t.status !== "DONE" && t.deadline && isPast(new Date(t.deadline))));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text)]">Tasks</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{tasks.length} задач</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm rounded-lg transition-colors cursor-pointer">
          <Plus size={15} />Нова задача
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Пошук..."
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors" />
        </div>
        <div className="flex gap-1">
          {STATUS_FILTERS.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${statusFilter === s ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]"}`}>
              {s === "IN_PROGRESS" ? "In Progress" : s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-muted)]">Завантаження...</div>
      ) : (
        <div className="space-y-4">
          {overdue.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[var(--danger)] uppercase tracking-wide mb-2">Прострочені</p>
              <TaskList tasks={overdue} onToggle={toggleTask} onDelete={deleteTask} />
            </div>
          )}
          {rest.length > 0 && (
            <div>
              {overdue.length > 0 && <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">Інші</p>}
              <TaskList tasks={rest} onToggle={toggleTask} onDelete={deleteTask} />
            </div>
          )}
          {tasks.length === 0 && (
            <div className="text-center py-12 text-[var(--text-muted)]">Задач немає</div>
          )}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Нова задача" size="sm">
        <TaskForm onSave={createTask} onCancel={() => setShowCreate(false)} />
      </Modal>
    </div>
  );
}

function TaskList({ tasks, onToggle, onDelete }: { tasks: Task[]; onToggle: (t: Task) => void; onDelete: (id: string) => void }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl divide-y divide-[var(--border)]">
      {tasks.map((task) => (
        <div key={task.id} className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--surface-2)] transition-colors">
          <button
            onClick={() => onToggle(task)}
            className={`mt-0.5 shrink-0 w-4 h-4 rounded border cursor-pointer transition-colors ${
              task.status === "DONE" ? "bg-[var(--success)] border-[var(--success)]" : "border-[var(--border)] hover:border-[var(--accent)]"
            }`}
          />
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${task.status === "DONE" ? "line-through text-[var(--text-muted)]" : "text-[var(--text)]"}`}>
              {task.title}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Badge value={task.priority} />
              <Badge value={task.status} />
              {task.deadline && (
                <span className={`text-xs ${task.status !== "DONE" && isPast(new Date(task.deadline)) ? "text-[var(--danger)]" : "text-[var(--text-muted)]"}`}>
                  {format(new Date(task.deadline), "d MMM yyyy", { locale: uk })}
                </span>
              )}
              {task.lead && <span className="text-xs text-[var(--text-muted)]">← {task.lead.name}</span>}
              {task.deal && <span className="text-xs text-[var(--text-muted)]">← {task.deal.company ?? "Deal"}</span>}
            </div>
          </div>
          <button onClick={() => onDelete(task.id)}
            className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors cursor-pointer text-xs mt-0.5">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
