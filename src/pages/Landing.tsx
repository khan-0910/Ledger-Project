import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { useApp } from '../lib/store'
import { useCountUp } from '../components/Amount'
import { formatINR } from '../lib/money'
import LedgerLogo from '../components/Logo'
import { ArrowRight, Eye, EyeOff, Shield, Target, Repeat } from '../components/Icons'
import '../landing.css'

/* Fictional demo numbers — minor units, clearly labelled as demo. */
const DEMO = {
  total: 24680_00,
  savings: 10000_00,
  guiltFree: 5500_00,
  safe: 287_00,
}

/* ---------- Chapter reveal variants (in-view, secondary to scroll-linked) ---------- */
const chapterIn = {
  hidden: { opacity: 0, y: 42 },
  show: (d = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.66, delay: d, ease: [0.16, 1, 0.3, 1] as const },
  }),
}

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion()
  if (reduced) {
    return <div className={className}>{children}</div>
  }
  return (
    <motion.div
      className={className}
      variants={chapterIn}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
      custom={delay}
    >
      {children}
    </motion.div>
  )
}

/* ---------- Hero visual: flagship masked-balance card + chips ---------- */

function PrivacyDemoCard() {
  const [revealed, setRevealed] = useState(false)
  const value = useCountUp(DEMO.total, revealed, 700)
  return (
    <div className="demo-card" aria-label="Demo of the balance privacy feature">
      <div className="demo-eyebrow">
        <span className="demo-label">Total balance</span>
        <span className="demo-badge">Demo</span>
      </div>
      <div className="demo-amount">
        {revealed ? formatINR(value) : <span className="masked-dots">₹••••••</span>}
      </div>
      <button
        type="button"
        className={`demo-reveal ${revealed ? 'on' : ''}`}
        aria-pressed={revealed}
        aria-label={revealed ? 'Hide balance' : 'Show balance'}
        onClick={() => setRevealed((v) => !v)}
      >
        {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
        {revealed ? 'Hide balance' : 'Show balance'}
      </button>
      <p className="demo-note">Your big total stays private. Everything else is plain to read.</p>
    </div>
  )
}

function HeroMock() {
  return (
    <div className="hero-visual">
      <PrivacyDemoCard />
      <div className="float-chip chip-a chip-float">
        <span className="chip-tag">Safe today</span>
        <span className="chip-val">{formatINR(DEMO.safe)}</span>
      </div>
      <div className="float-chip chip-b chip-float">
        <span className="chip-tag">Protected</span>
        <span className="chip-val">{formatINR(DEMO.savings)}</span>
      </div>
      <div className="float-chip chip-c">
        <span className="chip-tag">Movie night</span>
        <span className="chip-val">−₹260</span>
      </div>
    </div>
  )
}

/* ============================================================
   MONEY STORY — a pinned, scroll-linked chapter.
   One stage visual (the balance card + its split bar) is driven
   directly by scroll position through useScroll + useTransform:
   the headline counts up through the four beats (total →
   protected → guilt-free → safe today) and the split bar draws,
   all reversible with the scrollbar.
   ============================================================ */

type Beat = { step: string; label: string; text: string }

const STORY_BEATS: Beat[] = [
  {
    step: '01',
    label: 'Total balance',
    text: 'Everything in the account is one number — ₹24,680 all in. Here it counts up with your scroll.',
  },
  {
    step: '02',
    label: 'Protected first',
    text: '₹10,000 is locked away before anything else — rent, fees, the minimum balance. Off limits by default.',
  },
  {
    step: '03',
    label: 'Guilt-free',
    text: '₹5,500 is yours to actually enjoy — chai, movies, late-night maggi. Spend it without running the maths.',
  },
  {
    step: '04',
    label: 'Safe today',
    text: 'After today\u2019s plans, ₹287 is the number you actually look at before you say yes.',
  },
]

/* Windows are fractions of the chapter's scroll progress (0..1). */
const beatWindow = (i: number): [number, number, number, number] => [
  i * 0.25 - 0.06,
  i * 0.25 + 0.02,
  i * 0.25 + 0.22,
  i * 0.25 + 0.28,
]

/** One crossfading caption line — fully scroll-linked opacity. */
function StoryCaption({ progress, index, beat }: { progress: MotionValue<number>; index: number; beat: Beat }) {
  const [a, b, c, d] = beatWindow(index)
  const opacity = useTransform(
    progress,
    [a, b, c, d],
    index === 0 ? [1, 1, 1, 0] : index === STORY_BEATS.length - 1 ? [0, 1, 1, 1] : [0, 1, 1, 0],
  )
  const y = useTransform(progress, [a, b], index === 0 ? [0, 0] : [26, 0])
  return (
    <motion.div className="ms-caption" style={{ opacity, y }}>
      <span className="ms-step">{beat.step}</span>
      <h3 className="ms-cap-label">{beat.label}</h3>
      <p className="ms-cap-text">{beat.text}</p>
    </motion.div>
  )
}

function StoryDot({ progress, index }: { progress: MotionValue<number>; index: number }) {
  const [a, b, c, d] = beatWindow(index)
  const scale = useTransform(progress, [a, b, c, d], index === 0 ? [1.3, 1.3, 1.3, 1] : [0.7, 1.3, 1.3, 0.7])
  const opacity = useTransform(progress, [a, b, c, d], index === 0 ? [1, 1, 1, 0.35] : [0.35, 1, 1, 0.35])
  return (
    <motion.span
      className={`ms-dot ms-dot-${index}`}
      style={{ scale, opacity }}
      aria-hidden="true"
    />
  )
}

/** The stage visual: balance number + labels + split bar, all scroll-linked. */
function StoryStage({ progress, reduced }: { progress: MotionValue<number>; reduced: boolean }) {
  /* The headline number morphs continuously through the four beats. */
  const headlineRaw = useTransform(
    progress,
    [0, 0.18, 0.3, 0.48, 0.56, 0.68, 0.86, 1],
    reduced
      ? new Array(8).fill(DEMO.safe)
      : [0, DEMO.total, DEMO.total, DEMO.savings, DEMO.savings, DEMO.guiltFree, DEMO.safe, DEMO.safe],
  )
  const headline = useTransform(headlineRaw, (v) => formatINR(Math.round(v)))

  /* The split bar: protected grows, then guilt-free, then guilt-free
     drains to today's sliver as the story lands on safe-to-spend. */
  const protectedWidth = useTransform(progress, [0, 0.26, 0.44, 1], ['0%', '0%', '41%', '41%'])
  const guiltWidth = useTransform(progress, [0, 0.5, 0.62, 0.8, 0.92, 1], ['0%', '0%', '22%', '22%', '1%', '1%'])

  /* Small label pill under the number crossfades per beat. */
  const pillOpacity = STORY_BEATS.map((_, i) => {
    const [a, b, c, d] = beatWindow(i)
    return useTransform(progress, [a, b, c, d], i === 0 ? [1, 1, 1, 0] : i === STORY_BEATS.length - 1 ? [0, 1, 1, 1] : [0, 1, 1, 0])
  })

  return (
    <div className="ms-stage" aria-label="Ledger money model, advancing as you scroll">
      <div className="ms-stage-top">
        <span className="ms-stage-label">Ledger · demo</span>
        <motion.span className="ms-stage-pill" style={{ opacity: pillOpacity[0] }}>
          Total balance
        </motion.span>
        <motion.span className="ms-stage-pill ms-pill-teal" style={{ opacity: pillOpacity[1] }}>
          Protected
        </motion.span>
        <motion.span className="ms-stage-pill ms-pill-pink" style={{ opacity: pillOpacity[2] }}>
          Guilt-free
        </motion.span>
        <motion.span className="ms-stage-pill ms-pill-ink" style={{ opacity: pillOpacity[3] }}>
          Safe today
        </motion.span>
      </div>
      <motion.div className="ms-stage-number">{headline}</motion.div>
      <div className="ms-bar" role="img" aria-label="Split of the balance into protected and guilt-free money">
        <motion.span className="ms-bar-seg ms-bar-protected" style={{ width: protectedWidth }} />
        <motion.span className="ms-bar-seg ms-bar-guilt" style={{ width: guiltWidth }} />
      </div>
      <div className="ms-legend">
        <span className="ms-leg ms-leg-teal"><i />Protected</span>
        <span className="ms-leg ms-leg-pink"><i />Guilt-free</span>
        <span className="ms-leg ms-leg-rest"><i />Everything else</span>
      </div>
      <p className="ms-stage-foot">Every rupee of the total lands in one of these buckets.</p>
    </div>
  )
}

/** Static fallback: no pinning, no scroll-linked motion (reduced motion / mobile). */
function StaticMoneyStory() {
  return (
    <div className="ms-static">
      {STORY_BEATS.map((beat) => (
        <div className="ms-static-card" key={beat.step}>
          <span className="ms-step">{beat.step}</span>
          <h3 className="ms-cap-label">{beat.label}</h3>
          <p className="ms-cap-text">{beat.text}</p>
        </div>
      ))}
      <div className="ms-static-bar" role="img" aria-label="Final split of the balance into protected and guilt-free money">
        <span className="ms-bar-seg ms-bar-protected" style={{ width: '41%' }} />
        <span className="ms-bar-seg ms-bar-guilt" style={{ width: '22%' }} />
      </div>
      <div className="ms-legend">
        <span className="ms-leg ms-leg-teal"><i />Protected</span>
        <span className="ms-leg ms-leg-pink"><i />Guilt-free</span>
        <span className="ms-leg ms-leg-rest"><i />Everything else</span>
      </div>
    </div>
  )
}

function MoneyStory() {
  const reduced = useReducedMotion()
  const narrow = useIsNarrow()
  const staticMode = Boolean(reduced) || narrow
  const sceneRef = useRef<HTMLElement | null>(null)

  const { scrollYProgress } = useScroll({ target: sceneRef, offset: ['start start', 'end end'] })
  const visualProgress = useTransform(scrollYProgress, [0, 1], [0, 1])

  if (staticMode) {
    return (
      <section className="lh-chapter model-band ms-scene ms-scene--static" id="model" data-navband="dark">
        <div className="land-wrap">
          <span className="sec-kicker k-pink">How the money works</span>
          <h2 className="sec-title">One balance, four beats.</h2>
          <p className="sec-sub">Total → protected → guilt-free → safe today. Scroll is not animating this version; every beat is laid out plainly.</p>
          <StaticMoneyStory />
        </div>
      </section>
    )
  }

  return (
    <section className="lh-chapter model-band ms-scene" id="model" ref={sceneRef} data-navband="dark">
      <div className="ms-sticky">
        <div className="land-wrap ms-grid">
          <div className="ms-copy">
            <span className="sec-kicker k-pink">How the money works</span>
            <div className="ms-captions">
              {STORY_BEATS.map((beat, i) => (
                <StoryCaption key={beat.step} progress={visualProgress} index={i} beat={beat} />
              ))}
            </div>
            <div className="ms-dots" aria-hidden="true">
              {STORY_BEATS.map((_, i) => (
                <StoryDot key={i} progress={visualProgress} index={i} />
              ))}
            </div>
          </div>
          <StoryStage progress={visualProgress} reduced={Boolean(reduced)} />
        </div>
      </div>
    </section>
  )
}

/* ============================================================
   Hero / chapter scaffolding for the rest of the page
   ============================================================ */

/** Match-breakpoint hook: below this width the pinned scene becomes a plain list. */
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

export default function Landing() {
  const { demoSignIn } = useApp()
  const navigate = useNavigate()
  /** One-click demo entry: sign into the seeded account, then move into the app. */
  const runDemo = async () => {
    const err = await demoSignIn()
    if (!err) navigate('/app')
  }
  const [eveningChoice, setEveningChoice] = useState<'yes' | 'no'>('no')
  const reduced = useReducedMotion()
  const heroRef = useRef<HTMLElement | null>(null)

  /* Header theme: dark surface when it crosses the charcoal model band. */
  const navRef = useRef<HTMLElement | null>(null)
  const [darkNav, setDarkNav] = useState(false)
  useEffect(() => {
    const update = () => {
      const nav = navRef.current
      if (!nav) return
      const probeY = nav.getBoundingClientRect().bottom + 1
      let over = false
      document.querySelectorAll('[data-navband="dark"]').forEach((sec) => {
        const r = (sec as HTMLElement).getBoundingClientRect()
        if (r.top <= probeY && r.bottom >= probeY) over = true
      })
      setDarkNav(over)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  // Hero visual parallax: the flagship card floats slower than the page.
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const mockY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 56])
  const mockRotate = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -3])

  return (
    <div className="landing">
      <header className={`land-nav ${darkNav ? 'dark-nav' : ''}`} ref={navRef}>
        <div className="land-wrap land-nav-inner">
          <Link to="/" className="logo-link" aria-label="Ledger home">
            <LedgerLogo size={30} />
            <span className="logo-word">Ledger</span>
          </Link>
          <nav className="land-nav-actions" aria-label="Account">
            <Link to="/login" className="btn btn-ghost btn-sm">Log in</Link>
            <Link to="/signup" className="btn btn-primary btn-sm">Get started</Link>
          </nav>
        </div>
      </header>

      {/* CHAPTER 1 — Hero: headline, one line, one action, the masked card */}
      <section className="land-hero" id="top" ref={heroRef}>
        <div className="land-wrap hero-grid">
          <div className="hero-copy">
            <motion.div className="hero-eyebrow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
              For students wondering where it went
            </motion.div>
            <h1 className="hero-title" aria-label="Spend without the guilt.">
              {['Spend', 'without', 'the'].map((w) => (
                <span key={w} className="hero-title-word">{w}</span>
              ))}
              <span className="hero-title-word hero-guilt-word" aria-hidden="true">guilt.</span>
            </h1>
            <motion.p className="hero-sub" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32, duration: 0.55 }}>
              Ledger splits every rupee into <strong>protected savings</strong> and{' '}
              <strong>guilt-free spending</strong> — you always know what's safe to spend,
              and the big total stays private until you choose to look.
            </motion.p>
            <motion.div className="hero-ctas" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46, duration: 0.55 }}>
              <Link to="/app" className="btn btn-lg hero-cta">
                Enter your financial world <ArrowRight size={18} />
              </Link>
              <a href="#model" className="btn btn-lg ghost-cta">See how it works</a>
            </motion.div>
            <motion.button className="hero-demo-link" onClick={() => void runDemo()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
              or explore the live demo →
            </motion.button>
          </div>

          <motion.div style={{ y: mockY, rotate: mockRotate }} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.22, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
            <HeroMock />
          </motion.div>
        </div>
        <motion.div
          className="scroll-cue"
          animate={reduced ? undefined : { y: [0, 8, 0] }}
          transition={reduced ? undefined : { repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
        >
          Scroll
          <span className="cue-line" />
        </motion.div>
      </section>

      {/* CHAPTER 2 — the pinned, scroll-linked money story */}
      <MoneyStory />

      {/* CHAPTER 3 — Student moments: pink & teal panels on yellow */}
      <section className="lh-chapter" id="story">
        <div className="land-wrap">
          <Reveal>
            <span className="sec-kicker">Ledger in the wild</span>
            <h2 className="sec-title">Two moments you'll recognise.</h2>
          </Reveal>
          <div className="story-grid">
            {/* Movie night: check before you commit */}
            <Reveal delay={0.05}>
              <div className="story-card pink">
                <span className="story-tag">9:41 pm · Friday</span>
                <div className="sc-row">
                  <span className="sc-label">Safe to spend tonight</span>
                  <span className="sc-num">{formatINR(28700)}</span>
                </div>
                <div className="sc-swap">
                  <button className={`sc-choice ${eveningChoice === 'yes' ? 'on' : ''}`} onClick={() => setEveningChoice('yes')} aria-pressed={eveningChoice === 'yes'}>
                    Movie night
                  </button>
                  <button className={`sc-choice ${eveningChoice === 'no' ? 'on' : ''}`} onClick={() => setEveningChoice('no')} aria-pressed={eveningChoice === 'no'}>
                    Chai with the gang
                  </button>
                </div>
                <p className="sc-cap" key={eveningChoice}>
                  {eveningChoice === 'yes'
                    ? <>Movie night takes <em>₹260 of your ₹287</em> — chai tomorrow gets tight. Ledger flags it before you book.</>
                    : <>Chai keeps <em>₹215 free for the week</em> — movie plans survive till Friday. Say yes to this one.</>}
                </p>
                <p className="story-foot">Safe-to-spend is a running number, updated the second you log.</p>
              </div>
            </Reveal>

            {/* Laptop goal */}
            <Reveal delay={0.14}>
              <div className="story-card teal">
                <span className="story-tag">Goal · first laptop</span>
                <div className="sc-row">
                  <span className="sc-label">Saved so far</span>
                  <span className="sc-num">{formatINR(840000)} <span className="sc-of">/ {formatINR(2500000)}</span></span>
                </div>
                <div className="sc-bar" aria-hidden="true">
                  <motion.span
                    className="sc-bar-fill"
                    initial={{ width: reduced ? '34%' : 0 }}
                    whileInView={{ width: '34%' }}
                    viewport={{ once: true }}
                    transition={{ duration: reduced ? 0 : 1.1, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <p className="sc-cap">
                  ~<em>₹350 a week</em> moved from guilt-free money. Two trips skipped; the laptop fund noticed every time.
                </p>
                <p className="story-foot">Goals are fed from spending money — never from your protected line.</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CHAPTER 4 — App glimpse: real phone frame + feature list */}
      <section className="lh-chapter app-glimpse" id="app">
        <div className="land-wrap glimpse-grid">
          <Reveal>
            <div className="g-feature">
              <div className="g-item">
                <span className="g-icon pink-ic"><Shield size={22} /></span>
                <div>
                  <h3>Private by default</h3>
                  <p>The total balance is the one number that stays masked — with one click to show it.</p>
                </div>
              </div>
              <div className="g-item">
                <span className="g-icon teal-ic"><Target size={22} /></span>
                <div>
                  <h3>Budgets that breathe</h3>
                  <p>See what each category has left this month, as soon as you log it.</p>
                </div>
              </div>
              <div className="g-item">
                <span className="g-icon"><Repeat size={22} /></span>
                <div>
                  <h3>Recurring, remembered</h3>
                  <p>Rent, wifi, subscriptions — logged on schedule, flagged before they bite.</p>
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="mock-phone" role="img" aria-label="Preview of the Ledger dashboard">
              <div className="mock-balance-label">Total balance (demo)</div>
              <div className="mock-balance">₹••••••</div>
              <div className="mock-row"><span>Mess fees</span><span className="mock-amt neg">−₹2,400</span></div>
              <div className="mock-row"><span>Chai run <span className="mock-tag">Food</span></span><span className="mock-amt neg">−₹60</span></div>
              <div className="mock-row"><span>Scholarship credit</span><span className="mock-amt pos">+₹8,000</span></div>
              <div className="mock-safe">Safe to spend today · ₹287</div>
              <div className="demo-shield">Only the big total is masked — everything else stays readable.</div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CHAPTER 5 — closing CTA on pink */}
      <section className="cta-band">
        <div className="land-wrap">
          <Reveal>
            <span className="sec-kicker">Start today</span>
            <h2 className="sec-title">Know what you can actually spend.</h2>
            <p className="cta-sub">Free for students. Set up in under a minute — no card, no fuss.</p>
            <div className="hero-ctas">
              <Link to="/app" className="btn btn-lg hero-cta">
                Enter your financial world <ArrowRight size={18} />
              </Link>
              <button type="button" className="btn btn-lg ghost-cta" onClick={() => void runDemo()}>
                Try the demo
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="land-footer">
        <div className="land-wrap land-footer-inner">
          <div className="foot-brand">
            <div className="logo-link"><LedgerLogo size={24} /><span className="logo-word">Ledger</span></div>
            <p className="foot-tag">The private money app for students.</p>
          </div>
          <nav className="foot-links" aria-label="Footer">
            <Link to="/signup">Get started</Link>
            <Link to="/login">Log in</Link>
            <button onClick={() => void runDemo()} className="foot-demo-link">Try the demo</button>
          </nav>
        </div>
      </footer>
    </div>
  )
}
