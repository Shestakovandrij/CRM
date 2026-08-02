"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Search, Radar, Check, X, ExternalLink, Trash2, Send, Loader2,
} from "lucide-react";

type ProspectStatus = "NEW" | "APPROVED" | "REJECTED" | "QUEUED";

interface Prospect {
  id: string;
  instagram: string;
  fullName: string | null;
  bio: string | null;
  category: string | null;
  followers: number | null;
  postsCount: number | null;
  isPrivate: boolean;
  externalUrl: string | null;
  siteEvidence: string | null;
  source: string | null;
  score: number;
  status: ProspectStatus;
  campaignId: string | null;
}

const TABS: { key: ProspectStatus | "all"; label: string }[] = [
  { key: "NEW",      label: "Нові" },
  { key: "APPROVED", label: "Схвалені" },
  { key: "QUEUED",   label: "У кампаніях" },
  { key: "REJECTED", label: "Відхилені" },
  { key: "all",      label: "Усі" },
];

const BATCH = 25;

export default function ProspectsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [tab, setTab] = useState<ProspectStatus | "all">("NEW");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [niche, setNiche] = useState("");
  const [prefix, setPrefix] = useState("Розвідка");

  const { data, isLoading, isError } = useQuery<{ prospects: Prospect[]; counts: Record<string, number> }>({
    queryKey: ["prospects", tab, search],
    queryFn: async () => {
      const p = new URLSearchParams({ status: tab });
      if (search.trim()) p.set("search", search.trim());
      const r = await fetch(`/api/prospects?${p}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
  });

  const rows = useMemo(() => data?.prospects ?? [], [data]);
  const counts = data?.counts ?? {};

  const statusMut = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: ProspectStatus }) =>
      fetch("/api/prospects/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospects"] });
      setSelected(new Set());
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/prospects/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prospects"] }),
  });

  const createMut = useMutation({
    mutationFn: () =>
      fetch("/api/prospects/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [...selected],
          messageText,
          niche,
          namePrefix: prefix,
        }),
      }).then((r) => r.json()),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["prospects"] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      setSelected(new Set());
      setFormOpen(false);
      if (res.campaigns?.length === 1) router.push(`/campaigns/${res.campaigns[0].id}`);
      else router.push("/campaigns");
    },
  });

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allShown = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const batches = Math.ceil(selected.size / BATCH);

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="shrink-0 border-b border-[var(--border)]">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-[var(--text)]">Пошук лідів</h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
              Бізнес-акаунти без сайту. Перевірте і зберіть у кампанію
            </p>
          </div>
          <button
            onClick={() => setFormOpen(true)}
            disabled={selected.size === 0}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-[var(--accent)] text-black text-sm font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
          >
            <Send size={16} />
            Створити кампанію
            {selected.size > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-black/20 text-xs">
                {selected.size}
                {batches > 1 && ` → ${batches} шт`}
              </span>
            )}
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 px-4 sm:px-6 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSelected(new Set()); }}
              className={`px-3 py-2 text-sm rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                tab === t.key
                  ? "border-[var(--accent)] text-[var(--text)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              {t.label}
              {counts[t.key] != null && (
                <span className="ml-1.5 text-xs opacity-60">{counts[t.key]}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="flex items-center gap-2 px-4 sm:px-6 py-3 overflow-x-auto border-t border-[var(--border)]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Пошук за нікнеймом..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]/60"
            />
          </div>

          {selected.size > 0 && (
            <>
              <button
                onClick={() => statusMut.mutate({ ids: [...selected], status: "APPROVED" })}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 text-sm hover:bg-emerald-500/25 whitespace-nowrap"
              >
                <Check size={13} /> Схвалити
              </button>
              <button
                onClick={() => statusMut.mutate({ ids: [...selected], status: "REJECTED" })}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/15 text-red-400 text-sm hover:bg-red-500/25 whitespace-nowrap"
              >
                <X size={13} /> Відхилити
              </button>
            </>
          )}

          <span className="text-xs text-[var(--text-muted)] whitespace-nowrap ml-auto">
            Показано: <strong className="text-[var(--text)]">{rows.length}</strong>
          </span>
        </div>
      </div>

      {/* ── Create form ── */}
      {formOpen && (
        <div className="px-4 sm:px-6 py-4 border-b border-[var(--accent)]/20 bg-[var(--surface)] shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 items-start">
            <div className="w-full sm:w-44">
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Назва кампанії</label>
              <input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]/60"
              />
            </div>
            <div className="w-full sm:w-40">
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Ніша</label>
              <input
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="напр. Меблі"
                className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]/60"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="text-xs text-[var(--text-muted)] mb-1 block">
                Текст повідомлення — однаковий для всіх обраних
              </label>
              <textarea
                autoFocus
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={4}
                placeholder="Добрий день! Переглянув Вашу сторінку і помітив, що у Вас немає сайту..."
                className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]/60 resize-y"
              />
            </div>
            <div className="flex sm:flex-col gap-2 w-full sm:w-auto sm:pt-5">
              <button
                onClick={() => createMut.mutate()}
                disabled={!messageText.trim() || createMut.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent)] text-black text-sm font-semibold disabled:opacity-50"
              >
                {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Створити
              </button>
              <button
                onClick={() => setFormOpen(false)}
                className="px-4 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text)] bg-[var(--surface-2)]"
              >
                Скасувати
              </button>
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            Обрано {selected.size}. Кампанії створюються як <strong className="text-[var(--text)]">чернетки</strong> по {BATCH} лідів
            {batches > 1 && ` — вийде ${batches} шт`}. Розсилка не запускається — запустите вручну.
          </p>
        </div>
      )}

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-[var(--text-muted)] text-sm">Завантаження...</div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Radar size={40} className="text-red-400 opacity-40" />
            <p className="text-red-400 text-sm">Не вдалося завантажити кандидатів</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 px-6 text-center">
            <Radar size={40} className="text-[var(--text-muted)] opacity-30" />
            <p className="text-[var(--text-muted)] text-sm">
              {search ? "Нічого не знайдено." : "Кандидатів немає — розвідка ще не знайшла нових акаунтів."}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] z-10">
              <tr>
                <th className="w-10 px-3">
                  <input
                    type="checkbox"
                    checked={allShown}
                    onChange={(e) =>
                      setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())
                    }
                    className="accent-[var(--accent)]"
                  />
                </th>
                <th className="text-left px-3 py-3 text-xs font-medium text-[var(--text-muted)] w-44">Instagram</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-[var(--text-muted)] w-32">Категорія</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-[var(--text-muted)]">Біо</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-[var(--text-muted)] w-24">Підписники</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-[var(--text-muted)] w-44">Посилання в профілі</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-[var(--text-muted)] w-36">Джерело</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-[var(--text-muted)] w-16">Бал</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr
                  key={p.id}
                  className={`border-b border-[var(--border)] hover:bg-[var(--surface-2)]/30 ${
                    selected.has(p.id) ? "bg-[var(--accent)]/5" : ""
                  }`}
                >
                  <td className="px-3">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      className="accent-[var(--accent)]"
                    />
                  </td>

                  <td className="px-3 py-3">
                    <a
                      href={`https://instagram.com/${p.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-mono text-[var(--accent)] text-xs hover:underline"
                    >
                      @{p.instagram}
                      <ExternalLink size={10} className="opacity-50" />
                    </a>
                    {p.fullName && (
                      <div className="text-[10px] text-[var(--text-dim)] truncate mt-0.5">{p.fullName}</div>
                    )}
                    {p.isPrivate && (
                      <span className="text-[10px] text-orange-400">приватний</span>
                    )}
                  </td>

                  <td className="px-3 py-3 text-xs text-[var(--text-muted)] truncate">{p.category ?? "—"}</td>

                  <td className="px-3 py-3 text-xs text-[var(--text-muted)] max-w-xs">
                    <div className="line-clamp-2 whitespace-pre-wrap">{p.bio ?? "—"}</div>
                  </td>

                  <td className="px-3 py-3 text-xs text-[var(--text-muted)]">
                    {p.followers != null ? p.followers.toLocaleString("uk-UA") : "—"}
                  </td>

                  <td className="px-3 py-3 text-xs">
                    {p.siteEvidence ? (
                      <span className="text-yellow-400/90">{p.siteEvidence}</span>
                    ) : (
                      <span className="text-emerald-400">посилання немає</span>
                    )}
                  </td>

                  <td className="px-3 py-3 text-xs text-[var(--text-dim)] truncate">{p.source ?? "—"}</td>

                  <td className="px-3 py-3">
                    <span
                      className={`text-xs font-medium ${
                        p.score >= 80 ? "text-emerald-400" : p.score >= 50 ? "text-yellow-400" : "text-[var(--text-muted)]"
                      }`}
                    >
                      {p.score}
                    </span>
                  </td>

                  <td className="px-3 py-3">
                    <button
                      onClick={() => {
                        if (confirm(`Видалити @${p.instagram} зі списку?`)) deleteMut.mutate(p.id);
                      }}
                      className="p-1.5 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
