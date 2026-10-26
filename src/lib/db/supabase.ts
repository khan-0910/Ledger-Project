import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Budget, Goal, LedgerData, Profile, Recurring, Settings, Txn } from '../types'

/* eslint-disable @typescript-eslint/no-explicit-any */

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseEnabled = Boolean(URL && ANON)

export const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(URL!, ANON!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null

/* ---------- Row mappers ---------- */

function mapProfile(row: any): Profile {
  return {
    id: row.id,
    name: row.name ?? '',
    email: row.email ?? '',
    onboarded: Boolean(row.onboarded),
    currency: 'INR',
    totalBalanceMinor: row.total_balance_minor ?? 0,
    strictSavingsMinor: row.strict_savings_minor ?? 0,
    guiltFreeMinor: row.guilt_free_minor ?? 0,
    guiltFreeCycleStart: row.guilt_free_cycle_start ?? '',
    protectedBalanceMinor: row.protected_balance_minor ?? undefined,
    mabEnabled: row.mab_enabled ?? undefined,
  }
}

function mapTxn(row: any): Txn {
  return {
    id: row.id,
    type: row.type,
    amountMinor: row.amount_minor,
    category: row.category,
    subcategory: row.subcategory ?? undefined,
    description: row.description ?? '',
    date: row.date,
    method: row.method,
    note: row.note ?? undefined,
    createdAt: row.created_at,
  }
}

function mapBudget(row: any): Budget {
  return { id: row.id, category: row.category, limitMinor: row.limit_minor, month: row.month }
}

function mapGoal(row: any): Goal {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji ?? '🎯',
    targetMinor: row.target_minor,
    savedMinor: row.saved_minor,
    targetDate: row.target_date ?? undefined,
    createdAt: row.created_at,
  }
}

function mapRecurring(row: any): Recurring {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji ?? '🔁',
    amountMinor: row.amount_minor,
    category: row.category,
    frequency: row.frequency,
    nextDate: row.next_date,
  }
}

function mapSettings(row: any): Settings {
  return {
    balanceVisibility: row.balance_visibility ?? 'always-hide',
    hideOnLoad: row.hide_on_load ?? true,
  }
}

/* ---------- Auth ---------- */

export interface AuthUser {
  id: string
  email: string
  name: string
}

function userFrom(u: any): AuthUser {
  return { id: u.id, email: u.email ?? '', name: (u.user_metadata?.name as string) ?? '' }
}

export const auth = {
  async getUser(): Promise<AuthUser | null> {
    if (!supabase) return null
    const { data } = await supabase.auth.getSession()
    return data.session?.user ? userFrom(data.session.user) : null
  },

  async signUp(
    email: string,
    password: string,
    name: string,
  ): Promise<{ ok: boolean; needsConfirm: boolean; error?: string }> {
    if (!supabase) return { ok: false, needsConfirm: false, error: NO_SUPABASE }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // Confirm link must land back on the Pages path, not the bare domain.
      options: { emailRedirectTo: new globalThis.URL(import.meta.env.BASE_URL, window.location.origin).href },
    })
    if (error) return { ok: false, needsConfirm: false, error: humanAuthError(error.message) }
    return { ok: true, needsConfirm: !data.session }
  },

  async signIn(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
    if (!supabase) return { ok: false, error: NO_SUPABASE }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { ok: false, error: humanAuthError(error.message) }
    return { ok: true }
  },

  async signOut(): Promise<void> {
    await supabase?.auth.signOut()
  },

  async sendResetEmail(email: string): Promise<{ ok: boolean; error?: string }> {
    if (!supabase) return { ok: false, error: NO_SUPABASE }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: new globalThis.URL(import.meta.env.BASE_URL + 'reset', window.location.origin).href,
    })
    if (error) return { ok: false, error: humanAuthError(error.message) }
    return { ok: true }
  },

  async updatePassword(password: string): Promise<{ ok: boolean; error?: string }> {
    if (!supabase) return { ok: false, error: NO_SUPABASE }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { ok: false, error: humanAuthError(error.message) }
    return { ok: true }
  },

  onAuthChange(cb: (user: AuthUser | null) => void): () => void {
    if (!supabase) {
      cb(null)
      return () => {}
    }
    const { data } = supabase.auth.onAuthStateChange((_evt, session) => {
      cb(session?.user ? userFrom(session.user) : null)
    })
    return () => data.subscription.unsubscribe()
  },
}

const NO_SUPABASE =
  'Supabase is not configured in this deployment. Use “Try the demo” on the login screen to explore Ledger with sample data.'

function humanAuthError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Wrong email or password.'
  if (m.includes('email not confirmed')) return 'Please confirm your email first — check your inbox.'
  if (m.includes('rate limit')) return 'Too many attempts — wait a minute and try again.'
  if (m.includes('already registered')) return 'Could not create that account. Try logging in instead.'
  if (m.includes('pwned') || m.includes('leaked') || m.includes('weak')) return 'That password has shown up in a data leak. Pick another.'
  if (m.includes('password should be') || m.includes('password')) return 'Password must be at least 8 characters.'
  if (m.includes('failed to fetch')) return "Can't reach the server. Check your connection."
  return 'Something went wrong. Please try again.'
}

/* ---------- Data CRUD (all RLS-scoped to the signed-in user) ---------- */

export const db = {
  async loadAll(userId: string): Promise<LedgerData | null> {
    if (!supabase) return null
    const [p, t, b, g, r, s] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('budgets').select('*').eq('user_id', userId),
      supabase.from('goals').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('recurring_transactions').select('*').eq('user_id', userId).order('next_date'),
      supabase.from('settings').select('*').eq('user_id', userId).maybeSingle(),
    ])
    if (p.error || !p.data) return null
    return {
      profile: mapProfile(p.data),
      settings: s.data ? mapSettings(s.data) : { balanceVisibility: 'always-hide', hideOnLoad: true },
      txns: (t.data ?? []).map(mapTxn),
      budgets: (b.data ?? []).map(mapBudget),
      goals: (g.data ?? []).map(mapGoal),
      recurring: (r.data ?? []).map(mapRecurring),
    }
  },

  async saveProfile(userId: string, patch: Partial<Profile>): Promise<void> {
    if (!supabase) return
    const row: any = {}
    if (patch.name !== undefined) row.name = patch.name
    if (patch.onboarded !== undefined) row.onboarded = patch.onboarded
    if (patch.totalBalanceMinor !== undefined) row.total_balance_minor = patch.totalBalanceMinor
    if (patch.strictSavingsMinor !== undefined) row.strict_savings_minor = patch.strictSavingsMinor
    if (patch.guiltFreeMinor !== undefined) row.guilt_free_minor = patch.guiltFreeMinor
    if (patch.guiltFreeCycleStart !== undefined) row.guilt_free_cycle_start = patch.guiltFreeCycleStart
    if (patch.protectedBalanceMinor !== undefined) row.protected_balance_minor = patch.protectedBalanceMinor
    if (patch.mabEnabled !== undefined) row.mab_enabled = patch.mabEnabled
    if (patch.protectedBalanceMinor !== undefined) row.protected_balance_minor = patch.protectedBalanceMinor
    if (patch.mabEnabled !== undefined) row.mab_enabled = patch.mabEnabled
    const { error } = await supabase.from('profiles').update(row).eq('id', userId)
    if (error) throw new Error(error.message)
  },

  async saveSettings(userId: string, settings: Settings): Promise<void> {
    if (!supabase) return
    const { error } = await supabase.from('settings').upsert({
      user_id: userId,
      balance_visibility: settings.balanceVisibility,
      hide_on_load: settings.hideOnLoad,
    })
    if (error) throw new Error(error.message)
  },

  async insertTxn(userId: string, txn: Txn): Promise<void> {
    if (!supabase) return
    const { error } = await supabase.from('transactions').insert({
      id: txn.id,
      user_id: userId,
      type: txn.type,
      amount_minor: txn.amountMinor,
      category: txn.category,
      subcategory: txn.subcategory ?? null,
      description: txn.description,
      date: txn.date,
      method: txn.method,
      note: txn.note ?? null,
    })
    if (error) throw new Error(error.message)
  },

  async updateTxn(userId: string, txn: Txn): Promise<void> {
    if (!supabase) return
    const { error } = await supabase
      .from('transactions')
      .update({
        type: txn.type,
        amount_minor: txn.amountMinor,
        category: txn.category,
        subcategory: txn.subcategory ?? null,
        description: txn.description,
        date: txn.date,
        method: txn.method,
        note: txn.note ?? null,
      })
      .eq('id', txn.id)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
  },

  async deleteTxn(userId: string, id: string): Promise<void> {
    if (!supabase) return
    const { error } = await supabase.from('transactions').delete().eq('id', id).eq('user_id', userId)
    if (error) throw new Error(error.message)
  },

  async replaceBudgets(userId: string, budgets: Budget[]): Promise<void> {
    if (!supabase) return
    const del = await supabase.from('budgets').delete().eq('user_id', userId)
    if (del.error) throw new Error(del.error.message)
    if (budgets.length === 0) return
    const { error } = await supabase.from('budgets').insert(
      budgets.map((b) => ({ id: b.id, user_id: userId, category: b.category, limit_minor: b.limitMinor, month: b.month })),
    )
    if (error) throw new Error(error.message)
  },

  async replaceGoals(userId: string, goals: Goal[]): Promise<void> {
    if (!supabase) return
    const del = await supabase.from('goals').delete().eq('user_id', userId)
    if (del.error) throw new Error(del.error.message)
    if (goals.length === 0) return
    const { error } = await supabase.from('goals').insert(
      goals.map((g) => ({
        id: g.id,
        user_id: userId,
        name: g.name,
        emoji: g.emoji,
        target_minor: g.targetMinor,
        saved_minor: g.savedMinor,
        target_date: g.targetDate ?? null,
        created_at: g.createdAt,
      })),
    )
    if (error) throw new Error(error.message)
  },

  async replaceRecurring(userId: string, list: Recurring[]): Promise<void> {
    if (!supabase) return
    const del = await supabase.from('recurring_transactions').delete().eq('user_id', userId)
    if (del.error) throw new Error(del.error.message)
    if (list.length === 0) return
    const { error } = await supabase.from('recurring_transactions').insert(
      list.map((r) => ({
        id: r.id,
        user_id: userId,
        name: r.name,
        emoji: r.emoji,
        amount_minor: r.amountMinor,
        category: r.category,
        frequency: r.frequency,
        next_date: r.nextDate,
      })),
    )
    if (error) throw new Error(error.message)
  },

  async wipeData(userId: string): Promise<void> {
    if (!supabase) return
    await Promise.all([
      supabase.from('transactions').delete().eq('user_id', userId),
      supabase.from('budgets').delete().eq('user_id', userId),
      supabase.from('goals').delete().eq('user_id', userId),
      supabase.from('recurring_transactions').delete().eq('user_id', userId),
    ])
  },
}
