import React, { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate, useOutlet } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useApp } from '../lib/store'
import { PrivacyToast, SwipeToasts } from './ui'

import { Gear, Home, ListIcon, Logout, Pie, Repeat, Target, UserIcon, Plus } from './Icons'
import LedgerLogo from './Logo'

const NAV = [
  { to: '/app', label: 'Dashboard', icon: Home, end: true },
  { to: '/app/transactions', label: 'Transactions', icon: ListIcon },
  { to: '/app/budgets', label: 'Budgets', icon: WalletIcon },
  { to: '/app/goals', label: 'Goals', icon: Target },
  { to: '/app/analytics', label: 'Analytics', icon: Pie },
  { to: '/app/recurring', label: 'Recurring', icon: Repeat },
  { to: '/app/settings', label: 'Settings', icon: Gear },
]

function WalletIcon(p: { size?: number; className?: string }) {
  return (
    <svg width={p.size ?? 20} height={p.size ?? 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={p.className} aria-hidden="true">
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M3 9.5h18" />
      <circle cx="16.5" cy="14" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Which themed canvas is active, derived from the route. */
function pageTheme(pathname: string): string {
  if (pathname.startsWith('/app/transactions')) return 'txns'
  if (pathname.startsWith('/app/budgets')) return 'budgets'
  if (pathname.startsWith('/app/goals')) return 'goals'
  if (pathname.startsWith('/app/analytics')) return 'analytics'
  if (pathname.startsWith('/app/recurring')) return 'recurring'
  if (pathname.startsWith('/app/settings')) return 'settings'
  return 'dash'
}

/** Per-route canvas: colour, whether the canvas is dark, card tone, and the drifting backdrop word. */
const CANVAS: Record<string, { color: string; dark: boolean; card: 'dark' | 'light'; word: string }> = {
  dash: { color: '#ffd93d', dark: false, card: 'dark', word: 'where it stands ✦ ' },
  txns: { color: '#a6e4df', dark: false, card: 'dark', word: 'every rupee ✦ ' },
  budgets: { color: '#ff4f81', dark: false, card: 'dark', word: "what's left ✦ " },
  goals: { color: '#0a4f57', dark: true, card: 'light', word: 'save it up ✦ ' },
  analytics: { color: '#17140f', dark: true, card: 'light', word: 'the big picture ✦ ' },
  recurring: { color: '#ffc6d6', dark: false, card: 'dark', word: 'no surprises ✦ ' },
  settings: { color: '#ffe873', dark: false, card: 'dark', word: 'your rules ✦ ' },
}

/** Freezes the outlet for an exiting page so it can animate out with its old content. */
function FrozenOutlet() {
  const outlet = useOutlet()
  const [frozen] = useState(outlet)
  return frozen
}

export default function Shell() {
  const { pathname } = useLocation()
  const theme = pageTheme(pathname)
  const canvas = CANVAS[theme]
  const reduced = useReducedMotion()
  const mainRef = useRef<HTMLElement>(null)

  /* Pointer glare: one delegated listener feeds the hovered card its local coordinates. */
  useEffect(() => {
    const main = mainRef.current
    if (!main || reduced) return
    const move = (e: PointerEvent) => {
      const card = (e.target as HTMLElement | null)?.closest<HTMLElement>('.card')
      if (!card) return
      const r = card.getBoundingClientRect()
      card.style.setProperty('--mx', `${e.clientX - r.left}px`)
      card.style.setProperty('--my', `${e.clientY - r.top}px`)
    }
    main.addEventListener('pointermove', move, { passive: true })
    return () => main.removeEventListener('pointermove', move)
  }, [reduced])

  return (
    <div
      className={`shell shell-${theme}`}
      data-page={theme}
      data-canvas={canvas.dark ? 'dark' : 'light'}
      data-card={canvas.card}
      data-word={canvas.word.repeat(6)}
    >
      <Sidebar />
      <main className="main" id="main" ref={mainRef}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            className="route-stage"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 70, rotate: 1.2, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -50, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 220, damping: 26, opacity: { duration: 0.25 } }}
          >
            <FrozenOutlet />
          </motion.div>
        </AnimatePresence>
      </main>
      {/* Colour curtain: sweeps up in the new page's canvas colour on every route change. */}
      {!reduced && (
        <motion.div
          key={`curtain-${pathname}`}
          className="route-curtain"
          aria-hidden="true"
          style={{ background: canvas.color }}
          initial={{ y: '100%' }}
          animate={{ y: ['100%', '0%', '-100%'] }}
          transition={{ duration: 0.8, times: [0, 0.42, 1], ease: [0.76, 0, 0.24, 1] }}
        />
      )}
      <BottomNav />
      <PrivacyToast />
      <SwipeToasts />
    </div>
  )
}

function Sidebar() {
  const { user, signOut, data } = useApp()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const initial = (data?.profile.name || user?.name || user?.email || '?').slice(0, 1).toUpperCase()

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <NavLink to="/app" className="logo-link" aria-label="Ledger home">
          <LedgerLogo size={30} />
          <span className="logo-word">Ledger</span>
        </NavLink>
      </div>

      <nav className="side-nav" aria-label="Primary">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                <Icon size={19} className="side-icon" />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="peek-row">
          <span className="faint peek-note">Balances show on the Dashboard</span>
        </div>

        <div className="profile-wrap" ref={menuRef}>
          <button className="profile-chip" onClick={() => setMenuOpen((v) => !v)} aria-haspopup="menu" aria-expanded={menuOpen}>
            <span className="avatar" aria-hidden="true">{initial}</span>
            <span className="profile-meta">
              <span className="profile-name">{data?.profile.name || user?.name || 'Student'}</span>
              <span className="profile-mail">{user?.email}</span>
            </span>
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                className="profile-menu"
                role="menu"
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.16 }}
              >
                <button role="menuitem" className="menu-item" onClick={() => { setMenuOpen(false); navigate('/app/settings') }}>
                  <UserIcon size={16} /> Profile & settings
                </button>
                <button role="menuitem" className="menu-item menu-danger" onClick={() => { setMenuOpen(false); void signOut() }}>
                  <Logout size={16} /> Log out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  )
}

/* ---------- Mobile bottom navigation ---------- */

function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()
  const openAdd = () => window.dispatchEvent(new Event('ledger:open-add'))

  const path = location.pathname
  const item = (active: boolean, to: string, label: string, Icon: React.ComponentType<{ size?: number; className?: string }>) => (
    <NavLink to={to} className={`bnav-item ${active ? 'active' : ''}`} aria-label={label}>
      <Icon size={21} />
      <span>{label}</span>
    </NavLink>
  )

  return (
    <>
      <nav className="bottomnav" aria-label="Primary mobile">
        {item(path === '/app', '/app', 'Home', Home)}
        {item(path.startsWith('/app/transactions'), '/app/transactions', 'Txns', ListIcon)}
        <button className="bnav-add" aria-label="Add expense" onClick={openAdd}>
          <Plus size={24} strokeWidth={2.4} />
        </button>
        {item(path.startsWith('/app/budgets'), '/app/budgets', 'Budgets', WalletIcon)}
        <button className={`bnav-item ${moreOpen ? 'active' : ''}`} onClick={() => setMoreOpen(true)} aria-label="More">
          <Gear size={21} />
          <span>More</span>
        </button>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div className="sheet-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMoreOpen(false)} />
            <motion.div
              className="more-sheet"
              role="dialog"
              aria-label="More pages"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            >
              <div className="sheet-grab" />
              <h3>More</h3>
              <div className="more-grid">
                {[
                  { to: '/app/goals', label: 'Goals', icon: Target },
                  { to: '/app/analytics', label: 'Analytics', icon: Pie },
                  { to: '/app/recurring', label: 'Recurring', icon: Repeat },
                  { to: '/app/settings', label: 'Settings', icon: Gear },
                ].map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} className="more-item" onClick={() => setMoreOpen(false)}>
                    <span className="more-ic"><Icon size={20} /></span>
                    {label}
                  </NavLink>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
