import type { PaymentMethod, TxnType } from './types'
import { parseAmountInput } from './money'

export interface RawCsvRow {
  date: string
  type: string
  amount: string
  category: string
  description: string
  method: string
  note: string
}

export interface CsvDraft {
  row: number
  date: string
  type: TxnType
  amountMinor: number
  category: string
  description: string
  method: PaymentMethod
  note: string
  error?: string
}

/** RFC-4180-ish CSV splitter handling quotes and CRLF. */
export function splitCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ }
        else inQuotes = false
      } else cell += c
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(cell); cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += c
  }
  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((x) => x.trim() !== ''))
}

const CANON = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')

const FIELD_ALIASES: Record<keyof RawCsvRow, string[]> = {
  date: ['date', 'dated', 'transactiondate', 'txndate'],
  type: ['type', 'txntype', 'transactiontype', 'debitcredit', 'dr cr'],
  amount: ['amount', 'value', 'amt', 'rupees', 'inr'],
  category: ['category', 'cat'],
  description: ['description', 'desc', 'title', 'narration', 'particulars', 'details'],
  method: ['method', 'paymentmethod', 'paidvia', 'via', 'mode'],
  note: ['note', 'notes', 'memo', 'comment'],
}

export function detectMap(headers: string[]): Partial<Record<keyof RawCsvRow, number>> {
  const map: Partial<Record<keyof RawCsvRow, number>> = {}
  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [keyof RawCsvRow, string[]][]) {
    const idx = headers.findIndex((h) => aliases.includes(CANON(h)))
    if (idx >= 0) map[field] = idx
  }
  return map
}

const METHODS: PaymentMethod[] = ['upi', 'card', 'cash', 'netbanking']
const METHOD_ALIASES: Record<PaymentMethod, string[]> = {
  upi: ['upi', 'gpay', 'googlepay', 'phonepe', 'paytm', 'bhim', 'scan'],
  card: ['card', 'creditcard', 'debitcard', 'cc', 'dc'],
  cash: ['cash', 'money', 'physical'],
  netbanking: ['netbanking', 'bank', 'transfer', 'neft', 'imps', 'online'],
}

function normMethod(v: string): PaymentMethod {
  const c = CANON(v)
  for (const m of METHODS) if (METHOD_ALIASES[m].includes(c)) return m
  return 'upi'
}

function normType(v: string): TxnType | null {
  const c = CANON(v)
  if (['expense', 'debit', 'dr', 'spent', 'out'].includes(c)) return 'expense'
  if (['income', 'credit', 'cr', 'received', 'in'].includes(c)) return 'income'
  return null
}

/** Normalize many common date formats to yyyy-mm-dd. */
function normDate(v: string): string | null {
  const s = v.trim()
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/)
  if (m) {
    const d = m[1].padStart(2, '0'), mo = m[2].padStart(2, '0')
    const y = m[3].length === 2 ? `20${m[3]}` : m[3]
    return `${y}-${mo}-${d}`
  }
  const parsed = new Date(s)
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear()
    const mo = String(parsed.getMonth() + 1).padStart(2, '0')
    const d = String(parsed.getDate()).padStart(2, '0')
    return `${y}-${mo}-${d}`
  }
  return null
}

export function rowsToDrafts(rows: string[][], map: Partial<Record<keyof RawCsvRow, number>>): CsvDraft[] {
  return rows.map((cells, i) => {
    const get = (f: keyof RawCsvRow): string => (map[f] !== undefined ? (cells[map[f]!] ?? '').trim() : '')
    const draft: CsvDraft = {
      row: i + 2, // header is row 1
      date: get('date'),
      type: 'expense',
      amountMinor: 0,
      category: get('category').toLowerCase() || 'other',
      description: get('description'),
      method: normMethod(get('method')),
      note: get('note'),
    }
    const amount = parseAmountInput(get('amount'))
    const type = normType(get('type'))
    const date = normDate(get('date'))
    if (amount === null) draft.error = 'Invalid amount'
    else draft.amountMinor = amount
    if (type === null && get('type') !== '') draft.error = draft.error ?? 'Unknown type'
    else if (type) draft.type = type
    if (!date) draft.error = draft.error ?? 'Invalid date'
    else draft.date = date
    return draft
  })
}

export function toCsv(txns: {
  date: string; type: string; amountMinor: number; category: string
  description: string; method: string; note?: string
}[]): string {
  const esc = (v: string): string => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const header = 'date,type,amount,category,description,method,note'
  const lines = txns.map((t) =>
    [t.date, t.type, (t.amountMinor / 100).toFixed(2), t.category, esc(t.description), t.method, esc(t.note ?? '')].join(','),
  )
  return [header, ...lines].join('\n')
}

export function downloadText(filename: string, text: string, mime = 'text/csv'): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
