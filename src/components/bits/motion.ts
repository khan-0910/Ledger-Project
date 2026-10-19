import type { Transition, Variants } from 'framer-motion'

/**
 * LEDGER MOTION SYSTEM
 * One vocabulary of entrances: rise (content), pop (chips/stickers),
 * driftIn (illustrations), lineUp (headline words).
 * Every variant renders instantly when prefers-reduced-motion is on
 * (callers pass `instant` mirrors; see useMotionPref in ui.tsx).
 */

export const EXPO = [0.16, 1, 0.3, 1] as const
export const SPRING_STD: Transition = { type: 'spring', stiffness: 320, damping: 30 }
export const SPRING_SNAP: Transition = { type: 'spring', stiffness: 500, damping: 40 }

/** Durations (ms) */
export const D = {
  micro: 160,
  enter: 520,
  section: 640,
  hero: 720,
} as const

export function stagger(children: number, interval = 80): number {
  return interval
}

/** Standard scroll/section entrance: rise + settle. */
export function rise(delay = 0, y = 30): Variants {
  return {
    hidden: { opacity: 0, y },
    show: {
      opacity: 1,
      y: 0,
      transition: { delay, duration: D.section / 1000, ease: EXPO },
    },
  }
}

/** Playful entrance for chips / stickers / emoji tokens. */
export function pop(delay = 0, rot = 0): Variants {
  return {
    hidden: { opacity: 0, scale: 0.55, rotate: rot - 8, y: 18 },
    show: {
      opacity: 1,
      scale: 1,
      rotate: rot,
      y: 0,
      transition: { delay, ...SPRING_STD },
    },
  }
}

/** Slow diagonal drift for large decorative illustrations. */
export function driftIn(delay = 0, x = -40, y = 60): Variants {
  return {
    hidden: { opacity: 0, x, y, rotate: -4 },
    show: {
      opacity: 1,
      x: 0,
      y: 0,
      rotate: 0,
      transition: { delay, duration: 0.95, ease: EXPO },
    },
  }
}

/** Word/line reveal for headlines. */
export function lineUp(delay = 0): Variants {
  return {
    hidden: { opacity: 0, y: '0.55em' },
    show: {
      opacity: 1,
      y: 0,
      transition: { delay, duration: D.hero / 1000, ease: EXPO },
    },
  }
}

/** Container that staggers its children. */
export function staggerParent(interval = 0.08, delayChildren = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: interval, delayChildren } },
  }
}

/* ---------- Floating loops (CSS-friendly via style objects) ---------- */

export type FloatKind = 'bob' | 'rock' | 'sway'

/**
 * Per-object loop params so no two floats sync.
 * Deterministic hashing on a seed keeps SSR/tests stable.
 */
export function floatParams(seed: number, reduced: boolean): {
  amp: number; dur: number; delay: number; kind: FloatKind
} {
  if (reduced) return { amp: 0, dur: 0, delay: 0, kind: 'bob' }
  const kinds: FloatKind[] = ['bob', 'rock', 'sway']
  return {
    amp: 7 + ((seed * 37) % 9),           // 7–15px
    dur: 3.1 + ((seed * 53) % 29) / 10,   // 3.1–5.9s
    delay: ((seed * 71) % 24) / 10,       // 0–2.3s
    kind: kinds[seed % 3],
  }
}

/** Shared mouse-parallax factor: class of depth for the object. */
export type ParallaxDepth = 'near' | 'mid' | 'far'
export const DEPTH_PX: Record<ParallaxDepth, number> = { near: 22, mid: 12, far: 6 }
