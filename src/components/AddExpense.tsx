import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../lib/store'
import { parseAmountInput, formatINR } from '../lib/money'
import { CATEGORIES, EXPENSE_CATEGORIES } from '../lib/categories'
import { todayISO } from '../lib/dates'
import type { PaymentMethod, Txn, TxnType } from '../lib/types'
import { Modal } from './ui'
import { Glyph, type GlyphName } from './bits/Glyph'

const METHODS: { value: PaymentMethod; label: string; glyph: GlyphName }[] = [
  { value: 'upi', label: 'UPI', glyph: 'upi' },
  { value: 'card', label: 'Card', glyph: 'card' },
  { value: 'cash', label: 'Cash', glyph: 'cash' },
  { value: 'netbanking', label: 'Bank', glyph: 'bank' },
]

export default function AddExpense({ onClose, edit }: { onClose: () => void; edit?: Txn }) {
  const { upsertTxn, toast } = useApp()
  const [type, setType] = useState<TxnType>(edit?.type ?? 'expense')
  const [amount, setAmount] = useState(edit ? (edit.amountMinor / 100).toFixed(edit.amountMinor % 100 === 0 ? 0 : 2) : '')
  const [category, setCategory] = useState<string>(edit?.category ?? 'food')
  const [desc, setDesc] = useState(edit?.description ?? '')
  const [date, setDate] = useState(edit?.date ?? todayISO())
  const [method, setMethod] = useState<PaymentMethod>(edit?.method ?? 'upi')
  const [note, setNote] = useState(edit?.note ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const cats = useMemo(() => (type === 'income' ? CATEGORIES.filter((c) => c.id === 'income') : EXPENSE_CATEGORIES), [type])

  useEffect(() => {
    if (type === 'income' && !cats.some((c) => c.id === category)) setCategory('income')
    if (type === 'expense' && category === 'income') setCategory('food')
  }, [type, category, cats])

  const parsed = parseAmountInput(amount)
  const amountError = amount !== '' && parsed === null

  useEffect(() => {
    if (err) setErr(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, type, category, desc, date])

  async function save() {
    if (parsed === null) {
      setErr('Enter an amount greater than zero.')
      return
    }
    setSaving(true)
    const txn: Txn = {
      id: edit?.id ?? crypto.randomUUID(),
      type,
      amountMinor: parsed,
      category,
      description: desc.trim() || (type === 'income' ? 'Income' : 'Expense'),
      date,
      method: type === 'income' ? 'netbanking' : method,
      note: note.trim() || undefined,
      createdAt: edit?.createdAt ?? new Date().toISOString(),
    }
    const ok = await upsertTxn(txn)
    setSaving(false)
    if (ok) {
      toast('success', edit ? 'Transaction updated.' : type === 'income' ? 'Income added' : 'Expense added — balances updated.')
      onClose()
    } else {
      setErr("Couldn't save. Check your connection and try again.")
    }
  }

  return (
    <Modal open onClose={onClose} title={edit ? 'Edit transaction' : 'Add transaction'} wide>
      <div className="addform">
        <div className="addform-type" role="tablist" aria-label="Transaction type">
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={type === t}
              className={`type-tab ${type === t ? 'active' : ''} ${t === 'income' ? 'income' : ''}`}
              onClick={() => setType(t)}
            >
              {t === 'expense' ? '− Expense' : '+ Income'}
            </button>
          ))}
        </div>

        <div className={`addform-amount ${type === 'income' ? 'income' : ''} ${amountError ? 'invalid' : ''}`}>
          <span className="addform-cur">₹</span>
          <input
            className="addform-input"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
            aria-label="Amount in rupees"
            aria-invalid={amountError}
            autoFocus
          />
          {parsed !== null && (
            <motion.span key={parsed} className="addform-preview" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
              {formatINR(parsed, { decimals: parsed % 100 !== 0 })}
            </motion.span>
          )}
        </div>
        {amountError && <p className="form-err" role="alert">Enter a valid amount — numbers only, like 250 or 99.50.</p>}

        <div className="field-label">Category</div>
        <div className="cat-grid" role="listbox" aria-label="Category">
          {cats.map((c) => (
            <button
              key={c.id}
              role="option"
              aria-selected={category === c.id}
              className={`cat-cell ${category === c.id ? 'active' : ''}`}
              style={{ '--cat': c.color } as React.CSSProperties}
              onClick={() => setCategory(c.id)}
            >
              <span className="cat-cell-emoji"><Glyph name={c.glyph} size={22} /></span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        <div className="addform-row">
          <div className="addform-col">
            <label className="field-label" htmlFor="af-desc">Description</label>
            <input id="af-desc" className="input" placeholder={type === 'income' ? 'e.g. Monthly allowance' : 'e.g. Lunch at campus cafe'} value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={80} />
          </div>
          <div className="addform-col">
            <label className="field-label" htmlFor="af-date">Date</label>
            <input id="af-date" className="input" type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        {type === 'expense' && (
          <>
            <div className="field-label">Paid via</div>
            <div className="method-row" role="listbox" aria-label="Payment method">
              {METHODS.map((m) => (
                <button
                  key={m.value}
                  role="option"
                  aria-selected={method === m.value}
                  className={`method-chip ${method === m.value ? 'active' : ''}`}
                  onClick={() => setMethod(m.value)}
                >
                  <span aria-hidden><Glyph name={m.glyph} size={16} /></span> {m.label}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="addform-col">
          <label className="field-label" htmlFor="af-note">Note <span className="faint">(optional)</span></label>
          <input id="af-note" className="input" placeholder="Anything worth remembering" value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} />
        </div>

        {err && <p className="form-err" role="alert">{err}</p>}

        <div className="addform-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => void save()} disabled={saving || parsed === null}>
            {saving ? 'Saving…' : edit ? 'Save changes' : `Add ${type === 'income' ? 'income' : 'expense'}`}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/** Shared hook: opens the global add sheet (used by dashboard FAB, empty states). */
export function useOpenAdd(): () => void {
  return () => window.dispatchEvent(new Event('ledger:open-add'))
}
