import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useApp } from '../lib/store'
import { useCountUp } from '../components/Amount'
import { formatINR } from '../lib/money'
import LedgerLogo from '../components/Logo'
import Aurora from '../components/bits/Aurora'
import SplitText from '../components/bits/SplitText'
import AnimatedList from '../components/bits/AnimatedList'
import { FloatObject } from '../components/bits/Stickers'
import { ArrowRight, Eye, EyeOff } from '../components/Icons'

/* Fictional demo numbers — minor units, clearly labelled as demo. */
const DEMO = { total: 2468000, savings: 1000000, guiltFree: 550000, spent: 125000 }

/* Decorative floaters that live harmlessly behind the change (Stickers take care of motion) */
function HeroStickers() {
  return (
    <div className="hero-stickers" aria-hidden="true">
      <FloatObject kind="coin-stack" size={52} seed={3} depth="near" className="hs hs-1" delay={0.7} />
      <FloatObject kind="receipt" size={44} seed={5} depth="mid" className="hs hs-2" delay={0.9} />
      <FloatObject kind="sparkle" size={34} seed={8} depth="far" className="hs hs-3" delay={1.15} />
      <FloatObject kind="jar" size={58} seed={2} depth="near" className="hs hs-4" delay={1.25} />
      <FloatObject kind="coin" size={30} seed={11} depth="far" className="hs hs-5" delay={1.4} />
      <FloatObject kind="card" size={46} seed={6} depth="mid" className="hs hs-6" delay={1.5} />
    </div>
  )
}

/**
 * The hero's signature demo: the balance starts masked, exactly like the
 * Dashboard, and an explicit labelled button reveals / re-masks it.
 * No auto-loop animation — the user drives it.
 */
function PrivacyDemoCard() {
  const reduced = useReducedMotion()
  const [revealed, setRevealed] = useState(false)
  const value = useCountUp(DEMO.total, revealed, 700)
  return (
    <div className="demo-card card" aria-label="Demo of the balance privacy feature">
      <div className="demo-eyebrow">
        <span className="eyebrow">Total balance</span>
        <span className="demo-badge">Demo</span>
      </div>
      <div className="demo-amount display-num">
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
      {!reduced && <motion.span className="demo-orbit" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 26, ease: 'linear' }} />}
    </div>
  )
}

function FloatingChip({ className, children, delay = 0 }: { className: string; children: React.ReactNode; delay?: number }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className={`float-chip card ${className}`}
      initial={{ opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        animate={reduced ? undefined : { y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 3.4 + delay, ease: 'easeInOut', delay }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

/* ---------- Hero visual: real app mock with floating chips ---------- */

function HeroMock() {
  return (
    <div className="hero-mock">
      <PrivacyDemoCard />
      <FloatingChip className="chip-a" delay={0.5}>
        <div>
          <div className="float-label">Guilt-free</div>
          <div className="float-val display-num">{formatINR(DEMO.guiltFree)}</div>
        </div>
      </FloatingChip>
      <FloatingChip className="chip-b" delay={0.75}>
        <div>
          <div className="float-label">Savings</div>
          <div className="float-val display-num">{formatINR(DEMO.savings)}</div>
        </div>
      </FloatingChip>
      <FloatingChip className="chip-c" delay={1}>
        <div>
          <div className="float-label">Coffee</div>
          <div className="float-val display-num">−₹80</div>
        </div>
      </FloatingChip>
      <FloatingChip className="chip-d" delay={1.2}>
        <div>
          <div className="float-label">Safe to spend</div>
          <div className="float-val display-num">₹287/day</div>
        </div>
      </FloatingChip>
    </div>
  )
}

/* ---------- Money split: the scroll-driven "one pot → three pots" moment ---------- */

function MoneySplit() {
  const ref = useRef<HTMLElement>(null)
  const splitRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.35'] })
  const split = useTransform(scrollYProgress, [0.15, 0.75], [0, 1])
  const smooth = useTransform(split, (v) => v)

  const potOpacity = useTransform(smooth, [0.45, 0.9], [0, 1])
  const potScale = useTransform(smooth, [0.45, 1], [0.6, 1])
  const potY = useTransform(smooth, [0.45, 1], [46, 0])
  const potX = useTransform(smooth, (v) => `${-v * 36}px`)
  const lineScale = useTransform(smooth, [0.3, 0.7], [0, 1])

  return (
    <section className="land-section split-section" ref={ref}>
      <div className="land-wrap">
        <motion.div className="section-head" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6 }}>
          <span className="eyebrow">The Ledger model</span>
          <SplitText text="Your money. Three jobs." className="split-h2" delay={60} duration={0.7} splitType="words" tag="h2" textAlign="left" from={{ opacity: 0, y: 40 }} to={{ opacity: 1, y: 0 }} />
        </motion.div>

        <div className="money-split" ref={splitRef}>
          <motion.div className="ms-total" >
            <span className="eyebrow">Everything you have</span>
            <div className="ms-total-num display-num">{formatINR(DEMO.total)}</div>
          </motion.div>

          <motion.div className="ms-lines" style={{ scaleX: lineScale }} aria-hidden>
            <span className="ms-line ms-l" />
            <span className="ms-line ms-r" />
          </motion.div>

          <div className="ms-pots">
            <motion.div className="ms-pot card" style={{ opacity: potOpacity, scale: potScale, y: potY, x: potX }}>
              <span className="ms-pot-label">Savings</span>
              <span className="ms-pot-val display-num">{formatINR(DEMO.savings)}</span>
              <span className="ms-pot-note faint">Don't touch</span>
            </motion.div>
            <motion.div className="ms-pot card" style={{ opacity: potOpacity, scale: potScale, y: potY }}>
              <span className="ms-pot-label">Guilt-Free</span>
              <span className="ms-pot-val display-num">{formatINR(DEMO.guiltFree)}</span>
              <span className="ms-pot-note faint">Yours to spend</span>
            </motion.div>
          </div>
        </div>

        <motion.p className="alloc-demo-note faint" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.5 }}>
          Demo numbers — yours will be your own. (Strict savings covers your minimum-balance floor — you decide how.)
        </motion.p>
      </div>
    </section>
  )
}

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
}

function Section({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`land-section ${className ?? ''}`}>
      <div className="land-wrap">{children}</div>
    </section>
  )
}

function HowStep({ n, title, body, delay }: { n: string; title: string; body: string; delay: number }) {
  return (
    <motion.div className="how-step card hover-lift" {...fadeUp} transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}>
      <div className="how-num">{n}</div>
      <h3>{title}</h3>
      <p className="muted">{body}</p>
    </motion.div>
  )
}

/* Animated feed data for the feature section */
const FEED: { label: string; amt: string }[] = [
  { label: 'Lunch', amt: '-₹320' },
  { label: 'Metro', amt: '-₹60' },
  { label: 'Engineering book', amt: '-₹780' },
  { label: 'Cold coffee', amt: '-₹140' },
  { label: 'Movie night', amt: '-₹260' },
]

export default function Landing() {
  const { demoSignIn } = useApp()
  const navigate = useNavigate()
  /** Sign into the demo account, then move into the app. */
  const runDemo = async () => {
    const err = await demoSignIn()
    if (!err) navigate('/app')
  }
  const [nightChoice, setNightChoice] = useState<'yes' | 'no'>('yes')
  const [navScrolled, setNavScrolled] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  // Nav gains its jelly shadow once the page scrolls
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const mockY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 70])
  const mockRot = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -2.5])

  // Heavy WebGL visuals load AFTER first paint — keeps the landing instant
  const [showFx, setShowFx] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setShowFx(true)))
    return () => cancelAnimationFrame(id)
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

      <section className="land-hero" ref={heroRef}>
        {/* Aurora background — vivid coral/violet/cyan wash (post-paint) */}
        <div className="hero-bg" aria-hidden>
          {showFx && !reduced && (
            <Aurora
              colorStops={['#ff78ac', '#a8d5e3', '#f2f0ea', '#ff78ac']}
              amplitude={1.15}
              blend={0.6}
              speed={0.45}
            />
          )}
        </div>
        <HeroStickers />
        <div className="land-wrap hero-grid">
          <div className="hero-copy">
            <motion.div className="hero-eyebrow" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              The private money app for students
            </motion.div>
            <h1 className="hero-title" aria-label="Spend without the guilt.">
              {['Spend', 'without', 'the'].map((w, i) => (
                <motion.span
                  key={w}
                  initial={{ opacity: 0, y: 44, rotate: 2 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  transition={{ delay: 0.1 + i * 0.09, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="hero-word"
                >
                  {w}{' '}
                </motion.span>
              ))}
              <motion.span
                initial={{ opacity: 0, y: 44, rotate: -2, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.75, ease: [0.34, 1.56, 0.64, 1] }}
                className="hero-word hero-guilt-word"
              >
                guilt.
              </motion.span>
            </h1>
            <motion.p className="hero-sub" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.6 }}>
              Know how much is safe to spend — and keep your big total private until you decide to show it. Every other amount is plain to read.
            </motion.p>
            <motion.div className="hero-ctas" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.68, duration: 0.6 }}>
              <Link to="/app" className="btn btn-accent btn-lg hero-cta">
                Enter your financial world <ArrowRight size={18} />
              </Link>
              <a href="#how" className="btn btn-ghost btn-lg">See the story</a>
            </motion.div>
            <motion.button className="hero-demo-link" onClick={() => void runDemo()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
              or explore the live demo →
            </motion.button>
          </div>

          <motion.div className="hero-visual" style={{ y: mockY, rotate: mockRot }} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            <HeroMock />
          </motion.div>
        </div>
      </section>

      <Section className="how" id="how">
        <motion.div className="section-head" {...fadeUp} transition={{ duration: 0.6 }}>
          <span className="eyebrow">How it works</span>
          <h2>Four numbers. Zero confusion.</h2>
          <p className="muted">Ledger splits your money the way your brain already does — you just finally see it.</p>
        </motion.div>
        <div className="how-grid">
          <HowStep n="01" title="Drop in your balance" body="Tell Ledger what's actually in your account right now. Thirty seconds, one number." delay={0} />
          <HowStep n="02" title="Ring-fence the untouchables" body="Strict savings stays out of reach — mentally and visually. You decide the number, minimum balance included." delay={0.08} />
          <HowStep n="03" title="Get your guilt-free number" body="What's left is yours. Spend it on cold coffee and concert tickets, zero shame." delay={0.16} />
          <HowStep n="04" title="Show the total only when you want" body="Your Dashboard total starts masked. One labelled button beside it shows the number; one click hides it again. Other amounts stay readable." delay={0.24} />
        </div>
      </Section>

      <MoneySplit />

      {/* Sticky peek-engine demo: card pins left while three copy beats scroll past */}
      <Section className="peek-sticky-band">
        <div className="peek-sticky">
          <div className="peek-pin">
            <PrivacyDemoCard />
            <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="peek-pin-note faint card">
              The <strong>Show balance</strong> button lives on the Dashboard, right beside the total.
            </motion.div>
          </div>
          <div className="peek-beats">
            {[
              { t: 'Balance open in a crowd?', b: 'Never. The Dashboard total renders masked — a soft blur that keeps the shape but hides the digits.' },
              { t: 'Need to check it?', b: 'Tap Show balance beside your total — the number appears. Hide balance closes it the moment you are done.' },
              { t: 'Someone lean over your shoulder?', b: 'Hit Hide balance. The total re-masks instantly — and since other amounts are always readable, nothing is lost.' },
            ].map((beat, i) => (
              <motion.div key={i} className="peek-beat" {...fadeUp} transition={{ duration: 0.55 }}>
                <span className="peek-beat-n">{String(i + 1).padStart(2, '0')}</span>
                <h3>{beat.t}</h3>
                <p className="muted">{beat.b}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      <Section className="feature-band">
        <div className="privacy-grid">
          <motion.div className="privacy-copy" {...fadeUp} transition={{ duration: 0.6 }}>
            <span className="eyebrow">Know where it goes</span>
            <h2>Every rupee, telling its story.</h2>
            <p className="muted">
              Log in seconds. Watch your guilt-free pool react instantly — budgets, safe-to-spend and charts all move together.
            </p>
            <div className="feed-demo">
              <AnimatedList
                items={FEED.map((f) => `${f.label}   ${f.amt}`)}
                showGradients={false}
                enableArrowNavigation={false}
              />
            </div>
          </motion.div>

          <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.1 }}>
            <div className="privacy-demo-wrap">
              <PrivacyDemoCard />
              <motion.div className="privacy-bullets card" {...fadeUp} transition={{ delay: 0.2 }}>
                <ul className="privacy-list">
                  <li>Dashboard total masked by default — every visit</li>
                  <li>Show it with one labelled button, hide it just as fast</li>
                  <li>Bank-grade account security underneath</li>
                </ul>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </Section>

      <Section className="scenario-band">
        <motion.div className="section-head" {...fadeUp} transition={{ duration: 0.6 }}>
          <span className="eyebrow">Real student moments</span>
          <h2>Ledger in the wild.</h2>
        </motion.div>
        <div className="scenario-grid">
          {/* Night out: check safe-to-spend before saying yes */}
          <motion.div className="scenario-card card sc-night" {...fadeUp} transition={{ duration: 0.6 }}>
            <div className="sc-tag sc-tag-coral">9:41 pm · before you say yes</div>
            <div className="sc-screen">
              <div className="sc-row">
                <span className="sc-label faint">Safe to spend tonight</span>
                <span className="sc-num display-num">₹287</span>
              </div>
              <div className="sc-bar" aria-hidden>
                <span className="sc-bar-fill" style={{ width: '64%' }} />
              </div>
              <div className="sc-row faint">
                <span>After 2 movies already this week</span>
                <span>₹184 left today</span>
              </div>
              <div className="sc-swap">
                <button className={`sc-choice ${nightChoice === 'yes' ? 'on' : ''}`} onClick={() => setNightChoice('yes')}>Chai plans</button>
                <button className={`sc-choice ${nightChoice === 'no' ? 'on' : ''}`} onClick={() => setNightChoice('no')}>Movie night</button>
              </div>
              <motion.p className="sc-verdict" key={nightChoice} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                {nightChoice === 'yes'
                  ? '₹143 left after chai — you still eat tomorrow. Go.'
                  : 'That’s ₹260 of your ₹287. Ledger says: switch, and eat tomorrow.'}
              </motion.p>
            </div>
          </motion.div>

          {/* Laptop goal: real Goal-progress storytelling */}
          <motion.div className="scenario-card card sc-laptop" {...fadeUp} transition={{ duration: 0.6, delay: 0.08 }}>
            <div className="sc-tag sc-tag-mint">Goal · first laptop</div>
            <div className="sc-screen">
              <div className="sc-row">
                <span className="sc-label faint">Saved so far</span>
                <span className="sc-num display-num">₹8,400 <span className="sc-of faint">/ ₹25,000</span></span>
              </div>
              <div className="sc-bar tinted" aria-hidden>
                <motion.span
                  className="sc-bar-fill mint"
                  initial={{ width: 0 }}
                  whileInView={{ width: '34%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <div className="sc-row faint">
                <span>₹350 stashed every week from guilt-free</span>
                <span>~14 months to go</span>
              </div>
              <div className="sc-swap">
                <span className="sc-chip on">Net gains this month</span>
                <span className="sc-chip">Skips: 3 so far</span>
              </div>
            </div>
          </motion.div>

          {/* Rent + protected balance: commitments don't count as spendable */}
          <motion.div className="scenario-card card sc-rent" {...fadeUp} transition={{ duration: 0.6, delay: 0.12 }}>
            <div className="sc-tag sc-tag-violet">Rent week · what's actually protected</div>
            <div className="sc-screen">
              <div className="sc-protect-grid">
                <div className="sc-protect-row">
                  <div className="sc-protect-txt">
                    <div className="sc-protect-label">Hostel rent</div>
                    <div className="sc-protect-note faint">Due the 3rd · ₹4,000</div>
                  </div>
                  <span className="sc-protect-state">Reserved</span>
                </div>
                <div className="sc-protect-row">
                  <div className="sc-protect-txt">
                    <div className="sc-protect-label">Protected balance</div>
                    <div className="sc-protect-note faint">Your minimum-balance line · ₹2,000</div>
                  </div>
                  <span className="sc-protect-state">Untouched</span>
                </div>
              </div>
              <div className="sc-verdict">
                Neither shows up as money you can blow. Safe to spend knows the difference.
              </div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* Editorial big-words moment — Track · Peek · Spend (Mojek 'Track · Analyze · Reflect' analogue) */}
      <Section className="words-band">
        <div className="words-stage">
          {[
            { word: 'Hide.', cls: 'w-hide', line: 'Your Dashboard total opens masked — a soft blur until you decide.' },
            { word: 'Show.', cls: 'w-peek', line: 'One labelled button beside the total reveals it. Click again to re-mask.' },
            { word: 'Spend.', cls: 'w-spend', line: 'What remains after savings and essentials is guilt-free — actually spend it.' },
          ].map((w, i) => (
            <motion.div key={w.word} className="words-row" {...fadeUp} transition={{ duration: 0.65, delay: i * 0.12 }}>
              <h3 className={`words-word display-num ${w.cls}`}>{w.word}</h3>
              <p className="words-line muted">{w.line}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section className="allocation-band">
        <motion.div className="section-head" {...fadeUp} transition={{ duration: 0.6 }}>
          <span className="eyebrow">The whole picture</span>
          <h2>Where does your money actually live?</h2>
        </motion.div>
        <div className="alloc-grid">
          {[
            { label: 'Strict Savings', val: formatINR(DEMO.savings), note: "Don't touch", cls: 'a-green' },
            { label: 'Guilt-Free', val: formatINR(DEMO.guiltFree), note: 'Yours to spend', cls: 'a-yellow' },
          ].map((a, i) => (
            <motion.div key={a.label} className={`alloc-card card ${a.cls}`} {...fadeUp} transition={{ duration: 0.55, delay: i * 0.09 }}>
              <div className="alloc-label">{a.label}</div>
              <div className="alloc-val display-num">{a.val}</div>
              <div className="alloc-note muted">{a.note}</div>
            </motion.div>
          ))}
        </div>
        <motion.p className="alloc-demo-note faint" {...fadeUp}>Demo numbers — yours will be your own.</motion.p>
      </Section>

      <Section className="cta-band">
        <motion.div className="cta-card card" {...fadeUp} transition={{ duration: 0.7 }}>
          <h2>Your money, finally making sense.</h2>
          <p className="muted">Free for students. Set up in under a minute.</p>
          <div className="hero-ctas center">
            <Link to="/app" className="btn btn-accent btn-lg">Enter your financial world <ArrowRight size={18} /></Link>
            <button className="btn btn-ghost btn-lg" onClick={() => void runDemo()}>
              <span className="demo-shiny">Try the demo</span>
            </button>
          </div>
        </motion.div>
      </Section>

      <footer className="land-footer">
        <div className="land-wrap land-footer-inner">
          <div className="foot-brand">
            <div className="logo-link"><LedgerLogo size={24} /><span className="logo-word">Ledger</span></div>
            <p className="faint foot-tag">Know what you can actually spend.</p>
          </div>
          <nav className="foot-links" aria-label="Footer">
            <Link to="/signup">Get started</Link>
            <Link to="/login">Log in</Link>
            <button onClick={() => void runDemo()} className="foot-demo-link">Try the demo</button>
          </nav>
          <div className="foot-floaters" aria-hidden="true">
            <FloatObject kind="coin" size={26} seed={13} depth="far" delay={0.4} />
            <FloatObject kind="sparkle" size={22} seed={9} depth="far" delay={0.6} />
          </div>
        </div>
      </footer>
    </div>
  )
}
