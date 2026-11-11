/**
 * Ledger homepage — Harbour theme.
 *
 * Navy water, sand-cream cards that warm into coral, one coral accent.
 * Motion: Lenis smooths the window; GSAP + ScrollTrigger drive the pinned phone
 * (its own screen scrolls while insight cards surface around it), the fanned cards,
 * the scroll-filled statement, the jar split and the velocity marquee.
 * Under prefers-reduced-motion every section renders as a calm static page.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import { useApp } from '../lib/store'
import { useCountUp } from '../components/Amount'
import { formatINR } from '../lib/money'
import LedgerLogo from '../components/Logo'
import { useSmoothScroll } from '../lib/motion'
import { TideChart, StreamChart, smoothPath, type StreamSeries } from '../components/charts/Flow'
import '../landing.css'

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP)

const MOTION = '(prefers-reduced-motion: no-preference)'
const DESK = '(min-width: 861px)'
const rs = (n: number) => formatINR(n * 100)

/* ============================================================
   Sample data (illustration only — the real app uses yours)
   ============================================================ */

const TIDE_NOW = [0, 120, 260, 260, 540, 610, 980, 1060, 1180, 1610, 1690].map((v) => v * 100)
const TIDE_PREV = [0, 90, 310, 420, 520, 700, 760, 1100, 1240, 1300, 1460, 1720, 1810, 1990, 2050, 2290, 2380, 2400, 2610, 2770, 2830, 3050, 3120, 3190, 3420, 3480, 3610, 3700, 3790, 3920].map((v) => v * 100)

const STREAM_LABELS = ['15 Oct', '18 Oct', '21 Oct', '24 Oct', '27 Oct', '30 Oct', '2 Nov', '5 Nov', '8 Nov', '11 Nov']
const STREAM: StreamSeries[] = [
  { id: 'food', label: 'Food & drinks', color: '#ff6f5e', values: [180, 240, 210, 330, 420, 160, 260, 310, 470, 380].map((v) => v * 100) },
  { id: 'transport', label: 'Transport', color: '#d9a441', values: [90, 60, 120, 80, 150, 40, 110, 70, 130, 90].map((v) => v * 100) },
  { id: 'fun', label: 'Entertainment', color: '#b07aa1', values: [120, 0, 60, 199, 80, 0, 150, 99, 60, 120].map((v) => v * 100) },
  { id: 'study', label: 'Education', color: '#4f7cc4', values: [0, 120, 40, 0, 60, 220, 0, 50, 0, 70].map((v) => v * 100) },
  { id: 'groceries', label: 'Groceries', color: '#6fae8f', values: [140, 0, 90, 60, 0, 120, 80, 0, 160, 40].map((v) => v * 100) },
]

const MERCHANTS = [
  ['Chai + samosa', 'Metro recharge', 'Blinkit run', 'Mess lunch', 'Netflix split', 'Photocopies', 'Auto to campus', 'Cold coffee'],
  ['Zomato order', 'Bus pass top-up', 'Reference book', 'Movie night', 'Fruits & veggies', 'Rapido ride', 'Campus café', 'Haircut'],
  ['Spotify duet', 'Lab file printing', 'Milk & eggs', 'Laundry', 'Canteen snacks', 'Phone cable', 'Gift for friend', 'Notebooks'],
]

/* ============================================================
   Shared bits
   ============================================================ */

function useLive(root: React.RefObject<HTMLElement | null>, cls: string, setup: (q: (s: string) => HTMLElement[], desk: boolean) => void, deps: unknown[] = []) {
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add({ desk: DESK, motion: MOTION }, (c) => {
      const { desk, motion } = c.conditions as { desk: boolean; motion: boolean }
      const el = root.current
      if (!motion || !el) return
      el.classList.add(cls)
      setup(gsap.utils.selector(el) as (s: string) => HTMLElement[], desk)
      return () => el.classList.remove(cls)
    })
    return () => mm.revert()
  }, { scope: root, dependencies: deps })
}

/** Wide two-tone headline whose words rise out of a mask when it scrolls in. */
function Rise({ as: Tag = 'h2', className = '', children }: { as?: 'h1' | 'h2' | 'h3'; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(MOTION, () => {
      const el = ref.current
      if (!el) return
      const split = SplitText.create(el, { type: 'lines,words', mask: 'lines', linesClass: 'rise-line' })
      gsap.from(split.words, {
        yPercent: 115,
        duration: 1.2,
        ease: 'expo.out',
        stagger: 0.05,
        scrollTrigger: { trigger: el, start: 'top 86%', once: true },
      })
      return () => split.revert()
    })
    return () => mm.revert()
  }, { scope: ref })
  return <Tag ref={ref} className={`lx-rise ${className}`}>{children}</Tag>
}

function Phone({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`ph ${className}`}>
      <div className="ph-screen">
        <div className="ph-notch" />
        {children}
      </div>
    </div>
  )
}

function StatusBar() {
  return (
    <div className="ph-status">
      <span>9:41</span>
      <span className="ph-status-r"><i /><i /><i /></span>
    </div>
  )
}

function Spark({ values, w = 220, h = 54 }: { values: number[]; w?: number; h?: number }) {
  const max = Math.max(...values)
  const pts = values.map((v, i) => [4 + (i / (values.length - 1)) * (w - 8), h - 4 - (v / max) * (h - 10)] as [number, number])
  const line = smoothPath(pts)
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="spark" aria-hidden="true">
      <path d={`${line} L${pts[pts.length - 1][0]},${h} L${pts[0][0]},${h} Z`} className="spark-fill" />
      <path d={line} className="spark-line" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4" className="spark-buoy" />
    </svg>
  )
}

/** The app's dashboard, in miniature, long enough to scroll inside the phone. */
function PhoneDash() {
  return (
    <div className="ph-scroll">
      <StatusBar />
      <p className="pd-kicker">Tue, 11 Nov · 19 days left</p>
      <p className="pd-hi">Good evening, Aarav</p>
      <div className="pd-card pd-hero">
        <span className="pd-label">Total balance</span>
        <b className="pd-big">₹24,850</b>
        <span className="pd-split"><i style={{ width: '40%' }} /><i style={{ width: '13%' }} /></span>
        <span className="pd-legend">Savings 40% · Guilt-free 13%</span>
      </div>
      <div className="pd-two">
        <div className="pd-card pd-navy"><span className="pd-label">Strict savings</span><b>₹10,000</b></div>
        <div className="pd-card pd-hot"><span className="pd-label">Guilt-free left</span><b>₹3,120</b></div>
      </div>
      <div className="pd-card">
        <span className="pd-label">This month so far</span>
        <b className="pd-mid">₹1,610</b>
        <Spark values={[0, 120, 260, 260, 540, 610, 980, 1060, 1180, 1610]} />
      </div>
      <div className="pd-card">
        <span className="pd-label">Safe to spend today</span>
        <b className="pd-big">₹156</b>
        <span className="pd-note">Guilt-free left, split over 19 days</span>
      </div>
      <div className="pd-card">
        <span className="pd-label">Where it went</span>
        {[['Food & drinks', 39, '#ff6f5e'], ['Shopping', 26, '#e8908a'], ['Transport', 19, '#d9a441'], ['Entertainment', 16, '#b07aa1']].map(([l, p, c]) => (
          <div className="pd-rank" key={l as string}>
            <span><i style={{ background: c as string }} />{l}</span><em>{p}%</em>
            <span className="pd-track"><span style={{ width: `${(p as number) * 2.4}%` }} /></span>
          </div>
        ))}
      </div>
      <div className="pd-card">
        <span className="pd-label">Recurring</span>
        {[['Netflix split', 'Tomorrow', 199], ['Spotify duet', '14 Nov', 149], ['Hostel rent', '1 Dec', 6500]].map(([n, d, a]) => (
          <div className="pd-row" key={n as string}><span>{n}<em>{d}</em></span><b>{rs(a as number)}</b></div>
        ))}
      </div>
      <div className="pd-card">
        <span className="pd-label">Laptop fund</span>
        <b className="pd-mid">₹18,000 <em>of ₹45,000</em></b>
        <span className="pd-bar"><span style={{ width: '40%' }} /></span>
      </div>
    </div>
  )
}

/* ============================================================
   NAV
   ============================================================ */

function Nav({ onDemo }: { onDemo: () => void }) {
  const [state, setState] = useState({ solid: false, hidden: false })
  useEffect(() => {
    let last = window.scrollY
    let hidden = false
    const onScroll = () => {
      const y = window.scrollY
      if (y <= 400 || y < last - 4) hidden = false
      else if (y > last + 4) hidden = true
      setState({ solid: y > 24, hidden })
      last = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <header className={`lx-nav ${state.solid ? 'solid' : ''} ${state.hidden ? 'away' : ''}`}>
      <nav className="lx-nav-l" aria-label="Sections">
        <a href="#how">How it works</a>
        <a href="#features">Features</a>
        <Link to="/privacy">Privacy</Link>
      </nav>
      <Link to="/" className="lx-brand" aria-label="Ledger home">
        <LedgerLogo size={28} />
        <span>Ledger</span>
      </Link>
      <div className="lx-nav-r">
        <button type="button" className="lx-link" onClick={onDemo}>Demo</button>
        <Link to="/login" className="lx-link">Log in</Link>
        <Link to="/signup" className="lx-btn lx-btn-coral lx-btn-sm">Get started</Link>
      </div>
    </header>
  )
}

/* ============================================================
   HERO — headline over a rising tide of tiles; the phone peeks up,
   then pins in the middle while its own screen scrolls.
   ============================================================ */

const TILE_COLS = 20
const TILE_ROWS = 4
/** Which tiles are filled, from the top row down: denser toward the bottom, like a rising tide. */
const TILES = Array.from({ length: TILE_COLS * TILE_ROWS }, (_, i) => {
  const r = Math.floor(i / TILE_COLS)
  const c = i % TILE_COLS
  const h = Math.abs(Math.sin(c * 12.9898 + r * 78.233) * 43758.5453) % 1
  const filled = h < [0.14, 0.34, 0.62, 0.88][r]
  const h2 = (h * 97.13) % 1
  const tone = h2 < 0.07 ? 'coral' : h2 < 0.26 ? 'sand' : h2 < 0.64 ? 'deep' : 'mid'
  return filled ? tone : ''
})

const TOASTS = [
  { side: 'l', k: 'Safe to spend', t: '₹156 today', s: 'Guilt-free left, over 19 days' },
  { side: 'r', k: 'Recurring', t: 'Netflix split tomorrow', s: '₹199 from guilt-free' },
  { side: 'l', k: 'Budget', t: 'Food is at 82%', s: '₹270 left for November' },
  { side: 'r', k: 'Goal', t: 'Laptop fund 40% there', s: '₹18,000 of ₹45,000' },
]

function Hero({ onDemo }: { onDemo: () => void }) {
  const root = useRef<HTMLElement>(null)

  useLive(root, 'h-live', (q, desk) => {
    const stage = root.current!
    const copy = q('.h-copy')[0]
    const phone = q('.h-phone')[0]
    const peek = () => {
      const s = stage.getBoundingClientRect()
      const c = copy.getBoundingClientRect()
      const ph = phone.offsetHeight
      const centeredTop = s.height / 2 - ph / 2
      return Math.max(c.bottom - s.top + 40 - centeredTop, s.height * 0.3)
    }
    gsap.set(phone, { y: peek })

    const title = q('.h-title')[0]
    const split = SplitText.create(title, { type: 'lines,words', mask: 'lines', linesClass: 'rise-line' })
    const intro = gsap.timeline({ defaults: { ease: 'expo.out' } })
    intro
      .from(q('.h-pill'), { y: 16, autoAlpha: 0, duration: 0.9 })
      .from(split.words, { yPercent: 115, duration: 1.3, stagger: 0.07 }, 0.1)
      .from(q('.h-sub'), { y: 20, autoAlpha: 0, duration: 1 }, 0.55)
      .from(q('.h-ctas > *'), { y: 20, autoAlpha: 0, duration: 1, stagger: 0.08 }, 0.65)
      .from(q('.tile.on'), { scaleY: 0, transformOrigin: '50% 100%', duration: 1, ease: 'expo.out', stagger: { each: 0.02, from: 'end', grid: [TILE_ROWS, TILE_COLS], axis: 'y' } }, 0.3)
      .from(q('.h-phone-in'), { y: '70vh', duration: 1.8 }, 0.35)

    const screen = q('.ph-scroll')[0]
    const view = q('.h-phone .ph-screen')[0]
    const travel = () => -(screen.scrollHeight - view.clientHeight + 24)
    const toasts = q('.h-toast')

    const tl = gsap.timeline({
      scrollTrigger: { trigger: stage, start: 'top top', end: desk ? '+=240%' : '+=200%', pin: true, scrub: 1, invalidateOnRefresh: true },
    })
    tl.to(copy, { y: -140, autoAlpha: 0, duration: 0.8, ease: 'power2.in' }, 0)
      .to(q('.tile'), { yPercent: 120, autoAlpha: 0, duration: 1, stagger: { each: 0.01, from: 'random' } }, 0)
      .to(phone, { y: 0, duration: 1, ease: 'power2.inOut' }, 0)
      .to(screen, { y: travel, duration: 3.4, ease: 'none' }, 1)
    toasts.forEach((t, i) => {
      const from = TOASTS[i].side === 'l' ? -60 : 60
      tl.fromTo(t, { x: from, y: 24, autoAlpha: 0, rotate: from > 0 ? 3 : -3 }, { x: 0, y: 0, autoAlpha: 1, rotate: 0, duration: 0.45, ease: 'back.out(1.5)' }, 1.1 + i * 0.7)
      if (!desk && i < toasts.length - 1) tl.to(t, { autoAlpha: 0, y: -16, duration: 0.3 }, 1.1 + i * 0.7 + 0.6)
    })
    tl.to({}, { duration: 0.4 })
  })

  return (
    <section className="h-stage" ref={root} aria-label="Ledger">
      <div className="h-copy">
        <p className="h-pill">Free for students · no bank login</p>
        <h1 className="h-title">Spend without <span className="coral">the guilt</span></h1>
        <p className="h-sub">
          Ledger splits your balance into savings you don't touch and money you can spend freely,
          then tells you what's safe to spend today.
        </p>
        <div className="h-ctas">
          <Link to="/signup" className="lx-btn lx-btn-coral">Get started</Link>
          <button type="button" className="lx-btn lx-btn-line" onClick={onDemo}>Try the demo</button>
        </div>
      </div>

      <div className="h-tiles" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${TILE_COLS}, 1fr)` }}>
        {TILES.map((t, i) => <span key={i} className={`tile ${t ? `on t-${t}` : ''}`} />)}
      </div>

      <div className="h-phone">
        <div className="h-phone-in">
          <Phone><PhoneDash /></Phone>
          {TOASTS.map((t, i) => (
            <div key={i} className={`h-toast side-${t.side} n${i}`} aria-hidden="true">
              <span className="ht-k"><i />{t.k}</span>
              <b>{t.t}</b>
              <span className="ht-s">{t.s}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================
   FAN — three cards slide out from behind each other into a
   tilted row (the phone's cards, up close)
   ============================================================ */

function Fan() {
  const root = useRef<HTMLElement>(null)
  useLive(root, 'fan-live', (q, desk) => {
    const cards = q('.fan-card')
    if (desk) {
      gsap.fromTo(cards,
        { x: (i: number) => (1 - i) * 320, y: 140, rotateY: 0, rotateZ: 0, scale: 0.82, autoAlpha: 0 },
        {
          x: 0, y: 0, scale: 1, autoAlpha: 1,
          rotateY: (i: number) => [22, 0, -22][i],
          rotateZ: (i: number) => [-2, 0, 2][i],
          z: (i: number) => (i === 1 ? 60 : 0),
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top 85%', end: 'center 55%', scrub: 1 },
        })
    } else {
      gsap.from(cards, { y: 60, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: root.current, start: 'top 80%', once: true } })
    }
  })
  return (
    <section className="fan" ref={root} aria-label="What Ledger shows you">
      <div className="fan-row">
        <article className="fan-card lx-card">
          <span className="lc-k">Recurring</span>
          <p className="lc-t">3 payments in the next 3 weeks</p>
          {[['Netflix split', 'Tomorrow', 199], ['Spotify duet', '14 Nov', 149], ['Hostel rent', '1 Dec', 6500]].map(([n, d, a]) => (
            <div className="lc-row" key={n as string}><span>{n}<em>{d}</em></span><b>{rs(a as number)}</b></div>
          ))}
        </article>
        <article className="fan-card lx-card">
          <span className="lc-k">Where it went · November</span>
          {[['Food & drinks', 627, 39, '#ff6f5e'], ['Shopping', 415, 26, '#e8908a'], ['Transport', 303, 19, '#d9a441'], ['Entertainment', 265, 16, '#b07aa1']].map(([l, a, p, c], i) => (
            <div className="lc-rank" key={l as string}>
              <span><i style={{ background: c as string }} />{l}</span>
              <em>{p}%</em><b>{rs(a as number)}</b>
              <span className="lc-track"><span style={{ width: `${((a as number) / 627) * 100}%`, background: i === 0 ? '#e0523d' : undefined }} /></span>
            </div>
          ))}
        </article>
        <article className="fan-card lx-card">
          <span className="lc-k">Goals</span>
          {[['Laptop fund', 18000, 45000], ['Goa trip', 4200, 12000], ['Emergency cushion', 9000, 10000]].map(([n, s, t]) => (
            <div className="lc-goal" key={n as string}>
              <span>{n}<em>{rs(s as number)} of {rs(t as number)}</em></span>
              <span className="lc-track"><span style={{ width: `${((s as number) / (t as number)) * 100}%` }} /></span>
            </div>
          ))}
        </article>
      </div>
    </section>
  )
}

/* ============================================================
   STATEMENT — words fill in as you scroll
   ============================================================ */

function Statement() {
  const root = useRef<HTMLElement>(null)
  useLive(root, 'st-live', (q) => {
    const split = SplitText.create(q('.st-text')[0], { type: 'words' })
    gsap.fromTo(split.words, { opacity: 0.16 }, {
      opacity: 1, ease: 'none', stagger: 0.1,
      scrollTrigger: { trigger: q('.st-text')[0], start: 'top 80%', end: 'bottom 45%', scrub: true },
    })
  })
  return (
    <section className="st" ref={root}>
      <p className="st-text">
        Your ledger is <span className="coral">encrypted before it's stored.</span> No ads, no bank logins,
        no tracking scripts, and not a single number sold.
      </p>
      <p className="st-note">Encrypted in your browser with AES-256-GCM. <Link to="/privacy">Read the privacy page</Link></p>
    </section>
  )
}

/* ============================================================
   JARS — one balance, three jars
   ============================================================ */

const CHIPS = [
  ['Mess lunch', 'a'], ['Metro', 'b'], ['Rent', 'c'], ['Books', 'd'], ['Netflix', 'e'], ['Chai', 'f'], ['Laptop fund', 'g'], ['Blinkit', 'h'],
]

function Jars() {
  const root = useRef<HTMLElement>(null)
  const [on, setOn] = useState(false)
  useLive(root, 'jar-live', (q) => {
    q('.jar-chip').forEach((c, i) => {
      gsap.to(c, { y: -(60 + (i % 4) * 50), ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true } })
    })
    gsap.from(q('.jar-seg'), {
      width: 0, duration: 1.4, ease: 'expo.out', stagger: 0.15,
      scrollTrigger: { trigger: q('.jar-card')[0], start: 'top 75%', once: true, onEnter: () => setOn(true) },
    })
  })
  const save = useCountUp(10000, on, 1400)
  const ess = useCountUp(8130, on, 1400)
  const free = useCountUp(6720, on, 1400)
  return (
    <section className="jar" id="how" ref={root}>
      {CHIPS.map(([t, k]) => <span key={t} className={`jar-chip c-${k}`} aria-hidden="true">{t}</span>)}
      <p className="lx-kicker">How it works</p>
      <Rise className="lx-h2">One balance. <span className="coral">Three jars.</span></Rise>
      <p className="lx-lede">Tell Ledger what you have. It sets aside what you must not touch, keeps what's already promised, and shows the rest as yours to spend.</p>
      <div className="jar-card lx-card">
        <div className="jar-top">
          <span className="lc-k">Total balance</span>
          <b className="jar-total">₹24,850</b>
        </div>
        <div className="jar-bar">
          <span className="jar-seg s1" style={{ width: '40.2%' }} />
          <span className="jar-seg s2" style={{ width: '32.7%' }} />
          <span className="jar-seg s3" style={{ width: '27.1%' }} />
        </div>
        <div className="jar-legend">
          <div><i className="s1" /><span>Strict savings</span><b>{rs(on ? save : 10000)}</b><em>Not for spending</em></div>
          <div><i className="s2" /><span>Essentials</span><b>{rs(on ? ess : 8130)}</b><em>Rent, metro, mess</em></div>
          <div><i className="s3" /><span>Guilt-free</span><b>{rs(on ? free : 6720)}</b><em>Spend it on anything</em></div>
        </div>
      </div>
    </section>
  )
}

/* ============================================================
   FEATURES — bento of small working views
   ============================================================ */

function SafeCard() {
  const ranges = [['Today', 156], ['Week', 1092], ['Month', 2960]] as const
  const [i, setI] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => setI((v) => (v + 1) % 3), 2600)
    return () => window.clearInterval(id)
  }, [])
  const n = useCountUp(ranges[i][1], true, 700)
  return (
    <article className="bento-card lx-card b-safe">
      <div className="b-head">
        <div>
          <h3>Know what's safe to spend</h3>
          <p>Your guilt-free money, split over the days left in the month.</p>
        </div>
        <div className="seg" role="presentation">
          {ranges.map(([l], k) => <span key={l} className={k === i ? 'on' : ''}>{l}</span>)}
        </div>
      </div>
      <b className="b-big">{rs(n)}</b>
      <Spark values={[2960, 2810, 2790, 2600, 2450, 2440, 2210, 2050, 1980, 1760, 1610]} w={520} h={70} />
    </article>
  )
}

function HideCard() {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => setShown((v) => !v), 2400)
    return () => window.clearInterval(id)
  }, [])
  return (
    <article className="bento-card lx-card b-hide">
      <h3>Private by default</h3>
      <p>The big total stays hidden until you choose to look.</p>
      <div className="hide-box">
        <span className={`hide-num ${shown ? 'show' : ''}`}>
          <span className="hn-real">₹24,850</span>
          <span className="hn-mask">₹ ● ● ● ● ●</span>
        </span>
        <button type="button" className="hide-btn" tabIndex={-1} aria-hidden="true">{shown ? 'Hide balance' : 'Show balance'}</button>
      </div>
    </article>
  )
}

function Features() {
  const root = useRef<HTMLElement>(null)
  useLive(root, 'bt-live', (q) => {
    ScrollTrigger.batch(q('.bento-card'), {
      start: 'top 88%', once: true,
      onEnter: (b) => gsap.from(b, { y: 70, autoAlpha: 0, rotateX: -8, transformOrigin: '50% 100%', duration: 1.2, ease: 'expo.out', stagger: 0.1 }),
    })
    gsap.from(q('.bb-fill'), { scaleX: 0, transformOrigin: '0 50%', duration: 1.4, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: q('.b-budget')[0], start: 'top 80%', once: true } })
    gsap.from(q('.ring-arc'), { strokeDashoffset: 264, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: q('.b-goal')[0], start: 'top 80%', once: true } })
  })
  return (
    <section className="bento" id="features" ref={root}>
      <p className="lx-kicker">Features</p>
      <Rise className="lx-h2">Small screens. <span className="coral">Clear answers.</span></Rise>
      <div className="bento-grid">
        <SafeCard />
        <HideCard />
        <article className="bento-card lx-card b-budget">
          <h3>Budgets that warn early</h3>
          <p>Each category fills up as you spend, and turns coral before it runs out.</p>
          {[['Food & drinks', 82, '₹1,230 of ₹1,500'], ['Transport', 46, '₹460 of ₹1,000'], ['Shopping', 104, '₹520 of ₹500']].map(([l, p, s]) => (
            <div className="bb" key={l as string}>
              <span className="bb-l">{l}<em>{s}</em></span>
              <span className="bb-track"><span className={`bb-fill ${(p as number) >= 100 ? 'over' : (p as number) >= 80 ? 'near' : ''}`} style={{ width: `${Math.min(100, p as number)}%` }} /></span>
            </div>
          ))}
        </article>
        <article className="bento-card lx-card b-goal">
          <h3>Goals you can see</h3>
          <p>Put money aside for something specific and watch it fill.</p>
          <div className="ring-wrap">
            <svg viewBox="0 0 100 100" width="132" height="132" aria-hidden="true">
              <circle cx="50" cy="50" r="42" className="ring-bg" />
              <circle cx="50" cy="50" r="42" className="ring-arc" strokeDasharray="264" strokeDashoffset={264 * 0.6} transform="rotate(-90 50 50)" />
            </svg>
            <div><b>40%</b><span>Laptop fund</span><em>₹18,000 of ₹45,000</em></div>
          </div>
        </article>
        <article className="bento-card lx-card b-rec">
          <h3>No surprise bills</h3>
          <p>Rent and subscriptions are counted before they land.</p>
          {[['Netflix split', 'Tomorrow', 199], ['Spotify duet', '14 Nov', 149], ['Hostel rent', '1 Dec', 6500]].map(([n, d, a]) => (
            <div className="lc-row" key={n as string}><span>{n}<em>{d}</em></span><b>{rs(a as number)}</b></div>
          ))}
        </article>
      </div>
    </section>
  )
}

/* ============================================================
   SEARCH — merchant marquee that speeds up with your scroll
   ============================================================ */

const QUERIES: { q: string; rows: [string, string, number][] }[] = [
  { q: 'chai', rows: [['Chai + samosa', 'Today', 40], ['Chai + samosa', 'Mon', 35], ['Chai + samosa', '3 Nov', 40]] },
  { q: 'metro', rows: [['Metro recharge', '9 Nov', 200], ['Metro recharge', '28 Oct', 200], ['Metro recharge', '14 Oct', 150]] },
  { q: 'netflix', rows: [['Netflix split', '12 Oct', 199], ['Netflix split', '12 Sep', 199], ['Netflix split', '12 Aug', 199]] },
]

function SearchBox() {
  const [qi, setQi] = useState(0)
  const [typed, setTyped] = useState(QUERIES[0].q)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let cancelled = false
    let n = 0
    const word = QUERIES[qi].q
    setTyped('')
    const type = window.setInterval(() => {
      n++
      if (!cancelled) setTyped(word.slice(0, n))
      if (n >= word.length) window.clearInterval(type)
    }, 110)
    const next = window.setTimeout(() => setQi((v) => (v + 1) % QUERIES.length), 3600)
    return () => { cancelled = true; window.clearInterval(type); window.clearTimeout(next) }
  }, [qi])
  const done = typed === QUERIES[qi].q
  return (
    <div className="sx-box lx-card">
      <div className="sx-input">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <span>{typed}<i className="caret" /></span>
      </div>
      <div className={`sx-rows ${done ? 'on' : ''}`}>
        {QUERIES[qi].rows.map(([n, d, a], i) => (
          <div className="lc-row" key={`${qi}-${i}`} style={{ transitionDelay: `${i * 70}ms` }}><span>{n}<em>{d}</em></span><b>{rs(a)}</b></div>
        ))}
      </div>
    </div>
  )
}

function Search() {
  const root = useRef<HTMLElement>(null)
  useLive(root, 'sx-live', (q) => {
    const tweens = q('.sx-track').map((row, i) =>
      i % 2 === 0
        ? gsap.fromTo(row, { xPercent: 0 }, { xPercent: -50, duration: 46 + i * 6, ease: 'none', repeat: -1 })
        : gsap.fromTo(row, { xPercent: -50 }, { xPercent: 0, duration: 52, ease: 'none', repeat: -1 }))
    const speed = { v: 1 }
    ScrollTrigger.create({
      trigger: root.current, start: 'top bottom', end: 'bottom top',
      onUpdate: (self) => {
        const v = Math.min(6, 1 + Math.abs(self.getVelocity()) / 260)
        if (v > speed.v) {
          speed.v = v
          gsap.to(speed, { v: 1, duration: 1.2, ease: 'power3.out', overwrite: true, onUpdate: () => tweens.forEach((t) => t.timeScale(speed.v)) })
        }
      },
    })
  })
  return (
    <section className="sx" ref={root}>
      <div className="sx-marquee" aria-hidden="true">
        {MERCHANTS.map((row, i) => (
          <div className="sx-line" key={i}>
            <div className="sx-track">
              {[...row, ...row].map((m, k) => <span key={k} className="sx-chip">{m}</span>)}
            </div>
          </div>
        ))}
      </div>
      <div className="sx-center">
        <Rise className="lx-h2">Search anything. <span className="coral">Find it fast.</span></Rise>
        <p className="lx-lede">Type a word and every matching expense shows up, with its date and amount.</p>
        <SearchBox />
      </div>
    </section>
  )
}

/* ============================================================
   CHARTS — the same flowing charts as the app
   ============================================================ */

function Charts() {
  return (
    <section className="ch">
      <p className="lx-kicker">Analytics</p>
      <Rise className="lx-h2">Watch the month <span className="coral">move.</span></Rise>
      <div className="ch-grid">
        <article className="lx-card ch-card ch-wide">
          <div className="ch-head">
            <div>
              <h3>This month so far</h3>
              <p>₹744 more than this point last month</p>
            </div>
            <b>₹1,610</b>
          </div>
          <TideChart current={TIDE_NOW} previous={TIDE_PREV} days={30} today={11} height={250} />
          <div className="flow-key">
            <span><i className="k-cur" />This month</span>
            <span><i className="k-prev" />Last month</span>
            <span><i className="k-proj" />At this pace</span>
          </div>
        </article>
        <article className="lx-card ch-card">
          <div className="ch-head">
            <div>
              <h3>How your spending flows</h3>
              <p>Every 3 days, last 30 days</p>
            </div>
          </div>
          <StreamChart series={STREAM} labels={STREAM_LABELS} height={230} />
          <div className="flow-key">
            {STREAM.map((s) => <span key={s.id}><i style={{ background: s.color }} />{s.label}</span>)}
          </div>
        </article>
      </div>
    </section>
  )
}

/* ============================================================
   STEPS — sticky phone, three beats
   ============================================================ */

function ScreenLog() {
  return (
    <div className="scr scr-log">
      <StatusBar />
      <p className="pd-hi">Add expense</p>
      <div className="pd-card log-amt"><span>₹</span><b>40</b></div>
      <div className="log-cats">
        {['Food', 'Transport', 'Study', 'Fun', 'Shopping', 'Living'].map((c, i) => <span key={c} className={i === 0 ? 'on' : ''}>{c}</span>)}
      </div>
      <div className="pd-card log-field"><em>Description</em>Chai + samosa</div>
      <div className="pd-card log-field"><em>Paid with</em>UPI</div>
      <span className="log-save">Save expense</span>
    </div>
  )
}
function ScreenPlan() {
  return (
    <div className="scr">
      <StatusBar />
      <p className="pd-hi">Budgets</p>
      {[['Food & drinks', 82, '₹1,230 of ₹1,500'], ['Transport', 46, '₹460 of ₹1,000'], ['Education', 30, '₹150 of ₹500'], ['Shopping', 100, '₹500 of ₹500']].map(([l, p, s]) => (
        <div className="pd-card" key={l as string}>
          <span className="pd-label">{l}</span>
          <b className="pd-mid">{s}</b>
          <span className="pd-bar"><span className={(p as number) >= 100 ? 'over' : ''} style={{ width: `${p}%` }} /></span>
        </div>
      ))}
    </div>
  )
}
function ScreenReflect() {
  return (
    <div className="scr">
      <StatusBar />
      <p className="pd-hi">Analytics</p>
      <div className="pd-card">
        <span className="pd-label">Daily spending</span>
        <b className="pd-mid">avg ₹109</b>
        <Spark values={[60, 140, 30, 90, 260, 40, 20, 120, 538, 90, 70, 180]} />
      </div>
      <div className="pd-card">
        <span className="pd-label">Monthly savings</span>
        <b className="pd-mid">+₹5,390</b>
        <Spark values={[4200, 4800, 4100, 5390]} />
      </div>
      <div className="pd-card">
        <span className="pd-label">Top category</span>
        <b className="pd-mid">Food & drinks · 38%</b>
      </div>
    </div>
  )
}

const STEPS = [
  { k: '01', t: 'Log', h: 'Add an expense in seconds', p: 'Amount, category, done. Notes and payment method are there when you want them.', S: ScreenLog },
  { k: '02', t: 'Plan', h: 'Give every category a limit', p: 'Budgets fill as you spend, so you see trouble a week before it arrives.', S: ScreenPlan },
  { k: '03', t: 'Reflect', h: 'See where it actually went', p: 'Daily spending, category flow and monthly savings, from 7 days to a year.', S: ScreenReflect },
]

function Steps() {
  const root = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)
  useLive(root, 'sp-live', (q, desk) => {
    if (!desk) return
    q('.sp-step').forEach((s, i) => {
      ScrollTrigger.create({ trigger: s, start: 'top 55%', end: 'bottom 55%', onToggle: (self) => self.isActive && setActive(i) })
    })
    gsap.fromTo(q('.sp-progress span')[0], { scaleY: 0 }, { scaleY: 1, ease: 'none', transformOrigin: '50% 0', scrollTrigger: { trigger: q('.sp-steps')[0], start: 'top 55%', end: 'bottom 55%', scrub: true } })
  })
  return (
    <section className="sp" ref={root}>
      <div className="sp-intro">
        <p className="lx-kicker">A new way to keep track</p>
        <Rise className="lx-h2">Log. Plan. <span className="coral">Reflect.</span></Rise>
      </div>
      <div className="sp-grid">
        <div className="sp-phone-col">
          <Phone className="sp-phone">
            {STEPS.map(({ S }, i) => (
              <div key={i} className={`sp-screen ${i === active ? 'on' : ''}`} aria-hidden={i !== active}><S /></div>
            ))}
          </Phone>
        </div>
        <div className="sp-steps">
          <div className="sp-progress" aria-hidden="true"><span /></div>
          {STEPS.map(({ k, t, h, p, S }, i) => (
            <div key={k} className={`sp-step ${i === active ? 'on' : ''}`}>
              <span className="sp-k">{k} · {t}</span>
              <h3>{h}</h3>
              <p>{p}</p>
              <Phone className="sp-inline"><S /></Phone>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================
   MORE — horizontal shelf
   ============================================================ */

const MORE = [
  ['Protected balance', 'Keep a minimum in your account that safe-to-spend never touches.'],
  ['Essentials first', 'Plan rent, metro and mess fees so they come out before guilt-free money.'],
  ['Export to CSV', 'Download every transaction from Settings whenever you want.'],
  ['Notes on anything', 'Leave a note on an expense so future you remembers why.'],
  ['Any phone, any laptop', 'It runs in the browser, so there is nothing to install.'],
  ['Leave whenever', 'Delete your account from Settings and your data goes with it.'],
]

function More() {
  const shelf = useRef<HTMLDivElement>(null)
  const root = useRef<HTMLElement>(null)
  const nudge = (dir: number) => shelf.current?.scrollBy({ left: dir * Math.min(420, shelf.current.clientWidth * 0.8), behavior: 'smooth' })
  useLive(root, 'mo-live', (q) => {
    gsap.from(q('.mo-card'), { x: 120, autoAlpha: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: q('.mo-shelf')[0], start: 'top 85%', once: true } })
  })
  return (
    <section className="mo" ref={root}>
      <div className="mo-head">
        <div>
          <Rise className="lx-h2">That's not all</Rise>
          <p className="lx-lede">The small things that make it feel finished.</p>
        </div>
        <div className="mo-arrows">
          <button type="button" aria-label="Previous" onClick={() => nudge(-1)}>←</button>
          <button type="button" aria-label="Next" onClick={() => nudge(1)}>→</button>
        </div>
      </div>
      <div className="mo-shelf" ref={shelf} data-lenis-prevent-wheel="">
        {MORE.map(([t, p], i) => (
          <article key={t} className="mo-card lx-card">
            <span className="mo-n">{String(i + 1).padStart(2, '0')}</span>
            <h3>{t}</h3>
            <p>{p}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

/* ============================================================
   CLOSING + FOOTER
   ============================================================ */

function Closing({ onDemo }: { onDemo: () => void }) {
  const root = useRef<HTMLElement>(null)
  useLive(root, 'cl-live', (q) => {
    gsap.from(q('.tile.on'), {
      scaleY: 0, transformOrigin: '50% 100%', ease: 'none', stagger: { each: 0.015, from: 'end', grid: [TILE_ROWS, TILE_COLS], axis: 'y' },
      scrollTrigger: { trigger: root.current, start: 'top 80%', end: 'bottom bottom', scrub: 1 },
    })
  })
  return (
    <section className="cl" ref={root}>
      <Rise className="lx-h1">Start with <span className="coral">what you have</span></Rise>
      <p className="lx-lede">Free for students. No card, no bank login.</p>
      <div className="h-ctas">
        <Link to="/signup" className="lx-btn lx-btn-coral">Get started</Link>
        <button type="button" className="lx-btn lx-btn-line" onClick={onDemo}>Try the demo</button>
      </div>
      <div className="h-tiles cl-tiles" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${TILE_COLS}, 1fr)` }}>
        {TILES.map((t, i) => <span key={i} className={`tile ${t ? `on t-${t}` : ''}`} />)}
      </div>
    </section>
  )
}

function Footer({ onDemo }: { onDemo: () => void }) {
  return (
    <footer className="ft">
      <div className="ft-brand">
        <LedgerLogo size={26} />
        <span>Ledger</span>
      </div>
      <nav className="ft-links" aria-label="Footer">
        <Link to="/signup">Get started</Link>
        <Link to="/login">Log in</Link>
        <button type="button" onClick={onDemo}>Try the demo</button>
        <Link to="/privacy">Privacy</Link>
      </nav>
      <span className="ft-c">© {new Date().getFullYear()} Ledger</span>
    </footer>
  )
}

export default function Landing() {
  const { demoSignIn } = useApp()
  const navigate = useNavigate()
  useSmoothScroll()
  const runDemo = () => {
    void demoSignIn().then((err) => {
      if (!err) navigate('/app')
    })
  }
  useEffect(() => {
    // Fonts change line breaks; re-measure pins once they are in.
    void document.fonts?.ready.then(() => ScrollTrigger.refresh())
  }, [])

  return (
    <div className="lx">
      <Nav onDemo={runDemo} />
      <main>
        <Hero onDemo={runDemo} />
        <Fan />
        <Statement />
        <Jars />
        <Features />
        <Search />
        <Charts />
        <Steps />
        <More />
        <Closing onDemo={runDemo} />
      </main>
      <Footer onDemo={runDemo} />
    </div>
  )
}
