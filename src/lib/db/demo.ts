import type { LedgerData, Profile } from '../types'
import type { DbEvent } from '../types'
import { demoData } from '../demoData'
import { BAD_LOGIN, hashPassword, isHashed, verifyPassword } from '../security'

const LS_USERS = 'ledger.demo.users'
const LS_SESSION = 'ledger.demo.session'
const LS_PREFIX = 'ledger.demo.data.'

export interface DemoUser {
  id: string
  email: string
  name: string
  password: string // pbkdf2 hash (old accounts may hold plain text until next login)
  onboarded: boolean
}

function readUsers(): DemoUser[] {
  try {
    return JSON.parse(localStorage.getItem(LS_USERS) ?? '[]')
  } catch {
    return []
  }
}

function writeUsers(u: DemoUser[]): void {
  localStorage.setItem(LS_USERS, JSON.stringify(u))
}

export function delay(ms = 350): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Blank starting state for brand-new accounts — onboarding has NOT been done,
 * so the flow routes them through setup instead of showing demo numbers.
 * (The one-tap demo account seeds sample data separately via reseedDemo.)
 */
export function freshData(name: string, email: string): LedgerData {
  return {
    profile: {
      id: 'demo',
      name,
      email,
      onboarded: false,
      currency: 'INR',
      totalBalanceMinor: 0,
      strictSavingsMinor: 0,
      guiltFreeMinor: 0,
      guiltFreeCycleStart: '',
    },
    settings: { balanceVisibility: 'always-hide', hideOnLoad: true },
    txns: [],
    budgets: [],
    goals: [],
    recurring: [],
  }
}

/** Sample-data seed for the one-tap demo account. */
export function demoSeedData(name: string, email: string): LedgerData {
  const base = demoData()
  base.profile.id = 'demo'
  base.profile.name = name
  base.profile.email = email
  base.profile.onboarded = true
  return base
}

export const demoAuth = {
  listUsers(): DemoUser[] {
    return readUsers()
  },
  currentUser(): DemoUser | null {
    const id = localStorage.getItem(LS_SESSION)
    if (!id) return null
    return readUsers().find((u) => u.id === id) ?? null
  },
  async signIn(email: string, password: string): Promise<DemoUser> {
    const u = readUsers().find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
    // Hash even for unknown emails so both paths take the same time.
    const ok = u
      ? isHashed(u.password) ? await verifyPassword(password, u.password) : u.password === password
      : (await hashPassword(password), false)
    if (!u || !ok) throw new Error(BAD_LOGIN)
    // Upgrade any old plain-text password to a hash on first good login.
    if (!isHashed(u.password)) await demoAuth.setPassword(u.id, password)
    localStorage.setItem(LS_SESSION, u.id)
    return u
  },
  async signUp(email: string, password: string, name: string): Promise<DemoUser> {
    if (readUsers().some((x) => x.email.toLowerCase() === email.trim().toLowerCase())) {
      throw new Error('Could not create that account. Try logging in instead.')
    }
    const u: DemoUser = { id: crypto.randomUUID(), email: email.trim(), name, password: await hashPassword(password), onboarded: false }
    writeUsers([...readUsers(), u])
    localStorage.setItem(LS_SESSION, u.id)
    return u
  },
  async setPassword(id: string, password: string): Promise<void> {
    const hash = await hashPassword(password)
    writeUsers(readUsers().map((u) => (u.id === id ? { ...u, password: hash } : u)))
  },
  setOnboarded(id: string): void {
    writeUsers(readUsers().map((u) => (u.id === id ? { ...u, onboarded: true } : u)))
  },
  /** Persist a session for an existing user without going through signIn — used by the one-tap demo. */
  setSession(id: string): void {
    localStorage.setItem(LS_SESSION, id)
  },
  signOut(): void {
    localStorage.removeItem(LS_SESSION)
  },
}

export const demoDb = {
  load(userId: string): LedgerData | null {
    try {
      const raw = localStorage.getItem(LS_PREFIX + userId)
      return raw ? (JSON.parse(raw) as LedgerData) : null
    } catch {
      return null
    }
  },

  save(userId: string, data: LedgerData): void {
    localStorage.setItem(LS_PREFIX + userId, JSON.stringify(data))
  },

  ensureOnboardingData(userId: string, profile: Profile): void {
    const data = this.load(userId)
    if (data) {
      data.profile = { ...data.profile, ...profile }
      this.save(userId, data)
    }
  },

  apply(userId: string, data: LedgerData, event: DbEvent): LedgerData {
    const next: LedgerData = applyEvent(data, event)
    this.save(userId, next)
    return next
  },
}

export function applyEvent(data: LedgerData, event: DbEvent): LedgerData {
  switch (event.kind) {
    case 'patchProfile':
      return { ...data, profile: { ...data.profile, ...event.profile } }
    case 'patchSettings':
      return { ...data, settings: { ...data.settings, ...event.settings } }
    case 'setTxns':
      return { ...data, txns: event.txns }
    case 'upsertTxn': {
      const exists = data.txns.some((t) => t.id === event.txn.id)
      const txns = exists
        ? data.txns.map((t) => (t.id === event.txn.id ? event.txn : t))
        : [event.txn, ...data.txns].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.createdAt < b.createdAt ? 1 : -1))
      return { ...data, txns }
    }
    case 'removeTxn':
      return { ...data, txns: data.txns.filter((t) => t.id !== event.id) }
    case 'setBudgets':
      return { ...data, budgets: event.budgets }
    case 'setGoals':
      return { ...data, goals: event.goals }
    case 'setRecurring':
      return { ...data, recurring: event.recurring }
    case 'setEssentials':
      return { ...data, essentials: event.essentials }
    default:
      return data
  }
}
