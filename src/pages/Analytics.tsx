import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../lib/store'
import { Amount } from '../components/Amount'
import { Segmented } from '../components/ui'
import { CATEGORIES, category } from '../lib/categories'
import { addDays, dayLabel, monthLabel as monthLabelOf, todayISO } from '../lib/dates'
import { monthlySeries, spendByCategory, totalOf, txnsInLastDays, txnsInMonth } from '../lib/selectors'
import { usePrivacyText } from '../components/Amount'

type Range = '7D' | '30D' | '3M' | '6M' | '1Y'
const RANGES: Range[] = ['7D', '30D', '3M', '6M', '1Y']
const MONTHS_FOR: Record<Range, number> = { '7D': 1, '30D': 1, '3M': 3, '6M': 6, '1Y': 12 }

export default function Analytics() {
  const { data } = useApp()
  const [range, setRange] = useState<Range>('30D')
  const txns = data?.txns ?? []

  const months = MONTHS_FOR[range]
  const series = useMemo(() => monthlySeries(txns, months), [txns, months])
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

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-sub muted">Where your money actually goes.</p>
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
          <BarChart
            points={dailyBars.map((d) => ({ label: d.date.slice(8), value: d.value, tip: dayLabel(d.date) }))}
            color="var(--red)"
          />
        ) : (
          <BarChart
            points={series.map((p) => ({ label: p.label, value: p.expense, tip: monthLabelOf(p.key) }))}
            color="var(--red)"
          />
        )}
      </ChartCard>

      <div className="an-two">
        {/* Category donut */}
        <ChartCard title="Spending by category" sub={days ? `Last ${days} days` : `Last ${months} month${months > 1 ? 's' : ''}`}>
          <Donut data={catSpend} total={expense} />
        </ChartCard>

        {/* Income vs expenses */}
        <ChartCard title="Income vs expenses" sub={days ? `Last ${days} days` : `Last ${months} month${months > 1 ? 's' : ''}`}>
          <CompareChart income={income} expense={expense} />
        </ChartCard>
      </div>

      {/* Savings trend */}
      <ChartCard title="Monthly savings" sub="Income minus expenses, per month" wide>
        <LineChart points={series.map((p) => ({ label: p.label, value: p.net }))} />
      </ChartCard>

      {txns.length === 0 && (
        <div className="empty card">
          <h3>Charts incoming.</h3>
          <p className="muted">Add a few transactions and watch your patterns appear.</p>
        </div>
      )}
    </div>
  )
}

function rangeLabel(r: Range): string {
  return { '7D': 'this week', '30D': 'this month', '3M': 'in 3 months', '6M': 'in 6 months', '1Y': 'this year' }[r]
}

function StatCard({ label, value, tone, signed, delay }: { label: string; value: number; tone: string; signed?: boolean; delay: number }) {
  return (
    <motion.div className={`stat-card card tone-${tone}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}>
      <span className="eyebrow">{label}</span>
      <Amount className="display-num stat-num" value={value} signed={signed} ariaLabel={label} />
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

/* ---------- Bar chart ---------- */

function BarChart({ points, color }: { points: { label: string; value: number; tip: string }[]; color: string }) {
  const { fmt } = usePrivacyText()
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...points.map((p) => p.value))
  const labelEvery = points.length > 10 ? Math.ceil(points.length / 8) : 1

  return (
    <div className="barchart">
      <div className="bar-rows">
        {points.map((p, i) => (
          <div
            key={i}
            className={`bar-col ${hover === i ? 'hover' : ''}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onTouchStart={() => setHover(hover === i ? null : i)}
          >
            {hover === i && (
              <div className="bar-tip" role="status">
                <span className="faint">{p.tip}</span>
                <span>{fmt(p.value)}</span>
              </div>
            )}
            <motion.div
              className="bar-fill"
              style={{ background: p.value === 0 ? 'var(--bg-dim)' : color }}
              initial={{ height: 0 }}
              whileInView={{ height: `${Math.max(p.value === 0 ? 3 : 6, (p.value / max) * 100)}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: Math.min(i * 0.015, 0.4), ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        ))}
      </div>
      <div className="bar-labels">
        {points.map((p, i) => (
          <span key={i} className="bar-label faint">{i % labelEvery === 0 ? p.label : ''}</span>
        ))}
      </div>
    </div>
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

/* ---------- Income vs expense compare ---------- */

function CompareChart({ income, expense }: { income: number; expense: number }) {
  const { fmt } = usePrivacyText()
  const max = Math.max(1, income, expense)
  const bars = [
    { label: 'Income', value: income, color: 'var(--green)' },
    { label: 'Expenses', value: expense, color: 'var(--red)' },
  ]
  return (
    <div className="compare">
      {bars.map((b, i) => (
        <div key={b.label} className="compare-col">
          <span className="compare-amt display-num">
            {fmt(b.value, { compact: b.value >= 100_000_00 })}
          </span>
          <div className="compare-track">
            <motion.div
              className="compare-fill"
              style={{ background: b.color }}
              initial={{ height: 0 }}
              whileInView={{ height: `${Math.max(4, (b.value / max) * 100)}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <span className="faint compare-label">{b.label}</span>
        </div>
      ))}
    </div>
  )
}

/* ---------- Savings trend line ---------- */

function LineChart({ points }: { points: { label: string; value: number }[] }) {
  const { fmt } = usePrivacyText()
  const [hover, setHover] = useState<number | null>(null)
  const W = 560
  const H = 160
  const PAD = 8
  const vals = points.map((p) => p.value)
  const max = Math.max(1, ...vals)
  const min = Math.min(0, ...vals)
  const span = max - min || 1
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / Math.max(1, points.length - 1)
  const y = (v: number) => PAD + (1 - (v - min) / span) * (H - PAD * 2)
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.value)}`).join(' ')
  const area = `${path} L${x(points.length - 1)},${H} L${x(0)},${H} Z`
  const zeroY = y(0)

  return (
    <div className="linechart">
      <svg viewBox={`0 0 ${W} ${H}`} className="line-svg" role="img" aria-label="Monthly savings trend">
        <defs>
          <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--blue-strong)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--blue-strong)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={PAD} x2={W - PAD} y1={zeroY} y2={zeroY} stroke="var(--border-strong)" strokeDasharray="4 5" strokeWidth="1" />
        <motion.path d={area} fill="url(#lc-fill)" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.9, delay: 0.25 }} />
        <motion.path
          d={path} fill="none" stroke="var(--blue-strong)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={x(i)} cy={y(p.value)} r={hover === i ? 5.5 : 3.5}
              fill={p.value >= 0 ? 'var(--blue-strong)' : 'var(--red)'}
              stroke="var(--surface)" strokeWidth="2"
              style={{ transition: 'r 0.15s' }}
            />
            <rect
              x={x(i) - 18} y={0} width={36} height={H} fill="transparent"
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            />
          </g>
        ))}
      </svg>
      <div className="line-x">
        {points.map((p, i) => <span key={i} className="faint">{p.label}</span>)}
      </div>
      {hover !== null && (
        <div className="bar-tip line-tip" role="status">
          <span className="faint">{points[hover].label}</span>
          <span>{fmt(points[hover].value, { signed: true })}</span>
        </div>
      )}
    </div>
  )
}
