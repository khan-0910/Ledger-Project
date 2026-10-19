import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../lib/store'
import { clampPercent } from '../lib/money'
import { revealAll, hideAll, isRevealed, subscribePrivacy } from '../lib/privacy'
import { Alert, Check, Eye, Sparkle } from './Icons'
import SwipeToast from './bits/SwipeToast'
import { usePrivacyText } from './Amount'

/* ---------- Modal / bottom sheet ---------- */

export function Modal({
  open,
  onClose,
  children,
  title,
  wide,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`modal-card ${wide ? 'modal-wide' : ''}`}
            initial={{ opacity: 0, y: 34, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            {title && (
              <div className="modal-head">
                <h3>{title}</h3>
                <button className="icon-btn" onClick={onClose} aria-label="Close">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
                </button>
              </div>
            )}            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ---------- Side detail panel ---------- */

export function SidePanel({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="panel-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) onClose()
            }}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="panel-card"
            initial={{ x: '110%' }}
            animate={{ x: 0 }}
            exit={{ x: '110%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

/* ---------- Explicit Show/Hide balance control ---------- */

/** Tiny hook: is the global mask currently revealed? */
function usePrivacyRevealed(): boolean {
  const [rev, setRev] = useState(isRevealed)
  useEffect(() => subscribePrivacy((m) => setRev(m === 'on')), [])
  return rev
}

/**
 * The single privacy control: Show balance ↔ Hide balance.
 * An explicit labelled button — keyboard accessible, visible focus ring,
 * accessible name reflects the action it performs. Masking is never
 * triggered by hovering, pointer movement or touch timers.
 */
export function BalanceToggle({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  const revealed = usePrivacyRevealed()
  return (
    <button
      type="button"
      className={`privacy-toggle ${revealed ? 'privacy-on' : ''} ${compact ? 'privacy-toggle-sm' : ''} ${className}`}
      onClick={() => (revealed ? hideAll() : revealAll())}
      aria-pressed={revealed}
      aria-label={revealed ? 'Hide balance' : 'Show balance'}
      title={revealed ? 'Hide balance' : 'Show balance'}
    >
      {revealed ? <EyeOffMini size={15} /> : <Eye size={15} />}
      <span>{revealed ? 'Hide balance' : 'Show balance'}</span>
    </button>
  )
}

/* ---------- Privacy toast (Show/Hide balance confirmations) ---------- */

export function PrivacyToast() {
  const [msg, setMsg] = useState<null | { text: string; icon: 'hide' | 'show' }>(null)
  const timer = useRef(0)

  useEffect(() => {
    // Event-driven: announce only hard reveals (latched 'on'), not hover peeks
    let prev = isRevealed()
    return subscribePrivacy((mode) => {
      const now = mode === 'on'
      if (now === prev) return
      prev = now
      setMsg({ text: now ? 'Balances visible' : 'Balances hidden', icon: now ? 'show' : 'hide' })
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setMsg(null), 1800)
    })
  }, [])

  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          className="privacy-toast"
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ duration: 0.18 }}
          role="status"
        >
          {msg.icon === 'show' ? <Eye size={15} /> : <EyeOffMini />}
          {msg.text}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function EyeOffMini({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

/* ---------- Swipe toasts host (React Bits SwipeToast) ---------- */

export function SwipeToasts() {
  const { toasts, dismissToast } = useApp()
  return (
    <div className="swipe-toast-stack" aria-live="polite">
      <AnimatePresence>
        {toasts.slice(-1).map((t) => (
          <SwipeToast
            key={t.id}
            title={t.message}
            icon={
              <span className={`swipe-toast-ic toast-${t.kind}`}>
                {t.kind === 'success' ? <Check size={15} /> : t.kind === 'error' ? <Alert size={15} /> : <Sparkle size={15} />}
              </span>
            }
            actionLabel={t.actionLabel}
            onAction={() => {
              t.action?.()
              dismissToast(t.id)
            }}
            duration={t.kind === 'error' ? 6000 : 3800}
            fuse={t.kind === 'error' ? 'bottom' : 'none'}
            background="var(--surface)"
            color="var(--text)"
            closeButton
            onClose={() => dismissToast(t.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

/* ---------- MoneyText: privacy-aware inline text for chart legends/tips ---------- */

export function MoneyText({ value, signed, compact, className }: { value: number; signed?: boolean; compact?: boolean; className?: string }) {
  const { fmt } = usePrivacyText()
  return <span className={className}>{fmt(value, { signed, compact })}</span>
}

/* ---------- Progress bar ---------- */

export function ProgressBar({ pct, color, height = 10, delay = 0 }: { pct: number; color: string; height?: number; delay?: number }) {
  const { reducedMotion } = useApp()
  return (
    <div className="progress-track" style={{ height }} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div
        className="progress-fill"
        style={{ background: color }}
        initial={reducedMotion ? { width: `${clampPercent(pct)}%` } : { width: 0 }}
        animate={{ width: `${clampPercent(pct)}%` }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.9, ease: [0.16, 1, 0.3, 1], delay }}
      />
    </div>
  )
}

/* ---------- Segmented control ---------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  size?: 'sm' | 'md'
}) {
  return (
    <div className={`segmented ${size === 'sm' ? 'segmented-sm' : ''}`} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          className={`segment ${value === o.value ? 'active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------- Toasts ---------- */

export function Toasts() {
  const { toasts, dismissToast } = useApp()
  return (
    <div className="toast-stack" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className={`toast toast-${t.kind}`}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          >
            <span className="toast-icon">
              {t.kind === 'success' ? <Check size={16} /> : t.kind === 'error' ? <Alert size={16} /> : <Sparkle size={16} />}
            </span>
            <span className="toast-msg">{t.message}</span>
            {t.actionLabel && (
              <button className="toast-action" onClick={() => { t.action?.(); dismissToast(t.id) }}>
                {t.actionLabel}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

