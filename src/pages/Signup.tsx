import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useApp } from '../lib/store'
import { AuthLayout } from './Login'
import { Glyph } from '../components/bits/Glyph'

function pwScore(pw: string): number {
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return Math.min(4, s)
}

export default function Signup() {
  const { signUp } = useApp()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const score = useMemo(() => pwScore(pw), [pw])
  const labels = ['Too short', 'Weak', 'Okay', 'Good', 'Strong']

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setErr('Tell us your name — it makes Ledger feel yours.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErr('That email doesn\u2019t look right.')
    if (pw.length < 6) return setErr('Password must be at least 6 characters.')
    setErr(null)
    setBusy(true)
    const r = await signUp(email.trim(), pw, name.trim())
    setBusy(false)
    if (r.error) return setErr(r.error)
    if (r.needsConfirm) {
      setConfirming(true)
      return
    }
    navigate('/app', { replace: true })
  }

  if (confirming) {
    return (
      <AuthLayout title="Check your inbox" sub="We sent a confirmation link to your email.">
        <div className="confirm-note">
          <span className="confirm-emoji" aria-hidden><Glyph name="upi" size={34} /></span>
          <p className="muted">
            Confirm your email to activate your account, then log in. Didn't get it? Check spam, or wait a minute and try again.
          </p>
          <Link className="btn btn-primary" to="/login">Go to login</Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Create your Ledger" sub="One minute of setup. A semester of clarity.">
      <form className="auth-form" onSubmit={(e) => void submit(e)}>
        <div>
          <label className="field-label" htmlFor="su-name">Name</label>
          <input id="su-name" className="input" autoComplete="name" placeholder="Aarav" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="su-email">Email</label>
          <input id="su-email" className="input" type="email" autoComplete="email" placeholder="you@college.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="su-pw">Password</label>
          <input
            id="su-pw"
            className="input"
            type="password"
            autoComplete="new-password"
            placeholder="At least 6 characters"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          {pw && (
            <div className="pw-meter" aria-live="polite">
              <div className="pw-bars">
                {[0, 1, 2, 3].map((i) => (
                  <motion.span key={i} className={`pw-bar ${i < score ? `on s${score}` : ''}`} />
                ))}
              </div>
              <span className="pw-label faint">{labels[score]}</span>
            </div>
          )}
        </div>

        {err && <p className="form-err" role="alert">{err}</p>}

        <button className="btn btn-primary btn-lg auth-submit" type="submit" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthLayout>
  )
}
