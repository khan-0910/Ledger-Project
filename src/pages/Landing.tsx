import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from 'framer-motion'
import { useApp } from '../lib/store'
import { useCountUp } from '../components/Amount'
import { formatINR } from '../lib/money'
import LedgerLogo from '../components/Logo'
import {
  ArrowRight,
  Calendar,
  Download,
  Eye,
  EyeOff,
  Filter,
  Pencil,
  Pie,
  Repeat,
  Search,
  Shield,
  Sparkle,
  Target,
  Upload,
} from '../components/Icons'
import '../landing.css'

/* Fictional demo numbers — minor units, clearly labelled as demo. */
const DEMO = {
  total: 24680_00,
  savings: 10000_00,
  guiltFree: 5500_00,
  safe: 287_00,
}

const EXPO = [0.16, 1, 0.3, 1] as const

/* ============================================================
   Shared hooks
   ============================================================ */

/** Below this width the pinned scenes become plain stacked layouts. */
function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 920px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 920px)')
    const onChange = () => setNarrow(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return narrow
}

const wrap = (min: number, max: number, v: number) => {
  const r = max - min
  return ((((v - min) % r) + r) % r) + min
}

/* ============================================================
   Small motion pieces
   ============================================================ */

function Reveal({
  children,
  delay = 0,
  className,
  y = 48,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
  y?: number
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.8, delay, ease: EXPO }}
    >
      {children}
    </motion.div>
  )
}

/** Masked per-letter rise. Screen readers get the plain text. */
function SplitLine({ text, delay = 0, className }: { text: string; delay?: number; className?: string }) {
  const words = text.split(' ')
  let n = 0
  return (
    <span className={`split ${className ?? ''}`} aria-hidden="true">
      {words.map((w, wi) => (
        <span className="split-word" key={wi}>
          {[...w].map((ch, ci) => {
            const i = n++
            return (
              <span className="split-mask" key={ci}>
                <motion.span
                  className="split-ch"
                  initial={{ y: '110%', rotate: 8 }}
                  animate={{ y: '0%', rotate: 0 }}
                  transition={{ duration: 0.9, delay: delay + i * 0.028, ease: EXPO }}
                >
                  {ch}
                </motion.span>
              </span>
            )
          })}
          {wi < words.length - 1 && ' '}
        </span>
      ))}
    </span>
  )
}

/** Button that leans toward the pointer. */
function Magnetic({ children, strength = 0.35 }: { children: React.ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const x = useSpring(0, { stiffness: 260, damping: 18 })
  const y = useSpring(0, { stiffness: 260, damping: 18 })
  return (
    <motion.span
      ref={ref}
      className="magnetic"
      style={{ x, y }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse' || !ref.current) return
        const r = ref.current.getBoundingClientRect()
        x.set((e.clientX - (r.left + r.width / 2)) * strength)
        y.set((e.clientY - (r.top + r.height / 2)) * strength)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      {children}
    </motion.span>
  )
}

/** Blend-mode cursor ring — fine pointers only, off under reduced motion. */
function CursorBlob() {
  const reduced = useReducedMotion()
  const [enabled, setEnabled] = useState(false)
  const [hot, setHot] = useState(false)
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const sx = useSpring(x, { stiffness: 500, damping: 40 })
  const sy = useSpring(y, { stiffness: 500, damping: 40 })

  useEffect(() => {
    if (reduced || !window.matchMedia('(pointer: fine)').matches) return
    setEnabled(true)
    const move = (e: PointerEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
      const t = e.target as HTMLElement | null
      setHot(Boolean(t?.closest('a, button, input')))
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [reduced, x, y])

  if (!enabled) return null
  return (
    <motion.div
      className="cursor-blob"
      aria-hidden="true"
      style={{ x: sx, y: sy }}
      animate={{ scale: hot ? 2.4 : 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
    />
  )
}

/* ============================================================
   NAV — floating pill; flips surface by the band beneath it
   ============================================================ */

function Nav({ onDemo }: { onDemo: () => void }) {
  const navRef = useRef<HTMLElement | null>(null)
  const [tone, setTone] = useState<'light' | 'dark'>('light')
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 30 })

  useEffect(() => {
    const update = () => {
      const nav = navRef.current
      if (!nav) return
      const r = nav.getBoundingClientRect()
      const probeY = r.top + r.height / 2
      let next: 'light' | 'dark' = 'light'
      document.querySelectorAll<HTMLElement>('[data-nav]').forEach((sec) => {
        const b = sec.getBoundingClientRect()
        if (b.top <= probeY && b.bottom > probeY) next = sec.dataset.nav === 'dark' ? 'dark' : 'light'
      })
      setTone(next)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <motion.header
      ref={navRef}
      className={`lx-nav ${tone === 'dark' ? 'on-dark' : 'on-light'}`}
      initial={{ y: -90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, delay: 0.2, ease: EXPO }}
    >
      <Link to="/" className="lx-brand" aria-label="Ledger home">
        <LedgerLogo size={30} />
        <span>Ledger</span>
      </Link>
      <nav className="lx-nav-links" aria-label="Sections">
        <a href="#model">How it works</a>
        <a href="#features">Features</a>
        <a href="#search">Search</a>
        <button type="button" onClick={onDemo}>Live demo</button>
      </nav>
      <nav className="lx-nav-actions" aria-label="Account">
        <Link to="/login" className="lx-btn lx-btn-ghost lx-btn-sm">Log in</Link>
        <Link to="/signup" className="lx-btn lx-btn-solid lx-btn-sm">Get started</Link>
      </nav>
      <motion.span className="lx-nav-progress" style={{ scaleX: progress }} aria-hidden="true" />
    </motion.header>
  )
}

/* ============================================================
   01 HERO — yellow canvas, letter rise, phone, toasts, pixel floor
   ============================================================ */

function PrivacyBalance({ dark = true }: { dark?: boolean }) {
  const [revealed, setRevealed] = useState(false)
  const value = useCountUp(DEMO.total, revealed, 800)
  return (
    <div className={`pb ${dark ? 'pb-dark' : 'pb-light'}`}>
      <div className="pb-top">
        <span className="pb-label">Total balance</span>
        <span className="pb-badge">Demo</span>
      </div>
      <div className="pb-amount" aria-live="polite">
        {revealed ? formatINR(value) : <span className="pb-dots">₹••••••</span>}
      </div>
      <button
        type="button"
        className={`pb-toggle ${revealed ? 'on' : ''}`}
        aria-pressed={revealed}
        onClick={() => setRevealed((v) => !v)}
      >
        {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
        {revealed ? 'Hide balance' : 'Show balance'}
      </button>
    </div>
  )
}

const TOASTS = [
  { cls: 't-a', tone: 'pink', title: 'Rent due in 3 days', body: '₹6,500 already set aside in Protected.' },
  { cls: 't-b', tone: 'teal', title: 'Laptop goal +₹350', body: '34% there. Two skipped trips helped.' },
  { cls: 't-c', tone: 'ink', title: 'Chai logged · ₹20', body: 'Safe today is now ₹287.' },
]

function PixelFloor({ progress }: { progress: MotionValue<number> }) {
  const reduced = useReducedMotion()
  const cols = 14
  const tiles = useMemo(() => {
    const tones = ['ink', 'teal', 'pink', 'gap', 'gap', 'teal', 'ink', 'gap']
    let s = 7
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
    return Array.from({ length: cols * 3 }, (_, i) => ({
      tone: tones[Math.floor(rnd() * tones.length)],
      delay: 0.6 + (i % cols) * 0.04 + Math.floor(i / cols) * 0.12 + rnd() * 0.2,
    }))
  }, [])
  const [flip, setFlip] = useState(-1)
  useEffect(() => {
    if (reduced) return
    const id = window.setInterval(() => setFlip(Math.floor(Math.random() * cols * 3)), 900)
    return () => window.clearInterval(id)
  }, [reduced])
  const y = useTransform(progress, [0, 1], [0, reduced ? 0 : 140])

  return (
    <motion.div className="pixel-floor" style={{ y }} aria-hidden="true">
      {tiles.map((t, i) => (
        <motion.span
          key={i}
          className={`px px-${t.tone} ${flip === i ? 'px-flip' : ''}`}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.6, delay: t.delay, ease: EXPO }}
        />
      ))}
    </motion.div>
  )
}

function Hero({ onDemo }: { onDemo: () => void }) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLElement | null>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -160])
  const phoneScale = useTransform(scrollYProgress, [0, 1], [1, reduced ? 1 : 1.12])
  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 120])
  const copyOpacity = useTransform(scrollYProgress, [0, 0.7], [1, reduced ? 1 : 0])

  /* Pointer parallax for the floating toasts. */
  const px = useSpring(0, { stiffness: 80, damping: 20 })
  const py = useSpring(0, { stiffness: 80, damping: 20 })
  const tx1 = useTransform(px, (v) => v * 28)
  const ty1 = useTransform(py, (v) => v * 22)
  const tx2 = useTransform(px, (v) => v * -36)
  const ty2 = useTransform(py, (v) => v * -18)

  return (
    <section
      className="lx-hero"
      id="top"
      ref={ref}
      data-nav="light"
      onPointerMove={(e) => {
        if (reduced || e.pointerType !== 'mouse') return
        px.set(e.clientX / window.innerWidth - 0.5)
        py.set(e.clientY / window.innerHeight - 0.5)
      }}
    >
      <motion.div className="hero-copy" style={{ y: copyY, opacity: copyOpacity }}>
        <motion.span
          className="lx-pill"
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease: EXPO }}
        >
          <Sparkle size={14} /> Built for Indian students
        </motion.span>
        <h1 className="hero-title" aria-label="Spend without the guilt.">
          <SplitLine text="Spend without" delay={0.25} />
          <span className="hero-line2">
            <SplitLine text="the" delay={0.6} />{' '}
            <span className="hero-guilt" aria-hidden="true">
              <motion.span
                initial={{ opacity: 0, y: 40, rotate: -6 }}
                animate={{ opacity: 1, y: 0, rotate: -3 }}
                transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.85 }}
                style={{ display: 'inline-block' }}
              >
                guilt.
              </motion.span>
              <svg className="guilt-squiggle" viewBox="0 0 300 30" preserveAspectRatio="none">
                <motion.path
                  d="M4 18 C 40 4, 70 28, 110 14 S 180 4, 220 18 S 280 26, 296 10"
                  fill="none"
                  strokeWidth="7"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.1, delay: 1.25, ease: 'easeInOut' }}
                />
              </svg>
            </span>
          </span>
        </h1>
        <motion.p
          className="hero-sub"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0, ease: EXPO }}
        >
          Ledger splits every rupee into protected savings and guilt-free spending. You always know
          what's safe to spend — and the big total stays private until you look.
        </motion.p>
        <motion.div
          className="hero-ctas"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.15, ease: EXPO }}
        >
          <Magnetic>
            <Link to="/app" className="lx-btn lx-btn-solid lx-btn-lg">
              Enter your financial world <ArrowRight size={18} />
            </Link>
          </Magnetic>
          <button type="button" className="lx-btn lx-btn-ghost lx-btn-lg" onClick={onDemo}>
            Try the live demo
          </button>
        </motion.div>
      </motion.div>

      <motion.div
        className="hero-stage"
        style={{ y: phoneY, scale: phoneScale }}
        initial={{ opacity: 0, y: 220 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 0.5, ease: EXPO }}
      >
        <div className="phone" aria-label="Ledger app preview with demo numbers">
          <div className="phone-notch" />
          <div className="phone-head">
            <span>9:41</span>
            <span className="phone-hi">Hey, Aarav</span>
          </div>
          <PrivacyBalance />
          <div className="phone-split">
            <div className="ps ps-teal">
              <span>Protected</span>
              <b>{formatINR(DEMO.savings)}</b>
            </div>
            <div className="ps ps-pink">
              <span>Guilt-free</span>
              <b>{formatINR(DEMO.guiltFree)}</b>
            </div>
          </div>
          <div className="phone-safe">
            <span>Safe to spend today</span>
            <b>{formatINR(DEMO.safe)}</b>
          </div>
          <ul className="phone-list">
            <li><span>Chai at the tapri</span><em>−₹20</em></li>
            <li><span>Metro card top-up</span><em>−₹200</em></li>
            <li><span>Scholarship credit</span><em className="pos">+₹8,000</em></li>
          </ul>
        </div>

        {TOASTS.map((t, i) => (
          <motion.div
            key={t.cls}
            className={`lx-toast ${t.cls} lx-toast-${t.tone}`}
            style={i === 1 ? { x: tx2, y: ty2 } : { x: tx1, y: ty1 }}
            initial={{ opacity: 0, scale: 0.6, rotate: i % 2 ? 8 : -8 }}
            animate={{ opacity: 1, scale: 1, rotate: i % 2 ? 3 : -3 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 1.5 + i * 0.35 }}
          >
            <motion.div
              animate={reduced ? undefined : { y: [0, -10, 0] }}
              transition={reduced ? undefined : { duration: 3.4 + i, repeat: Infinity, ease: 'easeInOut' }}
            >
              <strong>{t.title}</strong>
              <span>{t.body}</span>
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      <PixelFloor progress={scrollYProgress} />
    </section>
  )
}

/* ============================================================
   02 TICKER — scroll-velocity marquee (Motion docs pattern)
   ============================================================ */

function VelocityRow({ text, baseVelocity }: { text: string; baseVelocity: number }) {
  const reduced = useReducedMotion()
  const baseX = useMotionValue(0)
  const { scrollY } = useScroll()
  const scrollVelocity = useVelocity(scrollY)
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 })
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], { clamp: false })
  const skewX = useTransform(smoothVelocity, [-2500, 2500], [reduced ? 0 : 10, reduced ? 0 : -10])
  const x = useTransform(baseX, (v) => `${wrap(-25, 0, v)}%`)
  const direction = useRef(1)

  useAnimationFrame((_, delta) => {
    if (reduced) return
    let moveBy = direction.current * baseVelocity * (delta / 1000)
    const f = velocityFactor.get()
    if (f < 0) direction.current = -1
    else if (f > 0) direction.current = 1
    moveBy += direction.current * moveBy * f
    baseX.set(baseX.get() + moveBy)
  })

  return (
    <div className="ticker-row">
      <motion.div className="ticker-track" style={{ x, skewX }}>
        {[0, 1, 2, 3].map((k) => (
          <span key={k}>{text}</span>
        ))}
      </motion.div>
    </div>
  )
}

function Ticker() {
  return (
    <section className="lx-ticker" data-nav="dark" aria-label="What Ledger tells you">
      <VelocityRow text="What you can spend ✦ What you should save ✦ What you must not touch ✦ " baseVelocity={-3} />
      <VelocityRow text="Chai ₹20 ✦ Mess fees ₹2,400 ✦ Metro ₹200 ✦ Movie ₹260 ✦ Laptop fund +₹350 ✦ " baseVelocity={2.4} />
    </section>
  )
}

/* ============================================================
   03 MONEY STORY — pinned, scroll-linked (kept from v1, rebuilt)
   ============================================================ */

type Beat = { step: string; label: string; text: string }

const STORY_BEATS: Beat[] = [
  { step: '01', label: 'Total balance', text: 'Everything in the account is one number — ₹24,680 all in. It counts up with your scroll.' },
  { step: '02', label: 'Protected first', text: '₹10,000 is locked away before anything else — rent, fees, the minimum balance. Off limits.' },
  { step: '03', label: 'Guilt-free', text: '₹5,500 is yours to enjoy — chai, movies, late-night maggi. Spend it without the maths.' },
  { step: '04', label: 'Safe today', text: 'After today’s plans, ₹287 is the number you check before you say yes.' },
]

const beatWindow = (i: number): [number, number, number, number] => [
  i * 0.25 - 0.06,
  i * 0.25 + 0.02,
  i * 0.25 + 0.22,
  i * 0.25 + 0.28,
]
const beatOpacity = (i: number) =>
  i === 0 ? [1, 1, 1, 0] : i === STORY_BEATS.length - 1 ? [0, 1, 1, 1] : [0, 1, 1, 0]

function StoryCaption({ progress, index, beat }: { progress: MotionValue<number>; index: number; beat: Beat }) {
  const [a, b, c, d] = beatWindow(index)
  const opacity = useTransform(progress, [a, b, c, d], beatOpacity(index))
  const y = useTransform(progress, [a, b, c, d], index === 0 ? [0, 0, 0, -40] : [60, 0, 0, -40])
  const blur = useTransform(progress, [a, b, c, d], index === 0 ? [0, 0, 0, 8] : [8, 0, 0, 8])
  const filter = useTransform(blur, (v) => `blur(${v}px)`)
  return (
    <motion.div className="ms-caption" style={{ opacity, y, filter }}>
      <span className="ms-step">{beat.step}</span>
      <h3>{beat.label}</h3>
      <p>{beat.text}</p>
    </motion.div>
  )
}

function StoryTick({ progress, index }: { progress: MotionValue<number>; index: number }) {
  const [a, b] = beatWindow(index)
  const fill = useTransform(progress, [Math.max(0, a), b + 0.2], [0, 1])
  return (
    <span className="ms-tick">
      <motion.i style={{ scaleX: fill }} />
    </span>
  )
}

function StoryPill({ progress, index, label, tone }: { progress: MotionValue<number>; index: number; label: string; tone: string }) {
  const [a, b, c, d] = beatWindow(index)
  const opacity = useTransform(progress, [a, b, c, d], beatOpacity(index))
  const scale = useTransform(progress, [a, b], index === 0 ? [1, 1] : [0.7, 1])
  return (
    <motion.span className={`ms-pill ms-pill-${tone}`} style={{ opacity, scale }}>
      {label}
    </motion.span>
  )
}

function StoryStage({ progress }: { progress: MotionValue<number> }) {
  const headlineRaw = useTransform(
    progress,
    [0, 0.15, 0.22, 0.3, 0.47, 0.55, 0.72, 0.8, 1],
    [0, DEMO.total, DEMO.total, DEMO.savings, DEMO.savings, DEMO.guiltFree, DEMO.guiltFree, DEMO.safe, DEMO.safe],
  )
  const headline = useTransform(headlineRaw, (v) => formatINR(Math.round(v)))

  /* Ring arcs: total draws, then protected + guilt-free carve it up. */
  const totalLen = useTransform(progress, [0, 0.15], [0, 1])
  const totalOpacity = useTransform(progress, [0.2, 0.3], [1, 0.14])
  const protLen = useTransform(progress, [0.22, 0.34], [0, 0.41])
  const guiltLen = useTransform(progress, [0.47, 0.58, 0.72, 0.84], [0, 0.22, 0.22, 0.012])
  const ringRotate = useTransform(progress, [0, 1], [-90, 270])
  const stageScale = useTransform(progress, [0, 0.08, 0.92, 1], [0.86, 1, 1, 0.96])

  return (
    <motion.div className="ms-stage" style={{ scale: stageScale }} aria-label="Ledger money model, advancing as you scroll">
      <div className="ms-ring-wrap">
        <motion.svg className="ms-ring" viewBox="0 0 300 300" style={{ rotate: ringRotate }}>
          <circle cx="150" cy="150" r="124" className="ring-bg" />
          <motion.circle cx="150" cy="150" r="124" className="ring-total" style={{ pathLength: totalLen, opacity: totalOpacity }} />
          <motion.circle cx="150" cy="150" r="124" className="ring-prot" style={{ pathLength: protLen }} />
          <motion.circle cx="150" cy="150" r="124" className="ring-guilt" style={{ pathLength: guiltLen, pathOffset: 0.42 }} />
        </motion.svg>
        <div className="ms-center">
          <div className="ms-pills">
            <StoryPill progress={progress} index={0} label="Total balance" tone="ink" />
            <StoryPill progress={progress} index={1} label="Protected" tone="teal" />
            <StoryPill progress={progress} index={2} label="Guilt-free" tone="pink" />
            <StoryPill progress={progress} index={3} label="Safe today" tone="ink" />
          </div>
          <motion.div className="ms-number">{headline}</motion.div>
          <span className="ms-demo">Demo numbers</span>
        </div>
      </div>
      <div className="ms-legend">
        <span><i className="lg-teal" />Protected</span>
        <span><i className="lg-pink" />Guilt-free</span>
        <span><i className="lg-rest" />Everything else</span>
      </div>
    </motion.div>
  )
}

function StaticMoneyStory() {
  return (
    <div className="ms-static">
      {STORY_BEATS.map((beat) => (
        <div className="ms-static-card" key={beat.step}>
          <span className="ms-step">{beat.step}</span>
          <h3>{beat.label}</h3>
          <p>{beat.text}</p>
        </div>
      ))}
    </div>
  )
}

function MoneyStory() {
  const reduced = useReducedMotion()
  const narrow = useIsNarrow()
  const staticMode = Boolean(reduced) || narrow
  const sectionRef = useRef<HTMLElement | null>(null)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] })
  const visualProgress = useTransform(scrollYProgress, [0, 1], [0, 1])
  const bigX = useTransform(visualProgress, [0, 1], ['10%', '-60%'])

  if (staticMode) {
    return (
      <section className="lx-story lx-story--static" id="model" data-nav="dark">
        <div className="lx-wrap">
          <span className="lx-kicker k-yellow">How the money works</span>
          <h2 className="lx-title">One balance. Four beats.</h2>
          <StaticMoneyStory />
        </div>
      </section>
    )
  }

  return (
    <section className="lx-story" id="model" ref={sectionRef} data-nav="dark">
      <div className="ms-sticky">
        <motion.div className="ms-bigword" style={{ x: bigX }} aria-hidden="true">
          total → protected → guilt-free → safe
        </motion.div>
        <div className="lx-wrap ms-grid">
          <div className="ms-copy">
            <span className="lx-kicker k-yellow">How the money works</span>
            <div className="ms-captions">
              {STORY_BEATS.map((beat, i) => (
                <StoryCaption key={beat.step} progress={visualProgress} index={i} beat={beat} />
              ))}
            </div>
            <div className="ms-ticks" aria-hidden="true">
              {STORY_BEATS.map((_, i) => (
                <StoryTick key={i} progress={visualProgress} index={i} />
              ))}
            </div>
          </div>
          <StoryStage progress={visualProgress} />
        </div>
      </div>
    </section>
  )
}

/* ============================================================
   04 BENTO — "All in one place": cards converge on scroll
   ============================================================ */

function ScatterCard({
  progress,
  from,
  className,
  children,
}: {
  progress: MotionValue<number>
  from: { x: number; y: number; r: number }
  className: string
  children: React.ReactNode
}) {
  const reduced = useReducedMotion()
  const k = reduced ? 0 : 1
  const x = useTransform(progress, [0, 1], [from.x * k, 0])
  const y = useTransform(progress, [0, 1], [from.y * k, 0])
  const rotate = useTransform(progress, [0, 1], [from.r * k, 0])
  const opacity = useTransform(progress, [0, 0.35], [reduced ? 1 : 0, 1])
  return (
    <motion.article
      className={`bento-card ${className}`}
      style={{ x, y, rotate, opacity }}
      whileHover={reduced ? undefined : { y: -8, rotate: 0, transition: { type: 'spring', stiffness: 300, damping: 18 } }}
    >
      {children}
    </motion.article>
  )
}

function BudgetBars() {
  const ref = useRef<HTMLDivElement | null>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const rows = [
    { k: 'Food', used: 72 },
    { k: 'Travel', used: 45 },
    { k: 'Fun', used: 88 },
  ]
  return (
    <div className="bb" ref={ref}>
      {rows.map((r, i) => (
        <div className="bb-row" key={r.k}>
          <span>{r.k}</span>
          <div className="bb-track">
            <motion.i
              initial={{ width: 0 }}
              animate={{ width: inView ? `${r.used}%` : 0 }}
              transition={{ duration: 1.1, delay: 0.2 + i * 0.15, ease: EXPO }}
            />
          </div>
          <em>{100 - r.used}% left</em>
        </div>
      ))}
    </div>
  )
}

function GoalRing() {
  const ref = useRef<SVGSVGElement | null>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  return (
    <svg ref={ref} className="goal-ring" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="48" className="gr-bg" />
      <motion.circle
        cx="60"
        cy="60"
        r="48"
        className="gr-fg"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: inView ? 0.34 : 0 }}
        transition={{ duration: 1.4, ease: EXPO, delay: 0.2 }}
      />
      <text x="60" y="66" textAnchor="middle">34%</text>
    </svg>
  )
}

function Bento() {
  const ref = useRef<HTMLElement | null>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start 0.15'] })
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 26 })
  const narrow = useIsNarrow()
  const m = narrow ? 0.35 : 1

  return (
    <section className="lx-bento" id="features" ref={ref} data-nav="light">
      <div className="lx-wrap">
        <Reveal className="lx-head">
          <span className="lx-kicker k-ink">All in one place</span>
          <h2 className="lx-title">
            Many rupees. <span className="serif-it">One calm view.</span>
          </h2>
          <p className="lx-lede">Every rupee lands in a bucket. Ledger keeps the buckets honest, so you don't have to.</p>
        </Reveal>

        <div className="bento-grid">
          <ScatterCard progress={p} from={{ x: -420 * m, y: 160, r: -14 }} className="b-privacy c-ink">
            <span className="b-ic"><Shield size={20} /></span>
            <h3>Private by default</h3>
            <p>The big total stays masked. One tap to peek — nothing else is hidden.</p>
            <PrivacyBalance dark={false} />
          </ScatterCard>
          <ScatterCard progress={p} from={{ x: 260 * m, y: 220, r: 12 }} className="b-budget c-yellow">
            <span className="b-ic"><Pie size={20} /></span>
            <h3>Budgets that breathe</h3>
            <BudgetBars />
          </ScatterCard>
          <ScatterCard progress={p} from={{ x: 480 * m, y: -60, r: 18 }} className="b-safe c-pink">
            <span className="b-small">Safe to spend · live</span>
            <div className="b-huge">₹287</div>
            <p>Updates the second you log a spend.</p>
          </ScatterCard>
          <ScatterCard progress={p} from={{ x: -300 * m, y: 280, r: 10 }} className="b-recur c-teal">
            <span className="b-ic"><Repeat size={20} /></span>
            <h3>Recurring, remembered</h3>
            <ul className="recur-list">
              <li><span>Hostel rent</span><em>in 3 days</em></li>
              <li><span>Wi-Fi</span><em>in 9 days</em></li>
              <li><span>Music app</span><em>on the 21st</em></li>
            </ul>
          </ScatterCard>
          <ScatterCard progress={p} from={{ x: 120 * m, y: 340, r: -16 }} className="b-goal c-ink">
            <span className="b-ic"><Target size={20} /></span>
            <h3>Goals that grow</h3>
            <div className="goal-row">
              <GoalRing />
              <p>First laptop<br /><b>₹8,400</b> of ₹25,000</p>
            </div>
          </ScatterCard>
          <ScatterCard progress={p} from={{ x: 360 * m, y: 300, r: -8 }} className="b-csv c-yellow">
            <span className="b-ic"><Upload size={20} /></span>
            <h3>Bring your statement</h3>
            <p>Import a CSV, export one back. Your data stays yours.</p>
          </ScatterCard>
        </div>
      </div>
    </section>
  )
}

/* ============================================================
   05 SEARCH — "Search anything. Summarise everything."
   ============================================================ */

type DemoTxn = { name: string; cat: string; amt: number; when: string }
const SEARCH_TXNS: DemoTxn[] = [
  { name: 'Chai at the tapri', cat: 'Food', amt: 20, when: 'Today' },
  { name: 'Chai + bun maska', cat: 'Food', amt: 45, when: 'Yesterday' },
  { name: 'Chai with the gang', cat: 'Food', amt: 120, when: 'Mon' },
  { name: 'Chai at the library', cat: 'Food', amt: 15, when: 'Last week' },
  { name: 'Swiggy · biryani', cat: 'Food', amt: 289, when: 'Sat' },
  { name: 'Swiggy · late-night maggi', cat: 'Food', amt: 99, when: 'Thu' },
  { name: 'Swiggy · pizza split', cat: 'Food', amt: 210, when: 'Last week' },
  { name: 'Auto to campus', cat: 'Travel', amt: 60, when: 'Today' },
  { name: 'Auto from station', cat: 'Travel', amt: 140, when: 'Sun' },
  { name: 'Auto, rainy day', cat: 'Travel', amt: 90, when: 'Last week' },
  { name: 'Metro card top-up', cat: 'Travel', amt: 200, when: 'Fri' },
  { name: 'Movie night', cat: 'Fun', amt: 260, when: 'Fri' },
]
const QUERIES = ['chai', 'swiggy', 'auto']

function SearchDemo() {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement | null>(null)
  const inView = useInView(ref, { amount: 0.4 })
  const [query, setQuery] = useState(reduced ? 'chai' : '')
  const [touched, setTouched] = useState(false)

  /* Auto-type through example queries until the visitor types. */
  useEffect(() => {
    if (!inView || touched || reduced) return
    let cancelled = false
    let qi = 0
    const timers: number[] = []
    const run = () => {
      const word = QUERIES[qi % QUERIES.length]
      for (let i = 0; i <= word.length; i++) {
        timers.push(window.setTimeout(() => !cancelled && setQuery(word.slice(0, i)), i * 140))
      }
      timers.push(window.setTimeout(() => { qi++; if (!cancelled) run() }, word.length * 140 + 2600))
    }
    run()
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [inView, touched, reduced])

  const q = query.trim().toLowerCase()
  const hits = q ? SEARCH_TXNS.filter((t) => t.name.toLowerCase().includes(q) || t.cat.toLowerCase().includes(q)) : []
  const total = hits.reduce((s, t) => s + t.amt, 0)
  const shown = useCountUp(total * 100, true, 500)

  return (
    <div className="search-box" ref={ref}>
      <label className="search-input">
        <Search size={20} />
        <input
          value={query}
          placeholder="Try chai, swiggy, auto…"
          aria-label="Search demo transactions"
          onChange={(e) => {
            setTouched(true)
            setQuery(e.target.value)
          }}
        />
        {!touched && !reduced && <span className="caret" aria-hidden="true" />}
      </label>
      <div className="search-sum">
        <div>
          <span>Matches</span>
          <b>{hits.length}</b>
        </div>
        <div>
          <span>Spent this month</span>
          <b>{formatINR(shown)}</b>
        </div>
        <div>
          <span>Average</span>
          <b>{hits.length ? formatINR(Math.round((total / hits.length) * 100)) : '—'}</b>
        </div>
      </div>
      <ul className="search-results">
        <AnimatePresence initial={false} mode="popLayout">
          {hits.map((t, i) => (
            <motion.li
              key={t.name}
              layout
              initial={{ opacity: 0, x: -30, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 30, scale: 0.96 }}
              transition={{ duration: 0.4, delay: i * 0.04, ease: EXPO }}
            >
              <span className={`sr-cat sr-${t.cat.toLowerCase()}`}>{t.cat}</span>
              <span className="sr-name">{t.name}</span>
              <span className="sr-when">{t.when}</span>
              <em>−₹{t.amt}</em>
            </motion.li>
          ))}
        </AnimatePresence>
        {!hits.length && <li className="sr-empty">Nothing yet — type to search the demo list.</li>}
      </ul>
    </div>
  )
}

function SearchSection() {
  return (
    <section className="lx-search" id="search" data-nav="light">
      <div className="lx-wrap search-grid">
        <Reveal className="lx-head lx-head-left">
          <span className="lx-kicker k-ink">Search &amp; filter</span>
          <h2 className="lx-title">
            Search anything. <span className="serif-it">Sum up everything.</span>
          </h2>
          <p className="lx-lede">
            Type “chai” and see every cup — how many, how much, and the average. It's a little
            scary. It's very useful.
          </p>
        </Reveal>
        <Reveal delay={0.12}>
          <SearchDemo />
        </Reveal>
      </div>
    </section>
  )
}

/* ============================================================
   06 HORIZONTAL — Log / Budget / Recur / Reflect, pinned sideways
   ============================================================ */

const STEPS = [
  { n: '01', k: 'Log', t: 'Two taps, one spend.', d: 'Amount, category, done. Add a note if future-you will ask “what was that?”', tone: 'yellow' },
  { n: '02', k: 'Budget', t: 'See what’s left.', d: 'Each category shows what remains this month — the moment you log.', tone: 'pink' },
  { n: '03', k: 'Recur', t: 'No more surprise bills.', d: 'Rent, Wi-Fi, subscriptions — logged on schedule, flagged before they bite.', tone: 'aqua' },
  { n: '04', k: 'Reflect', t: 'Learn from last month.', d: 'Insights spot where the money went, so next month goes better.', tone: 'blush' },
] as const

function StepVisual({ index }: { index: number }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const inView = useInView(ref, { amount: 0.4 })
  if (index === 0) {
    return (
      <div className="sv sv-log" ref={ref}>
        <div className="sv-amt">₹<motion.span animate={{ opacity: inView ? 1 : 0.2 }}>60</motion.span></div>
        <div className="sv-chips">
          {['Food', 'Travel', 'Fun', 'Books'].map((c, i) => (
            <motion.span
              key={c}
              className={i === 1 ? 'on' : ''}
              initial={{ y: 30, opacity: 0 }}
              animate={inView ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
              transition={{ delay: 0.1 + i * 0.08, type: 'spring', stiffness: 300, damping: 18 }}
            >
              {c}
            </motion.span>
          ))}
        </div>
        <div className="sv-note"><Pencil size={14} /> Auto to campus, running late</div>
      </div>
    )
  }
  if (index === 1) {
    return (
      <div className="sv sv-budget" ref={ref}>
        {[['Food', 0.72], ['Travel', 0.45], ['Fun', 0.88], ['Books', 0.2]].map(([k, v], i) => (
          <div className="svb" key={k as string}>
            <span>{k}</span>
            <div><motion.i animate={{ scaleX: inView ? (v as number) : 0 }} transition={{ duration: 1, delay: i * 0.1, ease: EXPO }} /></div>
          </div>
        ))}
      </div>
    )
  }
  if (index === 2) {
    return (
      <div className="sv sv-cal" ref={ref}>
        {Array.from({ length: 28 }, (_, i) => {
          const due = [2, 9, 20].includes(i)
          return (
            <motion.span
              key={i}
              className={due ? 'due' : ''}
              animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.4, opacity: 0 }}
              transition={{ delay: i * 0.015, type: 'spring', stiffness: 400, damping: 20 }}
            >
              {i + 1}
            </motion.span>
          )
        })}
      </div>
    )
  }
  return (
    <div className="sv sv-bars" ref={ref}>
      {[40, 70, 55, 90, 35, 60, 48].map((h, i) => (
        <motion.i
          key={i}
          animate={{ scaleY: inView ? h / 100 : 0.05 }}
          transition={{ duration: 0.9, delay: i * 0.06, ease: EXPO }}
        />
      ))}
      <span className="sv-insight"><Sparkle size={14} /> Food is up 18% vs last month</span>
    </div>
  )
}

function StepPanel({ s, i }: { s: (typeof STEPS)[number]; i: number }) {
  return (
    <article className={`hz-panel hz-${s.tone}`}>
      <div className="hz-copy">
        <span className="hz-n">{s.n}</span>
        <span className="hz-k">{s.k}</span>
        <h3>{s.t}</h3>
        <p>{s.d}</p>
      </div>
      <StepVisual index={i} />
    </article>
  )
}

function HorizontalSteps() {
  const reduced = useReducedMotion()
  const narrow = useIsNarrow()
  const sectionRef = useRef<HTMLElement | null>(null)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] })
  const visualProgress = useTransform(scrollYProgress, [0, 1], [0, 1])
  const x = useTransform(visualProgress, [0.05, 0.95], ['0%', `-${((STEPS.length - 1) / STEPS.length) * 100}%`])
  const bar = useSpring(visualProgress, { stiffness: 200, damping: 30 })

  const head = (
    <div className="hz-head lx-wrap">
      <span className="lx-kicker k-yellow">A new way to keep track</span>
      <h2 className="lx-title">Log. Budget. Recur. <span className="serif-it">Reflect.</span></h2>
    </div>
  )

  if (reduced || narrow) {
    return (
      <section className="lx-hz lx-hz--static" data-nav="dark">
        {head}
        <div className="lx-wrap hz-stack">
          {STEPS.map((s, i) => <StepPanel key={s.n} s={s} i={i} />)}
        </div>
      </section>
    )
  }

  return (
    <section className="lx-hz" ref={sectionRef} data-nav="dark">
      <div className="hz-sticky">
        {head}
        <motion.div className="hz-track" style={{ x }}>
          {STEPS.map((s, i) => <StepPanel key={s.n} s={s} i={i} />)}
        </motion.div>
        <div className="hz-progress lx-wrap" aria-hidden="true">
          <motion.i style={{ scaleX: bar }} />
        </div>
      </div>
    </section>
  )
}

/* ============================================================
   07 STUDENT MOMENTS — choice toggle + goal (kept, restyled)
   ============================================================ */

function Moments() {
  const [choice, setChoice] = useState<'movie' | 'chai'>('chai')
  const left = choice === 'movie' ? 27_00 : 215_00
  const shown = useCountUp(left, true, 600)
  const ringRef = useRef<HTMLDivElement | null>(null)
  const inView = useInView(ringRef, { once: true, amount: 0.5 })

  return (
    <section className="lx-moments" id="story" data-nav="light">
      <div className="lx-wrap">
        <Reveal className="lx-head">
          <span className="lx-kicker k-ink">Ledger in the wild</span>
          <h2 className="lx-title">Two moments <span className="serif-it">you'll recognise.</span></h2>
        </Reveal>
        <div className="moments-grid">
          <Reveal delay={0.05}>
            <div className="moment c-ink">
              <span className="m-tag">9:41 pm · Friday</span>
              <span className="m-label">Safe to spend tonight</span>
              <div className="m-num">{formatINR(DEMO.safe)}</div>
              <div className="m-toggle" role="group" aria-label="Pick tonight's plan">
                {(['movie', 'chai'] as const).map((k) => (
                  <button key={k} type="button" aria-pressed={choice === k} onClick={() => setChoice(k)}>
                    {choice === k && <motion.span layoutId="m-toggle-pill" className="m-toggle-pill" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
                    <span className="m-toggle-text">{k === 'movie' ? 'Movie night' : 'Chai with the gang'}</span>
                  </button>
                ))}
              </div>
              <div className="m-left">
                <span>Left after this</span>
                <b className={choice === 'movie' ? 'tight' : ''}>{formatINR(shown)}</b>
              </div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={choice}
                  className="m-cap"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                >
                  {choice === 'movie'
                    ? 'Movie night takes ₹260 of your ₹287 — tomorrow gets tight. Ledger flags it before you book.'
                    : 'Chai keeps ₹215 free for the week — movie plans survive till Friday. Say yes to this one.'}
                </motion.p>
              </AnimatePresence>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="moment c-pink" ref={ringRef}>
              <span className="m-tag">Goal · first laptop</span>
              <span className="m-label">Saved so far</span>
              <div className="m-num">
                ₹8,400 <small>/ ₹25,000</small>
              </div>
              <div className="m-bar">
                <motion.i initial={{ width: 0 }} animate={{ width: inView ? '34%' : 0 }} transition={{ duration: 1.3, ease: EXPO, delay: 0.2 }} />
              </div>
              <p className="m-cap">About ₹350 a week, moved from guilt-free money. Two trips skipped — the laptop fund noticed every time.</p>
              <p className="m-foot">Goals are fed from spending money — never from your protected line.</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ============================================================
   08 THAT'S NOT ALL — mini features with pointer tilt
   ============================================================ */

const MINI = [
  { icon: Filter, t: 'Filters that stick', d: 'Slice by category, date or amount in a tap.' },
  { icon: Pencil, t: 'Notes on any spend', d: 'Leave yourself a hint, find it later.' },
  { icon: Download, t: 'Export in seconds', d: 'Your history as a CSV, whenever you want it.' },
  { icon: Sparkle, t: 'Plain-language insights', d: 'Where it went, said like a friend would.' },
  { icon: Calendar, t: 'Month at a glance', d: 'Trends across weeks without the spreadsheet.' },
  { icon: Shield, t: 'Privacy first', d: 'Balance masked on load. Peek on your terms.' },
]

function TiltCard({ children, i }: { children: React.ReactNode; i: number }) {
  const reduced = useReducedMotion()
  const rx = useSpring(0, { stiffness: 200, damping: 16 })
  const ry = useSpring(0, { stiffness: 200, damping: 16 })
  return (
    <motion.div
      className="mini"
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 700 }}
      initial={{ opacity: 0, y: 60, rotate: i % 2 ? 4 : -4 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.8, delay: (i % 3) * 0.1, ease: EXPO }}
      onPointerMove={(e) => {
        if (reduced || e.pointerType !== 'mouse') return
        const r = e.currentTarget.getBoundingClientRect()
        ry.set(((e.clientX - r.left) / r.width - 0.5) * 18)
        rx.set(-((e.clientY - r.top) / r.height - 0.5) * 18)
      }}
      onPointerLeave={() => {
        rx.set(0)
        ry.set(0)
      }}
    >
      {children}
    </motion.div>
  )
}

function MoreFeatures() {
  return (
    <section className="lx-more" data-nav="light">
      <div className="lx-wrap">
        <Reveal className="lx-head">
          <span className="lx-kicker k-ink">That's not all</span>
          <h2 className="lx-title">Small things, <span className="serif-it">done properly.</span></h2>
        </Reveal>
        <div className="mini-grid">
          {MINI.map((m, i) => {
            const Icon = m.icon
            return (
              <TiltCard key={m.t} i={i}>
                <span className="mini-ic"><Icon size={22} /></span>
                <h3>{m.t}</h3>
                <p>{m.d}</p>
              </TiltCard>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ============================================================
   09 CTA — giant type that opens up with scroll
   ============================================================ */

function Closing({ onDemo }: { onDemo: () => void }) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLElement | null>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] })
  const scale = useTransform(scrollYProgress, [0, 1], [reduced ? 1 : 0.7, 1])
  const spacing = useTransform(scrollYProgress, [0, 1], [reduced ? '-0.03em' : '0.2em', '-0.03em'])
  const clip = useTransform(scrollYProgress, [0, 1], reduced ? ['circle(150% at 50% 50%)', 'circle(150% at 50% 50%)'] : ['circle(8% at 50% 60%)', 'circle(150% at 50% 50%)'])

  return (
    <section className="lx-cta" ref={ref} data-nav="dark">
      <motion.div className="cta-blob" style={{ clipPath: clip }} aria-hidden="true" />
      <div className="lx-wrap cta-inner">
        <motion.div
          className="cta-badge"
          aria-hidden="true"
          animate={reduced ? undefined : { rotate: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
        >
          <svg viewBox="0 0 120 120">
            <defs>
              <path id="cta-circle" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" />
            </defs>
            <text>
              <textPath href="#cta-circle">FREE FOR STUDENTS · NO CARD · NO FUSS ·</textPath>
            </text>
          </svg>
        </motion.div>
        <motion.h2 className="cta-title" style={{ scale, letterSpacing: spacing }}>
          Know what you can <span className="serif-it">actually</span> spend.
        </motion.h2>
        <p className="cta-sub">Set up in under a minute. Start with the demo, keep it if it clicks.</p>
        <div className="hero-ctas cta-ctas">
          <Magnetic>
            <Link to="/app" className="lx-btn lx-btn-solid lx-btn-lg">
              Enter your financial world <ArrowRight size={18} />
            </Link>
          </Magnetic>
          <button type="button" className="lx-btn lx-btn-ghost lx-btn-lg" onClick={onDemo}>
            Try the demo
          </button>
        </div>
      </div>
    </section>
  )
}

function Footer({ onDemo }: { onDemo: () => void }) {
  return (
    <footer className="lx-footer" data-nav="light">
      <div className="lx-wrap foot-top">
        <div className="foot-brand">
          <LedgerLogo size={28} />
          <p>The private money app for students.</p>
        </div>
        <nav className="foot-links" aria-label="Footer">
          <Link to="/signup">Get started</Link>
          <Link to="/login">Log in</Link>
          <button type="button" onClick={onDemo}>Try the demo</button>
        </nav>
      </div>
      {/* Letters sit clipped below the fold line, so the row (not each letter) is the in-view trigger. */}
      <motion.div
        className="foot-word"
        aria-hidden="true"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        transition={{ staggerChildren: 0.06 }}
      >
        {'Ledger'.split('').map((ch, i) => (
          <motion.span
            key={i}
            variants={{ hidden: { y: '100%' }, show: { y: '0%' } }}
            transition={{ duration: 0.9, ease: EXPO }}
          >
            {ch}
          </motion.span>
        ))}
      </motion.div>
    </footer>
  )
}

/* ============================================================
   PAGE
   ============================================================ */

export default function Landing() {
  const { demoSignIn } = useApp()
  const navigate = useNavigate()
  /** One-click demo entry: sign into the seeded account, then move into the app. */
  const runDemo = () => {
    void demoSignIn().then((err) => {
      if (!err) navigate('/app')
    })
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="landing lx">
        <CursorBlob />
        <Nav onDemo={runDemo} />
        <main>
          <Hero onDemo={runDemo} />
          <Ticker />
          <MoneyStory />
          <Bento />
          <SearchSection />
          <HorizontalSteps />
          <Moments />
          <MoreFeatures />
          <Closing onDemo={runDemo} />
        </main>
        <Footer onDemo={runDemo} />
      </div>
    </MotionConfig>
  )
}
