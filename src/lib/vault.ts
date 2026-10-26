/**
 * End-to-end encryption for Supabase mode.
 *
 * - Each user has one random AES-256-GCM data key (DK).
 * - DK is stored on the server only in wrapped form, twice:
 *     by a key derived from the password, and by a key derived from a recovery code.
 * - The ledger is saved as one encrypted blob. The server never sees plain data.
 * - This device keeps DK in IndexedDB so a reload does not ask for the password again.
 */
import type { LedgerData } from './types'
import { supabase } from './db/supabase'

const ITERATIONS = 310_000
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

async function kek(secret: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey'],
  )
}

async function wrap(dk: CryptoKey, secret: string) {
  const salt = rand(16)
  const iv = rand(12)
  const wrapped = await crypto.subtle.wrapKey('raw', dk, await kek(secret, salt, ITERATIONS), { name: 'AES-GCM', iv })
  return { salt: toB64(salt), iv: toB64(iv), wrapped: toB64(wrapped) }
}

async function unwrap(secret: string, salt: string, iv: string, wrapped: string, iterations: number): Promise<CryptoKey | null> {
  try {
    return await crypto.subtle.unwrapKey(
      'raw',
      fromB64(wrapped),
      await kek(secret, fromB64(salt), iterations),
      { name: 'AES-GCM', iv: fromB64(iv) },
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    )
  } catch {
    return null // wrong secret
  }
}

/* ---------- Recovery code: 25 random chars, grouped XXXXX-XXXXX-... (~125 bits) ---------- */

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O/1/I/L to avoid misreads

export function newRecoveryCode(): string {
  const out: string[] = []
  for (const b of rand(25)) out.push(ALPHABET[b % ALPHABET.length])
  return out.join('').match(/.{5}/g)!.join('-')
}

/** Accepts the code with or without dashes, any case. */
export const normalizeCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '').match(/.{1,5}/g)?.join('-') ?? ''

/* ---------- Server rows ---------- */

type KeyRow = {
  user_id: string
  pw_salt: string; pw_iv: string; pw_wrapped: string
  rc_salt: string; rc_iv: string; rc_wrapped: string
  iterations: number
}

function sb() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function fetchKeyRow(userId: string): Promise<KeyRow | null> {
  const { data, error } = await sb().from('user_keys').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw new Error(error.message)
  return (data as KeyRow) ?? null
}

/** Pure part of key setup: a new data key wrapped by password and by a fresh recovery code. */
export async function makeKeyRow(userId: string, password: string): Promise<{ dk: CryptoKey; recoveryCode: string; row: KeyRow }> {
  const dk = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  const recoveryCode = newRecoveryCode()
  const [p, r] = await Promise.all([wrap(dk, password), wrap(dk, recoveryCode)])
  const row: KeyRow = {
    user_id: userId,
    pw_salt: p.salt, pw_iv: p.iv, pw_wrapped: p.wrapped,
    rc_salt: r.salt, rc_iv: r.iv, rc_wrapped: r.wrapped,
    iterations: ITERATIONS,
  }
  return { dk, recoveryCode, row }
}

/** First time: make a data key, wrap it with password + a fresh recovery code, store it. */
export async function createKeys(userId: string, password: string): Promise<{ dk: CryptoKey; recoveryCode: string }> {
  const { dk, recoveryCode, row } = await makeKeyRow(userId, password)
  const { error } = await sb().from('user_keys').upsert({ ...row, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
  return { dk, recoveryCode }
}

export const unlockWithPassword = (row: KeyRow, password: string) =>
  unwrap(password, row.pw_salt, row.pw_iv, row.pw_wrapped, row.iterations)

export const unlockWithRecovery = (row: KeyRow, code: string) =>
  unwrap(normalizeCode(code), row.rc_salt, row.rc_iv, row.rc_wrapped, row.iterations)

/** Re-lock the data key with a new password (after a change or a reset). */
export async function rewrapPassword(userId: string, dk: CryptoKey, password: string): Promise<void> {
  const p = await wrap(dk, password)
  const { error } = await sb()
    .from('user_keys')
    .update({ pw_salt: p.salt, pw_iv: p.iv, pw_wrapped: p.wrapped, iterations: ITERATIONS, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

/** Replace the recovery code (old one stops working). */
export async function rotateRecoveryCode(userId: string, dk: CryptoKey): Promise<string> {
  const code = newRecoveryCode()
  const r = await wrap(dk, code)
  const { error } = await sb()
    .from('user_keys')
    .update({ rc_salt: r.salt, rc_iv: r.iv, rc_wrapped: r.wrapped, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
  return code
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

/** Wipe the vault and keys (used by "start over" when both secrets are lost). */
export async function destroyVault(userId: string): Promise<void> {
  await sb().from('vaults').delete().eq('user_id', userId)
  await sb().from('user_keys').delete().eq('user_id', userId)
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
