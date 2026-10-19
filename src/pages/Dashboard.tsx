import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useApp } from '../lib/store'
import { Amount } from '../components/Amount'
import { ProgressBar, Segmented, BalanceToggle } from '../components/ui'
import { TxnRow } from '../components/TxnRow'
import { TxnDetail } from '../components/TxnDetail'
import { useOpenAdd } from '../components/AddExpense'
import SpotlightCard from '../components/bits/SpotlightCard'
import SloshGauge from '../components/bits/SloshGauge'
import ClickSpark from '../components/bits/ClickSpark'
import { clampPercent } from '../lib/money'
import { greeting } from '../lib/dates'
import {
  daysLeftThisMonth, effectiveTotal, moneyModel, safeForRange,
} from '../lib/selectors'
import { insights as buildInsights, type Insight } from '../lib/insights'
import { usePrivacyText } from '../components/Amount'
import type { SafeRange } from '../lib/selectors'
import type { Txn } from '../lib/types'
import { Sparkle } from '../components/Icons'

export default function Dashboard() {
  const { user, data } = useApp()
  const openAdd = useOpenAdd()
  const [range, setRange] = useState<SafeRange>('day')
  const [detail, setDetail] = useState<Txn | null>(null)
  const [celebrate, setCelebrate] = useState(0)

  const txns = data?.txns ?? []
  const profile = data?.profile
  const essentials = useMemo(() => data?.essentials ?? [], [data])
  const model = useMemo(() => (profile ? moneyModel(profile, txns, essentials) : null), [profile, txns, essentials])

  const insights = useMemo(
    () => (data ? buildInsights(data) : []),
    [data],
  )

  if (!data || !profile || !model) return null

  const total = effectiveTotal(profile, txns)
  const safe = safeForRange(model, range)
  const daysLeft = daysLeftThisMonth(model)
  const monthKey = model.monthKey
  const recent = txns.slice(0, 5)

  const rangeLabel = range === 'day' ? 'today' : range === 'week' ? 'this week' : 'this month'
  const daysInRange = range === 'day' ? daysLeft : range === 'week' ? Math.min(7, daysLeft) : daysLeft
  const supportText = `Based on your remaining guilt-free budget and ${daysInRange} ${daysInRange === 1 ? 'day' : 'days'} left ${range === 'day' ? 'this month' : rangeLabel}.`

  const allocationPcts = {
    strict: total > 0 ? clampPercent((profile.strictSavingsMinor / total) * 100) : 0,
    gf: total > 0 ? clampPercent((profile.guiltFreeMinor / total) * 100) : 0,
  }

  const gfPct = model.guiltFreePctRemaining
  const gfTone = gfPct === 0 ? 'empty' : gfPct <= 25 ? 'low' : 'ok'

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">{greeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</h1>
          <p className="page-sub muted">Here's where your money stands.</p>
        </div>
      </header>

      {/* HERO BALANCE */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        aria-label="Total balance"
      >
        <SpotlightCard className="hero-balance card" spotlightColor="rgba(255, 107, 107, 0.16)">
          <div className="hero-left">
            <span className="eyebrow">Total balance</span>
            <div className="hero-amount-row">
              <Amount className="display-num hero-num" value={total} ariaLabel="Total balance" maskable />
              <BalanceToggle compact />
            </div>
            <span className="hero-updated faint">Updated today · includes this month's activity</span>
          </div>
          <div className="hero-split" aria-hidden>
            <span className="hs hs-strict" style={{ width: `${allocationPcts.strict}%` }} />
            <span className="hs hs-gf" style={{ width: `${allocationPcts.gf}%` }} />
          </div>
        </SpotlightCard>
      </motion.section>

      {/* ALLOCATION CARDS */}
      <section className="alloc-row" aria-label="Money allocation">
        <AllocCard
          label="Strict Savings"
          note="Don't touch"
          value={profile.strictSavingsMinor}
          pct={allocationPcts.strict}
          cls="a-green"
          delay={0}
        />
        <AllocCard
          label="Guilt-Free"
          note="Yours to spend"
          value={model.guiltFreeRemaining}
          pct={allocationPcts.gf}
          cls="a-yellow"
          delay={0}
        />
      </section>

      {/* GUILT-FREE SLOSH + SAFE TO SPEND */}
      <section className="dash-mid">
        <motion.section
          className="gf-card card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          aria-label="Guilt-free spending"
        >
          <div className="gf-head">
            <div>
              <h2 className="card-title">Guilt-Free Spending</h2>
              <p className="muted gf-sub">
                {gfTone === 'empty'
                  ? "You've reached your guilt-free spending limit."
                  : gfTone === 'low'
                    ? "You're getting close to your guilt-free limit."
                    : 'Spend it on what makes you happy.'}
              </p>
            </div>
          </div>
          <div className="gf-body">
            <div className="gf-liquid">
              <SloshGauge
                value={Math.round(clampPercent(gfPct))}
                interactive={false}
                showValue={false}
                liquidColor={gfTone === 'empty' ? '#ff6b6b' : gfTone === 'low' ? '#ffb020' : '#ffd93d'}
                glassColor="rgba(140, 120, 90, 0.12)"
                width={96}
                height={130}
                viscosity={6}
                tilt={7}
                splash={3}
                ariaLabel={`${Math.round(gfPct)}% of guilt-free budget remaining`}
              />
              <span className="gf-liquid-pct display-num">{Math.round(gfPct)}%</span>
            </div>
            <div className="gf-nums">
              <Amount className="display-num gf-num" value={model.guiltFreeRemaining} ariaLabel="Guilt-free remaining" />
              <span className="gf-remaining faint">remaining</span>
              <ProgressBar pct={gfPct} color="var(--yellow)" height={12} />
              <div className="gf-stats">
                <div><span className="faint">Spent</span> <Amount value={model.guiltFreeSpent} className="gf-stat" /></div>
                <div><span className="faint">Original</span> <Amount value={model.guiltFreeAllowance} className="gf-stat" /></div>
                <div><span className="faint">Cycle</span> <span className="gf-stat">{monthLabel(monthKey)}</span></div>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          className="sts-card card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          aria-label="Safe to spend"
        >
          <div className="sts-head">
            <h2 className="card-title">Safe to Spend</h2>
            <Segmented
              size="sm"
              options={[
                { value: 'day', label: 'Today' },
                { value: 'week', label: 'Week' },
                { value: 'month', label: 'Month' },
              ]}
              value={range}
              onChange={setRange}
            />
          </div>
          <div className="sts-value">
            <Amount className="display-num sts-num" value={safe} ariaLabel={`Safe to spend ${rangeLabel}`} />
          </div>
          <p className="sts-support muted">{supportText}</p>
          {(model.mabEnabled || model.essentialsRemaining > 0) && (
            <details className="sts-how card-like faint sts-explain">
              <summary>How this is calculated</summary>
              <ul>
                <li>Guilt-free left this cycle: <Amount value={model.guiltFreeRemaining} className="inline-amt" /></li>
                {model.mabEnabled && (
                  <li>Protected balance (kept untouched): <Amount value={model.protectedBalance} className="inline-amt" /></li>
                )}
                {model.mabEnabled && (
                  <li>Account balance above that line: <Amount value={Math.max(0, model.totalBalance - model.protectedBalance)} className="inline-amt" /></li>
                )}
                {model.essentialsRemaining > 0 && (
                  <li>Still owed for essentials this month: <Amount value={model.essentialsRemaining} className="inline-amt" /></li>
                )}
                <li>Split over the days left — that's your safe number.</li>
              </ul>
            </details>
          )}
          <div className="sts-days faint">
            {daysLeft} days left in {monthLabel(monthKey)}
          </div>
        </motion.section>
      </section>

      {/* INSIGHTS */}
      {insights.length > 0 && (
        <section className="dash-insights" aria-label="Your money story">
          <div className="sec-head">
            <h2 className="sec-title"><Sparkle size={17} /> Your Money Story</h2>
            <Link to="/app/analytics" className="see-link">Full analytics →</Link>
          </div>
          <div className="insight-row">
            {insights.slice(0, 4).map((ins, i) => (
              <InsightCard key={i} ins={ins} delay={0} />
            ))}
          </div>
        </section>
      )}

      {/* RECENT TRANSACTIONS */}
      <section className="dash-recent">
        <div className="sec-head">
          <h2 className="sec-title">Recent activity</h2>
          <Link to="/app/transactions" className="see-link">See all →</Link>
        </div>
        {recent.length === 0 ? (
          <ClickSpark sparkColor="#ffd93d" sparkCount={10}>
            <EmptyAdd onAdd={() => { setCelebrate((c) => c + 1); openAdd() }} />
          </ClickSpark>
        ) : (
          <div className="card txn-list">
            {recent.map((t, i) => (
              <TxnRow key={t.id} txn={t} index={i} onOpen={setDetail} />
            ))}
          </div>
        )}
      </section>

      {/* FAB (mobile-first quick add) */}
      <ClickSpark sparkColor="#ffd93d" sparkCount={12} sparkRadius={70}>
        <motion.button
          className="fab"
          onClick={openAdd}
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.06, rotate: 4 }}
          aria-label="Add expense"
        >
          +
        </motion.button>
      </ClickSpark>

      {detail && <TxnDetail txn={detail} onClose={() => setDetail(null)} />}
      <span hidden data-celebrate={celebrate} />
    </div>
  )
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short' })
}

function AllocCard({ label, note, value, pct, cls, delay }: {
  label: string; note: string; value: number; pct: number; cls: string; delay: number
}) {
  const spotlight = cls === 'a-green' ? 'rgba(34, 211, 153, 0.16)' : 'rgba(255, 176, 32, 0.18)'
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <SpotlightCard className={`alloc-card card hover-lift ${cls}`} spotlightColor={spotlight}>
        <div className="alloc-top">
          <div>
            <div className="alloc-label">{label}</div>
            <div className="alloc-note muted">{note}</div>
          </div>
        </div>
        <Amount className="display-num alloc-val" value={value} ariaLabel={label} />
        <ProgressBar pct={pct} color={`var(--${cls.replace('a-', '')})`} height={8} delay={0} />
      </SpotlightCard>
    </motion.div>
  )
}

function InsightCard({ ins, delay }: { ins: Insight; delay: number }) {
  const { fmt } = usePrivacyText()
  const text = ins.text.replace('{a}', ins.amount != null ? fmt(ins.amount) : '').replace('{p}', String(ins.pct ?? 0))
  return (
    <motion.div
      className={`insight-card card tone-${ins.tone}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <p>{text}</p>
    </motion.div>
  )
}

function EmptyAdd({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="empty card">
      <h3>Your Ledger is suspiciously quiet.</h3>
      <p className="muted">Add your first expense and start understanding where your money goes.</p>
      <button className="btn btn-accent" onClick={onAdd}>Add transaction</button>
    </div>
  )
}
