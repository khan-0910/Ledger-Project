/**
 * Encrypted storage for Supabase mode.
 *
 * - Each user's AES-256-GCM data key comes from the `ledger-key` Edge Function,
 *   derived from a server secret + the user id. It is never stored in the database.
 * - The ledger is saved as one encrypted blob, so table views and dumps show only ciphertext.
 * - The key doesn't depend on the password, so a normal password reset keeps the data.
 * - This device caches the key (non-extractable) in IndexedDB; logging out clears it.
 */
import type { LedgerData } from './types'
import { supabase } from './db/supabase'

const enc = new TextEncoder()
const dec = new TextDecoder()

const toB64 = (b: ArrayBuffer | Uint8Array) => {
  const bytes = new Uint8Array(b)
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}
const fromB64 = (s: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
const rand = (n: number): Uint8Array<ArrayBuffer> => crypto.getRandomValues(new Uint8Array(n))

function sb() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

/** Import raw key bytes as a non-extractable AES-GCM key. */
export const importDataKey = (b64: string) =>
  crypto.subtle.importKey('raw', fromB64(b64), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])

/** Ask the server for this user's data key (needs a signed-in session). */
export async function fetchDataKey(): Promise<CryptoKey> {
  const { data, error } = await sb().functions.invoke<{ key: string }>('ledger-key', { method: 'POST' })
  if (error || !data?.key) {
    // Surface the server's own reason (status + body) so failures are diagnosable.
    const ctx = (error as { context?: Response } | null)?.context
    const detail = ctx ? `${ctx.status} ${await ctx.text().catch(() => '')}` : (error?.message ?? 'no key returned')
    throw new Error('key service: ' + detail)
  }
  return importDataKey(data.key)
}

/* ---------- Encrypted ledger blob ---------- */

export type VaultDoc = { data: LedgerData; version: number }

export async function loadVault(userId: string, dk: CryptoKey): Promise<VaultDoc | null> {
  const { data, error } = await sb().from('vaults').select('iv, ciphertext, version').eq('user_id', userId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(data.iv) }, dk, fromB64(data.ciphertext))
  return { data: JSON.parse(dec.decode(plain)) as LedgerData, version: data.version }
}

export class VaultConflict extends Error {}

/**
 * Save the whole ledger. `version` is what we last loaded; if another device
 * saved since then, this throws VaultConflict instead of overwriting it.
 */
export async function saveVault(userId: string, dk: CryptoKey, d: LedgerData, version: number): Promise<number> {
  const iv = rand(12)
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dk, enc.encode(JSON.stringify(d)))
  const row = { iv: toB64(iv), ciphertext: toB64(ct), updated_at: new Date().toISOString() }
  if (version === 0) {
    const { error } = await sb().from('vaults').insert({ user_id: userId, ...row, version: 1 })
    if (error) {
      if (error.code === '23505') throw new VaultConflict('exists')
      throw new Error(error.message)
    }
    return 1
  }
  const { data, error } = await sb()
    .from('vaults')
    .update({ ...row, version: version + 1 })
    .eq('user_id', userId)
    .eq('version', version)
    .select('version')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new VaultConflict('stale')
  return version + 1
}


/* ---------- This-device key cache (IndexedDB) ---------- */

const IDB = 'ledger-keys'
const STORE = 'dk'

function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(IDB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE)
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  try {
    const db = await idb()
    return await new Promise<T>((res, rej) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE))
      req.onsuccess = () => res(req.result)
      req.onerror = () => rej(req.error)
    })
  } catch {
    return undefined // private mode / blocked storage: just ask for the password each time
  }
}

export const cacheKey = (userId: string, dk: CryptoKey) => tx('readwrite', (s) => s.put(dk, userId))
export const cachedKey = async (userId: string) => ((await tx<CryptoKey>('readonly', (s) => s.get(userId))) ?? null)
export const forgetKeys = () => tx('readwrite', (s) => s.clear())
