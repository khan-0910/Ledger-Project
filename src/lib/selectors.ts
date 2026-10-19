import type { Budget, Essential, Goal, Profile, Txn } from './types'
import { clampPercent, sum } from './money'
import { addDays, currentMonthKey, daysInMonth, fromISO, monthKeyOf, todayISO } from './dates'

/* ---------- Filtering ---------- */

export function txnsInMonth(txns: Txn[], monthKey: string): Txn[] {
  return txns.filter((t) => monthKeyOf(t.date) === monthKey)
}

export function txnsInLastDays(txns: Txn[], days: number, nowISO = todayISO()): Txn[] {
  const from = addDays(nowISO, -(days - 1))
  return txns.filter((t) => t.date >= from && t.date <= nowISO)
}

export function expensesOf(txns: Txn[]): Txn[] {
  return txns.filter((t) => t.type === 'expense')
}

export function totalOf(txns: Txn[], type: Txn['type']): number {
  return sum(txns.filter((t) => t.type === type).map((t) => t.amountMinor))
}

export function spendByCategory(txns: Txn[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const t of expensesOf(txns)) {
    map.set(t.category, (map.get(t.category) ?? 0) + t.amountMinor)
  }
  return map
}

/* ---------- Core money model ---------- */

export interface MoneyModel {
  totalBalance: number
  strictSavings: number
  guiltFreeAllowance: number
  /** Spent from guilt-free this cycle (expenses this month) */
  guiltFreeSpent: number
  guiltFreeRemaining: number
  guiltFreePctRemaining: number
  monthKey: string
  /** Optional protected minimum account balance (MAB). 0 = off. */
  protectedBalance: number
  mabEnabled: boolean
  /** Remaining planned essentials for this month (₹, minor units). */
  essentialsRemaining: number
  /** Total planned essentials for this month. */
  essentialsPlanned: number
  /** Spent on essentials' categories this month (info only — not double-counted). */
  essentialsSpent: number
}

export function moneyModel(profile: Profile, txns: Txn[], essentials: Essential[] = []): MoneyModel {
  const monthKey = currentMonthKey()
  const guiltFreeSpent = totalOf(txnsInMonth(txns, monthKey), 'expense')
  const guiltFreeRemaining = Math.max(0, profile.guiltFreeMinor - guiltFreeSpent)
  const guiltFreePctRemaining = profile.guiltFreeMinor > 0
    ? clampPercent((guiltFreeRemaining / profile.guiltFreeMinor) * 100)
    : 0

  /* --- essentials: planned commitments, not completed transactions ---
   * essentialsSpent is tracked for display only; it is NOT subtracted again
   * from the allowance because those expenses already flow through guiltFreeSpent. */
  const essentialsPlanned = sum(essentials.map((e) => e.amountMinor))
  const essCats = new Set(essentials.map((e) => e.category))
  const essentialsSpent = totalOf(txnsInMonth(txns, monthKey).filter((t) => t.type === 'expense' && essCats.has(t.category)), 'expense')
  const essentialsRemaining = Math.max(0, essentialsPlanned - Math.min(essentialsSpent, essentialsPlanned))

  return {
    totalBalance: profile.totalBalanceMinor,
    strictSavings: profile.strictSavingsMinor,
    guiltFreeAllowance: profile.guiltFreeMinor,
    guiltFreeSpent,
    guiltFreeRemaining,
    guiltFreePctRemaining,
    monthKey,
    protectedBalance: profile.protectedBalanceMinor ?? 0,
    mabEnabled: (profile.mabEnabled ?? false) && (profile.protectedBalanceMinor ?? 0) > 0,
    essentialsSpent,
    essentialsPlanned,
    essentialsRemaining,
  }
}

/* ---------- Safe to spend ---------- */

export type SafeRange = 'day' | 'week' | 'month'

export interface SafeToSpend {
  amount: number
  range: SafeRange
  daysLeft: number
  guiltFreeRemaining: number
  label: string
}

export function safeToSpend(model: MoneyModel, nowISO = todayISO()): SafeToSpend {
  const daysLeftMonth = daysLeftInMonth(nowISO, model.monthKey)
  const gf = model.guiltFreeRemaining
  return {
    range: 'day',
    amount: gf,
    daysLeft: daysLeftMonth,
    guiltFreeRemaining: gf,
    label: '',
  }
}

function daysLeftInMonth(nowISO: string, monthKey: string): number {
  const today = Number(nowISO.slice(8, 10))
  return Math.max(1, daysInMonth(monthKey) - today + 1)
}

/** Days remaining in the current Mon–Sun week, including today. */
function daysLeftInWeek(nowISO: string): number {
  const weekday = fromISO(nowISO).getDay()
  return ((7 - ((weekday + 6) % 7)) || 7)
}

export function daysLeftThisMonth(model: MoneyModel, nowISO = todayISO()): number {
  return daysLeftInMonth(nowISO, model.monthKey)
}

export function safeForRange(model: MoneyModel, range: SafeRange, nowISO = todayISO()): number {
  // Layer 1 (default, unchanged): guilt-free allowance left this cycle. This is
  // the discretionary pool minus what was already spent.
  let base = model.guiltFreeRemaining

  // Layer 2 (optional MAB): even if the allowance is generous, you can't spend
  // past the protected line. How much of the pool is actually sitting in the
  // account above the protected balance:
  if (model.mabEnabled) {
    const aboveLine = Math.max(0, model.totalBalance - model.protectedBalance)
    base = Math.min(base, Math.max(0, aboveLine - model.strictSavings))
  }

  // Layer 3 (optional essentials): planned commitments still to pay this month
  // are money that is NOT free to spend. Essentials already paid flowed through
  // the normal expense flow (guiltFreeSpent), so only the *remaining planned*
  // amount is reserved here — never double-counted.
  if (model.essentialsRemaining > 0) {
    base = Math.max(0, base - model.essentialsRemaining)
  }

  const dlMonth = daysLeftInMonth(nowISO, model.monthKey)
  if (range === 'day') return Math.floor(base / dlMonth)
  if (range === 'week') {
    const dl = Math.max(1, Math.min(daysLeftInWeek(nowISO), dlMonth))
    return Math.floor((base / dlMonth) * dl)
  }
  return base
}

/* ---------- Budgets ---------- */

export type BudgetState = 'healthy' | 'near' | 'over'

export interface BudgetProgress {
  budget: Budget
  spent: number
  limit: number
  pct: number
  remaining: number
  state: BudgetState
}

export function budgetProgress(txns: Txn[], budgets: Budget[], monthKey: string): BudgetProgress[] {
  const spentMap = spendByCategory(txnsInMonth(txns, monthKey))
  return budgets
    .slice()
    .sort((a, b) => b.limitMinor - a.limitMinor)
    .map((budget) => {
      const spent = spentMap.get(budget.category) ?? 0
      const pct = budget.limitMinor > 0 ? clampPercent((spent / budget.limitMinor) * 100) : 0
      const remaining = budget.limitMinor - spent
      const state: BudgetState = remaining < 0 ? 'over' : pct >= 85 ? 'near' : 'healthy'
      return { budget, spent, limit: budget.limitMinor, pct, remaining, state }
    })
}

/* ---------- Chart series ---------- */

export interface MonthPoint {
  key: string
  label: string
  income: number
  expense: number
  net: number
}

export function monthlySeries(txns: Txn[], months: number, endMonthKey = currentMonthKey()): MonthPoint[] {
  const [ey, em] = endMonthKey.split('-').map(Number)
  const points: MonthPoint[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(ey, em - 1 - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const inMonth = txnsInMonth(txns, key)
    const income = totalOf(inMonth, 'income')
    const expense = totalOf(inMonth, 'expense')
    points.push({
      key,
      label: d.toLocaleDateString('en-IN', { month: 'short' }),
      income,
      expense,
      net: income - expense,
    })
  }
  return points
}

export interface DayPoint {
  date: string
  day: number
  expense: number
  cumulative: number
}

export function dailySeries(txns: Txn[], monthKey: string): DayPoint[] {
  const inMonth = txnsInMonth(txns, monthKey)
  const perDay = new Map<string, number>()
  for (const t of expensesOf(inMonth)) {
    perDay.set(t.date, (perDay.get(t.date) ?? 0) + t.amountMinor)
  }
  const n = daysInMonth(monthKey)
  const points: DayPoint[] = []
  let cumulative = 0
  for (let day = 1; day <= n; day++) {
    const date = `${monthKey}-${String(day).padStart(2, '0')}`
    const expense = perDay.get(date) ?? 0
    cumulative += expense
    points.push({ date, day, expense, cumulative })
  }
  return points
}

/* ---------- Goals ---------- */

export function goalProgress(g: Goal): number {
  return g.targetMinor > 0 ? clampPercent((g.savedMinor / g.targetMinor) * 100) : 0
}

/* ---------- Data integrity ---------- */

/**
 * Recompute the effective total balance from allocations + recorded activity.
 * total = strict + guiltFree − expenses + income (current cycle). Strict savings
 * is expected to already respect the user's bank minimum balance.
 */
export function effectiveTotal(profile: Profile, txns: Txn[]): number {
  const m = moneyModel(profile, txns)
  const monthTxns = txnsInMonth(txns, m.monthKey)
  return (
    profile.strictSavingsMinor +
    m.guiltFreeAllowance -
    totalOf(monthTxns, 'expense') +
    totalOf(monthTxns, 'income')
  )
}
