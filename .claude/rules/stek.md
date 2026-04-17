# 🧱 TECH STACK RULE (MANDATORY)

## 🎯 STACK STRATEGY

Цей проєкт ОБОВʼЯЗКОВО будується на сучасному high-performance стеку.

❗ Заборонено відхилятись від цього стеку без критичної причини.

Основна ціль:

* realtime CRM
* automation system
* Instagram bot
* масштабування

---

# 🚀 PRIMARY STACK (REQUIRED)

## 🎨 FRONTEND

**Framework:** Next.js (App Router)

Використовувати:

* TypeScript
* TailwindCSS (dark-first)
* shadcn/ui (UI components)
* TanStack Table (для CRM таблиць)
* Zustand або React Query (state)

Обовʼязково:

* SPA UX (без reload)
* optimistic updates
* keyboard shortcuts

---

## ⚙️ BACKEND

**Runtime:** Node.js
**Framework:** NestJS (або Express + structure)

Використовувати:

* TypeScript
* REST API або tRPC
* WebSocket (realtime events)

Обовʼязково:

* модульна архітектура
* окремі сервіси:

  * auth
  * leads
  * deals
  * messaging
  * automation

---

## 🗄️ DATABASE

**Database:** PostgreSQL

Обовʼязково:

* нормалізована структура
* relations (НЕ NoSQL)

Основні таблиці:

* users
* leads
* deals
* messages
* campaigns
* tasks
* activities

---

## ⚡ QUEUE & REALTIME

**Redis — ОБОВʼЯЗКОВО**

Використовувати для:

* job queues (BullMQ)
* automation flows
* Instagram розсилки
* delay (anti-ban)
* rate limiting

---

## 🤖 AI LAYER

Інтеграція:

* OpenAI / Claude API

Функції:

* авто-відповіді в Instagram
* генерація повідомлень
* AI sales assistant
* lead scoring

---

## 📩 INSTAGRAM INTEGRATION

2 режими:

### SAFE MODE

* Meta Graph API

### AGGRESSIVE MODE (advanced)

* unofficial API
* проксі
* акаунт-ротація

❗ ОБОВʼЯЗКОВО:

* anti-ban логіка
* rate limiting
* random delays

---

# 🏗️ ARCHITECTURE

Система будується як:

Frontend (Next.js)
↓
API (Node.js / NestJS)
↓
PostgreSQL
↓
Redis (queues, jobs)
↓
Instagram + AI layer

---

# ⚡ PERFORMANCE RULES

ОБОВʼЯЗКОВО:

* no page reloads
* websocket updates
* background jobs (НЕ sync)
* кешування
* lazy loading

---

# 🧩 BACKEND STRUCTURE

Кожен модуль:

* controller
* service
* repository
* DTO

Приклад:

* leads.module.ts
* leads.service.ts
* leads.controller.ts

---

# 🔐 AUTH & SECURITY

* JWT auth
* role-based access (RBAC)
* rate limiting
* API protection

---

# 🚫 FORBIDDEN STACK

НЕ використовувати:

* Django / Frappe (як основа)
* MongoDB (для CRM)
* jQuery / legacy UI
* monolithic без модулів

---

# 🧠 DESIGN PRINCIPLES

1. Speed > everything
2. Automation first
3. Minimum clicks
4. Realtime UX
5. Scalable architecture

---

# 🏁 FINAL RULE

Це не просто веб-додаток.

Це:
👉 високонавантажена CRM
👉 automation engine
👉 Instagram sales system

Будь-яке технічне рішення має:

* або прискорювати систему
* або збільшувати продажі

Інакше — не впроваджувати.
