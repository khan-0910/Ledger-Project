import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../lib/store'
import { Amount, AmountStatic, Pct, usePrivacyText } from '../components/Amount'
import { Modal, ProgressBar } from '../components/ui'
import { EXPENSE_CATEGORIES, category } from '../lib/categories'
import { currentMonthKey, monthLabel } from '../lib/dates'
import { budgetProgress, spendByCategory, totalOf, txnsInMonth } from '../lib/selectors'
import { parseAmountInput } from '../lib/money'
import type { Budget } from '../lib/types'
import { Pencil, Plus, Trash } from '../components/Icons'

export default function Budgets() {
  const { data, setBudgets, toast } = useApp()
  const monthKey = currentMonthKey()
  const [editing, setEditing] = useState<Budget | 'new' | null>(null)

  const budgets = data?.budgets ?? []
  const txns = data?.txns ?? []
  const progress = useMemo(() => budgetProgress(txns, budgets, monthKey), [txns, budgets, monthKey])

  const spentMap = useMemo(() => spendByCategory(txnsInMonth(txns, monthKey)), [txns, monthKey])
  const unbudgeted = useMemo(() => {
    const map = new Map(spentMap)
    for (const b of budgets) map.delete(b.category)
    return map
  }, [spentMap, budgets])

  const totalLimit = budgets.reduce((a, b) => a + b.limitMinor, 0)
  const totalSpent = totalOf(txnsInMonth(txns, monthKey), 'expense')
  const usePct = totalLimit > 0 ? Math.min(100, (totalSpent / totalLimit) * 100) : 0

  const budgetedCats = new Set(budgets.map((b) => b.category))

  async function remove(b: Budget) {
    await setBudgets(budgets.filter((x) => x.id !== b.id))
    toast('success', 'Budget removed.')
  }

  return (
    <div className="page page-budgets">
      <header className="page-head">
        <div>
          <h1 className="page-title">Budgets</h1>
          <p className="page-sub muted">{monthLabel(monthKey)} · {budgets.length} active</p>
        </div>
        <div className="head-actions">
          
          <button className="btn btn-primary" onClick={() => setEditing('new')}><Plus size={16} /> New budget</button>
        </div>
      </header>

      {budgets.length === 0 ? (
        <div className="empty card">
          <h3>Give your money a plan.</h3>
          <p className="muted">Set a monthly limit per category and Ledger nags you gently — never shamefully.</p>
          <button className="btn btn-accent" onClick={() => setEditing('new')}>Create budget</button>
        </div>
      ) : (
        <>
          <motion.section className="budget-total card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bt-left">
              <span className="eyebrow">Planned this month</span>
              <Amount className="display-num bt-num" value={totalLimit} />
            </div>
            <div className="bt-right">
              <div className="bt-line"><span className="faint">Spent so far</span> <Amount value={totalSpent} /></div>
              <ProgressBar pct={usePct} color="var(--accent-deep)" height={10} />
              <div className="bt-note faint">{Math.round(usePct)}% of planned budgets used</div>
            </div>
          </motion.section>

          <div className="budget-grid">
            {progress.map((p, i) => (
              <BudgetCard key={p.budget.id} p={p} index={i} onEdit={() => setEditing(p.budget)} onDelete={() => void remove(p.budget)} />
            ))}
          </div>

          {unbudgeted.size > 0 && (
            <section className="unbudgeted card">
              <h3 className="card-title">Spending without a budget</h3>
              <p className="faint">Where money's going that you haven't planned for yet.</p>
              <div className="unb-row">
                {Array.from(unbudgeted).map(([catId, val]) => {
                  const def = category(catId)
                  return (
                    <div key={catId} className="unb-item">
                      <span className="unb-label">{def.label}</span>
                      <Amount value={val} className="unb-amt" />
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}

      <AnimatePresence>
        {editing && (
          <BudgetModal
            key="bm"
            budget={editing === 'new' ? null : editing}
            taken={budgetedCats}
            onClose={() => setEditing(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function BudgetCard({ p, index, onEdit, onDelete }: {
  p: ReturnType<typeof budgetProgress>[number]
  index: number
  onEdit: () => void
  onDelete: () => void
}) {
  const { fmt } = usePrivacyText()
  const [confirming, setConfirming] = useState(false)
  const def = category(p.budget.category)
  const color = def.color
  const money = (v: number) => fmt(v)

  const statusText =
    p.state === 'over' ? `${money(p.remaining)} over` :
    p.state === 'near' ? `${money(p.remaining)} left — go slow` :
    `${money(p.remaining)} remaining`

  return (
    <motion.div
      className={`budget-card card hover-lift state-${p.state}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
    >
      <div className="bc-head">
        <div className="bc-name">
          <div className="bc-label">{def.label}</div>
          <Pct value={p.pct} className="bc-pct faint" />
        </div>
        <div className="bc-actions">
          <button className="icon-btn" onClick={onEdit} aria-label={`Edit ${def.label} budget`}><Pencil size={15} /></button>
          {confirming ? (
            <button className="btn btn-danger btn-sm" onClick={onDelete}>Sure?</button>
          ) : (
            <button className="icon-btn" onClick={() => setConfirming(true)} aria-label={`Delete ${def.label} budget`}><Trash size={15} /></button>
          )}
        </div>
      </div>
      <div className="bc-amts">
        <Amount className="display-num bc-amt" value={p.spent} />
        <span className="bc-limit faint">/ <AmountStatic value={p.limit} /></span>
      </div>
      <ProgressBar pct={p.pct} color={p.state === 'over' ? 'var(--red)' : p.state === 'near' ? 'var(--yellow)' : color} />
      <div className={`bc-status st-${p.state}`}>{statusText}</div>
    </motion.div>
  )
}

function BudgetModal({ budget, taken, onClose }: { budget: Budget | null; taken: Set<string>; onClose: () => void }) {
  const { setBudgets, data, toast } = useApp()
  const [catId, setCatId] = useState(budget?.category ?? '')
  const [limit, setLimit] = useState(budget ? String(budget.limitMinor / 100) : '')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const parsed = parseAmountInput(limit)
  const monthKey = currentMonthKey()
  const cats = EXPENSE_CATEGORIES.filter((c) => budget?.category === c.id || !taken.has(c.id))

  async function save() {
    if (!catId) return setErr('Pick a category to budget.')
    if (parsed === null) return setErr('Enter a monthly limit greater than zero.')
    setBusy(true)
    const b: Budget = { id: budget?.id ?? crypto.randomUUID(), category: catId, limitMinor: parsed, month: monthKey }
    const list = budget ? (data?.budgets ?? []).map((x) => (x.id === b.id ? b : x)) : [...(data?.budgets ?? []), b]
    await setBudgets(list)
    setBusy(false)
    toast('success', budget ? 'Budget updated.' : 'Budget created — may the odds be ever in your favor.')
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={budget ? 'Edit budget' : 'New budget'}>
      <div className="addform">
        <div>
          <span className="field-label">Category</span>
          <div className="cat-grid compact">
            {cats.length === 0 && <p className="faint">Every category already has a budget. Impressive.</p>}
            {cats.map((c) => (
              <button
                key={c.id}
                className={`cat-cell ${catId === c.id ? 'active' : ''}`}
                style={{ '--cat': c.color } as React.CSSProperties}
                onClick={() => setCatId(c.id)}
                aria-pressed={catId === c.id}
              >
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="bg-limit">Monthly limit</label>
          <div className="addform-amount">
            <span className="addform-cur">₹</span>
            <input id="bg-limit" className="addform-input" inputMode="decimal" placeholder="0" value={limit} onChange={(e) => setLimit(e.target.value.replace(/[^\d.]/g, ''))} />
          </div>
        </div>
        {err && <p className="form-err" role="alert">{err}</p>}
        <div className="addform-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => void save()} disabled={busy}>{busy ? 'Saving…' : 'Save budget'}</button>
        </div>
      </div>
    </Modal>
  )
}
