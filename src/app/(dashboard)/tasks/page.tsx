"use client";

import { useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Plus, AlertTriangle, Clock } from "lucide-react";
import { Modal } from "@/components/ui/modal";
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
  assignee: string | null;
  lead: { id: string; name: string } | null;
  deal: { id: string; company: string | null } | null;
}

const COLUMNS = [
  {
    id: "TODO",
    label: "To Do",
    color: "#6b7280",
    glow: "rgba(107,114,128,0.15)",
    border: "rgba(107,114,128,0.25)",
    bg: "rgba(107,114,128,0.04)",
    dot: "#6b7280",
  },
  {
    id: "IN_PROGRESS",
    label: "In Progress",
    color: "#22d3ee",
    glow: "rgba(34,211,238,0.15)",
    border: "rgba(34,211,238,0.25)",
    bg: "rgba(34,211,238,0.04)",
    dot: "#22d3ee",
  },
  {
    id: "DONE",
    label: "Виконано",
    color: "#22c55e",
    glow: "rgba(34,197,94,0.15)",
    border: "rgba(34,197,94,0.25)",
    bg: "rgba(34,197,94,0.04)",
    dot: "#22c55e",
  },
];

const PRIORITY_CFG: Record<string, { label: string; color: string; bg: string }> = {
  LOW:    { label: "Низький",    color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
  MEDIUM: { label: "Середній",  color: "#C98C0A",  bg: "rgba(201,140,10,0.12)" },
  HIGH:   { label: "Високий",   color: "#f97316",  bg: "rgba(249,115,22,0.12)" },
  URGENT: { label: "Терміново", color: "#ef4444",  bg: "rgba(239,68,68,0.14)" },
};

const ASSIGNEES = ["Всі", "Андрій", "Лідусик"] as const;
type AssigneeFilter = typeof ASSIGNEES[number];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>("Всі");

  const fetchTasks = useCallback(async () => {
    const res = await fetch("/api/tasks");
    const data: Task[] = await res.json();
    setTasks(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  async function createTask(data: Record<string, unknown>) {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setShowCreate(false);
      fetchTasks();
    }
  }

  async function deleteTask(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  }

  const visibleTasks = assigneeFilter === "Всі"
    ? tasks
    : tasks.filter((t) => t.assignee === assigneeFilter);

  const byStatus = (status: string) => visibleTasks.filter((t) => t.status === status);
  const totalDone = visibleTasks.filter((t) => t.status === "DONE").length;
  const totalOverdue = visibleTasks.filter(
    (t) => t.status !== "DONE" && t.deadline && isPast(new Date(t.deadline))
  ).length;

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text)]">Задачі</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {visibleTasks.length} задач · {totalDone} виконано
            {totalOverdue > 0 && (
              <span style={{ color: "#ef4444" }}> · {totalOverdue} прострочено</span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-black text-sm rounded-lg transition-opacity hover:opacity-80 cursor-pointer font-semibold"
          style={{ background: "var(--accent)" }}
        >
          <Plus size={15} /> Нова задача
        </button>
      </div>

      {/* Assignee filter tabs */}
      <div className="flex gap-1.5 mb-4">
        {ASSIGNEES.map((a) => {
          const count = a === "Всі" ? tasks.length : tasks.filter((t) => t.assignee === a).length;
          const active = assigneeFilter === a;
          return (
            <button
              key={a}
              onClick={() => setAssigneeFilter(a)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
              style={{
                background: active ? "var(--accent)" : "var(--surface)",
                color: active ? "#000" : "var(--text-muted)",
                border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              {a}
              <span
                className="px-1 py-0.5 rounded text-xs font-bold"
                style={{
                  background: active ? "rgba(0,0,0,0.2)" : "var(--surface-2)",
                  color: active ? "#000" : "var(--text-muted)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-sm">
          Завантаження...
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 flex-1 overflow-x-auto pb-2">
            {COLUMNS.map((col) => {
              const colTasks = byStatus(col.id);
              return (
                <div key={col.id} className="flex flex-col w-72 shrink-0">
                  {/* Column header */}
                  <div
                    className="flex items-center justify-between mb-3 px-3 py-2.5 rounded-xl"
                    style={{
                      background: `linear-gradient(rgba(13,13,13,0.96), rgba(13,13,13,0.96)) padding-box, linear-gradient(135deg, ${col.border}, rgba(255,255,255,0.03)) border-box`,
                      border: "1px solid transparent",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: col.color,
                          boxShadow: `0 0 6px ${col.color}`,
                        }}
                      />
                      <span
                        className="text-sm font-semibold"
                        style={{ color: col.color }}
                      >
                        {col.label}
                      </span>
                    </div>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-lg"
                      style={{ color: col.color, background: col.glow }}
                    >
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Droppable column */}
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex-1 rounded-xl p-2 space-y-2 min-h-[200px] transition-all duration-200"
                        style={{
                          background: snapshot.isDraggingOver
                            ? col.glow
                            : "rgba(16,16,16,0.5)",
                          border: snapshot.isDraggingOver
                            ? `1px solid ${col.border}`
                            : "1px solid rgba(255,255,255,0.04)",
                          boxShadow: snapshot.isDraggingOver
                            ? `inset 0 0 30px ${col.glow}`
                            : "none",
                        }}
                      >
                        {colTasks.map((task, index) => {
                          const isOverdue =
                            task.status !== "DONE" &&
                            task.deadline &&
                            isPast(new Date(task.deadline));
                          const pCfg = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.MEDIUM;

                          return (
                            <Draggable
                              key={task.id}
                              draggableId={task.id}
                              index={index}
                            >
                              {(prov, snap) => (
                                <div
                                  ref={prov.innerRef}
                                  {...prov.draggableProps}
                                  {...prov.dragHandleProps}
                                  className="rounded-xl p-3 group transition-all"
                                  style={{
                                    ...prov.draggableProps.style,
                                    background:
                                      "linear-gradient(rgba(20,20,20,0.97), rgba(20,20,20,0.97)) padding-box, linear-gradient(135deg, rgba(201,140,10,0.18), rgba(255,255,255,0.03) 50%, rgba(34,211,238,0.08)) border-box",
                                    border: "1px solid transparent",
                                    boxShadow: snap.isDragging
                                      ? `0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${col.glow}`
                                      : "0 2px 8px rgba(0,0,0,0.3)",
                                    transform: snap.isDragging
                                      ? `${prov.draggableProps.style?.transform ?? ""} rotate(2deg)`
                                      : prov.draggableProps.style?.transform,
                                    opacity: task.status === "DONE" ? 0.65 : 1,
                                  }}
                                >
                                  {/* Title */}
                                  <p
                                    className={`text-sm font-medium mb-2 ${
                                      task.status === "DONE"
                                        ? "line-through text-[var(--text-muted)]"
                                        : "text-[var(--text)]"
                                    }`}
                                  >
                                    {task.title}
                                  </p>

                                  {task.description && (
                                    <p className="text-xs text-[var(--text-muted)] mb-2 line-clamp-2">
                                      {task.description}
                                    </p>
                                  )}

                                  {/* Tags row */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                                      style={{ color: pCfg.color, background: pCfg.bg }}
                                    >
                                      {pCfg.label}
                                    </span>

                                    {task.deadline && (
                                      <span
                                        className="flex items-center gap-1 text-xs"
                                        style={{
                                          color: isOverdue ? "#ef4444" : "var(--text-muted)",
                                        }}
                                      >
                                        {isOverdue ? (
                                          <AlertTriangle size={10} />
                                        ) : (
                                          <Clock size={10} />
                                        )}
                                        {format(new Date(task.deadline), "d MMM", { locale: uk })}
                                      </span>
                                    )}
                                  </div>

                                  {/* Assignee badge */}
                                  {task.assignee && (
                                    <span
                                      className="inline-block text-xs px-1.5 py-0.5 rounded-md font-medium mb-1.5"
                                      style={{
                                        background: task.assignee === "Андрій" ? "rgba(201,140,10,0.15)" : "rgba(168,85,247,0.15)",
                                        color: task.assignee === "Андрій" ? "#C98C0A" : "#a855f7",
                                      }}
                                    >
                                      {task.assignee}
                                    </span>
                                  )}

                                  {/* Lead / Deal + Delete */}
                                  <div className="flex items-center justify-between mt-2">
                                    <div className="text-xs text-[var(--text-muted)] truncate flex-1">
                                      {task.lead && (
                                        <span className="flex items-center gap-1">
                                          <span
                                            className="w-1.5 h-1.5 rounded-full shrink-0"
                                            style={{ background: "var(--accent)" }}
                                          />
                                          {task.lead.name}
                                        </span>
                                      )}
                                      {task.deal && (
                                        <span className="flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#22d3ee]" />
                                          {task.deal.company ?? "Угода"}
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={(e) => deleteTask(task.id, e)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-muted)] hover:text-red-400 text-xs cursor-pointer shrink-0 ml-2"
                                    >
                                      ×
                                    </button>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}

                        {colTasks.length === 0 && !snapshot.isDraggingOver && (
                          <div className="flex items-center justify-center h-20 text-xs text-[var(--text-muted)] opacity-40">
                            Перетягни сюди
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Нова задача" size="sm">
        <TaskForm onSave={createTask} onCancel={() => setShowCreate(false)} />
      </Modal>
    </div>
  );
}
