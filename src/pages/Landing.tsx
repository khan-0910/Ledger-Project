import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useApp } from '../lib/store'
import { useCountUp } from '../components/Amount'
import { formatINR } from '../lib/money'
import LedgerLogo from '../components/Logo'
import { ArrowRight, Eye, EyeOff, Shield, Target, Repeat } from '../components/Icons'
import '../landing.css'

/* Fictional demo numbers — minor units, clearly labelled as demo. */
const DEMO = { total: 2468000, savings: 1000000, guiltFree: 550000 }

/* ---------- Chapter reveal variants (in-view, Motion-style) ---------- */
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
      viewport={{ once: true, margin: '-80px' }}
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
        <span className="chip-val">{formatINR(28700)}</span>
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

export default function Landing() {
  const { demoSignIn } = useApp()
  const navigate = useNavigate()
  /** One-click demo entry: sign into the seeded account, then move into the app. */
  const runDemo = async () => {
    const err = await demoSignIn()
    if (!err) navigate('/app')
  }
  const [eveningChoice, setEveningChoice] = useState<'yes' | 'no'>('no')
  const [navScrolled, setNavScrolled] = useState(false)
  const reduced = useReducedMotion()
  const heroRef = useRef<HTMLElement | null>(null)

  // Hero visual parallax: the flagship card floats slower than the page.
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const mockY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 56])
  const mockRotate = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -3])

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="landing">
      <header className={`land-nav ${navScrolled ? 'scrolled' : ''}`}>
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

      {/* CHAPTER 2 — The model: dark charcoal chapter, ledger diagram */}
      <section className="lh-chapter model-band" id="model">
        <div className="land-wrap">
          <Reveal>
            <span className="sec-kicker k-pink">The Ledger model</span>
            <h2 className="sec-title">One balance, three jobs — drawn in the app itself.</h2>
            <p className="sec-sub">This is the entire idea. No dashboards to decode, nothing to configure first.</p>
          </Reveal>
          <div className="model-grid">
            <Reveal delay={0.08}>
              <div className="model-hero-num">{formatINR(DEMO.total)}</div>
              <div className="model-hero-label">What you actually have right now — visible here, private inside the app.</div>
            </Reveal>
            <Reveal delay={0.16}>
              <div className="model-diagram">
                <div className="model-pot">
                  <span className="pot-name">Total
                    <span className="pot-note">The big picture — you decide when to see it</span>
                  </span>
                  <span className="pot-amt">{formatINR(DEMO.total)}</span>
                </div>
                <div className="model-pot">
                  <span className="pot-name p-save">Protected
                    <span className="pot-note">Rent, fees, minimum balance — off limits by default</span>
                  </span>
                  <span className="pot-amt">{formatINR(DEMO.savings)}</span>
                </div>
                <div className="model-pot">
                  <span className="pot-name p-spend">Guilt-free
                    <span className="pot-note">Chai, movies, late-night maggi — yours to spend</span>
                  </span>
                  <span className="pot-amt">{formatINR(DEMO.guiltFree)}</span>
                </div>
              </div>
              <p className="model-footnote">Demo numbers. Yours set up in about a minute — pick a protected line, Ledger does the maths.</p>
            </Reveal>
          </div>
        </div>
      </section>

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
