"use client";

export const dynamic = "force-dynamic";

import { useState, useRef, use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Play, Pause, Upload, Plus, Trash2,
  CheckCircle2, XCircle, Clock, AlertCircle, Loader2,
  RotateCcw, Square, Pencil, Check, X,
} from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

type CampaignStatus = "DRAFT" | "RUNNING" | "PAUSED" | "COMPLETED";
type RecipientStatus = "PENDING" | "SENDING" | "SENT" | "ERROR" | "NOT_FOUND" | "SKIPPED";

interface Recipient {
  id: string;
  instagramUsername: string;
  messageText: string;
  status: RecipientStatus;
  sentAt: string | null;
  errorMessage: string | null;
}

interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  recipients: Recipient[];
}

const recipientStatusConfig: Record<RecipientStatus, { label: string; icon: React.ElementType; cls: string }> = {
  PENDING:   { label: "В черзі",      icon: Clock,        cls: "text-[var(--text-muted)]" },
  SENDING:   { label: "Надсилається", icon: Loader2,      cls: "text-yellow-400 animate-spin" },
  SENT:      { label: "Надіслано",    icon: CheckCircle2, cls: "text-emerald-400" },
  ERROR:     { label: "Помилка",      icon: XCircle,      cls: "text-red-400" },
  NOT_FOUND: { label: "Не знайдено",  icon: AlertCircle,  cls: "text-orange-400" },
  SKIPPED:   { label: "Пропущено",    icon: AlertCircle,  cls: "text-[var(--text-muted)]" },
};

const campaignStatusCfg: Record<CampaignStatus, { label: string; cls: string }> = {
  DRAFT:     { label: "Чернетка", cls: "text-[var(--text-muted)] bg-[var(--surface-2)]" },
  RUNNING:   { label: "Запущено",  cls: "text-emerald-400 bg-emerald-400/10" },
  PAUSED:    { label: "Пауза",     cls: "text-yellow-400 bg-yellow-400/10" },
  COMPLETED: { label: "Завершено", cls: "text-blue-400 bg-blue-400/10" },
};

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const { data: campaign, isLoading } = useQuery<Campaign>({
    queryKey: ["campaign", id],
    queryFn: () => fetch(`/api/campaigns/${id}`).then((r) => r.json()),
    refetchInterval: 3000,
  });

  const statusMut = useMutation({
    mutationFn: ({ status, resetQueue }: { status: CampaignStatus; resetQueue?: boolean }) =>
      fetch(`/api/campaigns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(resetQueue && { resetQueue: true }) }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign", id] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });

  const resetMut = useMutation({
    mutationFn: () =>
      fetch(`/api/campaigns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetQueue: true }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaign", id] }),
  });

  const importMut = useMutation({
    mutationFn: (recipients: { instagramUsername: string; messageText: string }[]) =>
      fetch(`/api/campaigns/${id}/recipients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign", id] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });

  const addMut = useMutation({
    mutationFn: ({ instagramUsername, messageText }: { instagramUsername: string; messageText: string }) =>
      fetch(`/api/campaigns/${id}/recipients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagramUsername, messageText }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign", id] });
      setAddOpen(false);
      setNewUsername("");
      setNewMessage("");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (recipientId: string) =>
      fetch(`/api/campaigns/${id}/recipients/${recipientId}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaign", id] }),
  });

  const retryMut = useMutation({
    mutationFn: (recipientId: string) =>
      fetch(`/api/campaigns/${id}/recipients/${recipientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PENDING", errorMessage: null }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaign", id] }),
  });

  const editMut = useMutation({
    mutationFn: ({ recipientId, messageText }: { recipientId: string; messageText: string }) =>
      fetch(`/api/campaigns/${id}/recipients/${recipientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageText }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign", id] });
      setEditingId(null);
    },
  });

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result;
      const wb = XLSX.read(data, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);

      const recipients = rows
        .map((row) => {
          const username = (
            row["Instagram username"] || row["username"] || row["Instagram"] || row["нікнейм"] || Object.values(row)[0]
          )?.toString().trim();
          const message = (
            row["Message text"] || row["message"] || row["Текст повідомлення"] || row["повідомлення"] || Object.values(row)[1]
          )?.toString().trim();
          return { instagramUsername: username, messageText: message };
        })
        .filter((r) => r.instagramUsername && r.messageText);

      if (recipients.length > 0) {
        importMut.mutate(recipients as { instagramUsername: string; messageText: string }[]);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
        Завантаження...
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
        Кампанію не знайдено.
      </div>
    );
  }

  const recipients = campaign.recipients ?? [];
  const total   = recipients.length;
  const sent    = recipients.filter((r) => r.status === "SENT").length;
  const errors  = recipients.filter((r) => r.status === "ERROR" || r.status === "NOT_FOUND").length;
  const pending = recipients.filter((r) => r.status === "PENDING" || r.status === "SENDING").length;
  const progress = total > 0 ? (sent / total) * 100 : 0;
  const statusCfg = campaignStatusCfg[campaign.status];

  return (
    <div className="flex flex-col h-full">

      {/* ── Top header ── */}
      <div className="shrink-0 border-b border-[var(--border)]">
        {/* Row 1: back + title + status badge */}
        <div className="flex items-center gap-3 px-4 sm:px-6 pt-4 pb-3">
          <button
            onClick={() => router.push("/campaigns")}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-semibold text-[var(--text)] truncate">
              {campaign.name}
            </h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusCfg.cls}`}>
              {statusCfg.label}
            </span>
          </div>
        </div>

        {/* Row 2: action buttons — scrollable on mobile */}
        <div className="flex items-center gap-2 px-4 sm:px-6 pb-3 overflow-x-auto">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileImport} />

          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-xs sm:text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--accent)]/40 transition-colors whitespace-nowrap active:scale-95"
          >
            <Upload size={13} />
            <span className="hidden sm:inline">Імпорт</span> Excel
          </button>

          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-xs sm:text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors whitespace-nowrap active:scale-95"
          >
            <Plus size={13} />
            Додати
          </button>

          {errors > 0 && campaign.status !== "RUNNING" && (
            <button
              onClick={() => resetMut.mutate()}
              disabled={resetMut.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-xs sm:text-sm text-orange-400 hover:bg-orange-400/10 transition-colors whitespace-nowrap disabled:opacity-50 active:scale-95"
            >
              <RotateCcw size={13} />
              Retry ({errors})
            </button>
          )}

          {(campaign.status === "RUNNING" || campaign.status === "PAUSED") && (
            <button
              onClick={() => {
                if (confirm("Завершити кампанію?")) statusMut.mutate({ status: "COMPLETED" });
              }}
              disabled={statusMut.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-xs sm:text-sm text-[var(--text-muted)] hover:text-blue-400 hover:border-blue-400/40 transition-colors whitespace-nowrap active:scale-95"
            >
              <Square size={13} />
              Завершити
            </button>
          )}

          {/* Main CTA */}
          {campaign.status === "RUNNING" ? (
            <button
              onClick={() => statusMut.mutate({ status: "PAUSED" })}
              disabled={statusMut.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-yellow-400/10 text-yellow-400 text-xs sm:text-sm font-semibold hover:bg-yellow-400/20 transition-colors whitespace-nowrap disabled:opacity-50 active:scale-95 ml-auto"
            >
              <Pause size={13} />
              Пауза
            </button>
          ) : campaign.status === "COMPLETED" ? (
            <button
              onClick={() => {
                if (confirm("Перезапустити? Всі відправлені зберігаються, тільки помилки скинуться.")) {
                  statusMut.mutate({ status: "RUNNING", resetQueue: true });
                }
              }}
              disabled={statusMut.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--surface-2)] text-[var(--text-muted)] text-xs sm:text-sm font-semibold hover:text-[var(--text)] transition-colors whitespace-nowrap disabled:opacity-50 active:scale-95 ml-auto"
            >
              <RotateCcw size={13} />
              Перезапустити
            </button>
          ) : (
            <button
              onClick={() => statusMut.mutate({ status: "RUNNING" })}
              disabled={total === 0 || statusMut.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 text-white text-xs sm:text-sm font-semibold hover:bg-emerald-600 transition-colors whitespace-nowrap disabled:opacity-40 active:scale-95 ml-auto"
              style={{ boxShadow: "0 0 16px rgba(52,211,153,0.25)" }}
            >
              <Play size={13} />
              {campaign.status === "PAUSED" ? "Продовжити" : "Запустити"}
            </button>
          )}
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="px-4 sm:px-6 py-3 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm mb-2 flex-wrap">
          <span className="text-[var(--text-muted)]">Всього: <strong className="text-[var(--text)]">{total}</strong></span>
          <span className="text-emerald-400">Надіслано: <strong>{sent}</strong></span>
          {errors > 0 && <span className="text-red-400">Помилок: <strong>{errors}</strong></span>}
          <span className="text-[var(--text-muted)]">В черзі: <strong>{pending}</strong></span>
        </div>
        {total > 0 && (
          <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* ── Auto-connect status ── */}
      <div className="px-4 sm:px-6 py-2.5 border-b border-[var(--border)] shrink-0"
        style={{ background: "rgba(16,16,16,0.60)" }}
      >
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] flex-wrap">
          {campaign.status === "RUNNING" ? (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                <span className="text-emerald-400 font-medium">Telegram-бот підключено — розсилка виконується автоматично</span>
              </span>
            </>
          ) : campaign.status === "PAUSED" ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
              <span className="text-yellow-400 font-medium">Пауза — натисни Продовжити щоб бот відновив роботу</span>
            </>
          ) : campaign.status === "COMPLETED" ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
              <span className="text-blue-400 font-medium">Завершено</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-dim)] inline-block" />
              <span>Натисни <strong className="text-[var(--text)]">Запустити</strong> — бот автоматично отримає задачу і розпочне розсилку</span>
            </>
          )}
        </div>
      </div>

      {/* ── Add form ── */}
      {addOpen && (
        <div className="px-4 sm:px-6 py-3 border-b border-[var(--accent)]/20 bg-[var(--surface)] shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="w-full sm:w-44">
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Instagram нікнейм</label>
              <input
                autoFocus
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="@username"
                className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]/60"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Текст повідомлення</label>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Привіт! Хочу запропонувати..."
                rows={5}
                className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]/60 resize-y"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => addMut.mutate({ instagramUsername: newUsername, messageText: newMessage })}
                disabled={!newUsername.trim() || !newMessage.trim() || addMut.isPending}
                className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-[var(--accent)] text-black text-sm font-semibold disabled:opacity-50"
              >
                Додати
              </button>
              <button
                onClick={() => setAddOpen(false)}
                className="px-4 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text)] bg-[var(--surface-2)]"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Recipients ── */}
      <div className="flex-1 overflow-auto">
        {recipients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-20 px-6 text-center">
            <Upload size={36} className="text-[var(--text-muted)] opacity-30" />
            <p className="text-sm text-[var(--text-muted)]">Немає отримувачів. Імпортуйте Excel або додайте вручну.</p>
            <p className="text-xs text-[var(--text-muted)] opacity-60">
              Формат: колонки «Instagram username» та «Message text»
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="w-full text-sm hidden sm:table">
              <thead className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)]">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] w-44">Нікнейм</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Повідомлення</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] w-28">Статус</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] w-32">Час</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] w-40">Помилка</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {recipients.map((r) => {
                  const cfg = recipientStatusConfig[r.status];
                  const Icon = cfg.icon;
                  return (
                    <tr key={r.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]/30">
                      <td className="px-4 py-3 font-mono text-[var(--accent)] text-xs">@{r.instagramUsername}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)] max-w-xs">
                        {editingId === r.id ? (
                          <div className="flex flex-col gap-1.5">
                            <textarea
                              autoFocus
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              rows={4}
                              className="w-full px-2 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--accent)]/60 text-xs text-[var(--text)] outline-none resize-y"
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={() => editMut.mutate({ recipientId: r.id, messageText: editText })}
                                disabled={!editText.trim() || editMut.isPending}
                                className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/30 disabled:opacity-50"
                              >
                                <Check size={11} /> Зберегти
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--surface-2)] text-[var(--text-muted)] text-xs hover:text-[var(--text)]"
                              >
                                <X size={11} /> Скасувати
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="line-clamp-2 text-xs whitespace-pre-wrap">{r.messageText}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1.5 text-xs ${cfg.cls}`}>
                          <Icon size={12} className={r.status === "SENDING" ? "animate-spin" : ""} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                        {r.sentAt ? format(new Date(r.sentAt), "dd.MM HH:mm") : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-red-400/80 max-w-xs truncate">
                        {r.errorMessage || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {(r.status === "ERROR" || r.status === "NOT_FOUND") && (
                            <button
                              onClick={() => retryMut.mutate(r.id)}
                              title="Повторити"
                              className="p-1 rounded text-[var(--text-muted)] hover:text-yellow-400 transition-colors"
                            >
                              <RotateCcw size={12} />
                            </button>
                          )}
                          <button
                            onClick={() => { setEditingId(r.id); setEditText(r.messageText); }}
                            title="Редагувати"
                            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => deleteMut.mutate(r.id)}
                            title="Видалити"
                            className="p-1 rounded text-[var(--text-muted)] hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-[var(--border)]">
              {recipients.map((r) => {
                const cfg = recipientStatusConfig[r.status];
                const Icon = cfg.icon;
                return (
                  <div key={r.id} className="px-4 py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[var(--accent)] text-xs font-semibold">
                          @{r.instagramUsername}
                        </span>
                        <span className={`flex items-center gap-1 text-xs ${cfg.cls}`}>
                          <Icon size={11} className={r.status === "SENDING" ? "animate-spin" : ""} />
                          {cfg.label}
                        </span>
                      </div>
                      {editingId === r.id ? (
                        <div className="flex flex-col gap-1.5 mt-1">
                          <textarea
                            autoFocus
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={4}
                            className="w-full px-2 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--accent)]/60 text-xs text-[var(--text)] outline-none resize-y"
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => editMut.mutate({ recipientId: r.id, messageText: editText })}
                              disabled={!editText.trim() || editMut.isPending}
                              className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/30 disabled:opacity-50"
                            >
                              <Check size={11} /> Зберегти
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--surface-2)] text-[var(--text-muted)] text-xs"
                            >
                              <X size={11} /> Скасувати
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--text-muted)] line-clamp-2 whitespace-pre-wrap">{r.messageText}</p>
                      )}
                      {r.errorMessage && (
                        <p className="text-xs text-red-400/80 mt-0.5 truncate">{r.errorMessage}</p>
                      )}
                      {r.sentAt && (
                        <p className="text-xs text-[var(--text-dim)] mt-0.5">
                          {format(new Date(r.sentAt), "dd.MM HH:mm")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {(r.status === "ERROR" || r.status === "NOT_FOUND") && (
                        <button
                          onClick={() => retryMut.mutate(r.id)}
                          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-yellow-400 active:scale-90 transition-all"
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => { setEditingId(r.id); setEditText(r.messageText); }}
                        className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent)] active:scale-90 transition-all"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deleteMut.mutate(r.id)}
                        className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-400 active:scale-90 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
