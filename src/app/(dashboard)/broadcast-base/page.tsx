"use client";

import { Fragment, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Download, Trash2, Pencil, Check, X, ChevronDown, ChevronRight,
  Database, ArrowUpDown, CheckCircle2, XCircle, AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

type RecipientStatus = "PENDING" | "SENDING" | "SENT" | "ERROR" | "NOT_FOUND" | "SKIPPED";

interface Send {
  id: string;
  campaignId: string | null;
  campaignName: string;
  messageText: string;
  status: RecipientStatus;
  sentAt: string;
}

interface BroadcastLead {
  id: string;
  instagram: string;
  niche: string | null;
  sendCount: number;
  firstSentAt: string | null;
  lastSentAt: string | null;
  lastStatus: RecipientStatus;
  sends: Send[];
}

const statusCfg: Record<RecipientStatus, { label: string; icon: React.ElementType; cls: string }> = {
  SENT:      { label: "Надіслано",  icon: CheckCircle2, cls: "text-emerald-400" },
  ERROR:     { label: "Помилка",    icon: XCircle,      cls: "text-red-400" },
  NOT_FOUND: { label: "Не знайдено", icon: AlertCircle, cls: "text-orange-400" },
  PENDING:   { label: "В черзі",    icon: AlertCircle,  cls: "text-[var(--text-muted)]" },
  SENDING:   { label: "Надсилання", icon: AlertCircle,  cls: "text-yellow-400" },
  SKIPPED:   { label: "Пропущено",  icon: AlertCircle,  cls: "text-[var(--text-muted)]" },
};

const fmt = (d: string | null) => (d ? format(new Date(d), "dd.MM.yyyy HH:mm") : "—");

export default function BroadcastBasePage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [niche, setNiche] = useState("all");
  const [sort, setSort] = useState<"desc" | "asc">("desc");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const { data, isLoading, isError } = useQuery<{ leads: BroadcastLead[]; niches: string[] }>({
    queryKey: ["broadcast-base", search, niche, sort],
    queryFn: async () => {
      const p = new URLSearchParams({ sort });
      if (search.trim()) p.set("search", search.trim());
      if (niche !== "all") p.set("niche", niche);
      const r = await fetch(`/api/broadcast-base?${p}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
  });

  const leads = useMemo(() => data?.leads ?? [], [data]);

  const nicheMut = useMutation({
    mutationFn: ({ id, niche }: { id: string; niche: string }) =>
      fetch(`/api/broadcast-base/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["broadcast-base"] });
      setEditingId(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/broadcast-base/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["broadcast-base"] }),
  });

  /** Експорт розгортає історію: один рядок = одна відправка. */
  function exportExcel() {
    const rows = leads.flatMap((l) =>
      (l.sends.length ? l.sends : [null]).map((s) => ({
        Instagram: l.instagram,
        "Ніша": l.niche ?? "",
        "Повідомлення": s?.messageText ?? "",
        "Дата відправлення": s ? fmt(s.sentAt) : "",
        "Кампанія": s?.campaignName ?? "",
        "Статус": s ? statusCfg[s.status].label : "",
        "Всього розсилок": l.sendCount,
      })),
    );
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "База розсилок");
    XLSX.writeFile(wb, `база-розсилок-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="shrink-0 border-b border-[var(--border)]">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-[var(--text)]">База розсилок</h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
              Ліди потрапляють сюди автоматично після відправлення
            </p>
          </div>
          <button
            onClick={exportExcel}
            disabled={!leads.length}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-[var(--accent)] text-black text-sm font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Експорт</span> Excel
          </button>
        </div>

        {/* ── Filters ── */}
        <div className="flex items-center gap-2 px-4 sm:px-6 pb-3 overflow-x-auto">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Пошук за нікнеймом..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]/60"
            />
          </div>

          <select
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]/60 whitespace-nowrap"
          >
            <option value="all">Усі ніші</option>
            <option value="none">Без ніші</option>
            {(data?.niches ?? []).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>

          <button
            onClick={() => setSort((s) => (s === "desc" ? "asc" : "desc"))}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors whitespace-nowrap"
          >
            <ArrowUpDown size={13} />
            {sort === "desc" ? "Спочатку нові" : "Спочатку старі"}
          </button>

          <span className="text-xs text-[var(--text-muted)] whitespace-nowrap ml-auto">
            Лідів: <strong className="text-[var(--text)]">{leads.length}</strong>
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-[var(--text-muted)] text-sm">
            Завантаження...
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Database size={40} className="text-red-400 opacity-40" />
            <p className="text-red-400 text-sm">Не вдалося завантажити базу</p>
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 px-6 text-center">
            <Database size={40} className="text-[var(--text-muted)] opacity-30" />
            <p className="text-[var(--text-muted)] text-sm">
              {search || niche !== "all" ? "Нічого не знайдено." : "База порожня — запустіть кампанію."}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] z-10">
              <tr>
                <th className="w-8" />
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] w-44">Instagram</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] w-36">Ніша</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Повідомлення</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] w-36">Дата</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] w-40">Кампанія</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] w-28">Статус</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => {
                const last = l.sends[0];
                const cfg = statusCfg[l.lastStatus];
                const Icon = cfg.icon;
                const open = expanded === l.id;

                return (
                  <Fragment key={l.id}>
                    <tr className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]/30">
                      <td className="pl-3">
                        {l.sends.length > 1 && (
                          <button
                            onClick={() => setExpanded(open ? null : l.id)}
                            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)]"
                            title="Історія розсилок"
                          >
                            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <a
                          href={`https://instagram.com/${l.instagram}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[var(--accent)] text-xs hover:underline"
                        >
                          @{l.instagram}
                        </a>
                        {l.sendCount > 1 && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)]">
                            {l.sendCount}×
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs">
                        {editingId === l.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") nicheMut.mutate({ id: l.id, niche: draft });
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              className="w-24 px-2 py-1 rounded bg-[var(--surface-2)] border border-[var(--accent)]/60 text-xs text-[var(--text)] outline-none"
                            />
                            <button
                              onClick={() => nicheMut.mutate({ id: l.id, niche: draft })}
                              className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                            >
                              <Check size={11} />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1 rounded text-[var(--text-muted)]">
                              <X size={11} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setDraft(l.niche ?? ""); setEditingId(l.id); }}
                            className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                            title="Змінити нішу"
                          >
                            {l.niche || <span className="opacity-40">—</span>}
                            <Pencil size={9} className="opacity-0 group-hover:opacity-100" />
                          </button>
                        )}
                      </td>

                      <td className="px-4 py-3 text-[var(--text-muted)] text-xs max-w-xs">
                        <div className="line-clamp-2 whitespace-pre-wrap">{last?.messageText ?? "—"}</div>
                      </td>

                      <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{fmt(l.lastSentAt ?? last?.sentAt ?? null)}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)] text-xs truncate">{last?.campaignName ?? "—"}</td>

                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1.5 text-xs ${cfg.cls}`}>
                          <Icon size={13} />
                          {cfg.label}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            if (confirm(`Видалити @${l.instagram} з бази разом з історією?`)) deleteMut.mutate(l.id);
                          }}
                          className="p-1.5 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                          title="Видалити"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>

                    {/* ── Історія розсилок ── */}
                    {open && (
                      <tr className="bg-[var(--surface-2)]/20">
                        <td />
                        <td colSpan={7} className="px-4 py-3">
                          <div className="text-xs text-[var(--text-muted)] mb-2">
                            Історія розсилок ({l.sends.length})
                          </div>
                          <div className="flex flex-col gap-2">
                            {l.sends.map((s) => {
                              const sc = statusCfg[s.status];
                              const SIcon = sc.icon;
                              return (
                                <div
                                  key={s.id}
                                  className="flex items-start gap-3 p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)]"
                                >
                                  <SIcon size={13} className={`${sc.cls} mt-0.5 shrink-0`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap text-xs">
                                      <span className="text-[var(--text)]">{s.campaignName}</span>
                                      <span className="text-[var(--text-dim)]">{fmt(s.sentAt)}</span>
                                      <span className={sc.cls}>{sc.label}</span>
                                    </div>
                                    <div className="text-xs text-[var(--text-muted)] mt-1 whitespace-pre-wrap">
                                      {s.messageText}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
