/**
 * Flowing charts for the Harbour theme.
 *
 * Every line is a monotone cubic (smooth, never overshoots the data), drawn at the
 * container's real pixel width so strokes and labels stay crisp. When a chart scrolls
 * into view GSAP lets it flow in from the left like a tide; the current point is a coral
 * "buoy" (the theme's signature detail).
 */
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { formatINR } from '../../lib/money'

gsap.registerPlugin(ScrollTrigger)

type Pt = [number, number]

/** Monotone cubic interpolation (Fritsch–Carlson) as an SVG path, starting with M. */
export function smoothPath(pts: Pt[]): string {
  const n = pts.length
  if (n === 0) return ''
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`
  const dx: number[] = []
  const slope: number[] = []
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0])
    slope.push((pts[i + 1][1] - pts[i][1]) / (dx[i] || 1))
  }
  const m: number[] = [slope[0]]
  for (let i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) m.push(0)
    else {
      const w1 = 2 * dx[i] + dx[i - 1]
      const w2 = dx[i] + 2 * dx[i - 1]
      m.push((w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]))
    }
  }
  m.push(slope[n - 2])
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3
    d += ` C${pts[i][0] + h},${pts[i][1] + m[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - m[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`
  }
  return d
}

/** Same curve continued (no leading M) — for closing areas. */
const continuePath = (pts: Pt[]) => smoothPath(pts).replace(/^M[^C]*/, (s) => `L${s.slice(1)}`)

/** ₹1.2k / ₹12k / ₹1.4L for axis ticks. */
export function compactINR(minor: number): string {
  const v = Math.abs(minor) / 100
  const sign = minor < 0 ? '−' : ''
  if (v >= 100_000) return `${sign}₹${(v / 100_000).toFixed(v >= 1_000_000 ? 0 : 1).replace(/\.0$/, '')}L`
  if (v >= 1000) return `${sign}₹${(v / 1000).toFixed(v >= 10_000 ? 0 : 1).replace(/\.0$/, '')}k`
  return `${sign}₹${Math.round(v)}`
}

/** Container width, tracked. */
function useWidth(ref: RefObject<HTMLElement | null>, fallback = 560): number {
  const [w, setW] = useState(fallback)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.clientWidth || fallback)
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width) || fallback))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, fallback])
  return w
}

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Tide-in: the clip rect grows left to right, buoys pop, streams rise from their midline.
 * Re-runs whenever `key` changes (new range / data).
 */
function useTideIn(root: RefObject<HTMLElement | null>, key: string) {
  useLayoutEffect(() => {
    const el = root.current
    if (!el || reduced()) return
    const ctx = gsap.context(() => {
      const clip = el.querySelectorAll('[data-tide]')
      const pops = el.querySelectorAll('[data-pop]')
      const rise = el.querySelectorAll('[data-rise]')
      const tl = gsap.timeline({ paused: true })
      if (clip.length) tl.fromTo(clip, { clipPath: 'inset(-20px 100% -20px -20px)' }, { clipPath: 'inset(-20px -20px -20px -20px)', duration: 1.8, ease: 'power3.inOut', clearProps: 'clipPath' }, 0)
      if (rise.length) tl.from(rise, { scaleY: 0, transformOrigin: '50% 50%', duration: 1.4, ease: 'expo.out', stagger: 0.05 }, 0.1)
      if (pops.length) tl.from(pops, { scale: 0, transformOrigin: '50% 50%', duration: 0.7, ease: 'back.out(2.4)', stagger: 0.06 }, 1.2)
      ScrollTrigger.create({
        trigger: el,
        scroller: (el.closest('.main') as HTMLElement | null) ?? undefined,
        start: 'top 88%',
        once: true,
        onEnter: () => tl.play(),
      })
    }, el)
    return () => ctx.revert()
  }, [root, key])
}

/** Coral buoy: the "now" point on every chart. */
function Buoy({ x, y }: { x: number; y: number }) {
  return (
    <g data-pop="" className="buoy">
      <circle cx={x} cy={y} r="10" className="buoy-halo" />
      <circle cx={x} cy={y} r="5" className="buoy-dot" />
    </g>
  )
}

function Tip({ x, w, children }: { x: number; w: number; children: ReactNode }) {
  const left = Math.max(70, Math.min(w - 70, x))
  return (
    <div className="flow-tip" role="status" style={{ left }}>
      {children}
    </div>
  )
}

/** Picks the nearest index for a pointer x. */
function useHover(n: number, x0: number, step: number) {
  const [i, setI] = useState<number | null>(null)
  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
    const idx = Math.round((e.clientX - r.left - x0) / (step || 1))
    setI(Math.max(0, Math.min(n - 1, idx)))
  }
  return { i, onMove, onLeave: () => setI(null) }
}

/* ============================================================
   Tide chart — this month's running spend vs last month
   ============================================================ */

export function TideChart({ current, previous, days, today, height = 240 }: {
  /** Running total for each day of this month, up to and including today. */
  current: number[]
  /** Running total for each day of last month. */
  previous: number[]
  /** Days in this month. */
  days: number
  /** 1-based day of month. */
  today: number
  height?: number
}) {
  const box = useRef<HTMLDivElement>(null)
  const W = useWidth(box)
  const H = height
  const L = 44
  const R = 14
  const T = 14
  const B = 26
  const spent = current[current.length - 1] ?? 0
  const projected = today > 0 ? Math.round((spent / today) * days) : 0
  const prevAt = (d: number) => previous[Math.min(d, previous.length) - 1] ?? 0
  const max = Math.max(1, projected, ...previous, ...current) * 1.08
  const x = (day: number) => L + ((day - 1) / Math.max(1, days - 1)) * (W - L - R)
  const y = (v: number) => T + (1 - v / max) * (H - T - B)
  const step = (W - L - R) / Math.max(1, days - 1)
  const hover = useHover(days, L, step)
  useTideIn(box, `${W > 0}-${days}-${spent}`)

  const cur: Pt[] = current.map((v, i) => [x(i + 1), y(v)])
  const prev: Pt[] = previous.slice(0, days).map((v, i) => [x(i + 1), y(v)])
  const curLine = smoothPath(cur)
  const curArea = cur.length > 1 ? `${curLine} L${x(cur.length)},${y(0)} L${x(1)},${y(0)} Z` : ''
  const ticks = [0, 0.5, 1].map((f) => Math.round((max / 1.08) * f))
  const days4 = [1, 8, 15, 22, Math.min(29, days)].filter((d, i, a) => a.indexOf(d) === i)
  const hi = hover.i

  return (
    <div className="flow tide" ref={box}>
      <svg width={W} height={H} role="img" aria-label={`Spent ${formatINR(spent)} so far this month, ${formatINR(prevAt(today))} by this day last month`}>
        <defs>
          <linearGradient id="tide-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-ink)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--chart-ink)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line className="flow-grid" x1={L} x2={W - R} y1={y(t)} y2={y(t)} />
            <text className="flow-axis" x={L - 8} y={y(t) + 4} textAnchor="end">{compactINR(t)}</text>
          </g>
        ))}
        {days4.map((d) => (
          <text key={d} className="flow-axis" x={x(d)} y={H - 6} textAnchor="middle">{d}</text>
        ))}
        <g data-tide="">
          {prev.length > 1 && <path d={smoothPath(prev)} className="tide-prev" />}
          {cur.length > 1 && today < days && (
            <path d={`M${x(today)},${y(spent)} L${x(days)},${y(projected)}`} className="tide-proj" />
          )}
          {curArea && <path d={curArea} fill="url(#tide-fill)" />}
          {cur.length > 1 && <path d={curLine} className="tide-line" />}
        </g>
        <line className="tide-today" x1={x(today)} x2={x(today)} y1={T} y2={H - B} />
        {cur.length > 0 && <Buoy x={x(today)} y={y(spent)} />}
        {hi !== null && (
          <g className="flow-cross">
            <line x1={x(hi + 1)} x2={x(hi + 1)} y1={T} y2={H - B} />
            {hi < current.length && <circle cx={x(hi + 1)} cy={y(current[hi])} r="4" />}
            {hi < previous.length && <circle cx={x(hi + 1)} cy={y(previous[hi])} r="3" className="ghost" />}
          </g>
        )}
        <rect x={L} y={0} width={Math.max(0, W - L - R)} height={H} fill="transparent" onPointerMove={hover.onMove} onPointerLeave={hover.onLeave} />
      </svg>
      {hi !== null && (
        <Tip x={x(hi + 1)} w={W}>
          <span className="flow-tip-k">Day {hi + 1}</span>
          {hi < current.length && <span><i className="k-cur" />This month <b>{formatINR(current[hi])}</b></span>}
          {hi < previous.length && <span><i className="k-prev" />Last month <b>{formatINR(previous[hi])}</b></span>}
        </Tip>
      )}
    </div>
  )
}

/* ============================================================
   Flow area — one series, smooth, with a buoy on the peak
   ============================================================ */

export function FlowArea({ points, height = 220, label }: {
  points: { label: string; value: number; tip: string }[]
  height?: number
  label: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const W = useWidth(box)
  const H = height
  const L = 44
  const R = 14
  const T = 16
  const B = 26
  const n = points.length
  const top = Math.max(1, ...points.map((p) => p.value))
  const max = top * 1.12
  const x = (i: number) => L + (n <= 1 ? (W - L - R) / 2 : (i / (n - 1)) * (W - L - R))
  const y = (v: number) => T + (1 - v / max) * (H - T - B)
  const pts: Pt[] = points.map((p, i) => [x(i), y(p.value)])
  const line = smoothPath(pts)
  const area = n > 1 ? `${line} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z` : ''
  const peak = points.findIndex((p) => p.value === top)
  const hover = useHover(n, L, n > 1 ? (W - L - R) / (n - 1) : 1)
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(W / 76))))
  const avg = n ? points.reduce((a, p) => a + p.value, 0) / n : 0
  useTideIn(box, `${n}-${top}-${W > 0}`)
  const hi = hover.i

  return (
    <div className="flow" ref={box}>
      <svg width={W} height={H} role="img" aria-label={label}>
        <defs>
          <linearGradient id="fa-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-ink)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--chart-ink)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line className="flow-grid" x1={L} x2={W - R} y1={y(top * f)} y2={y(top * f)} />
            <text className="flow-axis" x={L - 8} y={y(top * f) + 4} textAnchor="end">{compactINR(top * f)}</text>
          </g>
        ))}
        {avg > 0 && (
          <g>
            <line className="flow-avg" x1={L} x2={W - R} y1={y(avg)} y2={y(avg)} />
            <text className="flow-axis flow-avg-label" x={W - R} y={y(avg) - 6} textAnchor="end">avg {compactINR(avg)}</text>
          </g>
        )}
        {points.map((p, i) => ((i % every === 0 && (n - 1 - i >= every / 2 || i === n - 1)) || (i === n - 1 && every === 1) ? (
          <text key={i} className="flow-axis" x={x(i)} y={H - 6} textAnchor="middle">{p.label}</text>
        ) : null))}
        <g data-tide="">
          {area && <path d={area} fill="url(#fa-fill)" />}
          {n > 1 && <path d={line} className="tide-line" />}
        </g>
        {peak >= 0 && top > 1 && <Buoy x={x(peak)} y={y(top)} />}
        {hi !== null && (
          <g className="flow-cross">
            <line x1={x(hi)} x2={x(hi)} y1={T} y2={H - B} />
            <circle cx={x(hi)} cy={y(points[hi].value)} r="4" />
          </g>
        )}
        <rect x={L} y={0} width={Math.max(0, W - L - R)} height={H} fill="transparent" onPointerMove={hover.onMove} onPointerLeave={hover.onLeave} />
      </svg>
      {hi !== null && (
        <Tip x={x(hi)} w={W}>
          <span className="flow-tip-k">{points[hi].tip}</span>
          <b>{formatINR(points[hi].value)}</b>
        </Tip>
      )}
    </div>
  )
}

/* ============================================================
   Stream — categories flowing over time (centred stack)
   ============================================================ */

export interface StreamSeries { id: string; label: string; color: string; values: number[] }

export function StreamChart({ series, labels, height = 240 }: { series: StreamSeries[]; labels: string[]; height?: number }) {
  const box = useRef<HTMLDivElement>(null)
  const W = useWidth(box)
  const H = height
  const L = 14
  const R = 14
  const T = 12
  const B = 26
  const n = labels.length
  const totals = labels.map((_, i) => series.reduce((a, s) => a + (s.values[i] ?? 0), 0))
  const max = Math.max(1, ...totals)
  const x = (i: number) => L + (n <= 1 ? 0 : (i / (n - 1)) * (W - L - R))
  const mid = T + (H - T - B) / 2
  const k = (H - T - B) / max
  const hover = useHover(n, L, n > 1 ? (W - L - R) / (n - 1) : 1)
  useTideIn(box, `${n}-${max}-${series.length}-${W > 0}`)

  const layers = useMemo(() => {
    const base = totals.map((t) => mid - (t * k) / 2)
    return series.map((s) => {
      const lo: Pt[] = []
      const hi: Pt[] = []
      s.values.forEach((v, i) => {
        hi.push([x(i), base[i]])
        lo.push([x(i), base[i] + v * k])
        base[i] += v * k
      })
      const d = `${smoothPath(hi)} ${continuePath([...lo].reverse())} Z`
      return { ...s, d }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, W, H, max])

  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(W / 76))))
  const hi = hover.i

  return (
    <div className="flow stream" ref={box}>
      <svg width={W} height={H} role="img" aria-label="Spending by category over time">
                <line className="flow-grid" x1={L} x2={W - R} y1={mid} y2={mid} />
        {labels.map((l, i) => ((i % every === 0 && (n - 1 - i >= every / 2 || i === n - 1)) || (i === n - 1 && every === 1) ? (
          <text key={i} className="flow-axis" x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>{l}</text>
        ) : null))}
        <g data-tide="">
          {layers.map((s) => (
            <path key={s.id} d={s.d} fill={s.color} className={`stream-layer ${hi !== null ? 'dim' : ''}`} data-rise="" />
          ))}
        </g>
        {hi !== null && <line className="flow-cross-line" x1={x(hi)} x2={x(hi)} y1={T} y2={H - B} />}
        <rect x={0} y={0} width={W} height={H} fill="transparent" onPointerMove={hover.onMove} onPointerLeave={hover.onLeave} />
      </svg>
      {hi !== null && (
        <Tip x={x(hi)} w={W}>
          <span className="flow-tip-k">{labels[hi]} · {formatINR(totals[hi])}</span>
          {series
            .map((s) => ({ s, v: s.values[hi] ?? 0 }))
            .filter((r) => r.v > 0)
            .sort((a, b) => b.v - a.v)
            .slice(0, 4)
            .map(({ s, v }) => (
              <span key={s.id}><i style={{ background: s.color }} />{s.label} <b>{formatINR(v)}</b></span>
            ))}
        </Tip>
      )}
    </div>
  )
}

/* ============================================================
   Smooth line — signed values around a zero line
   ============================================================ */

export function SmoothLine({ points, height = 200, label }: { points: { label: string; value: number }[]; height?: number; label: string }) {
  const box = useRef<HTMLDivElement>(null)
  const W = useWidth(box)
  const H = height
  const L = 44
  const R = 18
  const T = 16
  const B = 26
  const n = points.length
  const vals = points.map((p) => p.value)
  const hiV = Math.max(1, ...vals)
  const loV = Math.min(0, ...vals)
  const pad = (hiV - loV) * 0.12
  const max = hiV + pad
  const min = loV < 0 ? loV - pad : 0
  const x = (i: number) => L + (n <= 1 ? (W - L - R) / 2 : (i / (n - 1)) * (W - L - R))
  const y = (v: number) => T + (1 - (v - min) / (max - min || 1)) * (H - T - B)
  const pts: Pt[] = points.map((p, i) => [x(i), y(p.value)])
  const line = smoothPath(pts)
  const zero = y(0)
  const area = n > 1 ? `${line} L${x(n - 1)},${zero} L${x(0)},${zero} Z` : ''
  const hover = useHover(n, L, n > 1 ? (W - L - R) / (n - 1) : 1)
  useTideIn(box, `${n}-${hiV}-${loV}-${W > 0}`)
  const hi = hover.i

  return (
    <div className="flow" ref={box}>
      <svg width={W} height={H} role="img" aria-label={label}>
                <line className="flow-zero" x1={L} x2={W - R} y1={zero} y2={zero} />
        <text className="flow-axis" x={L - 8} y={zero + 4} textAnchor="end">₹0</text>
        <text className="flow-axis" x={L - 8} y={y(hiV) + 4} textAnchor="end">{compactINR(hiV)}</text>
        {loV < 0 && <text className="flow-axis" x={L - 8} y={y(loV) + 4} textAnchor="end">{compactINR(loV)}</text>}
        {points.map((p, i) => (
          <text key={i} className="flow-axis" x={x(i)} y={H - 6} textAnchor="middle">{p.label}</text>
        ))}
        <g data-tide="">
          {area && <path d={area} className="sl-area" />}
          {n > 1 && <path d={line} className="tide-line" />}
          {points.map((p, i) => (i < n - 1 ? (
            <circle key={i} cx={x(i)} cy={y(p.value)} r="3.5" className={`sl-dot ${p.value < 0 ? 'neg' : ''}`} />
          ) : null))}
        </g>
        {n > 0 && <Buoy x={x(n - 1)} y={y(points[n - 1].value)} />}
        {hi !== null && (
          <g className="flow-cross">
            <line x1={x(hi)} x2={x(hi)} y1={T} y2={H - B} />
          </g>
        )}
        <rect x={L} y={0} width={Math.max(0, W - L - R)} height={H} fill="transparent" onPointerMove={hover.onMove} onPointerLeave={hover.onLeave} />
      </svg>
      {hi !== null && (
        <Tip x={x(hi)} w={W}>
          <span className="flow-tip-k">{points[hi].label}</span>
          <b>{formatINR(points[hi].value, { signed: true })}</b>
        </Tip>
      )}
    </div>
  )
}

/* ============================================================
   Ranked list with thin bars (the quiet companion to a chart)
   ============================================================ */

export function RankBars({ rows, total }: { rows: { id: string; label: string; color: string; value: number }[]; total: number }) {
  const box = useRef<HTMLDivElement>(null)
  const top = Math.max(1, ...rows.map((r) => r.value))
  useLayoutEffect(() => {
    const el = box.current
    if (!el || reduced()) return
    const ctx = gsap.context(() => {
      gsap.from(el.querySelectorAll('.rank-fill'), {
        scaleX: 0, transformOrigin: '0 50%', duration: 1.2, ease: 'expo.out', stagger: 0.08,
        scrollTrigger: { trigger: el, scroller: (el.closest('.main') as HTMLElement | null) ?? undefined, start: 'top 90%', once: true },
      })
    }, el)
    return () => ctx.revert()
  }, [rows.length, top])
  return (
    <div className="rank" ref={box}>
      {rows.map((r) => (
        <div key={r.id} className="rank-row">
          <span className="rank-dot" style={{ background: r.color }} />
          <span className="rank-label">{r.label}</span>
          <span className="rank-pct">{total > 0 ? Math.round((r.value / total) * 100) : 0}%</span>
          <span className="rank-amt">{formatINR(r.value)}</span>
          <span className="rank-track"><span className="rank-fill" style={{ width: `${(r.value / top) * 100}%` }} /></span>
        </div>
      ))}
    </div>
  )
}

/* ============================================================
   Spending calendar — one month, one square per day
   ============================================================ */

export function SpendCalendar({ days, today }: {
  /** Every day of the month, in order. */
  days: { date: string; value: number }[]
  /** ISO date of today, or '' when the month is over. */
  today: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const [hi, setHi] = useState<number | null>(null)
  const first = new Date(`${days[0]?.date}T00:00:00`)
  const lead = (first.getDay() + 6) % 7 // Monday first
  const past = days.filter((d) => !today || d.date <= today)
  const max = Math.max(1, ...past.map((d) => d.value))
  const level = (v: number) => (v <= 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4)))
  const busiest = past.reduce((a, d) => (d.value > a.value ? d : a), { date: '', value: 0 })
  const zeroDays = past.filter((d) => d.value === 0).length
  const label = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

  useLayoutEffect(() => {
    const el = box.current
    if (!el || reduced()) return
    const ctx = gsap.context(() => {
      gsap.from(el.querySelectorAll('.cal-day'), {
        scale: 0.4, autoAlpha: 0, duration: 0.7, ease: 'back.out(2)',
        stagger: { each: 0.018, grid: 'auto', from: 'start' },
        scrollTrigger: { trigger: el, scroller: (el.closest('.main') as HTMLElement | null) ?? undefined, start: 'top 88%', once: true },
      })
    }, el)
    return () => ctx.revert()
  }, [days.length])

  return (
    <div className="cal" ref={box}>
      <div className="cal-grid" role="grid" aria-label="Spending per day this month">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} className="cal-dow" aria-hidden="true">{d}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={`l${i}`} />)}
        {days.map((d, i) => {
          const future = !!today && d.date > today
          return (
            <span
              key={d.date}
              role="gridcell"
              aria-label={future ? `${label(d.date)}, upcoming` : `${label(d.date)}, ${formatINR(d.value)}`}
              className={`cal-day lv-${future ? 'f' : level(d.value)} ${d.date === today ? 'today' : ''}`}
              onPointerEnter={() => !future && setHi(i)}
              onPointerLeave={() => setHi(null)}
            >
              {Number(d.date.slice(8))}
            </span>
          )
        })}
      </div>
      <div className="cal-foot">
        {hi !== null ? (
          <span><b>{label(days[hi].date)}</b> · {days[hi].value ? formatINR(days[hi].value) : 'nothing spent'}</span>
        ) : (
          <span>{busiest.value > 0 ? <>Busiest <b>{label(busiest.date)}</b> · {formatINR(busiest.value)}</> : 'No spending yet'}</span>
        )}
        <span className="cal-zero"><b>{zeroDays}</b> no-spend {zeroDays === 1 ? 'day' : 'days'}</span>
      </div>
      <div className="cal-scale" aria-hidden="true">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((l) => <i key={l} className={`lv-${l}`} />)}
        <span>More</span>
      </div>
    </div>
  )
}
