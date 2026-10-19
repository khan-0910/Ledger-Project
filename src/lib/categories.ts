import type { Txn } from './types'
import type { GlyphName } from '../components/bits/Glyph'

export type CategoryId =
  | 'food'
  | 'groceries'
  | 'education'
  | 'transport'
  | 'entertainment'
  | 'shopping'
  | 'living'
  | 'income'
  | 'other'

export interface CategoryDef {
  id: CategoryId
  label: string
  /** Legacy data field — no longer rendered; kept so stored transactions don't break. */
  emoji: string
  /** Vector icon for current UI. */
  glyph: GlyphName
  color: string
  softVar: string
  examples: string[]
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'food',
    label: 'Food & Drinks',
    emoji: '🍜',
    glyph: 'food',
    color: '#e8a71c',
    softVar: '--yellow-soft',
    examples: ['Meals', 'Snacks', 'Coffee', 'Delivery'],
  },
  {
    id: 'groceries',
    label: 'Groceries & Supplies',
    emoji: '🧺',
    glyph: 'groceries',
    color: '#1f9d55',
    softVar: '--green-soft',
    examples: ['Groceries', 'Toiletries', 'Essentials'],
  },
  {
    id: 'education',
    label: 'Education',
    emoji: '📚',
    glyph: 'education',
    color: '#2f6fd0',
    softVar: '--blue-soft',
    examples: ['Books', 'Stationery', 'Courses'],
  },
  {
    id: 'transport',
    label: 'Transport',
    emoji: '🛺',
    glyph: 'transport',
    color: '#7d55d6',
    softVar: '--purple-soft',
    examples: ['Bus / Metro', 'Auto', 'Fuel'],
  },
  {
    id: 'entertainment',
    label: 'Entertainment',
    emoji: '🎬',
    glyph: 'entertainment',
    color: '#e04f2f',
    softVar: '--red-soft',
    examples: ['Games', 'Movies', 'Subscriptions'],
  },
  {
    id: 'shopping',
    label: 'Shopping',
    emoji: '🛍️',
    glyph: 'shopping',
    color: '#d95d9a',
    softVar: '--pink-soft',
    examples: ['Clothes', 'Electronics', 'Other'],
  },
  {
    id: 'living',
    label: 'College / Living',
    emoji: '🏠',
    glyph: 'living',
    color: '#4a9f8c',
    softVar: '--teal-soft',
    examples: ['Hostel', 'Rent', 'Utilities'],
  },
  {
    id: 'income',
    label: 'Income',
    emoji: '💸',
    glyph: 'income',
    color: '#b6d83c',
    softVar: '--accent-soft',
    examples: ['Allowance', 'Salary', 'Freelance'],
  },
  {
    id: 'other',
    label: 'Other',
    emoji: '📦',
    glyph: 'other',
    color: '#8b9080',
    softVar: '--surface-hover',
    examples: ['Misc'],
  },
]

export const EXPENSE_CATEGORIES = CATEGORIES.filter((c) => c.id !== 'income')

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]))

export function category(id: string): CategoryDef {
  return BY_ID.get(id as CategoryId) ?? BY_ID.get('other')!
}

/** Extra soft color tokens used by some categories. */
export const EXTRA_SOFT_VARS = `
:root { --pink-soft: #fbe7f0; --teal-soft: #e1f2ef; --accent-soft: #f2f8d8; }
:root[data-theme='dark'] {
  --pink-soft: rgba(217, 93, 154, 0.14);
  --teal-soft: rgba(74, 159, 140, 0.14);
  --accent-soft: rgba(216, 242, 110, 0.12);
}
`

export function categoryColor(id: string): string {
  return category(id).color
}

export function isExpenseCategory(id: string): boolean {
  return id !== 'income'
}

/** Fallback grouping for a txn that predates a category rename, etc. */
export function coerceCategory(t: Partial<Txn>): CategoryId {
  return (BY_ID.has(t.category as CategoryId) ? t.category : 'other') as CategoryId
}
