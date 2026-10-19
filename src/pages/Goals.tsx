import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../lib/store'
import { Modal, ProgressBar } from '../components/ui'
import { usePrivacyText } from '../components/Amount'
import { parseAmountInput } from '../lib/money'
import { dayLabel, daysBetween, todayISO } from '../lib/dates'
import { goalProgress } from '../lib/selectors'
import type { Goal } from '../lib/types'
import { Pencil, Plus, Trash } from '../components/Icons'
import { StickerBurst } from '../components/bits/Stickers'
import { Glyph, type GlyphName, glyphFor, emojiForGlyph } from '../components/bits/Glyph'

/** Goal icon picker options — original vector glyphs, not emoji. */
const GOAL_GLYPHS: { g: GlyphName; label: string }[] = [
  { g: 'laptop', label: 'Laptop' },
  { g: 'beach', label: 'Trip' },
  { g: 'cushion', label: 'Cushion' },
  { g: 'rocket', label: 'Launch' },
  { g: 'gradcap', label: 'Course' },
  { g: 'target', label: 'Target' },
  { g: 'party', label: 'Celebrate' },
  { g: 'coffee', label: 'Small joys' },
]

export default function Goals() {
  const [celebrate, setCelebrate] = useState(false)
  useEffect(() => {
    if (!celebrate) return
    const t = window.setTimeout(() => setCelebrate(false), 2200)
    return () => window.clearTimeout(t)
  }, [celebrate])
  const { data, setGoals, toast } = useApp()
  const goals = data?.goals ?? []
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [funding, setFunding] = useState<Goal | null>(null)
  const [deleting, setDeleting] = useState<Goal | null>(null)

  async function save(list: Goal[]) {
    await setGoals(list)
  }

  const sorted = [...goals].sort((a, b) => goalProgress(b) - goalProgress(a))

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Goals</h1>
          <p className="page-sub muted">{goals.length === 0 ? 'Dreams, with deadlines.' : `${goals.length} dream${goals.length > 1 ? 's' : ''} in progress`}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> New goal</button>
      </header>

      {sorted.length === 0 ? (
        <div className="empty card">
          <h3>Got something you're saving for?</h3>
          <p className="muted">A gaming PC. A Goa trip. A laptop that doesn't sound like a jet engine.</p>
          <button className="btn btn-accent" onClick={() => setCreating(true)}>Create a goal</button>
        </div>
      ) : (
        <div className="goals-grid">
          {sorted.map((g, i) => (
            <GoalCard
              key={g.id}
              g={g}
              index={i}
              onEdit={() => setEditing(g)}
              onFund={() => setFunding(g)}
              onDelete={() => setDeleting(g)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {creating && <GoalModal key="new" goal={null} onClose={() => setCreating(false)} onSave={save} />}
        {editing && <GoalModal key="edit" goal={editing} onClose={() => setEditing(null)} onSave={save} />}
        {funding && (
          <FundModal
            key="fund"
            goal={funding}
            onClose={() => setFunding(null)}
            onAdd={(amt) => {
              const target = goals.find((g) => g.id === funding.id)
              const willComplete = target != null && goalProgress({ ...target, savedMinor: target.savedMinor + amt }) >= 100 && goalProgress(target) < 100
              void save(goals.map((g) => (g.id === funding.id ? { ...g, savedMinor: g.savedMinor + amt } : g)))
              setFunding(null)
              if (willComplete) {
                toast('success', 'Goal complete!')
                setCelebrate(true)
              } else {
                toast('success', 'Saved towards your goal')
              }
            }}
          />
        )}
        <AnimatePresence>
          {celebrate && (
            <motion.div
              className="goal-celebrate"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.4 } }}
            >
              <div className="goal-celebrate-card" key={celebrate as unknown as string}>
                <p className="goal-celebrate-line">Goal complete — future you says thanks</p>
                <StickerBurst kinds={['sparkle', 'star', 'coin', 'coin-stack']} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {deleting && (
          <Modal open onClose={() => setDeleting(null)} title={`Delete “${deleting.name}”?`}>
            <div className="addform">
              <p className="muted">This removes the goal but doesn't touch your transactions or balances.</p>
              <div className="addform-actions">
                <button className="btn btn-ghost" onClick={() => setDeleting(null)}>Keep it</button>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    void save(goals.filter((g) => g.id !== deleting.id))
                    setDeleting(null)
                    toast('success', 'Goal deleted.')
                  }}
                >
                  Delete goal
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}

function GoalCard({ g, index, onEdit, onFund, onDelete }: {
  g: Goal; index: number; onEdit: () => void; onFund: () => void; onDelete: () => void
}) {
  const { fmt } = usePrivacyText()
  const pct = goalProgress(g)
  const done = pct >= 100
  const remainingDays = g.targetDate ? daysBetween(todayISO(), g.targetDate) : null

  return (
    <motion.div
      className="goal-card card hover-lift"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.45 }}
    >
      <div className="gc-head">
        <div className="gc-name">
          <div className="gc-title">{g.name}</div>
          <div className="gc-sub faint">
            {g.targetDate ? `Target ${dayLabel(g.targetDate)}` : 'No deadline'}
            {remainingDays !== null && remainingDays > 0 && !done ? ` · ${remainingDays} days left` : ''}
          </div>
        </div>
        <GoalRing pct={pct} done={done} />
      </div>

      <div className="gc-amts">
        <div>
          <span className="faint gc-cap">Saved</span>
          <div className="gc-val display-num">{fmt(g.savedMinor)}</div>
        </div>
        <div>
          <span className="faint gc-cap">Target</span>
          <div className="gc-target">{fmt(g.targetMinor)}</div>
        </div>
      </div>

      <ProgressBar pct={pct} color={done ? 'var(--green)' : 'var(--yellow)'} height={10} delay={0.1} />

      <div className="gc-actions">
        <button className="btn btn-accent btn-sm" onClick={onFund}>+ Add money</button>
        <button className="icon-btn" onClick={onEdit} aria-label={`Edit ${g.name}`}><Pencil size={15} /></button>
        <button className="icon-btn" onClick={onDelete} aria-label={`Delete ${g.name}`}><Trash size={15} /></button>
      </div>
    </motion.div>
  )
}

function GoalRing({ pct, done }: { pct: number; done: boolean }) {
  const R = 24
  const C = 2 * Math.PI * R
  return (
    <svg width="58" height="58" viewBox="0 0 60 60" role="img" aria-label={`${Math.round(pct)}% saved`}>
      <circle cx="30" cy="30" r={R} fill="none" stroke="var(--bg-dim)" strokeWidth="6" />
      <motion.circle
        cx="30" cy="30" r={R} fill="none"
        stroke={done ? 'var(--green)' : 'var(--yellow)'}
        strokeWidth="6" strokeLinecap="round"
        strokeDasharray={C}
        initial={{ strokeDashoffset: C }}
        animate={{ strokeDashoffset: C * (1 - Math.min(100, pct) / 100) }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        transform="rotate(-90 30 30)"
      />
      <text x="30" y="34" textAnchor="middle" className="ring-label">{Math.round(pct)}%</text>
    </svg>
  )
}

function GoalModal({ goal, onClose, onSave }: { goal: Goal | null; onClose: () => void; onSave: (g: Goal[]) => void }) {
  const { data, toast } = useApp()
  const [name, setName] = useState(goal?.name ?? '')
  // Legacy emoji field is derived from the chosen glyph so stored data stays valid.
  const [emoji] = useState(goal?.emoji ?? '🎯')

  const [glyph, setGlyph] = useState<GlyphName>(glyphFor(goal?.emoji, 'laptop'))
  const [target, setTarget] = useState(goal ? String(goal.targetMinor / 100) : '')
  const [saved, setSaved] = useState(goal ? String(goal.savedMinor / 100) : '0')
  const [date, setDate] = useState(goal?.targetDate ?? '')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const targetMinor = parseAmountInput(target)
  const savedMinor = parseAmountInput(saved) ?? 0

  async function submit() {
    if (!name.trim()) return setErr('Give the goal a name.')
    if (targetMinor === null) return setErr('Enter a target amount.')
    setBusy(true)
    const g: Goal = {
      id: goal?.id ?? crypto.randomUUID(),
      name: name.trim(),
      emoji: emojiForGlyph(glyph) || emoji,
      targetMinor,
      savedMinor,
      targetDate: date || undefined,
      createdAt: goal?.createdAt ?? new Date().toISOString(),
    }
    const list = goal ? (data?.goals ?? []).map((x) => (x.id === g.id ? g : x)) : [...(data?.goals ?? []), g]
    await onSave(list)
    setBusy(false)
    toast('success', goal ? 'Goal updated.' : 'Goal created. Future you says thanks.')
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={goal ? 'Edit goal' : 'New goal'}>
      <div className="addform">
        <div>
          <span className="field-label">Pick an icon</span>
          <div className="emoji-row" role="listbox" aria-label="Goal icon">
            {GOAL_GLYPHS.map(({ g, label }) => (
              <button
                key={g}
                className={`emoji-cell ${glyph === g ? 'active' : ''}`}
                onClick={() => setGlyph(g)}
                role="option"
                aria-selected={glyph === g}
                aria-label={label}
              >
                <Glyph name={g} size={20} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="g-name">Goal name</label>
          <input id="g-name" className="input" placeholder="Gaming PC" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        </div>
        <div className="addform-row">
          <div className="addform-col">
            <label className="field-label" htmlFor="g-target">Target amount</label>
            <div className="addform-amount">
              <span className="addform-cur">₹</span>
              <input id="g-target" className="addform-input" inputMode="decimal" placeholder="150000" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^\d.]/g, ''))} />
            </div>
          </div>
          <div className="addform-col">
            <label className="field-label" htmlFor="g-saved">Already saved</label>
            <div className="addform-amount">
              <span className="addform-cur">₹</span>
              <input id="g-saved" className="addform-input" inputMode="decimal" placeholder="0" value={saved} onChange={(e) => setSaved(e.target.value.replace(/[^\d.]/g, ''))} />
            </div>
          </div>
        </div>
        <div className="addform-col">
          <label className="field-label" htmlFor="g-date">Target date <span className="faint">(optional)</span></label>
          <input id="g-date" className="input" type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {err && <p className="form-err" role="alert">{err}</p>}
        <div className="addform-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => void submit()} disabled={busy}>{busy ? 'Saving…' : 'Save goal'}</button>
        </div>
      </div>
    </Modal>
  )
}

function FundModal({ goal, onClose, onAdd }: { goal: Goal; onClose: () => void; onAdd: (amt: number) => void }) {
  const [val, setVal] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const parsed = parseAmountInput(val)

  return (
    <Modal open onClose={onClose} title={`Add to ${goal.name}`}>
      <div className="addform">
        <div className="addform-amount">
          <span className="addform-cur">₹</span>
          <input className="addform-input" inputMode="decimal" placeholder="0" value={val} onChange={(e) => setVal(e.target.value.replace(/[^\d.]/g, ''))} autoFocus />
        </div>
        <div className="quick-amts">
          {[100, 250, 500, 1000].map((q) => (
            <button key={q} className="chip" onClick={() => setVal(String(q))}>₹{q}</button>
          ))}
        </div>
        {err && <p className="form-err" role="alert">{err}</p>}
        <div className="addform-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-accent"
            onClick={() => {
              if (parsed === null) return setErr('Enter an amount greater than zero.')
              onAdd(parsed)
            }}
          >
            Add to goal
          </button>
        </div>
      </div>
    </Modal>
  )
}
