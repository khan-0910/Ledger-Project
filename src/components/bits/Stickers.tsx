import React, { useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion'
import { DEPTH_PX, floatParams, pop, type ParallaxDepth } from './motion'

/* ------------------------------------------------------------------
   LEDGER STICKERS — original money-object SVG set.
   Hand-drawn vibe: ink outline + warm fills, slightly imperfect radii.
   All decorative wrappers are aria-hidden and never intercept clicks.
------------------------------------------------------------------- */

export type StickerKind =
  | 'coin-stack' | 'coin' | 'wallet' | 'receipt' | 'jar' | 'card'
  | 'notebook' | 'sparkle' | 'star' | 'ticket'

const INK = '#241f1a'

export function StickerGlyph({ kind, size = 44 }: { kind: StickerKind; size?: number }) {
  const s = { width: size, height: size } as const
  switch (kind) {
    case 'coin-stack':
      return (
        <svg {...s} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <ellipse cx="24" cy="35" rx="15" ry="5.5" fill="#ffd93d" stroke={INK} strokeWidth="2.4" />
          <ellipse cx="24" cy="29" rx="15" ry="5.5" fill="#ffc24d" stroke={INK} strokeWidth="2.4" />
          <ellipse cx="24" cy="23" rx="15" ry="5.5" fill="#ffd93d" stroke={INK} strokeWidth="2.4" />
          <ellipse cx="24" cy="15" rx="15" ry="5.5" fill="#ffe17d" stroke={INK} strokeWidth="2.4" />
          <path d="M18 9l2-2M24 8l0-2.4M30 9l-2-2" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      )
    case 'coin':
      return (
        <svg {...s} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <circle cx="24" cy="24" r="13" fill="#ffd93d" stroke={INK} strokeWidth="2.6" />
          <circle cx="24" cy="24" r="7.5" fill="none" stroke="#b8860b" strokeWidth="2" />
          <path d="M21 21h6M24 21v7" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      )
    case 'wallet':
      return (
        <svg {...s} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect x="7" y="12" width="34" height="25" rx="7" fill="#ff8a5c" stroke={INK} strokeWidth="2.6" />
          <path d="M7 19c6 2.4 27 2.4 34 0" stroke={INK} strokeWidth="2.2" />
          <rect x="28" y="21" width="13" height="9" rx="4.5" fill="#fff3dd" stroke={INK} strokeWidth="2.2" />
          <circle cx="35" cy="25.5" r="1.7" fill={INK} />
        </svg>
      )
    case 'receipt':
      return (
        <svg {...s} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path d="M12 7h24l-2.5 4 2.5 4-2.5 4 2.5 4-2.5 4 2.5 4-2.5 3H14l2.5 3H12z" fill="#fffdf6" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M18 16h13M18 22h13M18 28h8" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
          <path d="M12 14l2.5 4L12 22l2.5 4" fill="#fffdf6" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
        </svg>
      )
    case 'jar':
      return (
        <svg {...s} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path d="M15 15h18l3 6v16a5 5 0 0 1-5 5H17a5 5 0 0 1-5-5V21z" fill="#b6f2dd" stroke={INK} strokeWidth="2.6" />
          <rect x="14" y="9" width="20" height="7" rx="3" fill={INK} />
          <circle cx="20" cy="32" r="3.2" fill="#ffd93d" stroke={INK} strokeWidth="2" />
          <circle cx="27" cy="35" r="3.2" fill="#ff8a5c" stroke={INK} strokeWidth="2" />
        </svg>
      )
    case 'card':
      return (
        <svg {...s} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect x="6" y="13" width="36" height="23" rx="5" fill="#ff78ac" stroke={INK} strokeWidth="2.6" transform="rotate(-4 24 24)" />
          <path d="M6 21h36" stroke="#fff" strokeWidth="4" />
          <circle cx="36" cy="30" r="2.4" fill="#fff" />
        </svg>
      )
    case 'notebook':
      return (
        <svg {...s} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect x="10" y="9" width="28" height="31" rx="4" fill="#9be8b1" stroke={INK} strokeWidth="2.6" />
          <path d="M10 15h28M10 21h28" stroke={INK} strokeWidth="1.8" opacity="0.55" />
          <path d="M15 9V5M24 9V5M33 9V5" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M17 27l3.4 3.4L27 24" stroke={INK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'sparkle':
      return (
        <svg {...s} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path d="M24 4l3.2 13.8L41 24l-13.8 3.2L24 41l-3.2-13.8L7 24l13.8-3.2z" fill="#ffd93d" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M38 6l1.2 4.8L44 12l-4.8 1.2L38 18l-1.2-4.8L32 12l4.8-1.2z" fill="#ff8a5c" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      )
    case 'star':
      return (
        <svg {...s} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path d="M24 5l5.6 12.1 13.4 2-9.5 8.9 2.2 13L24 34.5l-11.7 6.5 2.2-13-9.5-8.9 13.4-2z" fill="#ff8a5c" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        </svg>
      )
    case 'ticket':
      return (
        <svg {...s} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path d="M8 17a4 4 0 0 1 4-4h24a4 4 0 0 1 4 4v3a5 5 0 0 0 0 8v3a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4v-3a5 5 0 0 0 0-8z" fill="#7fd8f5" stroke={INK} strokeWidth="2.6" />
          <path d="M28 14v4.5M28 22v4M28 29.5V34" stroke={INK} strokeWidth="2.2" strokeLinecap="round" strokeDasharray="3 3" />
        </svg>
      )
  }
}

/* ------------------------------------------------------------------
   FloatObject — pop-in, per-object float loop, cursor parallax.
   seed changes amp/duration/delay/kind so objects never sync.
------------------------------------------------------------------- */

export function FloatObject({
  kind, size = 48, seed = 1, depth = 'mid', className, style, delay = 0,
}: { kind: StickerKind; size?: number; seed?: number; depth?: ParallaxDepth; className?: string; style?: React.CSSProperties; delay?: number }) {
  const fp = floatParams(seed, false)
  return (
    <motion.div
      className={`float-obj ${className ?? ''}`}
      style={style}
      aria-hidden="true"
      variants={pop(delay, ((seed % 7) - 3) * 2)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-40px' }}
    >
      <motion.div
        animate={{
          y: fp.kind === 'bob' ? [0, -fp.amp, 0] : undefined,
          rotate: fp.kind === 'rock' ? [0, (seed % 2 ? -1 : 1) * (3 + (seed % 4)), 0] : undefined,
          x: fp.kind === 'sway' ? [0, (seed % 2 ? 1 : -1) * fp.amp, 0] : undefined,
        }}
        transition={
          fp.kind === 'sway'
            ? { repeat: Infinity, duration: fp.dur, ease: 'easeInOut', delay: fp.delay }
            : { repeat: Infinity, duration: fp.dur, ease: 'easeInOut', delay: fp.delay }
        }
      >
        <Parallax depth={depth} seed={seed}>
          <StickerGlyph kind={kind} size={size} />
        </Parallax>
      </motion.div>
    </motion.div>
  )
}

/**
 * Cursor parallax shared by all stickers on a page.
 * Each instance listens to the same window pointermove — transform only,
 * so it never triggers layout. Cleaned up on unmount.
 */
function Parallax({ depth, seed, children }: { depth: ParallaxDepth; seed: number; children: React.ReactNode }) {
  const reduced = useReducedMotion()
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const sx = useSpring(px, { stiffness: 60, damping: 18 })
  const sy = useSpring(py, { stiffness: 60, damping: 18 })
  const dir = seed % 2 === 0 ? 1 : -1
  const x = useTransform(sx, (v) => v * DEPTH_PX[depth] * dir * (reduced ? 0 : 1))
  const y = useTransform(sy, (v) => v * DEPTH_PX[depth] * (reduced ? 0 : 1))

  useEffect(() => {
    if (reduced) return
    const onMove = (e: PointerEvent) => {
      // normalize to [-1, 1] around viewport center
      px.set((e.clientX / window.innerWidth - 0.5) * 2)
      py.set((e.clientY / window.innerHeight - 0.5) * 2)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [px, py, reduced])

  return <motion.div style={{ x, y }}>{children}</motion.div>
}

/** A small confetti burst of stickers for celebratory moments. */
export function StickerBurst({ kinds, area = 130 }: { kinds: StickerKind[]; area?: number }) {
  const reduced = useReducedMotion()
  if (reduced) return null
  return (
    <span className="sticker-burst" aria-hidden="true">
      {kinds.map((k, i) => (
        <motion.span
          key={`${k}-${i}`}
          className="sticker-burst-item"
          initial={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0, 1.1, 1, 0.8],
            x: [0, ((i * 53) % (area * 2)) - area],
            y: [-8 - ((i * 31) % area)],
            rotate: ((i * 47) % 60) - 30,
          }}
          transition={{ duration: 1.15, delay: i * 0.045, ease: 'easeOut' }}
        >
          <StickerGlyph kind={k} size={18 + ((i * 7) % 10)} />
        </motion.span>
      ))}
    </span>
  )
}
