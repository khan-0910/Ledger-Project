import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../lib/store'
import { AuthLayout } from './Login'

export default function Reset() {
  const { updatePassword, user } = useApp()
  const navigate = useNavigate()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (pw.length < 6) return setErr('Password must be at least 6 characters.')
    if (pw !== pw2) return setErr("Passwords don't match.")
    setErr(null)
    setBusy(true)
    const error = await updatePassword(pw)
    setBusy(false)
    if (error) return setErr(error + ' If you arrived without a reset session, request a fresh link from the login page.')
    navigate('/app', { replace: true })
  }

  return (
    <AuthLayout title="Set a new password" sub="Choose something memorable — you'll type it a lot.">
      {!user && (
        <p className="form-err" role="alert" style={{ marginBottom: 14 }}>
          You're not signed in with a reset session. Open the newest link we emailed you, or{' '}
          <Link to="/forgot" className="auth-mini-link">request a new one</Link>.
        </p>
      )}
      <form className="auth-form" onSubmit={(e) => void submit(e)}>
        <div>
          <label className="field-label" htmlFor="rs-pw">New password</label>
          <input id="rs-pw" className="input" type="password" autoComplete="new-password" placeholder="At least 6 characters" value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="rs-pw2">Confirm new password</label>
          <input id="rs-pw2" className="input" type="password" autoComplete="new-password" placeholder="Same again" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </div>
        {err && <p className="form-err" role="alert">{err}</p>}
        <button className="btn btn-primary btn-lg auth-submit" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </AuthLayout>
  )
}
