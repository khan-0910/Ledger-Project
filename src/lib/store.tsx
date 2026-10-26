import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Budget, Essential, Goal, LedgerData, Profile, Recurring, Settings, Txn } from './types'
import type { DbEvent } from './types'
import { applyEvent, delay, demoAuth, demoDb, demoSeedData, freshData } from './db/demo'
import { EMAIL_RE, clearFailures, lockoutMessage, passwordProblem, recordFailure } from './security'

import { auth as sbAuth, db as sbDb, supabase, supabaseEnabled } from './db/supabase'
import { VaultConflict, cacheKey, cachedKey, fetchDataKey, forgetKeys, loadVault, saveVault } from './vault'
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
  deleteAccount: () => Promise<string | null>
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
        if (su) {
          const su2: SessionUser = { id: su.id, email: su.email, name: su.name, mode: 'supabase' }
          if (!(await unlock(su2))) return
          if (!alive) return
          setStage('signed-out')
          return
        }
      }
      if (!u) {
        const du = demoAuth.currentUser()
        // With Supabase on, only the one-tap demo stays local; old browser-only logins are dropped.
        if (du && supabaseEnabled && du.email !== 'student@demo.ledger') demoAuth.signOut()
        else if (du) u = { id: du.id, email: du.email, name: du.name, mode: 'demo' }
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
    const du = demoAuth.currentUser()
    const stored = du ? demoDb.load(du.id) : null
    const d = stored ?? freshData(u.name, u.email)
    demoDb.save(u.id, d)
    applyData(d, u)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ----- encrypted vault (Supabase mode) ----- */
  const dkRef = useRef<CryptoKey | null>(null)
  const versionRef = useRef(0)
  const saveChain = useRef<Promise<unknown>>(Promise.resolve())

  const openVault = useCallback(async (u: SessionUser, dk: CryptoKey) => {
    dkRef.current = dk
    await cacheKey(u.id, dk)
    let doc = await loadVault(u.id, dk)
    if (!doc) {
      // First unlock: carry over any old plain-text rows, then wipe them from the server.
      const old = await sbDb.loadAll(u.id).catch(() => null)
      const fresh = freshData(u.name || u.email.split('@')[0], u.email)
      const d: LedgerData = old?.profile.onboarded ? old : fresh
      d.profile = { ...d.profile, id: u.id, email: u.email }
      try {
        const v = await saveVault(u.id, dk, d, 0)
        doc = { data: d, version: v }
      } catch (e) {
        if (!(e instanceof VaultConflict)) throw e
        doc = await loadVault(u.id, dk) // another device made it first
        if (!doc) throw e
      }
      if (old) {
        await sbDb.wipeData(u.id).catch(() => {})
        await sbDb.saveProfile(u.id, { name: '', totalBalanceMinor: 0, strictSavingsMinor: 0, guiltFreeMinor: 0 }).catch(() => {})
      }
    }
    versionRef.current = doc.version
    applyData(doc.data, u)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Signed in: get this user's data key (device cache, else the key service) and open the vault. */
  const unlock = useCallback(async (u: SessionUser): Promise<string | null> => {
    try {
      const dk = (await cachedKey(u.id)) ?? (await fetchDataKey())
      await openVault(u, dk)
      return null
    } catch {
      dkRef.current = null
      return "Couldn't open your data. Check your connection and try again."
    }
  }, [openVault])

  /** Save the whole ledger: local in demo mode, encrypted blob in Supabase mode. */
  const persist = useCallback(async (u: SessionUser, next: LedgerData) => {
    if (u.mode === 'demo') {
      demoDb.save(u.id, next)
      return
    }
    const dk = dkRef.current
    if (!dk) throw new Error('locked')
    const job = saveChain.current.catch(() => {}).then(async () => {
      try {
        versionRef.current = await saveVault(u.id, dk, next, versionRef.current)
      } catch (e) {
        if (!(e instanceof VaultConflict)) throw e
        const doc = await loadVault(u.id, dk)
        if (doc) {
          versionRef.current = doc.version
          settingsRef.current = doc.data.settings
          setData(doc.data)
        }
        toast('info', 'Updated from another device. Please redo your last change.')
      }
    })
    saveChain.current = job
    await job
  }, [toast])

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
      return su ? unlock({ id: su.id, email: su.email, name: su.name, mode: 'supabase' }) : null
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
  }, [hydrate, unlock])

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
        const err = su ? await unlock({ id: su.id, email: su.email, name: name || su.name, mode: 'supabase' }) : null
        return { error: err, needsConfirm: false }
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
    [hydrate, unlock],
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
  }, [user])

  const signOut = useCallback(async () => {
    if (user?.mode === 'supabase') {
      await forgetKeys()
      dkRef.current = null
      versionRef.current = 0
      await sbAuth.signOut()
    } else demoAuth.signOut()
    setUser(null)
    setData(null)
    hideAll()
    setStage('signed-out')
  }, [user])

  const deleteAccount = useCallback(async (): Promise<string | null> => {
    if (!user) return null
    if (user.mode === 'supabase') {
      const { error } = await supabase!.rpc('delete_my_account')
      if (error) return "Couldn't delete your account. Try again."
      await forgetKeys()
      dkRef.current = null
      await sbAuth.signOut().catch(() => {})
    } else {
      demoAuth.deleteUser(user.id)
    }
    setUser(null)
    setData(null)
    hideAll()
    setStage('signed-out')
    return null
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
      if (user.mode === 'demo') demoAuth.setOnboarded(user.id)
      await persist(user, next)
      setStage('ready')
    },
    [user, data, persist],
  )
  /* ----- data actions ----- */
  const dispatch = useCallback(
    async (event: DbEvent) => {
      if (!user || !data) return
      const next = applyEvent(data, event)
      setData(next)
      await persist(user, next)
    },
    [user, data, persist],
  )

  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      if (!user || !data) return
      const next = applyEvent(data, { kind: 'patchProfile', profile: patch })
      setData(next)
      await persist(user, next)
    },
    [user, data, persist],
  )

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    if (!user || !data) return
    const next = applyEvent(data, { kind: 'patchSettings', settings: patch })
    setData(next)
    settingsRef.current = next.settings
    await persist(user, next)
  }, [user, data, persist])
  updateSettingsRef.current = updateSettings

  const upsertTxn = useCallback(
    async (txn: Txn): Promise<boolean> => {
      if (!user || !data) return false
      const prev = data
      const next = applyEvent(data, { kind: 'upsertTxn', txn })
      setData(next)
      try {
        await persist(user, next)
        return true
      } catch {
        setData(prev) // rollback
        toast('error', "Something went wrong. Your expense wasn't added.", 'Retry', () => void upsertTxn(txn))
        return false
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, data, toast, persist],
  )

  const deleteTxn = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user || !data) return false
      const prev = data
      const next = applyEvent(data, { kind: 'removeTxn', id })
      setData(next)
      try {
        await persist(user, next)
        return true
      } catch {
        setData(prev)
        toast('error', "Couldn't delete that transaction. Nothing was lost — try again.")
        return false
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, data, toast, persist],
  )

  const setBudgets = useCallback(
    async (budgets: Budget[]) => {
      if (!user || !data) return
      const next = applyEvent(data, { kind: 'setBudgets', budgets })
      setData(next)
      await persist(user, next)
    },
    [user, data, persist],
  )

  const setGoals = useCallback(
    async (goals: Goal[]) => {
      if (!user || !data) return
      const next = applyEvent(data, { kind: 'setGoals', goals })
      setData(next)
      await persist(user, next)
    },
    [user, data, persist],
  )

  const setEssentials = useCallback(
    async (list: Essential[]) => {
      if (!user || !data) return
      const next = applyEvent(data, { kind: 'setEssentials', essentials: list })
      setData(next)
      await persist(user, next)
    },
    [user, data, persist],
  )

  const setRecurring = useCallback(
    async (list: Recurring[]) => {
      if (!user || !data) return
      const next = applyEvent(data, { kind: 'setRecurring', recurring: list })
      setData(next)
      await persist(user, next)
    },
    [user, data, persist],
  )

  const wipeData = useCallback(async () => {
    if (!user || !data) return
    const next: LedgerData = { ...data, txns: [], budgets: [], goals: [], recurring: [] }
    setData(next)
    await persist(user, next)
  }, [user, data, persist])

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
      deleteAccount,
      completeOnboarding, dispatch, updateProfile, updateSettings,
      upsertTxn, deleteTxn, setBudgets, setGoals, setRecurring, setEssentials,
      wipeData, reseedDemo,
    }),
    [stage, user, data, reducedMotion, toasts, toast, dismissToast,
      signIn, signUp, demoSignIn, sendReset, updatePassword, signOut, completeOnboarding, dispatch,
      deleteAccount,
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
