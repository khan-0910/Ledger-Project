import { useState } from 'react'
import { useApp } from '../lib/store'
import { Modal } from './ui'

/** One-time display of a new recovery code. Can't be closed until the user says it's saved. */
export default function RecoveryCodeModal() {
  const { recoveryCode, ackRecoveryCode, user } = useApp()
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  if (!recoveryCode) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCode)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const download = () => {
    const text = `Ledger recovery code\nAccount: ${user?.email ?? ''}\n\n${recoveryCode}\n\nKeep this somewhere safe. With it you can open your data if you forget your password.\n`
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'ledger-recovery-code.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const done = () => {
    setSaved(false)
    setCopied(false)
    ackRecoveryCode()
  }

  return (
    <Modal open title="Save your recovery code" onClose={() => { /* must confirm first */ }}>
      <div style={{ display: 'grid', gap: 14 }}>
        <p className="muted">
          Your data is encrypted with your password, so nobody else can read it, not even us. If you forget your password,
          this code is the <b>only</b> way back in. We can't see it or resend it.
        </p>
        <code
          aria-label="Recovery code"
          style={{
            display: 'block', padding: '16px 18px', borderRadius: 14, fontSize: 18, fontWeight: 700,
            letterSpacing: '0.06em', textAlign: 'center', wordBreak: 'break-all', userSelect: 'all',
            fontFamily: 'var(--font-mono, monospace)', background: 'var(--surface-2)', border: '2px dashed var(--sticker-border)',
          }}
        >
          {recoveryCode}
        </code>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-soft" onClick={() => void copy()}>{copied ? 'Copied' : 'Copy'}</button>
          <button className="btn btn-soft" onClick={download}>Download .txt</button>
        </div>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 700 }}>
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
          I saved it somewhere safe (password manager, notes, or paper)
        </label>
        <button className="btn btn-primary btn-lg" disabled={!saved} onClick={done}>Continue</button>
      </div>
    </Modal>
  )
}
