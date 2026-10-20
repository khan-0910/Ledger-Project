import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useApp } from '../lib/store'
import { useCountUp } from '../components/Amount'
import { formatINR } from '../lib/money'
import LedgerLogo from '../components/Logo'
import { ArrowRight, Eye, EyeOff } from '../components/Icons'
import '../landing.css'

/* Fictional demo numbers — minor units, clearly labelled as demo. */
const DEMO = { total: 2468000, savings: 1000000, guiltFree: 550000 }

/* ---------- Hero visual: the one flagship card, the masked balance ---------- */

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
    <div className="hero-visual" aria-hidden={false}>
      <PrivacyDemoCard />
      <div className="float-chip chip-a chip-float">
        <span className="chip-tag">Safe today</span>
        <span className="chip-val">{formatINR(28700, { compact: false }).toString().replace('₹', '₹')}</span>
      </div>
      <div className="float-chip chip-b chip-float">
        <span className="chip-tag t-teal">Protected</span>
        <span className="chip-val">{formatINR(DEMO.savings)}</span>
      </div>
      <div className="float-chip chip-c chip-float">
        <span className="chip-tag t-pink">Movie night</span>
        <span className="chip-val">−₹260</span>
      </div>
    </div>
  )
}

/* ---------- Section scaffold ---------- */

function Section({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`land-section ${className}`.trim()}>
      <div className="land-wrap">{children}</div>
    </section>
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

      {/* 1 — Hero: promise, one line, one action, the masked-balance card */}
      <section className="land-hero" id="top">
        <div className="land-wrap hero-grid">
          <div className="hero-copy">
            <motion.div className="hero-eyebrow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
              For students who wonder where it went
            </motion.div>
            <h1 className="hero-title" aria-label="Spend without the guilt.">
              {['Spend', 'without', 'the'].map((w, i) => (
                <span key={w} className={`hero-title-word rise d${i + 1}`}>{w}</span>
              ))}
              <span className="hero-title-word hero-guilt-word rise d4" aria-hidden="true">guilt.</span>
            </h1>
            <motion.p className="hero-sub" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.55 }}>
              Ledger splits every rupee into <strong>protected savings</strong> and{' '}
              <strong>guilt-free spending</strong> — so you always know what's actually safe to spend,
              and the big total stays private until you choose to look.
            </motion.p>
            <motion.div className="hero-ctas" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48, duration: 0.55 }}>
              <Link to="/app" className="btn btn-lg hero-cta">
                Enter your financial world <ArrowRight size={18} />
              </Link>
              <a href="#model" className="btn btn-lg ghost-cta">See how it works</a>
            </motion.div>
            <motion.button className="hero-demo-link" onClick={() => void runDemo()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.62 }}>
              or explore the live demo →
            </motion.button>
          </div>

          <motion.div initial={{ opacity: 0, y: reduced ? 0 : 26 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
            <HeroMock />
          </motion.div>
        </div>
      </section>

      {/* 2 — The money model: one editorial ledger diagram, shown once */}
      <Section id="model" className="model-band">
        <div className="sec-head">
          <span className="sec-kicker">The Ledger model</span>
          <h2 className="sec-title">Your whole balance, split the moment money arrives.</h2>
          <p className="sec-sub">Not three confusing apps — one ledger with three lines. This is the entire idea.</p>
        </div>
        <div className="model-grid">
          <div className="rise d1">
            <div className="model-hero-num">{formatINR(DEMO.total)}</div>
            <div className="model-hero-label">What you actually have right now — visible here, private in the app.</div>
          </div>
          <div>
            <div className="model-diagram rise d2">
              <div className="model-pot">
                <span className="pot-name p-total">Total
                  <span className="pot-note">The big picture — only you decide when to see it</span>
                </span>
                <span className="pot-amt main">{formatINR(DEMO.total)}</span>
              </div>
              <div className="model-pot">
                <span className="pot-name p-save">Protected
                  <span className="pot-note">Rent, fees, minimum balance — off limits by default</span>
                </span>
                <span className="pot-amt">{formatINR(DEMO.savings)}</span>
              </div>
              <div className="model-pot">
                <span className="pot-name p-spend">Guilt-free
                  <span className="pot-note">Safe to spend — chai, movies, late-night maggi</span>
                </span>
                <span className="pot-amt">{formatINR(DEMO.guiltFree)}</span>
              </div>
            </div>
            <p className="model-footnote rise d3">Demo numbers. Yours set up in about a minute — pick a protected line, Ledger does the maths.</p>
          </div>
        </div>
      </Section>

      {/* 3 — Product story: two real student moments, one interactive */}
      <Section id="story" className="story-band">
        <div className="sec-head">
          <span className="sec-kicker">Ledger in the wild</span>
          <h2 className="sec-title">Two moments you'll recognise.</h2>
        </div>
        <div className="story-grid">
          {/* Night plan: check safe-to-spend before saying yes */}
          <div className="story-card rise">
            <span className="story-tag">9:41 pm · before you say yes</span>
            <div className="sc-row">
              <span className="sc-label">Safe to spend tonight</span>
              <span className="sc-num">{formatINR(28700)}</span>
            </div>
            <div className="sc-bar" aria-hidden>
              <span className="sc-bar-fill" style={{ width: eveningChoice === 'yes' ? '38%' : '62%' }} />
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
                ? <>Movie night spends <em>₹260 of your ₹287</em> — chai tomorrow gets tight. Ledger flags it before you book.</>
                : <>Chai keeps <em>₹215 free for the week</em> — movie plans survive till Friday. Say yes to this one.</>}
            </p>
            <p className="story-foot">Safe-to-spend is a running number, not a guess.</p>
          </div>

          {/* Laptop goal: guilt-free money quietly building a dream */}
          <div className="story-card teal rise d1">
            <span className="story-tag">Goal · first laptop</span>
            <div className="sc-row">
              <span className="sc-label">Saved so far</span>
              <span className="sc-num">{formatINR(840000)} <span className="sc-of">/ {formatINR(2500000)}</span></span>
            </div>
            <div className="sc-bar" aria-hidden>
              <motion.span
                className="sc-bar-fill mint"
                initial={{ width: 0 }}
                whileInView={{ width: '34%' }}
                viewport={{ once: true }}
                transition={{ duration: reduced ? 0 : 1, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <p className="sc-cap">
              ~<em>₹350 a week</em> siphoned from guilt-free money. You skipped two trips; the laptop fund noticed every time.
            </p>
            <p className="story-foot">Goals are fed by spending money — not by touching your protected line.</p>
          </div>
        </div>
      </Section>

      {/* 4 — Closing CTA */}
      <Section className="cta-band">
        <div className="rise">
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
        </div>
      </Section>

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
