import { useEffect, useRef, useState } from 'react'
import { privacyMode, subscribePrivacy, type PrivacyMode } from '../lib/privacy'
import { formatINR, maskFor } from '../lib/money'
import { useSyncExternalStore } from 'react'

const EASE_OUT_EXPO = (t: number): number => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))

/**
 * Animated number that counts from its previous value to the next.
 * Used by the landing demo + onboarding (where reveal is driven locally).
 */
export function useCountUp(target: number, active: boolean, duration = 550): number {
  const [display, setDisplay] = useState(target)
  const fromRef = useRef(target)
  const rafRef = useRef(0)

  useEffect(() => {
    if (!active) {
      fromRef.current = target
      setDisplay(target)
      return
    }
    const from = fromRef.current
    if (from === target) return
    const t0 = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration)
      const eased = EASE_OUT_EXPO(t)
      const v = Math.round(from + (target - from) * eased)
      setDisplay(v)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, active, duration])

  return display
}

function subscribe(l: () => void) {
  return subscribePrivacy(l)
}

function usePrivacyMode(): PrivacyMode {
  return useSyncExternalStore(subscribe, privacyMode, () => 'hidden' as PrivacyMode)
}

export interface AmountProps {
  /** Minor units */
  value: number
  decimals?: boolean
  signed?: boolean
  compact?: boolean
  className?: string
  ariaLabel?: string
  /** Opt-in masking: render the dual mask/real layers (Dashboard balances). */
  maskable?: boolean
}

/**
 * The one true money renderer.
 *
 * By default it renders the plain, always-visible value — transaction
 * amounts, budget figures and analytics must never be masked. Only when
 * `maskable` is set (Dashboard balance values) does it render BOTH layers
 * — real value in normal flow plus the mask overlay — and `<html
 * data-privacy>` crossfades between them in pure CSS: no React re-render,
 * no layout shift. The state changes only via the Show/Hide button.
 */
export function Amount({ value, decimals, signed, compact, className, ariaLabel, maskable }: AmountProps) {
  const mode = usePrivacyMode()
  if (!maskable) {
    return (
      <span className={`amt ${className ?? ''}`} aria-label={ariaLabel}>
        {formatINR(value, { decimals, signed, compact })}
      </span>
    )
  }
  const revealed = mode === 'on'
  return (
    <span className={`amt amt-wrap ${revealed ? 'amt-revealed' : ''} ${className ?? ''}`} aria-label={ariaLabel} data-masked={!revealed}>
      <span className="amt-real">{formatINR(value, { decimals, signed, compact })}</span>
      <span className="amt-mask" aria-hidden="true">
        <span className="amt-dots">{maskFor(value)}</span>
      </span>
    </span>
  )
}

/** Identical rendering; alias kept for existing call sites. */
export function AmountStatic(props: AmountProps) {
  return <Amount {...props} />
}

/** Percent helper — percentages are not sensitive, always shown. */
export function Pct({ value, className }: { value: number; className?: string }) {
  return <span className={className}>{Math.round(value)}%</span>
}

/**
 * Plain-text money formatter for non-dashboard pages.
 * These amounts stay visible at all times — no masking, ever.
 */
export function usePlainMoney(): { fmt: (v: number, opts?: { decimals?: boolean; signed?: boolean; compact?: boolean }) => string } {
  return { fmt: (v, opts) => formatINR(v, opts) }
}

/**
 * Plain text helper for insight lines, chart legends and totals.
 * Only the Dashboard's primary Total Balance is masked — all derived
 * figures, summaries and other pages stay readable at all times.
 */
export function usePrivacyText(): { revealed: boolean; mode: PrivacyMode; fmt: (v: number, opts?: { decimals?: boolean; signed?: boolean; compact?: boolean }) => string; mask: (v: number) => string } {
  const mode = usePrivacyMode()
  return {
    revealed: true,
    mode,
    fmt: (v, opts) => formatINR(v, opts),
    mask: (v) => formatINR(v),
  }
}
