import type { LedgerData, Profile } from '../types'
import type { DbEvent } from '../types'
import { demoData } from '../demoData'

const LS_USERS = 'ledger.demo.users'
const LS_SESSION = 'ledger.demo.session'
const LS_PREFIX = 'ledger.demo.data.'

export interface DemoUser {
  id: string
  email: string
  name: string
  password: string
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
  signIn(email: string, password: string): DemoUser {
    const u = readUsers().find((x) => x.email.toLowerCase() === email.toLowerCase())
    if (!u) throw new Error('No account found with this email. Try creating one.')
    if (u.password !== password) throw new Error('Wrong password. Mind the caps lock.')
    localStorage.setItem(LS_SESSION, u.id)
    return u
  },
  signUp(email: string, password: string, name: string): DemoUser {
    if (readUsers().some((x) => x.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account with this email already exists. Try logging in.')
    }
    const u: DemoUser = { id: crypto.randomUUID(), email, name, password, onboarded: false }
    writeUsers([...readUsers(), u])
    localStorage.setItem(LS_SESSION, u.id)
    return u
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
