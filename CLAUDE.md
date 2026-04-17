# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Priority:** Rules in `.claude/rules/` are the primary authority. Skills in `.claude/skills/` are tools to invoke — they serve the rules, not override them.

---

## Project Goal

Dark CRM + Instagram Bot — high-performance sales automation system. Instagram is the core channel.

**Decision filter:** Every technical decision must either speed up the system or increase sales. Otherwise — don't implement it.

---

## Mandatory Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router) + TypeScript + TailwindCSS + shadcn/ui + TanStack Table + Zustand / React Query |
| Database | PostgreSQL via Neon (serverless) |
| ORM | Prisma |
| Auth | NextAuth.js v5 — credentials only (single user) |
| Queue | Upstash Redis + BullMQ (for future Instagram bot) |
| Deploy | Vercel (frontend + API routes in one repo) |

**Forbidden:** Separate NestJS server (single-user app uses Next.js Route Handlers), MongoDB, jQuery.

---

## Architecture

Single Next.js repo — frontend + API routes in one deployment on Vercel.

```
src/app/(auth)/login         → login page
src/app/(dashboard)/         → protected CRM pages
src/app/api/                 → API Route Handlers
src/lib/db.ts                → Prisma client singleton
src/lib/auth.ts              → NextAuth config
prisma/schema.prisma         → DB schema
```

---

## Core DB Models

`Lead` → `Deal` (1:many) → `Task` (1:many)
`Activity` — timeline events linked to Lead or Deal

Lead statuses: `NEW → CONTACTED → NEGOTIATION → WON / LOST`
Deal statuses: `PLANNING → DESIGN → DEVELOPMENT → TESTING → COMPLETED`

---

## Performance Rules (Mandatory)

- SPA — no page reloads, use React Query for data fetching
- Optimistic UI updates everywhere
- All heavy ops go through Upstash Redis queues (future bot)

---

## UI Rules (Dark CRM Standard)

- **Dark theme only** — no light-mode fallback in MVP
- Keyboard-first UX — shortcuts for common actions
- Minimum clicks: quick-add popups, inline editing
- Style: Linear/Notion — sidebar + workspace layout
- No emojis as icons — use SVG (Lucide)
- Transitions 150–300ms, contrast ≥ 4.5:1

---

## Commands

```bash
npm run dev          # local dev server
npm run build        # production build
npm run lint         # ESLint
npx prisma migrate dev    # run DB migrations
npx prisma studio         # DB GUI
npx prisma generate       # regenerate client after schema change
```

---

## MVP Scope

Leads, Pipeline (Kanban), Clients (Deals), Tasks, Unified Timeline, Dashboard.

---

## Available Skills

### `ui-ux-pro-max` — Design Intelligence

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "crm saas dashboard dark professional" --design-system -p "CRM" --stack shadcn
```

### `06-developer-experience` — DX Subagents

Key subagents: `refactoring-specialist.md`, `dependency-manager.md`, `build-engineer.md`
