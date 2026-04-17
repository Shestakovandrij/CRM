"use client";

export const dynamic = "force-dynamic";

import { useState, useRef, use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Play, Pause, Upload, Plus, Trash2,
  CheckCircle2, XCircle, Clock, AlertCircle, Loader2, Copy, Check,
  RotateCcw, Square,
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
  PENDING: { label: "В черзі", icon: Clock, cls: "text-[var(--text-muted)]" },
  SENDING: { label: "Надсилається", icon: Loader2, cls: "text-yellow-400 animate-spin" },
  SENT: { label: "Надіслано", icon: CheckCircle2, cls: "text-emerald-400" },
  ERROR: { label: "Помилка", icon: XCircle, cls: "text-red-400" },
  NOT_FOUND: { label: "Не знайдено", icon: AlertCircle, cls: "text-orange-400" },
  SKIPPED: { label: "Пропущено", icon: AlertCircle, cls: "text-[var(--text-muted)]" },
};

const campaignStatusCfg: Record<CampaignStatus, { label: string; cls: string }> = {
  DRAFT: { label: "Чернетка", cls: "text-[var(--text-muted)] bg-[var(--surface-2)]" },
  RUNNING: { label: "Запущено", cls: "text-emerald-400 bg-emerald-400/10" },
  PAUSED: { label: "Пауза", cls: "text-yellow-400 bg-yellow-400/10" },
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
  const [copiedSecret, setCopiedSecret] = useState(false);

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

  function copyBotSecret() {
    const secret = process.env.NEXT_PUBLIC_BOT_SECRET || "налаштуйте BOT_SECRET в .env";
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
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
  const total = recipients.length;
  const sent = recipients.filter((r) => r.status === "SENT").length;
  const errors = recipients.filter((r) => r.status === "ERROR" || r.status === "NOT_FOUND").length;
  const pending = recipients.filter((r) => r.status === "PENDING" || r.status === "SENDING").length;
  const progress = total > 0 ? (sent / total) * 100 : 0;
  const statusCfg = campaignStatusCfg[campaign.status];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-[var(--border)] shrink-0">
        <button
          onClick={() => router.push("/campaigns")}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-[var(--text)] truncate">{campaign.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.cls}`}>
              {statusCfg.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileImport} />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--accent)]/40 transition-colors"
          >
            <Upload size={14} />
            Імпорт Excel
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            <Plus size={14} />
            Додати
          </button>

          {errors > 0 && campaign.status !== "RUNNING" && (
            <button
              onClick={() => resetMut.mutate()}
              disabled={resetMut.isPending}
              title="Скинути помилки назад в чергу"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-orange-400 hover:bg-orange-400/10 transition-colors disabled:opacity-50"
            >
              <RotateCcw size={14} />
              Retry помилки ({errors})
            </button>
          )}

          {(campaign.status === "RUNNING" || campaign.status === "PAUSED") && (
            <button
              onClick={() => {
                if (confirm("Завершити кампанію?")) statusMut.mutate({ status: "COMPLETED" });
              }}
              disabled={statusMut.isPending}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-muted)] hover:text-blue-400 hover:border-blue-400/40 transition-colors"
            >
              <Square size={14} />
              Завершити
            </button>
          )}

          {campaign.status === "RUNNING" ? (
            <button
              onClick={() => statusMut.mutate({ status: "PAUSED" })}
              disabled={statusMut.isPending}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-yellow-400/10 text-yellow-400 text-sm font-medium hover:bg-yellow-400/20 transition-colors disabled:opacity-50"
            >
              <Pause size={14} />
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
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[var(--surface-2)] text-[var(--text-muted)] text-sm font-medium hover:text-[var(--text)] transition-colors disabled:opacity-50"
            >
              <RotateCcw size={14} />
              Перезапустити
            </button>
          ) : (
            <button
              onClick={() => statusMut.mutate({ status: "RUNNING" })}
              disabled={total === 0 || statusMut.isPending}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-40"
            >
              <Play size={14} />
              {campaign.status === "PAUSED" ? "Продовжити" : "Запустити"}
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-6 py-3 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-6 text-sm mb-2">
          <span className="text-[var(--text-muted)]">Всього: <strong className="text-[var(--text)]">{total}</strong></span>
          <span className="text-emerald-400">Надіслано: <strong>{sent}</strong></span>
          <span className="text-red-400">Помилок: <strong>{errors}</strong></span>
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

      {/* Bot info panel */}
      <div className="px-6 py-3 border-b border-[var(--border)] bg-[var(--surface-2)]/50 shrink-0">
        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] flex-wrap">
          <span className="font-medium text-[var(--text)]">Telegram-бот:</span>
          <span className="flex items-center gap-1.5">
            ID:
            <code
              onClick={() => { navigator.clipboard.writeText(id); }}
              className="px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--accent)] font-mono cursor-pointer hover:opacity-80"
              title="Клікни щоб скопіювати"
            >
              {id}
            </code>
          </span>
          <span className="text-[var(--border)]">|</span>
          <span>Запустити: <code className="text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">/run {id}</code></span>
          <span className="text-[var(--border)]">|</span>
          <span>Пауза: <code className="text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">/pause</code></span>
          <span className="text-[var(--border)]">|</span>
          <span>Статус: <code className="text-[var(--text-muted)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded">/status</code></span>
        </div>
      </div>

      {/* Add form */}
      {addOpen && (
        <div className="px-6 py-3 border-b border-[var(--accent)]/20 bg-[var(--surface)] shrink-0">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Instagram нікнейм</label>
              <input
                autoFocus
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="@username"
                className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]/60"
              />
            </div>
            <div className="flex-[2]">
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Текст повідомлення</label>
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Привіт! Хочу запропонувати..."
                className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]/60"
              />
            </div>
            <button
              onClick={() => addMut.mutate({ instagramUsername: newUsername, messageText: newMessage })}
              disabled={!newUsername.trim() || !newMessage.trim() || addMut.isPending}
              className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm disabled:opacity-50"
            >
              Додати
            </button>
            <button
              onClick={() => setAddOpen(false)}
              className="px-4 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {recipients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
            <Upload size={36} className="text-[var(--text-muted)] opacity-30" />
            <p className="text-sm text-[var(--text-muted)]">Немає отримувачів. Імпортуйте Excel або додайте вручну.</p>
            <p className="text-xs text-[var(--text-muted)] opacity-60">
              Очікуваний формат: колонки «Instagram username» та «Message text»
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] w-48">Нікнейм</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Повідомлення</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] w-32">Статус</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] w-36">Час відправки</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] w-48">Помилка</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {recipients.map((r) => {
                const cfg = recipientStatusConfig[r.status];
                const Icon = cfg.icon;
                return (
                  <tr key={r.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]/30">
                    <td className="px-4 py-3 font-mono text-[var(--accent)] text-xs">
                      @{r.instagramUsername}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)] max-w-xs">
                      <span className="line-clamp-2 text-xs">{r.messageText}</span>
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
                            ↺
                          </button>
                        )}
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
        )}
      </div>
    </div>
  );
}
