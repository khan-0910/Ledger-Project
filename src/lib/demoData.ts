import type { Budget, Goal, LedgerData, PaymentMethod, Recurring, Txn } from './types'
import type { CategoryId } from './categories'
import { toMinor } from './money'
import { addDays, currentMonthKey, todayISO } from './dates'

/** Deterministic PRNG so demo data is stable across regenerations. */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(20260923)
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]
const between = (min: number, max: number) => Math.floor(min + rand() * (max - min + 1))

interface Spec {
  cat: CategoryId
  desc: string[]
  min: number // rupees
  max: number
  perWeek: number // expected occurrences per week
  method?: PaymentMethod[]
}

const SPECS: Spec[] = [
  { cat: 'food', desc: ['Mess lunch', 'Campus café', 'Chai + samosa', 'Zomato order', 'Canteen snacks', 'Cold coffee'], min: 30, max: 160, perWeek: 3 },
  { cat: 'transport', desc: ['Metro recharge', 'Auto to campus', 'Bus pass top-up', 'Rapido ride'], min: 20, max: 110, perWeek: 2, method: ['upi', 'cash'] },
  { cat: 'groceries', desc: ['Blinkit run', 'Fruits & veggies', 'Toiletries', 'Milk & eggs'], min: 60, max: 350, perWeek: 0.7 },
  { cat: 'education', desc: ['Photocopies', 'Notebooks', 'Reference book', 'Lab file printing'], min: 50, max: 350, perWeek: 0.35 },
  { cat: 'entertainment', desc: ['Netflix split', 'Movie night', 'Steam sale pickup', 'Spotify duet'], min: 99, max: 350, perWeek: 0.5 },
  { cat: 'shopping', desc: ['T-shirt', 'Phone cable', 'Earbud cushions', 'Sneakers (sale)'], min: 199, max: 900, perWeek: 0.2 },
  { cat: 'other', desc: ['Gift for friend', 'Laundry', 'Haircut'], min: 50, max: 350, perWeek: 0.3 },
]

function makeTxns(): Txn[] {
  const txns: Txn[] = []
  const today = todayISO()
  const start = addDays(today, -125) // ~4 months of history
  let id = 1
  const uid = () => `d${String(id++).padStart(4, '0')}`

  for (let d = 0; d <= 125; d++) {
    const date = addDays(start, d)
    const dayIdx = d
    // Income: monthly allowance on the 1st + occasional freelance
    if (date.endsWith('-01')) {
      txns.push({
        id: uid(), type: 'income', amountMinor: toMinor(7000), category: 'income',
        description: 'Monthly allowance', date, method: 'netbanking',
        createdAt: `${date}T08:30:00`,
      })
    }
    if (rand() < 0.04) {
      txns.push({
        id: uid(), type: 'income', amountMinor: toMinor(between(500, 2500)), category: 'income',
        description: pick(['Freelance gig', 'Sold old books', 'Tuition class', 'Contest prize']), date,
        method: 'upi', createdAt: `${date}T18:00:00`,
      })
    }
    // Big fixed items
    if (date.endsWith('-14')) {
      txns.push({ id: uid(), type: 'expense', amountMinor: toMinor(199), category: 'entertainment', description: 'Netflix', date, method: 'card', createdAt: `${date}T09:00:00` })
    }
    // Everyday spending
    const weekend = [0, 6].includes(new Date(date).getDay())
    for (const spec of SPECS) {
      const expected = spec.perWeek / 7 * (weekend ? 1.4 : 1)
      if (rand() < expected) {
        const amount = between(spec.min, spec.max)
        txns.push({
          id: uid(), type: 'expense', amountMinor: toMinor(amount), category: spec.cat,
          description: pick(spec.desc), date, method: pick(spec.method ?? ['upi', 'upi', 'cash', 'card']),
          createdAt: `${date}T${String(between(8, 21)).padStart(2, '0')}:${String(between(0, 59)).padStart(2, '0')}:00`,
        })
      }
    }
    void dayIdx
  }
  return txns.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1))
}

const mk = currentMonthKey()

function makeBudgets(): Budget[] {
  const b = (category: string, rupees: number): Budget => ({
    id: `b-${category}`, category, limitMinor: toMinor(rupees), month: mk,
  })
  return [b('food', 5000), b('transport', 1800), b('education', 1200), b('entertainment', 1500), b('shopping', 2000)]
}

function makeGoals(): Goal[] {
  return [
    { id: 'g1', name: 'Gaming PC', emoji: '🖥️', targetMinor: toMinor(150000), savedMinor: toMinor(82500), targetDate: '2027-06-01', createdAt: '2026-01-12T10:00:00' },
    { id: 'g2', name: 'Goa trip with hostel gang', emoji: '🏖️', targetMinor: toMinor(18000), savedMinor: toMinor(6500), targetDate: '2026-12-20', createdAt: '2026-03-02T10:00:00' },
    { id: 'g3', name: 'Emergency cushion', emoji: '🛟', targetMinor: toMinor(25000), savedMinor: toMinor(11250), createdAt: '2026-02-14T10:00:00' },
  ]
}

function makeRecurring(): Recurring[] {
  const today = todayISO()
  return [
    { id: 'r1', name: 'Netflix', emoji: '🍿', amountMinor: toMinor(199), category: 'entertainment', frequency: 'monthly', nextDate: addDays(today, 9) },
    { id: 'r2', name: 'Spotify', emoji: '🎧', amountMinor: toMinor(119), category: 'entertainment', frequency: 'monthly', nextDate: addDays(today, 3) },
    { id: 'r3', name: 'Hostel Wi‑Fi', emoji: '📶', amountMinor: toMinor(350), category: 'living', frequency: 'monthly', nextDate: addDays(today, 15) },
    { id: 'r4', name: 'Coursera', emoji: '🎓', amountMinor: toMinor(3999), category: 'education', frequency: 'yearly', nextDate: addDays(today, 48) },
  ]
}

export function demoData(): LedgerData {
  const txns = makeTxns()
  const monthTxns = txns.filter((t) => t.date.startsWith(mk) && t.type === 'expense')
  const spentThisMonth = monthTxns.reduce((a, t) => a + t.amountMinor, 0)

  const strictSavings = toMinor(8000)
  // Calibrate the guilt-free allowance so the demo month always ends with a
  // healthy, believable remaining balance no matter how the random month went.
  const guiltFree = spentThisMonth + toMinor(1250)

  // Total is consistent with allocations + this month's activity
  const income = txns.filter((t) => t.date.startsWith(mk) && t.type === 'income').reduce((a, t) => a + t.amountMinor, 0)
  const total = strictSavings + guiltFree - spentThisMonth + income

  return {
    profile: {
      id: 'demo-user',
      name: 'Aarav',
      email: 'aarav@demo.ledger',
      onboarded: true,
      currency: 'INR',
      totalBalanceMinor: total,
      strictSavingsMinor: strictSavings,
      guiltFreeMinor: guiltFree,
      guiltFreeCycleStart: `${mk}-01`,
    },
    settings: { balanceVisibility: 'always-hide', hideOnLoad: true },
    txns,
    budgets: makeBudgets(),
    goals: makeGoals(),
    recurring: makeRecurring(),
  }
}

/** Small demo dataset for the landing page previews (fictional). */
export const LANDING_DEMO = {
  balance: toMinor(24680),
  savings: toMinor(10000),
  guiltFree: toMinor(5500),
  spentToday: toMinor(320),
}
