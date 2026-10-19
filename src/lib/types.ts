export type ISODate = string // yyyy-mm-dd (local)
export type MonthKey = string // yyyy-mm

export type TxnType = 'expense' | 'income'
export type PaymentMethod = 'upi' | 'card' | 'cash' | 'netbanking'

export interface Txn {
  id: string
  type: TxnType
  amountMinor: number
  category: string
  subcategory?: string
  description: string
  date: ISODate
  method: PaymentMethod
  note?: string
  createdAt: string // ISO datetime
}

export interface Budget {
  id: string
  category: string
  limitMinor: number
  month: MonthKey
}

export interface Goal {
  id: string
  name: string
  emoji: string
  targetMinor: number
  savedMinor: number
  targetDate?: ISODate
  createdAt: string
}

/** A planned essential commitment (rent, transport, phone…) for the current month. */
export interface Essential {
  id: string
  name: string
  emoji: string
  amountMinor: number
  category: string
  /** Day of month this is due (1–31). */
  dueDay: number
}

export interface Recurring {
  id: string
  name: string
  emoji: string
  amountMinor: number
  category: string
  frequency: 'monthly' | 'weekly' | 'yearly'
  nextDate: ISODate
}

export interface Profile {
  id: string
  name: string
  email: string
  onboarded: boolean
  currency: 'INR'
  totalBalanceMinor: number
  strictSavingsMinor: number
  /** Guilt-free allowance for the current cycle */
  guiltFreeMinor: number
  guiltFreeCycleStart: ISODate
  /** Optional: minimum account balance the user wants untouched (MAB). null/undefined = off. */
  protectedBalanceMinor?: number
  /** Optional: whether the Protected Balance participates in safe-to-spend. Default off. */
  mabEnabled?: boolean
}

export type BalanceVisibility = 'always-hide' | 'show-after-login' | 'remember'

export interface Settings {
  balanceVisibility: BalanceVisibility
  hideOnLoad: boolean
  /** Kept for backwards compatibility with persisted demo/supabase settings; unused. */
  peekLock?: boolean
}

/** Full client-side state for one user. */
export interface LedgerData {
  profile: Profile
  settings: Settings
  txns: Txn[]
  budgets: Budget[]
  goals: Goal[]
  recurring: Recurring[]
  /** Optional planned essential commitments for the current cycle. */
  essentials?: Essential[]
}

/** Uniform change events emitted by the data layer. */
export type DbEvent =
  | { kind: 'replace'; data: LedgerData }
  | { kind: 'patchProfile'; profile: Partial<Profile> }
  | { kind: 'patchSettings'; settings: Partial<Settings> }
  | { kind: 'setTxns'; txns: Txn[] }
  | { kind: 'upsertTxn'; txn: Txn }
  | { kind: 'removeTxn'; id: string }
  | { kind: 'setBudgets'; budgets: Budget[] }
  | { kind: 'setGoals'; goals: Goal[] }
  | { kind: 'setRecurring'; recurring: Recurring[] }
  | { kind: 'setEssentials'; essentials: Essential[] }
