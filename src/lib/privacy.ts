/**
 * Privacy core — one explicit control.
 *
 * `document.documentElement.dataset.privacy` flips between 'on' | 'hidden'.
 * Only the Dashboard's primary Total Balance renders a masked/real pair;
 * it is crossfaded by CSS from that attribute (or the .amt-revealed class).
 *
 * The state changes ONLY when the labelled Show balance / Hide balance
 * button is clicked. No hover peeking, no keyboard shortcuts, no
 * pointer/timeouts — and no automatic hiding on tab blur: what the user
 * chose stays chosen.
 */

export type PrivacyMode = 'on' | 'hidden'

const ATTR = 'privacy'

let mode: PrivacyMode = 'hidden'
const listeners = new Set<(mode: PrivacyMode) => void>()

function apply() {
  document.documentElement.dataset[ATTR] = mode
  listeners.forEach((l) => l(mode))
}

/* ---- React glue: useSyncExternalStore-compatible snapshots ---- */

export function getPrivacySnapshot(): PrivacyMode {
  return mode
}

export function getServerSnapshot(): PrivacyMode {
  return 'hidden'
}

/** Called once at app boot, before first paint of money UI. Always masked. */
export function initPrivacy(): void {
  mode = 'hidden'
  document.documentElement.dataset[ATTR] = mode
}

export function privacyMode(): PrivacyMode {
  return mode
}

/** useSyncExternalStore subscribe fn (listener receives the new mode). */
export function subscribePrivacy(l: (mode: PrivacyMode) => void): () => void {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

/** Is the real value on screen right now (used for aria + focus)? */
export function isRevealed(): boolean {
  return mode === 'on'
}

/**
 * Show the balance. Only the Dashboard hero call site wants to latch it on,
 * but the single explicit control drives it either way.
 */
export function revealAll(): boolean {
  if (mode === 'on') return true
  mode = 'on'
  apply()
  return true
}

/** Hide the balance. */
export function hideAll(): void {
  if (mode === 'hidden') return
  mode = 'hidden'
  apply()
}
