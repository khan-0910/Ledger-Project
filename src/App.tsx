import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './lib/store'
import { ThemeProvider } from './lib/theme'
import Shell from './components/Shell'
import AddExpense from './components/AddExpense'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Forgot from './pages/Forgot'
import Reset from './pages/Reset'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budgets from './pages/Budgets'
import Goals from './pages/Goals'
import Analytics from './pages/Analytics'
import Recurring from './pages/Recurring'
import Settings from './pages/Settings'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.getElementById('main')?.scrollTo({ top: 0 })
    window.scrollTo({ top: 0 })
  }, [pathname])
  return null
}

/** Wraps each routed page in a springy enter transition (exit handled at shell level). */
function Page({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

/**
 * App routes. The Shell is persistent (sidebar theme + bottom nav update
 * instantly with the route); page content animates inside the shell.
 */
function AnimatedRoutes() {
  return (
    <Routes>
      {/* The public homepage lives at "/" for everyone — signed-out AND
          signed-in. No auth-dependent redirect. The app is at /app. */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Navigate to="/app" replace />} />
      <Route path="/signup" element={<Navigate to="/app" replace />} />
      <Route path="/reset" element={<Navigate to="/app/settings" replace />} />
      <Route path="/app" element={<Shell />}>
        <Route index element={<Page><Dashboard /></Page>} />
        <Route path="transactions" element={<Page><Transactions /></Page>} />
        <Route path="budgets" element={<Page><Budgets /></Page>} />
        <Route path="goals" element={<Page><Goals /></Page>} />
        <Route path="analytics" element={<Page><Analytics /></Page>} />
        <Route path="recurring" element={<Page><Recurring /></Page>} />
        <Route path="settings" element={<Page><Settings /></Page>} />
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}

function Splash() {
  return (
    <div className="splash" role="status" aria-label="Loading Ledger">
      <motion.div
        animate={{ scale: [1, 1.07, 1] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
      >
        <svg width="46" height="46" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <rect width="64" height="64" rx="18" fill="var(--ink)" />
          <circle cx="27" cy="31" r="11" stroke="var(--accent)" strokeWidth="4.5" />
          <circle cx="27" cy="31" r="3.4" fill="var(--accent)" />
          <path d="M41 22.5l10 8.5M41 39.5l10-8.5" stroke="var(--accent)" strokeWidth="4.5" strokeLinecap="round" />
        </svg>
      </motion.div>
    </div>
  )
}

/**
 * Stage router.
 * - loading      → splash (never flash financial data)
 * - signed-out   → public routes only (landing, auth); /app redirects to /login
 * - onboarding   → onboarding flow, no balances visible anywhere
 * - ready        → authenticated app shell
 */
function StageRouter() {
  const { stage } = useApp()

  if (stage === 'loading') return <Splash />

  if (stage === 'signed-out') {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/reset" element={<Reset />} />
        <Route path="/app/*" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }

  if (stage === 'onboarding') {
    return (
      <Routes>
        <Route path="*" element={<Onboarding />} />
      </Routes>
    )
  }

  return <AnimatedRoutes />
}

/** Global "+ Add transaction" sheet, reachable from every screen via a custom event. */
function GlobalAddSheet() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const fn = () => setOpen(true)
    window.addEventListener('ledger:open-add', fn)
    return () => window.removeEventListener('ledger:open-add', fn)
  }, [])
  return <AnimatePresence>{open && <AddExpense key="add" onClose={() => setOpen(false)} />}</AnimatePresence>
}export default function App() {
  // The single-file preview build is served statically without SPA fallback,
  // so it uses hash routing; normal builds keep clean URLs. BrowserRouter
  // needs the Pages repo path as basename so routes, links and navigations
  // (including direct opens of /Ledger-Project/app/...) all resolve under it.
  const Router =
    import.meta.env.MODE === 'singlefile' ? HashRouter : BrowserRouter
  const basename = import.meta.env.MODE === 'singlefile' ? undefined : import.meta.env.BASE_URL

  return (
    <Router basename={basename}>
      <ThemeProvider>
        <AppProvider>
          <ScrollToTop />
          <StageRouter />
          <GlobalAddSheet />
        </AppProvider>
      </ThemeProvider>
    </Router>
  )
}
