import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../lib/store'
import { Amount } from '../components/Amount'
import { Modal } from '../components/ui'
import { CATEGORIES, category } from '../lib/categories'
import { dayLabel, daysBetween, todayISO } from '../lib/dates'
import { parseAmountInput } from '../lib/money'
import type { Recurring } from '../lib/types'
import { Pencil, Plus, Repeat, Trash } from '../components/Icons'
import { Glyph, type GlyphName } from '../components/bits/Glyph'

const FREQS: { value: Recurring['frequency']; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'yearly', label: 'Yearly' },
]

export default function Recurring() {
  const { data } = useApp()
  const list = data?.recurring ?? []
  const [editing, setEditing] = useState<Recurring | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Recurring | null>(null)
  const { setRecurring, toast } = useApp()

  const monthlyTotal = list.reduce(
    (acc, r) => acc + (r.frequency === 'monthly' ? r.amountMinor : r.frequency === 'yearly' ? Math.round(r.amountMinor / 12) : r.amountMinor * 4),
    0,
  )

  const sorted = [...list].sort((a, b) => a.nextDate.localeCompare(b.nextDate))

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Recurring</h1>
          <p className="page-sub muted">Subscriptions and repeat expenses, tracked on autopilot.</p>
        </div>
        <div className="head-actions">
          
          <button className="btn btn-primary" onClick={() => setEditing('new')}><Plus size={16} /> Add recurring</button>
        </div>
      </header>

      {sorted.length === 0 ? (
        <div className="empty card">
          <h3>Nothing on repeat.</h3>
          <p className="muted">Track Netflix, Spotify, gym, internet — know exactly what leaves your account every month.</p>
          <button className="btn btn-accent" onClick={() => setEditing('new')}>Add recurring expense</button>
        </div>
      ) : (
        <>
          <motion.section className="rec-total card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
            <Repeat size={22} />
            <div>
              <span className="eyebrow">Every month</span>
              <Amount className="display-num rec-num" value={monthlyTotal} />
            </div>
            <span className="faint rec-note">across {list.length} recurring {list.length === 1 ? 'expense' : 'expenses'}</span>
          </motion.section>

          <div className="rec-list">
            {sorted.map((r, i) => {
              const days = daysBetween(todayISO(), r.nextDate)
              const soon = days <= 3
              const def = category(r.category)
              return (
                <motion.div
                  key={r.id}
                  className="rec-row card"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.35 }}
                >
                  <div className="rec-main">
                    <div className="rec-name">{r.name}</div>
                    <div className="rec-meta faint">{def.label} · {FREQS.find((f) => f.value === r.frequency)?.label}</div>
                  </div>
                  <div className={`rec-next ${soon ? 'soon' : ''}`}>
                    <span className="rec-next-label faint">{days < 0 ? 'Due' : days === 0 ? 'Today' : `in ${days} day${days === 1 ? '' : 's'}`}</span>
                    <span className="rec-next-date">{dayLabel(r.nextDate)}</span>
                  </div>
                  <Amount className="rec-amt display-num" value={r.amountMinor} />
                  <div className="rec-actions">
                    <button className="icon-btn" onClick={() => setEditing(r)} aria-label={`Edit ${r.name}`}><Pencil size={15} /></button>
                    <button className="icon-btn" onClick={() => setDeleting(r)} aria-label={`Delete ${r.name}`}><Trash size={15} /></button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </>
      )}

      <AnimatePresence>
        {editing && (
          <RecModal
            key={editing === 'new' ? 'new' : editing.id}
            rec={editing === 'new' ? null : editing}
            onClose={() => setEditing(null)}
          />
        )}
        {deleting && (
          <Modal open onClose={() => setDeleting(null)} title={`Remove “${deleting.name}”?`}>
            <div className="addform">
              <p className="muted">This stops tracking it. Past transactions stay put.</p>
              <div className="addform-actions">
                <button className="btn btn-ghost" onClick={() => setDeleting(null)}>Keep it</button>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    void setRecurring(list.filter((x) => x.id !== deleting.id))
                    setDeleting(null)
                    toast('success', 'Recurring expense removed.')
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}

function RecModal({ rec, onClose }: { rec: Recurring | null; onClose: () => void }) {
  const { data, setRecurring, toast } = useApp()
  const [name, setName] = useState(rec?.name ?? '')
  const [emoji, setEmoji] = useState(rec?.emoji ?? 'repeat')
  const [amount, setAmount] = useState(rec ? String(rec.amountMinor / 100) : '')
  const [catId, setCatId] = useState(rec?.category ?? 'entertainment')
  const [freq, setFreq] = useState<Recurring['frequency']>(rec?.frequency ?? 'monthly')
  const [nextDate, setNextDate] = useState(rec?.nextDate ?? todayISO())
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const parsed = parseAmountInput(amount)

  async function save() {
    if (!name.trim()) return setErr('What is the name of this expense?')
    if (parsed === null) return setErr('Enter an amount greater than zero.')
    setBusy(true)
    const r: Recurring = {
      id: rec?.id ?? crypto.randomUUID(),
      name: name.trim(),
      emoji,
      amountMinor: parsed,
      category: catId,
      frequency: freq,
      nextDate,
    }
    const list = rec ? (data?.recurring ?? []).map((x) => (x.id === r.id ? r : x)) : [...(data?.recurring ?? []), r]
    await setRecurring(list)
    setBusy(false)
    toast('success', rec ? 'Recurring expense updated.' : 'Recurring expense added.')
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={rec ? 'Edit recurring expense' : 'Add recurring expense'}>
      <div className="addform">
        <div className="addform-row">
          <div className="addform-col">
            <label className="field-label" htmlFor="rc-name">Name</label>
            <input id="rc-name" className="input" placeholder="Netflix" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
          </div>
          <div className="addform-col narrow">
            <label className="field-label" htmlFor="rc-emoji">Icon</label>
            <div className="emoji-row" role="listbox" aria-label="Recurring icon">
              {['repeat', 'pop', 'gradcap', 'wifi', 'rocket', 'coffee'].map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`emoji-cell ${emoji === g ? 'active' : ''}`}
                  onClick={() => setEmoji(g)}
                  role="option"
                  aria-selected={emoji === g}
                >
                  <Glyph name={g as GlyphName} size={18} />
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="rc-amt">Amount</label>
          <div className="addform-amount">
            <span className="addform-cur">₹</span>
            <input id="rc-amt" className="addform-input" inputMode="decimal" placeholder="199" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} />
          </div>
        </div>
        <div>
          <span className="field-label">Category</span>
          <select className="select" value={catId} onChange={(e) => setCatId(e.target.value)} aria-label="Category">
            {CATEGORIES.filter((c) => c.id !== 'income').map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="addform-row">
          <div className="addform-col">
            <span className="field-label">Frequency</span>
            <select className="select" value={freq} onChange={(e) => setFreq(e.target.value as Recurring['frequency'])} aria-label="Frequency">
              {FREQS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div className="addform-col">
            <label className="field-label" htmlFor="rc-next">Next payment</label>
            <input id="rc-next" className="input" type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
          </div>
        </div>
        {err && <p className="form-err" role="alert">{err}</p>}
        <div className="addform-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => void save()} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </Modal>
  )
}
