"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, Send, Trash2, Play, Pause, CheckCircle2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type CampaignStatus = "DRAFT" | "RUNNING" | "PAUSED" | "COMPLETED";
type RecipientStatus = "PENDING" | "SENDING" | "SENT" | "ERROR" | "NOT_FOUND" | "SKIPPED";

interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  createdAt: string;
  recipients: { status: RecipientStatus }[];
  _count: { recipients: number };
}

const statusConfig: Record<CampaignStatus, { label: string; cls: string }> = {
  DRAFT:     { label: "Чернетка", cls: "text-[var(--text-muted)] bg-[var(--surface-2)]" },
  RUNNING:   { label: "Запущено",  cls: "text-emerald-400 bg-emerald-400/10" },
  PAUSED:    { label: "Пауза",     cls: "text-yellow-400 bg-yellow-400/10" },
  COMPLETED: { label: "Завершено", cls: "text-blue-400 bg-blue-400/10" },
};

function CampaignStats({ recipients }: { recipients: { status: RecipientStatus }[] }) {
  const sent    = recipients.filter((r) => r.status === "SENT").length;
  const errors  = recipients.filter((r) => r.status === "ERROR" || r.status === "NOT_FOUND").length;
  const pending = recipients.filter((r) => r.status === "PENDING" || r.status === "SENDING").length;
  const total   = recipients.length;

  return (
    <div className="flex items-center flex-wrap gap-3 text-xs text-[var(--text-muted)]">
      <span className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
        {sent} надіслано
      </span>
      {errors > 0 && (
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
          {errors} помилок
        </span>
      )}
      <span className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] inline-block" />
        {pending} в черзі
      </span>
      <span className="text-[var(--border)]">/ {total}</span>
    </div>
  );
}

export default function CampaignsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["campaigns"],
    queryFn: () => fetch("/api/campaigns").then((r) => r.json()),
    refetchInterval: 5000,
  });

  const createMut = useMutation({
    mutationFn: (name: string) =>
      fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      setCreating(false);
      setNewName("");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/campaigns/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CampaignStatus }) =>
      fetch(`/api/campaigns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (newName.trim()) createMut.mutate(newName.trim());
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-[var(--border)]">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-[var(--text)]">Instagram розсилки</h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
            Натисни Запустити — бот стартує автоматично
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-[var(--accent)] text-black text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Нова кампанія</span>
          <span className="sm:hidden">Нова</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Create form */}
        {creating && (
          <form
            onSubmit={handleCreate}
            className="mb-4 flex items-center gap-3 p-4 rounded-xl border border-[var(--accent)]/40 bg-[var(--surface)] shadow-sm"
          >
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Назва кампанії..."
              className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none"
            />
            <button
              type="submit"
              disabled={!newName.trim() || createMut.isPending}
              className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-black text-xs font-semibold disabled:opacity-50"
            >
              Створити
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              ✕
            </button>
          </form>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-[var(--text-muted)] text-sm">
            Завантаження...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Send size={40} className="text-[var(--text-muted)] opacity-30" />
            <p className="text-[var(--text-muted)] text-sm">Немає кампаній. Створіть першу!</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {campaigns.map((c) => {
              const cfg = statusConfig[c.status];
              const total = c._count.recipients;
              const sent = c.recipients.filter((r) => r.status === "SENT").length;
              const progress = total > 0 ? (sent / total) * 100 : 0;

              return (
                <div
                  key={c.id}
                  className="flex items-start sm:items-center gap-3 sm:gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40 transition-colors cursor-pointer active:scale-[0.99]"
                  onClick={() => router.push(`/campaigns/${c.id}`)}
                >
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-medium text-[var(--text)] truncate">{c.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${cfg.cls}`}>
                        {cfg.label}
                      </span>
                    </div>
                    {total > 0 ? (
                      <>
                        <CampaignStats recipients={c.recipients} />
                        <div className="mt-2 h-1 rounded-full bg-[var(--surface-2)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-400 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-[var(--text-muted)]">Отримувачів ще немає</p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-[var(--text-dim)] mt-1.5">
                      <Clock size={11} />
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                    </div>
                  </div>

                  {/* Action buttons — always visible on mobile, hover on desktop */}
                  <div
                    className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 opacity-100 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {c.status === "DRAFT" || c.status === "PAUSED" ? (
                      <button
                        title="Запустити"
                        onClick={() => statusMut.mutate({ id: c.id, status: "RUNNING" })}
                        className="p-2 rounded-xl hover:bg-emerald-400/10 text-emerald-400 transition-colors active:scale-90"
                      >
                        <Play size={16} />
                      </button>
                    ) : c.status === "RUNNING" ? (
                      <button
                        title="Пауза"
                        onClick={() => statusMut.mutate({ id: c.id, status: "PAUSED" })}
                        className="p-2 rounded-xl hover:bg-yellow-400/10 text-yellow-400 transition-colors active:scale-90"
                      >
                        <Pause size={16} />
                      </button>
                    ) : (
                      <CheckCircle2 size={16} className="text-blue-400 mx-1.5" />
                    )}
                    <button
                      title="Видалити"
                      onClick={() => {
                        if (confirm("Видалити кампанію?")) deleteMut.mutate(c.id);
                      }}
                      className="p-2 rounded-xl hover:bg-red-400/10 text-[var(--text-muted)] hover:text-red-400 transition-colors active:scale-90"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
