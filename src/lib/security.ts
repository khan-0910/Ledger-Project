/**
 * Login hardening shared by demo and Supabase modes.
 * - Passwords: PBKDF2-SHA256 with a per-user salt (never stored in plain text).
 * - Brute force: per-email attempt counter with growing lockout.
 * - Enumeration: one generic message for bad email OR bad password.
 * - Policy: length + common-password + "not your email" checks.
 */

const ITERATIONS = 210_000
const enc = new TextEncoder()

const toB64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b)))
const fromB64 = (s: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
  return toB64(bits)
}

/** Stored format: pbkdf2$<iterations>$<salt b64>$<hash b64> */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return `pbkdf2$${ITERATIONS}$${toB64(salt)}$${await derive(password, salt, ITERATIONS)}`
}

/** Constant-time compare so timing does not leak how much matched. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iter, salt, hash] = stored.split('$')
  if (scheme !== 'pbkdf2' || !salt || !hash) return false
  return safeEqual(await derive(password, fromB64(salt), Number(iter)), hash)
}

export const isHashed = (s: string) => s.startsWith('pbkdf2$')

/* ---------- Brute-force lockout ---------- */

const LS_ATTEMPTS = 'ledger.auth.attempts'
const FREE_TRIES = 5
const BASE_LOCK_MS = 30_000
const MAX_LOCK_MS = 15 * 60_000

type Attempt = { fails: number; until: number }

function readAttempts(): Record<string, Attempt> {
  try {
    return JSON.parse(localStorage.getItem(LS_ATTEMPTS) ?? '{}')
  } catch {
    return {}
  }
}

function writeAttempts(a: Record<string, Attempt>) {
  try {
    localStorage.setItem(LS_ATTEMPTS, JSON.stringify(a))
  } catch {
    /* storage blocked: lockout is best effort */
  }
}

const keyOf = (email: string) => email.trim().toLowerCase()

/** Returns a message if this email is locked out right now. */
export function lockoutMessage(email: string): string | null {
  const a = readAttempts()[keyOf(email)]
  if (!a || a.until <= Date.now()) return null
  const secs = Math.ceil((a.until - Date.now()) / 1000)
  return `Too many tries. Wait ${secs >= 60 ? `${Math.ceil(secs / 60)} min` : `${secs}s`} and try again.`
}

export function recordFailure(email: string): void {
  const all = readAttempts()
  const a = all[keyOf(email)] ?? { fails: 0, until: 0 }
  a.fails += 1
  if (a.fails >= FREE_TRIES) {
    // 30s, 60s, 120s ... capped at 15 min
    a.until = Date.now() + Math.min(BASE_LOCK_MS * 2 ** (a.fails - FREE_TRIES), MAX_LOCK_MS)
  }
  all[keyOf(email)] = a
  writeAttempts(all)
}

export function clearFailures(email: string): void {
  const all = readAttempts()
  delete all[keyOf(email)]
  writeAttempts(all)
}

/** Same text for unknown email and wrong password. */
export const BAD_LOGIN = 'Wrong email or password.'

/* ---------- Password policy ---------- */

const COMMON = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', '1234567890', 'qwerty123',
  'qwertyuiop', 'iloveyou', 'abc12345', 'letmein1', 'welcome1', 'admin123', '11111111',
  '00000000', 'passw0rd', 'football', 'baseball', 'sunshine', 'princess', 'ledger123',
])

export const MIN_PASSWORD = 8

/** Returns a problem message, or null if the password is OK. */
export function passwordProblem(pw: string, email = ''): string | null {
  if (pw.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters.`
  if (pw.length > 128) return 'Password is too long (128 max).'
  if (COMMON.has(pw.toLowerCase())) return 'That password is too common. Pick another.'
  if (/^(.)\1+$/.test(pw)) return 'Password cannot be one repeated character.'
  const local = email.split('@')[0]?.toLowerCase()
  if (local && local.length >= 3 && pw.toLowerCase().includes(local)) return 'Password should not contain your email.'
  return null
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
