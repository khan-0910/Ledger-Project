import React, { useRef, useState } from 'react'
import { useApp } from '../lib/store'
import { supabaseEnabled } from '../lib/db/supabase'
import { parseAmountInput, formatINR } from '../lib/money'
import { EXPENSE_CATEGORIES } from '../lib/categories'
import { downloadText, detectMap, rowsToDrafts, splitCsv, toCsv, type CsvDraft, type RawCsvRow } from '../lib/csv'
import { todayISO } from '../lib/dates'
import type { Txn } from '../lib/types'
import { Download, Upload, X } from '../components/Icons'
import { passwordProblem } from '../lib/security'
import { Glyph, type GlyphName, glyphFor } from '../components/bits/Glyph'

type Tab = 'profile' | 'privacy' | 'data' | 'about'

export default function Settings() {
  const { data } = useApp()
  const [tab, setTab] = useState<Tab>('profile')

  if (!data) return null

  const tabs: { id: Tab; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'data', label: 'Data' },
    { id: 'about', label: 'About' },
  ]

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub muted">Make Ledger behave exactly how you like.</p>
        </div>
      </header>

      <div className="set-tabs" role="tablist" aria-label="Settings sections">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`set-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && <ProfileTab />}
      {tab === 'privacy' && <PrivacyTab />}
      {tab === 'data' && <DataTab />}
      {tab === 'about' && <AboutTab />}
    </div>
  )
}

/* ================= PROFILE ================= */

function ProfileTab() {
  const { data, user, updateProfile, updatePassword, toast } = useApp()
  const [name, setName] = useState(data?.profile.name ?? '')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwErr, setPwErr] = useState<string | null>(null)
  const [busyPw, setBusyPw] = useState(false)

  const [total, setTotal] = useState(data ? String(data.profile.totalBalanceMinor / 100) : '')
  const [strict, setStrict] = useState(data ? String(data.profile.strictSavingsMinor / 100) : '')
  const [gf, setGf] = useState(data ? String(data.profile.guiltFreeMinor / 100) : '')
  const [busyBal, setBusyBal] = useState(false)
  const [balErr, setBalErr] = useState<string | null>(null)

  const totalMinor = parseAmountInput(total)
  const strictMinor = parseAmountInput(strict) ?? 0
  const gfMinor = parseAmountInput(gf) ?? 0
  const allocated = strictMinor + gfMinor

  async function saveBalances() {
    if (totalMinor === null) return setBalErr('Total balance must be a valid amount.')
    if (allocated > totalMinor) return setBalErr('Allocations exceed your total — trim something first.')
    setBusyBal(true)
    await updateProfile({
      totalBalanceMinor: totalMinor,
      strictSavingsMinor: strictMinor,
      guiltFreeMinor: gfMinor,
    })
    setBusyBal(false)
    toast('success', 'Balances updated.')
  }

  async function changePw() {
    { const weak = passwordProblem(pw); if (weak) return setPwErr(weak) }
    if (pw !== pw2) return setPwErr("Passwords don't match.")
    setBusyPw(true)
    const err = await updatePassword(pw)
    setBusyPw(false)
    if (err) return setPwErr(err)
    setPw(''); setPw2('')
    toast('success', 'Password updated.')
  }

  return (
    <div className="set-grid">
      <section className="card set-card">
        <h2 className="card-title">Profile</h2>
        <div>
          <label className="field-label" htmlFor="st-name">Display name</label>
          <div className="set-inline">
            <input id="st-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
            <button className="btn btn-soft" onClick={() => { void updateProfile({ name: name.trim() || 'Student' }); toast('success', 'Name updated.') }}>Save</button>
          </div>
          <p className="faint set-hint">Signed in as {user?.email}</p>
        </div>
      </section>

      <section className="card set-card">
        <h2 className="card-title">Your numbers</h2>
        <p className="faint set-hint">Update these whenever life happens — scholarship day, rent day, surprise day.</p>
        <div className="set-bal-grid">
          <div>
            <label className="field-label" htmlFor="st-total">Total balance</label>
            <input id="st-total" className="input" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value.replace(/[^\d.]/g, ''))} />
          </div>
          <div>
            <label className="field-label" htmlFor="st-strict">Strict savings</label>
            <input id="st-strict" className="input" inputMode="decimal" value={strict} onChange={(e) => setStrict(e.target.value.replace(/[^\d.]/g, ''))} />
          </div>
          <div>
            <label className="field-label" htmlFor="st-gf">Guilt-free</label>
            <input id="st-gf" className="input" inputMode="decimal" value={gf} onChange={(e) => setGf(e.target.value.replace(/[^\d.]/g, ''))} />
          </div>
        </div>
        {balErr && <p className="form-err" role="alert">{balErr}</p>}
        <button className="btn btn-primary" onClick={() => void saveBalances()} disabled={busyBal}>
          {busyBal ? 'Saving…' : 'Save balances'}
        </button>
      </section>

      <section className="card set-card">
        <h2 className="card-title">Protected balance</h2>
        <p className="faint set-hint">A minimum amount you want untouched in your account (like your bank's minimum-balance rule). When on, Safe to Spend keeps this out of reach.</p>
        <MabToggle />
      </section>

      <section className="card set-card">
        <h2 className="card-title">Essential commitments</h2>
        <p className="faint set-hint">Planned must-pay costs this month (rent, phone, college fees). They're reserved from Safe to Spend until paid — planned ≠ spent.</p>
        <EssentialsEditor />
      </section>

      <section className="card set-card">
        <h2 className="card-title">Change password</h2>
        {!supabaseEnabled && <p className="faint set-hint">Demo mode — stored locally in this browser only.</p>}
        <div className="set-inline">
          <input className="input" type="password" placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" aria-label="New password" />
          <input className="input" type="password" placeholder="Repeat it" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" aria-label="Repeat new password" />
          <button className="btn btn-soft" onClick={() => void changePw()} disabled={busyPw}>{busyPw ? 'Saving…' : 'Update'}</button>
        </div>
        {pwErr && <p className="form-err" role="alert">{pwErr}</p>}
      </section>

      <AccountSafety />
    </div>
  )
}

/* ================= RECOVERY CODE + DELETE ACCOUNT ================= */

function AccountSafety() {
  const { user, makeRecoveryCode, deleteAccount, toast } = useApp()
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const cloud = user?.mode === 'supabase'

  async function newCode() {
    setBusy(true)
    const err = await makeRecoveryCode()
    setBusy(false)
    if (err) toast('error', err)
  }

  async function remove() {
    if (confirm.trim().toUpperCase() !== 'DELETE') return toast('error', 'Type DELETE to confirm.')
    setBusy(true)
    const err = await deleteAccount()
    setBusy(false)
    if (err) toast('error', err)
  }

  return (
    <>
      {cloud && (
        <section className="card set-card">
          <h2 className="card-title">Recovery code</h2>
          <p className="faint set-hint">
            Your data is end-to-end encrypted. If you forget your password, your recovery code is the only way back in.
            Lost it? Make a new one. The old code stops working.
          </p>
          <button className="btn btn-soft" onClick={() => void newCode()} disabled={busy}>Make a new recovery code</button>
        </section>
      )}
      <section className="card set-card">
        <h2 className="card-title">Delete account</h2>
        <p className="faint set-hint">
          {cloud
            ? 'Permanently deletes your account, encryption keys and all your data from our servers. This cannot be undone. Export a CSV first if you want a copy.'
            : 'Removes this demo account and its data from this browser.'}
        </p>
        <div className="set-inline">
          <input className="input" placeholder="Type DELETE" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label="Type DELETE to confirm" autoComplete="off" />
          <button className="btn btn-danger" onClick={() => void remove()} disabled={busy}>{busy ? 'Working…' : 'Delete my account'}</button>
        </div>
        <p className="faint set-hint" style={{ marginTop: 10 }}><a href={import.meta.env.BASE_URL + 'privacy'}>Read the privacy policy</a></p>
      </section>
    </>
  )
}

/* ================= MAB / PROTECTED BALANCE ================= */

function MabToggle() {
  const { data, updateProfile, toast } = useApp()
  if (!data) return null
  const p = data.profile
  const enabled = p.mabEnabled ?? false
  const [amt, setAmt] = useState(p.protectedBalanceMinor ? String(p.protectedBalanceMinor / 100) : '')
  const amtMinor = parseAmountInput(amt)
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(enabled)
  const total = p.totalBalanceMinor

  async function save(on: boolean) {
    if (on && (amtMinor === null || amtMinor <= 0)) {
      toast('error', 'Enter a protected amount first, then hit Save.')
      return
    }
    if (on && amtMinor! >= total) {
      toast('error', "That's your whole balance — nothing would be spendable. Pick a smaller floor.")
      return
    }
    setBusy(true)
    await updateProfile({ protectedBalanceMinor: on ? amtMinor ?? 0 : p.protectedBalanceMinor ?? 0, mabEnabled: on })
    setBusy(false)
    setOpen(on)
    toast('success', on ? 'Protected balance on — Safe to Spend will respect it.' : 'Protected balance off.')
  }

  return (
    <div>
      <label className="peeklock-row">
        <input
          type="checkbox"
          className="checkbox"
          checked={enabled}
          onChange={(e) => {
            setOpen(e.target.checked)
            if (!e.target.checked) void save(false)
          }}
        />
        <span>Protect a minimum balance (MAB)</span>
      </label>
      {open && (
        <div className="set-inline" style={{ marginTop: 10 }}>
          <input
            className="input"
            inputMode="decimal"
            placeholder="e.g. 2000"
            value={amt}
            aria-label="Protected amount in rupees"
            onChange={(e) => setAmt(e.target.value.replace(/^0+|[^\d.]/g, ''))}
          />
          <button className="btn btn-soft" onClick={() => void save(true)} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
    </div>
  )
}

/* ================= ESSENTIAL COMMITMENTS ================= */

const ESS_GLYPHS: GlyphName[] = ['living', 'phone', 'bus', 'gradcap', 'bulb', 'upi', 'pill', 'box']

function EssentialsEditor() {
  const { data, setEssentials, toast } = useApp()
  if (!data) return null
  const list = data.essentials ?? []
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState<GlyphName>('living')
  const [cat, setCat] = useState('living')
  const [amt, setAmt] = useState('')
  const [dueDay, setDueDay] = useState('1')

  const amtMinor = parseAmountInput(amt)

  async function add() {
    if (!name.trim()) return toast('error', 'Give the commitment a name.')
    if (amtMinor === null || amtMinor <= 0) return toast('error', 'Enter the amount you expect to pay.')
    const item = {
      id: crypto.randomUUID(),
      name: name.trim(),
      emoji,
      amountMinor: amtMinor,
      category: cat,
      dueDay: Math.min(31, Math.max(1, Number(dueDay) || 1)),
    }
    await setEssentials([...list, item])
    setName(''); setAmt(''); setDueDay('1')
    toast('success', `“${item.name}” reserved from Safe to Spend.`)
  }

  async function remove(id: string) {
    await setEssentials(list.filter((e) => e.id !== id))
  }

  const planned = list.reduce((s, e) => s + e.amountMinor, 0)

  return (
    <div>
      {list.length > 0 && (
        <ul className="ess-list">
          {list.map((e) => (
            <li key={e.id} className="ess-item">
              <span className="ess-emoji" aria-hidden><Glyph name={glyphFor(e.emoji, 'living')} size={20} /></span>
              <span className="ess-name">{e.name}</span>
              <span className="faint ess-due">due day {e.dueDay}</span>
              <span className="ess-amt display-num">{formatINR(e.amountMinor)}</span>
              <button className="icon-btn" aria-label={`Remove ${e.name}`} onClick={() => void remove(e.id)}><X size={15} /></button>
            </li>
          ))}
          <li className="ess-total faint">Reserved this month: <strong>{formatINR(planned, { decimals: planned % 100 !== 0 })}</strong></li>
        </ul>
      )}
      <div className="ess-form">
        <div className="emoji-row" role="listbox" aria-label="Commitment icon">
          {ESS_GLYPHS.map((m) => (
            <button key={m} className={`emoji-cell ${emoji === m ? 'on' : ''}`} role="option" aria-selected={emoji === m} onClick={() => setEmoji(m)} aria-label={m}><Glyph name={m} size={18} /></button>
          ))}
        </div>
        <div className="ess-form-grid">
          <input className="input" placeholder="e.g. Hostel rent" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} aria-label="Commitment name" />
          <select className="select" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
            {EXPENSE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <input className="input" inputMode="decimal" placeholder="₹ amount" value={amt} onChange={(e) => setAmt(e.target.value.replace(/^0+|[^\d.]/g, ''))} aria-label="Amount in rupees" />
          <input className="input" inputMode="numeric" placeholder="Due day" value={dueDay} onChange={(e) => setDueDay(e.target.value.replace(/[^\d]/g, '').slice(0, 2))} aria-label="Due day of month" />
        </div>
        <button className="btn btn-soft" onClick={() => void add()}>+ Add commitment</button>
      </div>
    </div>
  )
}

/* ================= PRIVACY ================= */

/**
 * Privacy Tab — matches the actual model exactly:
 * a single, explicit Show/Hide control next to the Dashboard's primary
 * Total Balance. No hover, no keyboard shortcuts, no global modes.
 */
function PrivacyTab() {
  return (
    <div className="set-grid">
      <section className="card set-card">
        <h2 className="card-title">Balance privacy</h2>
        <p className="muted">
          Your Dashboard's primary <strong>Total Balance</strong> starts hidden every time you open Ledger.
          The labelled <strong>Show balance / Hide balance</strong> button sits right beside it — clicking it
          reveals or re-masks that one number.
        </p>
        <p className="muted">
          Everything else is always readable: transaction amounts, budget figures, goal progress,
          analytics and recurring totals are never masked.
        </p>
        <p className="faint set-hint">
          This is visual masking only — your account itself is protected by authentication and database security.
        </p>
      </section>
    </div>
  )
}

/* ================= DATA (import / export) ================= */

function DataTab() {
  const { data, dispatch, toast, wipeData, reseedDemo, user } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<string[][] | null>(null)
  const [map, setMap] = useState<Partial<Record<keyof RawCsvRow, number>>>({})
  const [drafts, setDrafts] = useState<CsvDraft[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [confirmWipe, setConfirmWipe] = useState(false)

  const txns = data?.txns ?? []

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      const all = splitCsv(String(reader.result ?? ''))
      if (all.length === 0) return toast('error', "That file looked empty.")
      const [head, ...rest] = all
      setHeaders(head)
      setRows(rest)
      setMap(detectMap(head))
      setDrafts(rowsToDrafts(rest, detectMap(head)))
    }
    reader.readAsText(f)
  }

  async function doImport() {
    if (!drafts.length) return
    setBusy(true)
    const valid = drafts.filter((d) => !d.error)
    const txnsNew: Txn[] = valid.map((d) => ({
      id: crypto.randomUUID(),
      type: d.type,
      amountMinor: d.amountMinor,
      category: d.category,
      description: d.description || 'Imported',
      date: d.date,
      method: d.method,
      note: d.note || undefined,
      createdAt: new Date().toISOString(),
    }))
    // Saved through the store, so cloud accounts stay encrypted.
    await dispatch({ kind: 'setTxns', txns: [...txnsNew, ...txns] })
    setBusy(false)
    setRows(null); setDrafts([]); setMap({})
    toast('success', `Imported ${txnsNew.length} transaction${txnsNew.length === 1 ? '' : 's'}.`)
  }

  function exportCsv() {
    if (!data) return
    const csv = toCsv(txns)
    downloadText(`ledger-export-${todayISO()}.csv`, csv)
    toast('success', 'Exported — check your downloads.')
  }

  const validCount = drafts.filter((d) => !d.error).length
  const errCount = drafts.length - validCount

  return (
    <div className="set-grid">
      <section className="card set-card">
        <h2 className="card-title">Export</h2>
        <p className="muted">Download everything as CSV. The file contains real values — keep it somewhere safe.</p>
        <button className="btn btn-primary" onClick={exportCsv} disabled={txns.length === 0}>
          <Download size={16} /> Export CSV ({txns.length})
        </button>
      </section>

      <section className="card set-card">
        <h2 className="card-title">Import CSV</h2>
        <p className="muted">Bring a bank or app export. Nothing is overwritten — imports add to what you have.</p>
        <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onFile} />
        <button className="btn btn-soft" onClick={() => fileRef.current?.click()}><Upload size={16} /> Choose CSV file</button>

        {rows && (
          <div className="import-preview">
            <div className="import-map">
              <span className="field-label">Column mapping</span>
              <div className="import-map-grid">
                {(Object.keys(map) as (keyof RawCsvRow)[]).map((f) => (
                  <div key={f} className="import-map-row">
                    <span>{f}</span>
                    <select
                      className="select select-sm"
                      value={map[f] ?? -1}
                      onChange={(e) => {
                        const next = { ...map, [f]: Number(e.target.value) }
                        setMap(next)
                        setDrafts(rowsToDrafts(rows, next))
                      }}
                      aria-label={`Column for ${f}`}
                    >
                      {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div className="import-table" role="table" aria-label="Import preview">
              <div className="import-tr import-th" role="row">
                <span>Row</span><span>Date</span><span>Type</span><span>Amount</span><span>Category</span><span>Description</span><span></span>
              </div>
              {drafts.slice(0, 12).map((d) => (
                <div key={d.row} className="import-tr" role="row">
                  <span className="faint">{d.row}</span>
                  <span>{d.date}</span>
                  <span>{d.type}</span>
                  <span>{formatINR(d.amountMinor, { decimals: d.amountMinor % 100 !== 0 })}</span>
                  <span>{d.category}</span>
                  <span className="truncate">{d.description || '—'}</span>
                  <span className="import-err">{d.error ?? ''}</span>
                </div>
              ))}
            </div>
            <div className="import-actions">
              <span className={errCount > 0 ? 'form-err' : 'faint'}>
                {validCount} ready{errCount > 0 ? ` · ${errCount} will be skipped` : ''}
              </span>
              <div className="flex gap-2">
                <button className="btn btn-ghost btn-sm" onClick={() => { setRows(null); setDrafts([]) }}>Cancel</button>
                <button className="btn btn-accent" onClick={() => void doImport()} disabled={busy || validCount === 0}>
                  {busy ? 'Importing…' : `Import ${validCount}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="card set-card danger-card">
        <h2 className="card-title">Danger zone</h2>
        {confirmWipe ? (
          <div className="wipe-confirm">
            <p>This deletes all transactions, budgets, goals and recurring items. Your account and profile stay. There is no undo.</p>
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmWipe(false)}>Keep my data</button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  void wipeData()
                  setConfirmWipe(false)
                  toast('success', 'All financial data cleared.')
                }}
              >
                Yes, delete everything
              </button>
            </div>
          </div>
        ) : (
          <button className="btn btn-danger" onClick={() => setConfirmWipe(true)}>Delete all financial data</button>
        )}
        {user?.mode === 'demo' && (
          <button className="btn btn-soft" style={{ marginTop: 10 }} onClick={() => { reseedDemo(); toast('info', 'Demo data refreshed.') }}>
            Reseed demo data
          </button>
        )}
      </section>
    </div>
  )
}

/* ================= ABOUT ================= */

function AboutTab() {
  const { user, signOut } = useApp()
  return (
    <div className="set-grid">
      <section className="card set-card">
        <h2 className="card-title">About Ledger</h2>
        <p className="muted">
          Ledger is the money app that assumes your balance is nobody's business. Know what you can spend, protect what matters, and reveal only when you choose.
        </p>
        <p className="faint set-hint">
          {user?.mode === 'supabase' ? 'Connected to Supabase — your data syncs to your account.' : 'Demo mode — data lives in this browser.'}
          {' '}· Theme, privacy and data controls are yours.
        </p>
      </section>
      <section className="card set-card">
        <h2 className="card-title">Account</h2>
        <p className="muted">Signed in as <strong>{user?.email}</strong></p>
        <button className="btn btn-soft" onClick={() => void signOut()}>Sign out</button>
      </section>
    </div>
  )
}
