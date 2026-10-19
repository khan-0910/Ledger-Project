import { useMemo, useState } from 'react'
import { useApp } from '../lib/store'
import { Segmented } from '../components/ui'
import { TxnRow } from '../components/TxnRow'
import { TxnDetail } from '../components/TxnDetail'
import { useOpenAdd } from '../components/AddExpense'
import { CATEGORIES } from '../lib/categories'
import { monthLabel as monthLabelOf } from '../lib/dates'
import { totalOf } from '../lib/selectors'
import { usePrivacyText } from '../components/Amount'
import type { Txn, TxnType } from '../lib/types'

type SortKey = 'recent' | 'oldest' | 'high' | 'low'

export default function Transactions() {
  const { data } = useApp()
  const { fmt: pfmt } = usePrivacyText()
  const openAdd = useOpenAdd()
  const [q, setQ] = useState('')
  const [type, setType] = useState<'all' | TxnType>('all')
  const [cat, setCat] = useState<'all' | string>('all')
  const [month, setMonth] = useState<'all' | string>('all')
  const [sort, setSort] = useState<SortKey>('recent')
  const [detail, setDetail] = useState<Txn | null>(null)

  const txns = data?.txns ?? []

  const months = useMemo(() => {
    const keys = new Set<string>(txns.map((t) => t.date.slice(0, 7)))
    return Array.from(keys).sort().reverse()
  }, [txns])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let list = txns.filter((t) => {
      if (type !== 'all' && t.type !== type) return false
      if (cat !== 'all' && t.category !== cat) return false
      if (month !== 'all' && !t.date.startsWith(month)) return false
      if (needle && !(`${t.description} ${t.note ?? ''} ${t.category}`.toLowerCase().includes(needle))) return false
      return true
    })
    switch (sort) {
      case 'oldest': list = [...list].sort((a, b) => a.date.localeCompare(b.date)); break
      case 'high': list = [...list].sort((a, b) => b.amountMinor - a.amountMinor); break
      case 'low': list = [...list].sort((a, b) => a.amountMinor - b.amountMinor); break
      default: /* store keeps recency order */ break
    }
    return list
  }, [txns, q, type, cat, month, sort])

  /* Group by relative day when sorting by date; flat list otherwise */
  const groups = useMemo(() => {
    if (sort === 'high' || sort === 'low') {
      return [{ label: 'Results', items: filtered }]
    }
    const map = new Map<string, Txn[]>()
    for (const t of filtered) {
      const label = relativeGroup(t.date)
      const arr = map.get(label) ?? []
      arr.push(t)
      map.set(label, arr)
    }
    const order = ['Today', 'Yesterday', 'This week', 'Earlier']
    return order.filter((l) => map.has(l)).map((l) => ({ label: l, items: map.get(l)! }))
  }, [filtered, sort])

  const totalExpense = totalOf(filtered, 'expense')
  const totalIncome = totalOf(filtered, 'income')

  return (
    <div className="page page-txns">
      <header className="page-head">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-sub muted">
            {pfmt(totalExpense, { signed: true })} spent · {pfmt(totalIncome, { signed: true })} income in view
          </p>
        </div>
        
      </header>

      <div className="txn-toolbar card">
        <div className="txn-search">
          <input
            className="input"
            placeholder="Search description or note…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search transactions"
          />
        </div>
        <div className="txn-filters">
          <Segmented
            size="sm"
            options={[
              { value: 'all', label: 'All' },
              { value: 'expense', label: 'Expenses' },
              { value: 'income', label: 'Income' },
            ]}
            value={type}
            onChange={setType}
          />
          <select className="select select-sm" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category">
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <select className="select select-sm" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Filter by month">
            <option value="all">All months</option>
            {months.map((m) => (
              <option key={m} value={m}>{monthLabelOf(m)}</option>
            ))}
          </select>
          <select className="select select-sm" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort transactions">
            <option value="recent">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="high">Amount: high → low</option>
            <option value="low">Amount: low → high</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty card">
          {txns.length === 0 ? (
            <>
              <h3>Your Ledger is quiet.</h3>
              <p className="muted">Add your first expense and start understanding where your money goes.</p>
            </>
          ) : (
            <>
              <h3>Nothing matches those filters.</h3>
              <p className="muted">Try loosening the search or picking a different month.</p>
            </>
          )}
          <button className="btn btn-accent" onClick={openAdd}>Add transaction</button>
        </div>
      ) : (
        <div className="txn-groups">
          {groups.map((g) => (
            <section key={g.label} className="txn-group" aria-label={g.label}>
              <div className="txn-group-head">
                <h2 className="txn-group-title">{g.label}</h2>
                <span className="txn-group-sum faint">
                  <SumFor items={g.items} />
                </span>
              </div>
              <div className="card txn-list">
                {g.items.map((t, i) => (
                  <TxnRow key={t.id} txn={t} index={i} onOpen={setDetail} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <TxnDetail txn={detail} onClose={() => setDetail(null)} />
    </div>
  )
}

function relativeGroup(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000)
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return 'This week'
  return 'Earlier'
}

function SumFor({ items }: { items: Txn[] }) {
  const { fmt } = usePrivacyText()
  const net = totalOf(items, 'income') - totalOf(items, 'expense')
  return <>{fmt(net, { signed: true })}</>
}
