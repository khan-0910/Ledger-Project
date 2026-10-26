import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Budget, Essential, Goal, LedgerData, Profile, Recurring, Settings, Txn } from './types'
import type { DbEvent } from './types'
import { applyEvent, delay, demoAuth, demoDb, demoSeedData, freshData } from './db/demo'
import { EMAIL_RE, clearFailures, lockoutMessage, passwordProblem, recordFailure } from './security'

import { auth as sbAuth, db as sbDb, supabaseEnabled } from './db/supabase'
import { toMinor } from './money'
import { todayISO } from './dates'
import { hideAll, initPrivacy } from './privacy'

export type SessionUser = { id: string; email: string; name: string; mode: 'demo' | 'supabase' }

export type SessionStage = 'loading' | 'signed-out' | 'onboarding' | 'ready'

export interface Toast {
  id: number
  kind: 'success' | 'error' | 'info'
  message: string
  actionLabel?: string
  action?: () => void
}

interface AppContextValue {
  stage: SessionStage
  user: SessionUser | null
  data: LedgerData | null
  reducedMotion: boolean
  toasts: Toast[]
  toast: (kind: Toast['kind'], message: string, actionLabel?: string, action?: () => void) => void
  dismissToast: (id: number) => void
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null; needsConfirm: boolean }>
  demoSignIn: (email?: string, password?: string) => Promise<string | null>
  sendReset: (email: string) => Promise<string | null>
  updatePassword: (pw: string) => Promise<string | null>
  signOut: () => Promise<void>
  completeOnboarding: (p: { name: string; total: number; strict: number; guiltFree: number }) => Promise<void>
  dispatch: (event: DbEvent) => Promise<void>
  updateProfile: (patch: Partial<Profile>) => Promise<void>
  updateSettings: (patch: Partial<Settings>) => Promise<void>
  upsertTxn: (txn: Txn) => Promise<boolean>
  deleteTxn: (id: string) => Promise<boolean>
  setBudgets: (b: Budget[]) => Promise<void>
  setGoals: (g: Goal[]) => Promise<void>
  setRecurring: (r: Recurring[]) => Promise<void>
  setEssentials: (list: Essential[]) => Promise<void>
  wipeData: () => Promise<void>
  reseedDemo: () => void
}

const Ctx = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}

/* ---------- reveal state lives entirely with the Dashboard button ---------- */

let toastSeq = 1

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [stage, setStage] = useState<SessionStage>('loading')
  const [user, setUser] = useState<SessionUser | null>(null)
  const [data, setData] = useState<LedgerData | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const settingsRef = useRef<Settings | null>(null)
  const updateSettingsRef = useRef<((patch: Partial<Settings>) => Promise<void>) | null>(null)

  /* ----- toasts ----- */
  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const toast = useCallback(
    (kind: Toast['kind'], message: string, actionLabel?: string, action?: () => void) => {
      const id = toastSeq++
      setToasts((t) => [...t.slice(-2), { id, kind, message, actionLabel, action }])
      window.setTimeout(() => dismissToast(id), kind === 'error' ? 6000 : 3200)
    },
    [dismissToast],
  )

  /* ----- reduced motion ----- */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const fn = () => setReducedMotion(mq.matches)
    mq.addEventListener?.('change', fn)
    return () => mq.removeEventListener?.('change', fn)
  }, [])

  /* ----- initial session load ----- */
  useEffect(() => {
    let alive = true
    async function boot() {
      let u: SessionUser | null = null
      if (supabaseEnabled) {
        const su = await sbAuth.getUser()
        if (su) u = { id: su.id, email: su.email, name: su.name, mode: 'supabase' }
      }
      if (!u) {
        const du = demoAuth.currentUser()
        if (du) u = { id: du.id, email: du.email, name: du.name, mode: 'demo' }
      }
      if (!alive) return
      if (!u) {
        setStage('signed-out')
        return
      }
      await hydrate(u)
    }
    boot()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ----- supabase auth listener ----- */
  useEffect(() => {
    if (!supabaseEnabled) return
    const unsub = sbAuth.onAuthChange((su) => {
      if (!su) {
        setUser(null)
        setData(null)
        setStage('signed-out')
      }
      // sign-in hydration is handled by the action callbacks
    })
    return unsub
  }, [])

  const hydrate = useCallback(async (u: SessionUser) => {
    if (u.mode === 'demo') {
      const du = demoAuth.currentUser()
      const stored = du ? demoDb.load(du.id) : null
      const d = stored ?? freshData(u.name, u.email)
      demoDb.save(u.id, d)
      applyData(d, u)
    } else {
      const d = await sbDb.loadAll(u.id)
      if (!d) {
        // First Supabase login: create profile row
        const profile: Profile = {
          id: u.id,
          name: u.name || u.email.split('@')[0],
          email: u.email,
          onboarded: false,
          currency: 'INR',
          totalBalanceMinor: 0,
          strictSavingsMinor: 0,
          guiltFreeMinor: 0,
          guiltFreeCycleStart: todayISO(),
        }
        await sbDb.saveProfile(u.id, profile)
        await sbDb.saveSettings(u.id, { balanceVisibility: 'always-hide', hideOnLoad: true })
        applyData({ profile, settings: { balanceVisibility: 'always-hide', hideOnLoad: true }, txns: [], budgets: [], goals: [], recurring: [] }, u)
        return
      }
      applyData(d, u)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function applyData(d: LedgerData, u: SessionUser) {
    setData(d)
    settingsRef.current = d.settings
    setUser(u)
    // The Total Balance always starts masked; the Dashboard's explicit
    // Show balance button is the only thing that changes that.
    initPrivacy()
    setStage(d.profile.onboarded ? 'ready' : 'onboarding')
  }

  /* ----- privacy control: none global — the Dashboard button owns it ----- */

  /* ----- auth actions ----- */
  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    const locked = lockoutMessage(email)
    if (locked) return locked
    if (supabaseEnabled) {
      const r = await sbAuth.signIn(email, password)
      if (r.error) {
        recordFailure(email)
        return r.error
      }
      clearFailures(email)
      const su = await sbAuth.getUser()
      if (su) await hydrate({ id: su.id, email: su.email, name: su.name, mode: 'supabase' })
      return null
    }
    try {
      await delay(450)
      const u = await demoAuth.signIn(email, password)
      clearFailures(email)
      await hydrate({ id: u.id, email: u.email, name: u.name, mode: 'demo' })
      return null
    } catch (e) {
      recordFailure(email)
      return lockoutMessage(email) ?? (e instanceof Error ? e.message : 'Could not sign in.')
    }
  }, [hydrate])

  const signUp = useCallback(
    async (email: string, password: string, name: string): Promise<{ error: string | null; needsConfirm: boolean }> => {
      if (!EMAIL_RE.test(email.trim())) return { error: 'Enter a valid email.', needsConfirm: false }
      const weak = passwordProblem(password, email)
      if (weak) return { error: weak, needsConfirm: false }
      if (supabaseEnabled) {
        const r = await sbAuth.signUp(email, password, name)
        if (r.error) return { error: r.error, needsConfirm: false }
        if (r.needsConfirm) return { error: null, needsConfirm: true }
        const su = await sbAuth.getUser()
        if (su) await hydrate({ id: su.id, email: su.email, name: su.name, mode: 'supabase' })
        return { error: null, needsConfirm: false }
      }
      await delay(500)
      try {
        const u = await demoAuth.signUp(email, password, name)
        await hydrate({ id: u.id, email: u.email, name: u.name, mode: 'demo' })
        return { error: null, needsConfirm: false }
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'Could not create account.', needsConfirm: false }
      }
    },
    [hydrate],
  )

  const demoSignIn = useCallback(
    async (email?: string, password?: string): Promise<string | null> => {
      if (email && password) {
        const err = await signIn(email, password)
        return err
      }
      await delay(400)
      // One-tap demo user: seeds sample data and skips onboarding
      const existing = demoAuth.listUsers().find((u) => u.email === 'student@demo.ledger')
      const u = existing ?? await demoAuth.signUp('student@demo.ledger', 'ledger123', 'Aarav')
      u.onboarded = true
      demoAuth.setOnboarded(u.id)
      // Persist the session so a hard reload keeps the demo signed in
      demoAuth.setSession(u.id)
      const d = demoSeedData(u.name, u.email)
      demoDb.save(u.id, d)
      await hydrate({ id: u.id, email: u.email, name: u.name, mode: 'demo' })
      return null
    },
    [signIn, hydrate],
  )

  const sendReset = useCallback(async (email: string): Promise<string | null> => {
    if (supabaseEnabled) {
      const r = await sbAuth.sendResetEmail(email)
      return r.error ?? null
    }
    await delay(500)
    // Same answer whether or not the email exists (no account probing).
    return null
  }, [])

  const updatePassword = useCallback(async (pw: string): Promise<string | null> => {
    const weak = passwordProblem(pw, user?.email)
    if (weak) return weak
    if (supabaseEnabled) {
      const r = await sbAuth.updatePassword(pw)
      return r.error ?? null
    }
    await delay(400)
    const u = demoAuth.currentUser()
    if (u) await demoAuth.setPassword(u.id, pw)
    return null
  }, [user?.email])

  const signOut = useCallback(async () => {
    if (user?.mode === 'supabase') await sbAuth.signOut()
    else demoAuth.signOut()
    setUser(null)
    setData(null)
    hideAll()
    setStage('signed-out')
  }, [user])

  /* ----- onboarding ----- */
  const completeOnboarding = useCallback(
    async (p: { name: string; total: number; strict: number; guiltFree: number }) => {
      if (!user || !data) return
      const profile: Partial<Profile> = {
        name: p.name || data.profile.name,
        totalBalanceMinor: p.total,
        strictSavingsMinor: p.strict,
        guiltFreeMinor: p.guiltFree,
        onboarded: true,
        guiltFreeCycleStart: todayISO(),
      }
      const next = applyEvent(data, { kind: 'patchProfile', profile })
      setData(next)
      if (user.mode === 'demo') {
        demoAuth.setOnboarded(user.id)
        demoDb.save(user.id, next)
      } else {
        await sbDb.saveProfile(user.id, profile)
      }
      setStage('ready')
    },
    [user, data],
  )
  /* ----- data actions ----- */
  const dispatch = useCallback(
    async (event: DbEvent) => {
      if (!user || !data) return
      const next = applyEvent(data, event)
      setData(next)
      if (user.mode === 'demo') demoDb.save(user.id, next)
    },
    [user, data],
  )

  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      if (!user || !data) return
      const next = applyEvent(data, { kind: 'patchProfile', profile: patch })
      setData(next)
      if (user.mode === 'demo') demoDb.save(user.id, next)
      else await sbDb.saveProfile(user.id, patch)
    },
    [user, data],
  )

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    if (!user || !data) return
    const next = applyEvent(data, { kind: 'patchSettings', settings: patch })
    setData(next)
    settingsRef.current = next.settings
    if (user.mode === 'demo') demoDb.save(user.id, next)
    else await sbDb.saveSettings(user.id, next.settings)
  }, [user, data])
  updateSettingsRef.current = updateSettings

  const upsertTxn = useCallback(
    async (txn: Txn): Promise<boolean> => {
      if (!user || !data) return false
      const prev = data
      const next = applyEvent(data, { kind: 'upsertTxn', txn })
      setData(next)
      try {
        if (user.mode === 'demo') {
          demoDb.save(user.id, next)
        } else {
          const exists = prev.txns.some((t) => t.id === txn.id)
          if (exists) await sbDb.updateTxn(user.id, txn)
          else await sbDb.insertTxn(user.id, txn)
        }
        return true
      } catch {
        setData(prev) // rollback
        toast('error', "Something went wrong. Your expense wasn't added.", 'Retry', () => void upsertTxn(txn))
        return false
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, data, toast],
  )

  const deleteTxn = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user || !data) return false
      const prev = data
      const next = applyEvent(data, { kind: 'removeTxn', id })
      setData(next)
      try {
        if (user.mode === 'demo') demoDb.save(user.id, next)
        else await sbDb.deleteTxn(user.id, id)
        return true
      } catch {
        setData(prev)
        toast('error', "Couldn't delete that transaction. Nothing was lost — try again.")
        return false
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, data, toast],
  )

  const setBudgets = useCallback(
    async (budgets: Budget[]) => {
      if (!user || !data) return
      const next = applyEvent(data, { kind: 'setBudgets', budgets })
      setData(next)
      if (user.mode === 'demo') demoDb.save(user.id, next)
      else await sbDb.replaceBudgets(user.id, budgets)
    },
    [user, data],
  )

  const setGoals = useCallback(
    async (goals: Goal[]) => {
      if (!user || !data) return
      const next = applyEvent(data, { kind: 'setGoals', goals })
      setData(next)
      if (user.mode === 'demo') demoDb.save(user.id, next)
      else await sbDb.replaceGoals(user.id, goals)
    },
    [user, data],
  )

  const setEssentials = useCallback(
    async (list: Essential[]) => {
      if (!user || !data) return
      const next = applyEvent(data, { kind: 'setEssentials', essentials: list })
      setData(next)
      if (user.mode === 'demo') demoDb.save(user.id, next)
    },
    [user, data],
  )

  const setRecurring = useCallback(
    async (list: Recurring[]) => {
      if (!user || !data) return
      const next = applyEvent(data, { kind: 'setRecurring', recurring: list })
      setData(next)
      if (user.mode === 'demo') demoDb.save(user.id, next)
      else await sbDb.replaceRecurring(user.id, list)
    },
    [user, data],
  )

  const wipeData = useCallback(async () => {
    if (!user || !data) return
    const next: LedgerData = { ...data, txns: [], budgets: [], goals: [], recurring: [] }
    setData(next)
    if (user.mode === 'demo') demoDb.save(user.id, next)
    else await sbDb.wipeData(user.id)
  }, [user, data])

  const reseedDemo = useCallback(() => {
    if (!user) return
    if (user.mode === 'demo') {
      const d = demoSeedData(user.name, user.email)
      demoDb.save(user.id, d)
      applyData(d, user)
    }
  }, [user])

  const value = useMemo<AppContextValue>(
    () => ({
      stage, user, data, reducedMotion, toasts,
      toast, dismissToast,
      signIn, signUp, demoSignIn, sendReset, updatePassword, signOut,
      completeOnboarding, dispatch, updateProfile, updateSettings,
      upsertTxn, deleteTxn, setBudgets, setGoals, setRecurring, setEssentials,
      wipeData, reseedDemo,
    }),
    [stage, user, data, reducedMotion, toasts, toast, dismissToast,
      signIn, signUp, demoSignIn, sendReset, updatePassword, signOut, completeOnboarding, dispatch,
      updateProfile, updateSettings, upsertTxn, deleteTxn, setBudgets, setGoals, setRecurring, setEssentials, wipeData, reseedDemo],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** Convenience hook for profile with safe fallback (landing page, etc.). */
export function useProfileOrNull(): Profile | null {
  const { data } = useApp()
  return data?.profile ?? null
}

export { toMinor }
