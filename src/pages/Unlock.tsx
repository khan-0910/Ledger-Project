import React, { useState } from 'react'
import { useApp } from '../lib/store'
import { AuthLayout } from './Login'

/**
 * Shown when signed in but this device doesn't hold the data key yet.
 * - Password: re-derive the key.
 * - Recovery code + new password: for after a reset, or a forgotten password.
 * - Start fresh: both lost; wipes the (unreadable) data and starts a new vault.
 */
export default function Unlock() {
  const { user, lockMode, unlockSession, recoverWithCode, startFresh, signOut } = useApp()
  const [mode, setMode] = useState<'password' | 'recovery' | 'fresh'>(lockMode)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [code, setCode] = useState('')
  const [sure, setSure] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(fn: () => Promise<string | null>) {
    setErr(null)
    setBusy(true)
    const e = await fn()
    setBusy(false)
    if (e) setErr(e)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'password') return void run(() => unlockSession(pw))
    if (pw !== pw2) return setErr("Passwords don't match.")
    if (mode === 'recovery') return void run(() => recoverWithCode(code, pw))
    if (sure.trim().toUpperCase() !== 'START FRESH') return setErr('Type START FRESH to confirm.')
    return void run(() => startFresh(pw))
  }

  const go = (m: typeof mode) => {
    setMode(m)
    setErr(null)
  }

  const copy = {
    password: { title: 'Unlock your Ledger', sub: `Your data is encrypted. Enter the password for ${user?.email ?? 'your account'} to open it on this device.` },
    recovery: {
      title: 'Use your recovery code',
      sub: lockMode === 'recovery'
        ? 'Your password changed, so your data needs your recovery code once. Then pick the password you want to keep.'
        : 'Enter the recovery code you saved when you signed up, then pick a new password.',
    },
    fresh: { title: 'Start fresh', sub: 'Without your password or recovery code, nobody can read your old data, not even us. You can wipe it and start again.' },
  }[mode]

  return (
    <AuthLayout title={copy.title} sub={copy.sub}>
      <form className="auth-form" onSubmit={submit}>
        {mode === 'recovery' && (
          <div>
            <label className="field-label" htmlFor="ul-code">Recovery code</label>
            <input
              id="ul-code" className="input" autoComplete="off" spellCheck={false}
              placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" value={code} onChange={(e) => setCode(e.target.value)}
              style={{ fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.04em' }}
            />
          </div>
        )}
        <div>
          <label className="field-label" htmlFor="ul-pw">{mode === 'password' ? 'Password' : 'New password'}</label>
          <input
            id="ul-pw" className="input" type="password"
            autoComplete={mode === 'password' ? 'current-password' : 'new-password'}
            value={pw} onChange={(e) => setPw(e.target.value)}
          />
        </div>
        {mode !== 'password' && (
          <div>
            <label className="field-label" htmlFor="ul-pw2">Repeat new password</label>
            <input id="ul-pw2" className="input" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
        )}
        {mode === 'fresh' && (
          <div>
            <label className="field-label" htmlFor="ul-sure">Type START FRESH to wipe your old data</label>
            <input id="ul-sure" className="input" autoComplete="off" value={sure} onChange={(e) => setSure(e.target.value)} />
          </div>
        )}
        {err && <p className="form-err" role="alert">{err}</p>}
        <button className={`btn ${mode === 'fresh' ? 'btn-danger' : 'btn-primary'} btn-lg auth-submit`} type="submit" disabled={busy}>
          {busy ? 'Working…' : mode === 'password' ? 'Unlock' : mode === 'recovery' ? 'Unlock and save password' : 'Wipe and start fresh'}
        </button>
      </form>
      <p className="auth-switch">
        {mode === 'password' && <button type="button" className="link-btn" onClick={() => go('recovery')}>Forgot password? Use recovery code</button>}
        {mode === 'recovery' && (
          <>
            {lockMode === 'password' && <><button type="button" className="link-btn" onClick={() => go('password')}>Back to password</button> · </>}
            <button type="button" className="link-btn" onClick={() => go('fresh')}>Lost the code too?</button>
          </>
        )}
        {mode === 'fresh' && <button type="button" className="link-btn" onClick={() => go('recovery')}>I found my code</button>}
        {' · '}
        <button type="button" className="link-btn" onClick={() => void signOut()}>Log out</button>
      </p>
    </AuthLayout>
  )
}
