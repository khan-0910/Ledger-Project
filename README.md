# Ledger

A dark, sticker-styled personal finance tracker for students: balances, budgets, goals, recurring expenses, analytics — with a privacy-first "hide my balance" design.

## Stack

- React 18 + Vite 5 + TypeScript
- React Router 6
- Zustand-style store (`src/lib/store.tsx`) with Supabase persistence + a fully offline demo mode
- Framer Motion animations
- No UI framework — hand-rolled CSS (`src/index.css`, `src/app.css`)

## Features

- **Dashboard** — total balance (masked by default), strict / guilt-free allocation, safe-to-spend, insights, recent transactions
- **Transactions** — search, filter by type & method, group by day, add/edit/delete, CSV export
- **Budgets** — per-category budgets with progress, over/near/healthy states, unbudgeted suggestions
- **Goals** — goal cards with progress and add-money flow
- **Recurring** — upcoming recurring expenses with day counts
- **Analytics** — stat cards, category donut, month bars, legend rows
- **Settings** — profile, balances, essential commitments, password, privacy, data export/delete
- **Night-only theme** — every route has its own dark canvas with contrasting boxes; mobile bottom nav; More sheet

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Demo mode seeds sample data so every screen is explorable without an account.

## Build

```bash
npm run build      # outputs dist/
npx tsc --noEmit   # typecheck
```
