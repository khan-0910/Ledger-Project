/**
 * All monetary values are stored as integer minor units (paise).
 * No floating-point arithmetic is used for stored amounts.
 */

export const RUPEE = '₹'

/** Parse a user-typed amount ("1,850.50", "1850", "₹90") into minor units. Returns null when invalid. */
export function parseAmountInput(raw: string): number | null {
  const cleaned = raw.replace(/[₹,\s]/g, '')
  if (cleaned === '' || !/^\d*(\.\d{0,2})?$/.test(cleaned)) return null
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n <= 0 || n > 99_99_99_99_999) return null
  return Math.round(n * 100)
}

export function toMinor(rupees: number): number {
  return Math.round(rupees * 100)
}

export function fromMinor(minor: number): number {
  return minor / 100
}

/** Format minor units as ₹ with Indian digit grouping (₹1,85,000). */
export function formatINR(
  minor: number,
  opts: { decimals?: boolean; signed?: boolean; compact?: boolean } = {},
): string {
  const { decimals = false, signed = false, compact = false } = opts
  const abs = Math.abs(minor)
  const value = abs / 100

  let body: string
  if (compact && abs >= 100_000_00) {
    // ₹1.2L style for very large values in tight spots
    const lakh = value / 100_000
    body = `${lakh >= 10 ? Math.round(lakh) : Math.round(lakh * 10) / 10}L`
  } else {
    body = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0,
    }).format(value)
  }

  const sign = minor < 0 ? '−' : signed && minor > 0 ? '+' : ''
  return `${sign}${RUPEE}${body}`
}

/** "₹•••••" mask with a length hinting at magnitude (never exact). */
export function maskFor(minor: number): string {
  const digits = minor <= 0 ? 3 : Math.min(7, String(Math.floor(minor / 100)).length + 1)
  return `${RUPEE}${'•'.repeat(digits)}`
}

export const sum = (arr: number[]): number => arr.reduce((a, b) => a + b, 0)

export const clampPercent = (n: number): number => Math.max(0, Math.min(100, n))
