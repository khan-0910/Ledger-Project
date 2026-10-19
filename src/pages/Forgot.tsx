import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../lib/store'
import { AuthLayout } from './Login'

export default function Forgot() {
  const { sendReset } = useApp()
  const [email, setEmail] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErr('That email doesn\u2019t look right.')
      return
    }
    setErr(null)
    setBusy(true)
    const error = await sendReset(email.trim())
    setBusy(false)
    if (error) setErr(error)
    else setSent(true)
  }

  if (sent) {
    return (
      <AuthLayout title="Reset link sent" sub={`If an account exists for ${email}, a reset link is on its way.`}>
        <div className="confirm-note">
          <span className="confirm-emoji" aria-hidden>📨</span>
          <p className="muted">The link expires soon — use it while it's fresh. Then set a new password and get back to your Ledger.</p>
          <Link className="btn btn-primary" to="/login">Back to login</Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Forgot password" sub="Enter your email and we'll send a reset link.">
      <form className="auth-form" onSubmit={(e) => void submit(e)}>
        <div>
          <label className="field-label" htmlFor="fp-email">Email</label>
          <input id="fp-email" className="input" type="email" autoComplete="email" placeholder="you@college.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {err && <p className="form-err" role="alert">{err}</p>}
        <button className="btn btn-primary btn-lg auth-submit" type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className="auth-switch"><Link to="/login">← Back to login</Link></p>
    </AuthLayout>
  )
}
