import { motion } from 'framer-motion'
import type { Txn } from '../lib/types'
import { category } from '../lib/categories'
import { AmountStatic } from './Amount'

export function TxnRow({ txn, index = 0, onOpen, reducedMotion }: {
  txn: Txn
  index?: number
  onOpen?: (t: Txn) => void
  reducedMotion?: boolean
}) {
  const def = category(txn.category)
  const income = txn.type === 'income'
  return (
    <motion.button
      className="txn-row"
      onClick={() => onOpen?.(txn)}
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.25), duration: 0.3 }}
      aria-label={`${income ? 'Income' : 'Expense'}: ${txn.description}`}
    >
      <span className="txn-main">
        <span className="txn-desc">{txn.description}</span>
        <span className="txn-meta">
          {def.label}
          {txn.note ? <span className="txn-note-dot" title={txn.note}> · {txn.note}</span> : null}
        </span>
      </span>
      <span className={`txn-amt ${income ? 'pos' : ''}`}>
        <AmountStatic value={txn.amountMinor} signed={income} decimals={txn.amountMinor % 100 !== 0} />
      </span>
    </motion.button>
  )
}
