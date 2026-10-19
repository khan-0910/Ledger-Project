# Ledger — Project Report

## What it is
**Ledger** ("Spend without the guilt") is a personal finance web app for students, built around one idea: *your balances stay hidden by default, and you choose when to look*. It tracks a total balance, splits it into **Strict Savings** (money you've promised not to touch) and **Guilt-Free** spending (money you can enjoy without regret), then tells you what's **Safe to Spend** per day/week/month.

- App name: `ledger` v1.0.0
- Currency: INR (₹)
- Tagline: "One minute of setup. A semester of clarity."

## Tech stack
| Layer | Tech |
|---|---|
| UI framework | React 18 + TypeScript 5 |
| Build tool | Vite 5 (**single-file build** via `vite-plugin-singlefile` → one 949 kB `index.html`) |
| Routing | react-router-dom 6 (hash-based, `#/`, `#/signup`, `#/app`, …) |
| Animation | framer-motion 11, GSAP 3 (+ `@gsap/react`), custom spring/bits library |
| Visual FX | ogl (WebGL — Aurora & SplashCursor), custom CSS bit components |
| Backend (optional) | Supabase (`@supabase/supabase-js`) — auth + per-user tables |
| Backend (default) | **Demo mode** — full auth + DB layer persisted in `localStorage`, zero setup |

## Pages (13)
`Landing` · `Signup` · `Login` · `Forgot` · `Reset` · `Onboarding` (4-step flow: name → total balance → strict savings → guilt-free, with live breakdown sheet) · `Dashboard` · `Transactions` · `Budgets` · `Goals` · `Recurring` · `Analytics` · `Settings`

## Core features
- **4-step onboarding** — full-viewport flow: centered stage, step dots, progress header, live "breakdown" sheet that slides up on the last step with animated count-ups.
- **Dashboard** — total balance card with split bar (strict vs guilt-free %), allocation cards, guilt-free "slosh gauge" (animated liquid), Safe-to-Spend with Today/Week/Month segmented control, insights ("Your Money Story"), recent activity.
- **Privacy engine** — the signature feature:
  - All money amounts render masked (`₹••••••`) by default; the *real value sits in normal flow* with the mask as an overlay → toggling is a pure opacity crossfade, zero layout shift.
  - **Hover anywhere → everything peeks; move away → instantly re-masks** (triple-covered via `pointerleave`/`pointerout`/`mouseleave` + window-blur slam + watchdog so it can never latch).
  - **PEEK ↔ HIDE toggle chip** in every header: click to latch-open everything (chip flips to mint "HIDE"), click again to lock down.
  - **H key** hides everything instantly, from anywhere.
  - Touch: tap gives a 6-second peek. Settings offer peek-lock (hard privacy) and reveal-preference modes (`always-hide` / `remember` / `show-after-login`).
  - No clickable reveal buttons anywhere by design.
- **Transactions / Budgets / Goals / Recurring** — full CRUD with optimistic updates, rollback + error toast with Retry on failure, CSV export.
- **Analytics** — spending breakdown, category insights.
- **Toasts, modals, side panels, FAB add-expense** — all sticker-themed.

## Design system ("sticker" look)
- 2px hand-drawn ink borders + offset jelly shadows + per-card **blob radii** (no two adjacent cards share a shape) + tiny ±0.3° tilts for a hand-placed feel.
- Buttons/inputs/chips/modals all press down physically on click; stripe-textured progress fills; painted dashed dividers.
- Light + dark themes; system fonts swap in async so text always paints immediately.
- WebGL extras (Aurora background, SplashCursor) are **lazy-mounted after first paint** so they never block rendering.

## Data layer
- Everything funnels through a single store (`AppProvider`) with an event reducer (`applyEvent`).
- **Supabase mode**: profile, settings, txns, budgets, goals, recurring persisted per user id; new users get profile rows + privacy-first settings (`always-hide`, `hideOnLoad`).
- **Demo mode**: identical API, `localStorage` persistence, seeded demo data via a one-tap demo sign-in (`student@demo.ledger`).

## Build & run
```bash
npm install
npm run dev        # dev server
npm run build      # typecheck + bundle
npx vite build --mode singlefile   # → dist_single/index.html (fully self-contained, host anywhere)
```
The single-file build means the entire app (JS + CSS + assets inlined) ships as **one `index.html`** you can open locally or drop on any static host / LAN server.

## QA status (verified live in-browser)
- ✅ Signup → 4-step onboarding → dashboard end-to-end: name, allocations, and Safe-to-Spend math all carried correctly.
- ✅ Persistent across hard reload — no data loss after signup.
- ✅ Onboarding layout fixed: centered stage + header + footer (previously rendered unstyled in the top-left corner; missing CSS was written).
- ✅ Hover-peek: reveals on hover, re-masks instantly (~60 ms) on leave, verified hidden → peek → hidden cycle.
- ✅ PEEK ↔ HIDE toggle flips both ways, including the latched-open state.
- ✅ H-key response ~2 ms.
- ✅ All 13 pages render in light + dark, no horizontal overflow at mobile width.
- ✅ TypeScript typecheck clean; build passes.

## Known limitations
- Supabase env vars are optional; without them the app runs fully in demo/localStorage mode.
- Single-file bundle is ~949 kB (288 kB gzipped) — fine for LAN/local use, not yet code-split for CDN delivery.
- Amount masking is client-side only (by design — privacy from *shoulder-surfers*, not from account owners).
