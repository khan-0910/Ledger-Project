import type { LedgerData, Txn } from './types'
import { CATEGORIES } from './categories'
import { addDays, currentMonthKey, todayISO } from './dates'
import { moneyModel, safeForRange, totalOf, txnsInMonth } from './selectors'
import type { GlyphName } from '../components/bits/Glyph'

export type Insight = {
  icon: GlyphName
  /** Highlight color token */
  tone: 'green' | 'yellow' | 'blue' | 'red' | 'purple'
  /** Text template; {a} = amount, {p} = percent. Placeholders in sensitive insights are masked unless revealed. */
  text: string
  /** Minor-unit amount for {a}; required when text contains {a} */
  amount?: number
  /** Percent for {p} */
  pct?: number
  /** When true, {a} respects privacy masking; {p} always shows (percentages aren't amounts) */
  sensitiveAmount?: boolean
}

function spentByCategory(txns: Txn[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const t of txns) {
    if (t.type !== 'expense') continue
    map.set(t.category, (map.get(t.category) ?? 0) + t.amountMinor)
  }
  return map
}

export function insights(data: LedgerData): Insight[] {
  const out: Insight[] = []
  const nowKey = currentMonthKey()
  const nowTxns = txnsInMonth(data.txns, nowKey)
  const [y, m] = nowKey.split('-').map(Number)
  const prevDate = new Date(y, m - 2, 1)
  const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
  const prevTxns = txnsInMonth(data.txns, prevKey)

  const nowSpent = spentByCategory(nowTxns)
  const prevSpent = spentByCategory(prevTxns)
  const nowTotal = totalOf(nowTxns, 'expense')
  const prevTotal = totalOf(prevTxns, 'expense')

  if (nowTotal > 0) {
    // Biggest category
    let bigCat = ''
    let bigVal = -1
    for (const [cat, val] of nowSpent) {
      if (val > bigVal) {
        bigVal = val
        bigCat = cat
      }
    }
    if (bigCat) {
      const def = CATEGORIES.find((c) => c.id === bigCat)
      out.push({
        icon: def?.glyph ?? 'box',
        tone: 'blue',
        sensitiveAmount: true,
        amount: bigVal,
        text: `You spent {a} on ${def?.label.toLowerCase() ?? bigCat} this month — your biggest category.`,
      })
    }

    // Category MoM deltas
    for (const def of CATEGORIES) {
      if (def.id === 'income') continue
      const now = nowSpent.get(def.id) ?? 0
      const prev = prevSpent.get(def.id) ?? 0
      if (prev > 0 && now > 0) {
        const pct = Math.round(((now - prev) / prev) * 100)
        if (pct >= 15) {
          out.push({
            icon: 'trend-up',
            tone: 'red',
            sensitiveAmount: false,
            pct,
            text: `${def.label} is {p}% higher than last month.`,
          })
          break
        }
        if (pct <= -15) {
          out.push({
            icon: 'trend-down',
            tone: 'green',
            sensitiveAmount: false,
            pct: Math.abs(pct),
            text: `${def.label} is {p}% lower than last month. Nice.`,
          })
          break
        }
      }
    }

    // Guilt-free streak: consecutive weeks (ending this one) with spend ≤ 1/4 of allowance
    const gfTotal = data.profile.guiltFreeMinor
    if (gfTotal > 0) {
      let streak = 0
      const today = todayISO()
      for (let w = 0; w < 8; w++) {
        const end = addDays(today, -7 * w)
        const start = addDays(today, -7 * (w + 1) + 1)
        const spent = totalOf(
          data.txns.filter((t) => t.date >= start && t.date <= end && t.type === 'expense'),
          'expense',
        )
        if (spent <= gfTotal / 4) streak++
        else break
      }
      if (streak >= 2) {
        out.push({
          icon: 'shield',
          tone: 'green',
          sensitiveAmount: false,
          text: `You've stayed within your guilt-free budget for ${streak} straight weeks.`,
        })
      }
    }

    // Savings delta vs last month (income − expense)
    const nowNet = totalOf(nowTxns, 'income') - nowTotal
    const prevNet = totalOf(prevTxns, 'income') - prevTotal
    if (prevTotal > 0 || prevTxns.length > 0) {
      const delta = nowNet - prevNet
      if (delta > 0) {
        out.push({
          icon: 'coin',
          tone: 'green',
          sensitiveAmount: true,
          amount: delta,
          text: `You've kept {a} more than last month.`,
        })
      } else if (delta < 0) {
        out.push({
          icon: 'sprout',
          tone: 'yellow',
          sensitiveAmount: true,
          amount: -delta,
          text: `You kept {a} less than last month — an easy rebound.`,
        })
      }
    }

    // Safe-to-spend hint
    const model = moneyModel(data.profile, data.txns, data.essentials ?? [])
    const perDay = safeForRange(model, 'month')
    if (model.guiltFreeRemaining > 0 && perDay > 0) {
      out.push({
        icon: 'sun',
        tone: 'yellow',
        sensitiveAmount: true,
        amount: perDay,
        text: `That's about {a} a day you can spend until month-end.`,
      })
    }
  } else {
    out.push({
      icon: 'sprout',
      tone: 'blue',
      text: 'Log a few expenses and your money story will start telling itself.',
    })
  }

  // Subscriptions nudge
  if (data.recurring.length > 0) {
    const monthly = data.recurring.reduce(
      (acc, r) => acc + (r.frequency === 'monthly' ? r.amountMinor : r.frequency === 'yearly' ? Math.round(r.amountMinor / 12) : r.amountMinor * 4),
      0,
    )
    out.push({
      icon: 'repeat',
      tone: 'purple',
      sensitiveAmount: true,
      amount: monthly,
      text: `Recurring subscriptions cost you about {a} every month.`,
    })
  }

  return out.slice(0, 5)
}
