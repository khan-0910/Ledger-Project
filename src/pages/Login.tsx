import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useApp } from '../lib/store'
import LedgerLogo from '../components/Logo'
import { FloatObject } from '../components/bits/Stickers'
import { Eye, EyeOff } from '../components/Icons'

export default function Login() {
  const { signIn, demoSignIn } = useApp()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showPw, setShowPw] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !pw) {
      setErr('Enter your email and password.')
      return
    }
    setErr(null)
    setBusy(true)
    const error = await signIn(email.trim(), pw)
    setBusy(false)
    if (error) setErr(error)
    else navigate('/app', { replace: true })
  }

  async function demo() {
    setBusy(true)
    const error = await demoSignIn()
    setBusy(false)
    if (error) setErr(error)
    else navigate('/app', { replace: true })
  }

  return (
    <AuthLayout
      title="Welcome back"
      sub="Log in to see where your money stands."
    >
      <form className="auth-form" onSubmit={(e) => void submit(e)}>
        <div>
          <label className="field-label" htmlFor="li-email">Email</label>
          <input id="li-email" className="input" type="email" autoComplete="email" placeholder="you@college.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <div className="auth-pw-row">
            <label className="field-label" htmlFor="li-pw">Password</label>
            <Link to="/forgot" className="auth-mini-link">Forgot?</Link>
          </div>
          <div className="pw-field">
            <input id="li-pw" className="input" type={showPw ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={pw} onChange={(e) => setPw(e.target.value)} />
            <button type="button" className="pw-toggle" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'} aria-pressed={showPw}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {err && <p className="form-err" role="alert">{err}</p>}

        <button className="btn btn-primary btn-lg auth-submit" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Log in'}
        </button>
      </form>

      <div className="auth-divider"><span>or</span></div>

      <button className="btn btn-soft btn-lg auth-demo" onClick={() => void demo()} disabled={busy}>
        Try the demo student account
      </button>

      <p className="auth-switch">
        New to Ledger? <Link to="/signup">Create an account</Link>
      </p>
    </AuthLayout>
  )
}

export function AuthLayout({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="auth-page">
      <div className="auth-stickers" aria-hidden="true">
        <FloatObject kind="coin-stack" size={54} seed={4} depth="mid" className="as as-1" delay={0.35} />
        <FloatObject kind="receipt" size={40} seed={7} depth="far" className="as as-2" delay={0.55} />
        <FloatObject kind="sparkle" size={30} seed={10} depth="far" className="as as-3" delay={0.7} />
        <FloatObject kind="wallet" size={46} seed={2} depth="near" className="as as-4" delay={0.45} />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="auth-head"
      >
        <Link to="/" className="logo-link auth-logo" aria-label="Back to Ledger home">
          <LedgerLogo size={34} />
          <span className="logo-word">Ledger</span>
        </Link>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 26, rotate: -1 }}
        animate={{ opacity: 1, y: 0, rotate: -0.6 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="auth-card card"
      >
        <h1 className="auth-title">{title}</h1>
        <p className="auth-sub muted">{sub}</p>
        {children}
      </motion.div>
      <motion.p
        className="auth-foot faint"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >Balances stay hidden by default. Always.</motion.p>
    </div>
  )
}
