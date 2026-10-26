import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../lib/store'
import { useCountUp } from '../components/Amount'
import { formatINR, maskFor, parseAmountInput } from '../lib/money'
import LedgerLogo from '../components/Logo'
import { FloatObject } from '../components/bits/Stickers'
import { ArrowRight, Check } from '../components/Icons'
import { Link } from 'react-router-dom'

const STEPS = 4

const spring = { type: 'spring', stiffness: 320, damping: 30 } as const

export default function Onboarding() {
  const { user, data, completeOnboarding } = useApp()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [name, setName] = useState(data?.profile.name || user?.name || '')
  const [total, setTotal] = useState('')
  const [strict, setStrict] = useState('')
  const [gf, setGf] = useState('')
  const [showVals, setShowVals] = useState(false)
  const [finishing, setFinishing] = useState(false)

  const totalMinor = parseAmountInput(total)
  const strictMinor = parseAmountInput(strict) ?? 0
  const gfMinor = parseAmountInput(gf) ?? 0
  const allocated = strictMinor + gfMinor

  const over = totalMinor !== null && allocated > totalMinor

  const canNext = useMemo(() => {
    switch (step) {
      case 0: return name.trim().length > 0
      case 1: return totalMinor !== null
      case 2: return strictMinor > 0
      case 3: return gfMinor > 0 && !over
      default: return true
    }
  }, [step, name, totalMinor, strictMinor, gfMinor, over])

  function next() {
    if (!canNext) return
    setDir(1)
    setStep((s) => Math.min(s + 1, STEPS - 1))
  }
  function back() {
    setDir(-1)
    setStep((s) => Math.max(s - 1, 0))
  }

  async function finish() {
    setFinishing(true)
    await completeOnboarding({
      name: name.trim(),
      total: totalMinor ?? 0,
      strict: strictMinor,
      guiltFree: gfMinor,
    })
  }

  return (
    <div className="onb-page">
      <div className="onb-stickers" aria-hidden="true">
        <FloatObject kind="coin-stack" size={46} seed={5} depth="mid" className="os os-1" delay={0.4} />
        <FloatObject kind="jar" size={52} seed={1} depth="near" className="os os-2" delay={0.55} />
        <FloatObject kind="notebook" size={40} seed={9} depth="far" className="os os-3" delay={0.7} />
        <FloatObject kind="sparkle" size={28} seed={12} depth="far" className="os os-4" delay={0.85} />
      </div>
      <div className="onb-top">
        <Link to="/" className="logo-link" aria-label="Ledger home">
          <LedgerLogo size={26} />
          <span className="logo-word">Ledger</span>
        </Link>
        <div className="onb-dots" aria-label={`Step ${step + 1} of ${STEPS}`}>
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className={`onb-dot ${i < step ? 'done' : ''} ${i === step ? 'on' : ''}`} />
          ))}
        </div>
      </div>

      <div className="onb-stage">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: 44 * dir }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -34 * dir }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="onb-panel"
          >
            {step === 0 && (
              <StepShell title={`Hey! What should we call you?`} sub="Your Ledger, your name.">
                <input
                  className="input input-lg onb-input"
                  placeholder="Aarav"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={30}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && next()}
                />
              </StepShell>
            )}

            {step === 1 && (
              <StepShell title={`How much money do you have available, ${name.trim() || 'friend'}?`} sub="Your total bank balance right now. You can change it anytime.">
                <MoneyInput value={total} onChange={setTotal} onEnter={next} autoFocus />
              </StepShell>
            )}

            {step === 2 && (
              <StepShell
                title="How much do you want to protect?"
                sub="Strict savings — money you've promised yourself not to touch. Keep your bank's minimum balance in mind when you pick the number."
              >
                <MoneyInput value={strict} onChange={setStrict} onEnter={next} autoFocus label="Strict savings" />
                {totalMinor !== null && strictMinor > totalMinor && (
                  <p className="form-err">That's more than your total balance — try a smaller amount.</p>
                )}
              </StepShell>
            )}

            {step === 3 && (
              <StepShell title="How much are you comfortable spending?" sub="Guilt-free money — food, movies, manga, whatever sparks joy.">
                <MoneyInput value={gf} onChange={setGf} onEnter={next} autoFocus label="Guilt-free spending" />
                {over && <p className="form-err">Your allocations add up to more than your total. Trim something to keep it honest.</p>}
              </StepShell>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Breakdown preview slides up once everything is filled */}
      <AnimatePresence>
        {step === 3 && gfMinor > 0 && !over && (
          <motion.div
            className="onb-breakdown card"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={spring}
          >
            <div className="onb-bd-head">
              <span className="eyebrow">{totalMinor !== null ? (showVals ? `Your ${formatINR(totalMinor)}` : 'Your money') : 'Your money'}</span>
              <button className="chip" onClick={() => setShowVals((v) => !v)}>
                {showVals ? 'Hide' : 'Reveal'}
              </button>
            </div>
            <div className="onb-bd-grid">
              <Split label="Strict Savings" note="Don't touch" val={strictMinor} show={showVals} cls="a-green" delay={0} />
              <Split label="Guilt-Free" note="Yours to spend" val={gfMinor} show={showVals} cls="a-yellow" delay={0.08} />
            </div>
            {showVals && totalMinor !== null && allocated < totalMinor && (
              <p className="faint onb-bd-note">
                {formatINR(totalMinor - allocated)} unallocated — it stays in your total until you assign it.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="onb-foot">
        {step > 0 && <button className="btn btn-ghost" onClick={back}>Back</button>}
        <div className="onb-foot-spacer" />
        {step < STEPS - 1 ? (
          <button className="btn btn-primary" onClick={next} disabled={!canNext}>
            Continue <ArrowRight size={17} />
          </button>
        ) : (
          <button className="btn btn-accent" onClick={() => void finish()} disabled={!canNext || finishing}>
            {finishing ? 'Setting up…' : "You're ready — open my Ledger"}
          </button>
        )}
      </div>

    </div>
  )
}

function StepShell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="onb-step">
      <h1 className="onb-title">{title}</h1>
      <p className="onb-sub muted">{sub}</p>
      {children}
    </div>
  )
}

function MoneyInput({
  value, onChange, onEnter, label, autoFocus,
}: { value: string; onChange: (v: string) => void; onEnter: () => void; label?: string; autoFocus?: boolean }) {
  const parsed = parseAmountInput(value)
  return (
    <div className="onb-money">
      {label && <span className="onb-money-label">{label}</span>}
      <div className={`addform-amount ${parsed !== null ? 'ok' : ''}`}>
        <span className="addform-cur">₹</span>
        <input
          className="addform-input"
          inputMode="decimal"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && onEnter()}
          aria-label={label ?? 'Amount in rupees'}
          autoFocus={autoFocus}
        />
      </div>
      {parsed !== null && <span className="onb-money-words faint">{inWords(parsed)}</span>}
    </div>
  )
}

function inWords(minor: number): string {
  const n = Math.floor(minor / 100)
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(1).replace(/\.0$/, '')} crore`
  if (n >= 100_000) return `${(n / 100_000).toFixed(1).replace(/\.0$/, '')} lakh`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')} thousand`
  return `${n}`
}

function Split({ label, note, val, show, cls, delay }: {
  label: string; note: string; val: number; show: boolean; cls: string; delay: number
}) {
  const animated = useCountUp(val, show, 600)
  return (
    <motion.div
      className={`alloc-card card ${cls}`}
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.1 + delay, ...spring }}
    >
      <div className="alloc-label">{label}</div>
      <div className="alloc-val display-num">
        {show ? formatINR(animated) : <span className="masked-dots">{maskFor(val)}</span>}
      </div>
      <div className="alloc-note muted">{note}</div>
      <motion.span
        className="onb-check"
        initial={false}
        animate={show ? { scale: 1, opacity: 1 } : { scale: 0.6, opacity: 0 }}
      >
        <Check size={13} />
      </motion.span>
    </motion.div>
  )
}
