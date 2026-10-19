import { useState } from 'react'
import { useApp } from '../lib/store'
import type { Txn } from '../lib/types'
import { category } from '../lib/categories'
import { fullDayLabel } from '../lib/dates'
import { SidePanel } from './ui'
import { Glyph } from './bits/Glyph'
import { Amount } from './Amount'
import { Pencil, Trash } from './Icons'
import AddExpense from './AddExpense'

export function TxnDetail({ txn, onClose }: { txn: Txn | null; onClose: () => void }) {
  const { deleteTxn, toast } = useApp()
  const [confirming, setConfirming] = useState(false)
  const [editing, setEditing] = useState(false)

  if (!txn) return null
  const def = category(txn.category)

  async function del() {
    const ok = await deleteTxn(txn!.id)
    if (ok) {
      toast('success', 'Transaction deleted.')
      onClose()
    }
  }

  return (
    <>
    <SidePanel open onClose={onClose} title="Transaction details">
      <div className="detail">
        <div className="detail-hero" style={{ '--cat': def.color } as React.CSSProperties}>
          <span className="detail-emoji" aria-hidden><Glyph name={def.glyph} size={26} /></span>
          <span className={`detail-amt display-num ${txn.type === 'income' ? 'pos' : ''}`}>
            <Amount value={txn.type === 'income' ? txn.amountMinor : -txn.amountMinor} decimals={txn.amountMinor % 100 !== 0} />
          </span>
          <span className="detail-desc">{txn.description}</span>
        </div>

        <dl className="detail-list">
          <div><dt>Status</dt><dd>{txn.type === 'income' ? 'Income' : 'Expense'}</dd></div>
          <div><dt>Category</dt><dd>{def.label}</dd></div>
          <div><dt>Date</dt><dd>{fullDayLabel(txn.date)}</dd></div>
          <div><dt>Paid via</dt><dd>{methodLabel(txn.method)}</dd></div>
          <div><dt>Added</dt><dd>{new Date(txn.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>
          {txn.note && <div><dt>Note</dt><dd className="detail-note">{txn.note}</dd></div>}
        </dl>

        {confirming ? (
          <div className="detail-confirm">
            <p>Delete this transaction? This can't be undone.</p>
            <div className="detail-confirm-row">
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>Keep it</button>
              <button className="btn btn-danger btn-sm" onClick={() => void del()}>Delete</button>
            </div>
          </div>
        ) : (
          <div className="detail-actions">
            <button className="btn btn-soft" onClick={() => setEditing(true)}>
              <Pencil size={15} /> Edit
            </button>
            <button className="btn btn-soft detail-delete" onClick={() => setConfirming(true)}>
              <Trash size={15} /> Delete
            </button>
          </div>
        )}
      </div>
    </SidePanel>
    {editing && <AddExpense edit={txn} onClose={() => { setEditing(false); onClose() }} />}
    </>
  )
}

export function methodLabel(m: Txn['method']): string {
  return { upi: 'UPI', card: 'Card', cash: 'Cash', netbanking: 'Bank transfer' }[m]
}
