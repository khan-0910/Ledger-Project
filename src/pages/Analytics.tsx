import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../lib/store'
import { Amount } from '../components/Amount'
import { Segmented } from '../components/ui'
import { CATEGORIES, category } from '../lib/categories'
import { addDays, currentMonthKey, dayLabel, monthLabel as monthLabelOf, todayISO } from '../lib/dates'
import { dailySeries, monthlySeries, spendByCategory, totalOf, txnsInLastDays, txnsInMonth } from '../lib/selectors'
import { usePrivacyText } from '../components/Amount'
import { FlowArea, SmoothLine, SpendCalendar, StreamChart, type StreamSeries } from '../components/charts/Flow'

type Range = '7D' | '30D' | '3M' | '6M' | '1Y'
const RANGES: Range[] = ['7D', '30D', '3M', '6M', '1Y']
const MONTHS_FOR: Record<Range, number> = { '7D': 1, '30D': 1, '3M': 3, '6M': 6, '1Y': 12 }

export default function Analytics() {
  const { data } = useApp()
  const [range, setRange] = useState<Range>('30D')
  const txns = data?.txns ?? []

  const months = MONTHS_FOR[range]
  const series = useMemo(() => monthlySeries(txns, months), [txns, months])
  // The savings trend is always a *monthly* line: with 7D/30D only one
  // bucket exists, which renders as a lone dot — extend to 3 months minimum.
  const savingsSeries = useMemo(() => monthlySeries(txns, Math.max(months, 3)), [txns, months])
  const days = range === '7D' ? 7 : range === '30D' ? 30 : 0
  const dailyBars = useMemo(() => {
    if (!days) return []
    const from = addDays(todayISO(), -(days - 1))
    const perDay = new Map<string, number>()
    for (const t of txns) {
      if (t.type !== 'expense' || t.date < from) continue
      perDay.set(t.date, (perDay.get(t.date) ?? 0) + t.amountMinor)
    }
    return Array.from({ length: days }, (_, i) => {
      const date = addDays(todayISO(), -(days - 1 - i))
      return { date, value: perDay.get(date) ?? 0 }
    })
  }, [txns, days])

  const rangeTxns = useMemo(
    () => (days ? txnsInLastDays(txns, days) : series.flatMap((p) => txnsInMonth(txns, p.key))),
    [txns, days, series],
  )
  const expense = totalOf(rangeTxns, 'expense')
  const income = totalOf(rangeTxns, 'income')

  const catSpend = useMemo(() => {
    const map = spendByCategory(rangeTxns)
    return Array.from(map).map(([id, val]) => ({ def: category(id), val })).sort((a, b) => b.val - a.val)
  }, [rangeTxns])

  const stream = useMemo(() => streamData(txns, range), [txns, range])
  const calendar = useMemo(() => dailySeries(txns, currentMonthKey()).map((d) => ({ date: d.date, value: d.expense })), [txns])

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-sub muted">Where your money actually goes</p>
        </div>
        <div className="head-actions">
          <Segmented size="sm" options={RANGES.map((r) => ({ value: r, label: r }))} value={range} onChange={setRange} />
          
        </div>
      </header>

      {/* Summary strip */}
      <section className="an-summary">
        <StatCard label={`Spent ${rangeLabel(range)}`} value={expense} tone="red" delay={0} />
        <StatCard label={`Income ${rangeLabel(range)}`} value={income} tone="green" delay={0.05} />
        <StatCard label="Net" value={income - expense} tone="purple" delay={0.1} signed />
      </section>

      {/* Spending chart */}
      <ChartCard title={days ? 'Daily spending' : 'Monthly spending'} sub={`Last ${days ?? months} ${days ? 'days' : 'months'}`}>
        {days ? (
          <FlowArea
            label="Daily spending"
            height={240}
            points={dailyBars.map((d) => ({ label: String(Number(d.date.slice(8))), value: d.value, tip: dayLabel(d.date) }))}
          />
        ) : (
          <FlowArea
            label="Monthly spending"
            height={240}
            points={series.map((p) => ({ label: p.label, value: p.expense, tip: monthLabelOf(p.key) }))}
          />
        )}
      </ChartCard>

      {/* Category stream */}
      <ChartCard title="How your spending flows" sub={stream.sub}>
        <StreamChart series={stream.series} labels={stream.labels} />
        <div className="flow-key">
          {stream.series.map((s) => (
            <span key={s.id}><i style={{ background: s.color }} />{s.label}</span>
          ))}
        </div>
      </ChartCard>

      <div className="an-two">
        {/* Category donut */}
        <ChartCard title="Spending by category" sub={days ? `Last ${days} days` : `Last ${months} month${months > 1 ? 's' : ''}`}>
          <Donut data={catSpend} total={expense} />
        </ChartCard>

        {/* Day-by-day calendar */}
        <ChartCard title="Day by day" sub={monthLabelOf(currentMonthKey())}>
          <SpendCalendar days={calendar} today={todayISO()} />
        </ChartCard>
      </div>

      {/* Savings trend */}
      <ChartCard title="Monthly savings" sub="Income minus expenses, per month" wide>
        <SmoothLine label="Monthly savings trend" points={savingsSeries.map((p) => ({ label: p.label, value: p.net }))} />
      </ChartCard>

      {txns.length === 0 && (
        <div className="empty card">
          <h3>No charts yet</h3>
          <p className="muted">Add a few transactions and your patterns show up here.</p>
        </div>
      )}
    </div>
  )
}

/** Category totals per bucket: days for short ranges, weeks or months for long ones. */
function streamData(txns: { type: string; date: string; category: string; amountMinor: number }[], range: Range) {
  const today = todayISO()
  const spec = {
    '7D': { n: 7, size: 1, unit: 'day' },
    '30D': { n: 10, size: 3, unit: 'day' },
    '3M': { n: 13, size: 7, unit: 'day' },
    '6M': { n: 26, size: 7, unit: 'day' },
    '1Y': { n: 12, size: 0, unit: 'month' },
  }[range]
  const buckets: { from: string; to: string; label: string }[] = []
  if (spec.unit === 'month') {
    const now = new Date()
    for (let i = spec.n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      buckets.push({ from: `${key}-01`, to: `${key}-31`, label: d.toLocaleDateString('en-IN', { month: 'short' }) })
    }
  } else {
    for (let i = spec.n - 1; i >= 0; i--) {
      const to = addDays(today, -i * spec.size)
      const from = addDays(to, -(spec.size - 1))
      const d = new Date(to)
      buckets.push({ from, to, label: d.toLocaleDateString('en-IN', spec.size === 1 ? { weekday: 'short' } : { day: 'numeric', month: 'short' }) })
    }
  }
  const per = new Map<string, number[]>()
  for (const t of txns) {
    if (t.type !== 'expense') continue
    const bi = buckets.findIndex((b) => t.date >= b.from && t.date <= b.to)
    if (bi < 0) continue
    if (!per.has(t.category)) per.set(t.category, Array(buckets.length).fill(0))
    per.get(t.category)![bi] += t.amountMinor
  }
  const series: StreamSeries[] = Array.from(per)
    .map(([id, values]) => ({ id, label: category(id).label, color: category(id).color, values }))
    .sort((a, b) => b.values.reduce((x, y) => x + y, 0) - a.values.reduce((x, y) => x + y, 0))
  const sub = { '7D': 'By day, last 7 days', '30D': 'Every 3 days, last 30 days', '3M': 'By week, last 3 months', '6M': 'By week, last 6 months', '1Y': 'By month, last year' }[range]
  return { series, labels: buckets.map((b) => b.label), sub }
}

function rangeLabel(r: Range): string {
  return { '7D': 'this week', '30D': 'this month', '3M': 'in 3 months', '6M': 'in 6 months', '1Y': 'this year' }[r]
}

function StatCard({ label, value, tone, signed, delay }: { label: string; value: number; tone: string; signed?: boolean; delay: number }) {
  return (
    <motion.div className={`stat-card card tone-${tone}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}>
      <span className="eyebrow">{label}</span>
      <Amount count className="display-num stat-num" value={value} signed={signed} ariaLabel={label} />
    </motion.div>
  )
}

function ChartCard({ title, sub, children, wide }: { title: string; sub: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <motion.section
      className={`chart-card card ${wide ? 'wide' : ''}`}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5 }}
    >
      <div className="chart-head">
        <h2 className="card-title">{title}</h2>
        <span className="faint">{sub}</span>
      </div>
      {children}
    </motion.section>
  )
}

/* ---------- Donut ---------- */

function Donut({ data, total }: { data: { def: (typeof CATEGORIES)[number]; val: number }[]; total: number }) {
  const { fmt } = usePrivacyText()
  const R = 54
  const C = 2 * Math.PI * R
  let acc = 0
  const arcs = data.map((d) => {
    const frac = total > 0 ? d.val / total : 0
    const arc = { ...d, frac, offset: acc }
    acc += frac
    return arc
  })

  return (
    <div className="donut-wrap">
      <div className="donut-box">
        <svg width="150" height="150" viewBox="0 0 130 130" role="img" aria-label="Spending by category">
          <circle cx="65" cy="65" r={R} fill="none" stroke="var(--bg-dim)" strokeWidth="15" />
          {arcs.map((a, i) => (
            <motion.circle
              key={a.def.id}
              cx="65" cy="65" r={R} fill="none"
              stroke={a.def.color}
              strokeWidth="15" strokeLinecap="butt"
              strokeDasharray={`${a.frac * C} ${C}`}
              initial={{ strokeDashoffset: C, opacity: 0 }}
              whileInView={{ strokeDashoffset: -a.offset * C, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              transform="rotate(-90 65 65)"
            />
          ))}
          <text x="65" y="60" textAnchor="middle" className="donut-cap">Total</text>
          <text x="65" y="78" textAnchor="middle" className="donut-val">
            {fmt(total, { compact: true })}
          </text>
        </svg>
      </div>
      <div className="donut-legend">
        {arcs.length === 0 && <p className="faint">No spending in this range yet.</p>}
        {arcs.map((a) => (
          <div key={a.def.id} className="legend-row">
            <span className="legend-dot" style={{ background: a.def.color }} />
            <span className="legend-label">{a.def.label}</span>
            <span className="legend-pct faint">{Math.round(a.frac * 100)}%</span>
            <span className="legend-amt">{fmt(a.val)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

