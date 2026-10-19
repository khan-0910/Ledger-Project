/** Date helpers — all dates are local-time yyyy-mm-dd strings (ISODate). */

export function todayISO(): string {
  return toISO(new Date())
}

export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, n: number): string {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** Days between two ISO dates (b - a). */
export function daysBetween(a: string, b: string): number {
  const da = fromISO(a).getTime()
  const db = fromISO(b).getTime()
  return Math.round((db - da) / 86_400_000)
}

export function monthKeyOf(iso: string): string {
  return iso.slice(0, 7)
}

export function currentMonthKey(): string {
  return todayISO().slice(0, 7)
}

/** First day of the month for a MonthKey ("2026-09" → "2026-09-01"). */
export function monthStart(monthKey: string): string {
  return `${monthKey}-01`
}

export function daysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

/** "September 2026" */
export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

/** "12 Aug" / "12 Aug 2025" */
export function dayLabel(iso: string): string {
  const d = fromISO(iso)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
  })
}

/** "Monday, 12 Aug" */
export function fullDayLabel(iso: string): string {
  return fromISO(iso).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })
}

/** Relative group label for a txn date: Today / Yesterday / This week / Earlier. */
export function relativeDayGroup(iso: string, now: Date = new Date()): 'Today' | 'Yesterday' | 'This week' | 'Earlier' {
  const d = fromISO(iso)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86_400_000)
  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7 && d.getDay() !== 1) return 'This week'
  return 'Earlier'
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours()
  if (h < 5) return 'Up late?'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
