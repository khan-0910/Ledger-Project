import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './app-theme.css'
import { initPrivacy } from './lib/privacy'

// Privacy must be decided before first paint of any money UI.
// Default masked; the store re-inits from user settings after hydrate.
// Masking changes ONLY via the explicit Show/Hide button — no hover peeking.
initPrivacy()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
