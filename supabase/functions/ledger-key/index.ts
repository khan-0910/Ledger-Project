// Supabase Edge Function: ledger-key
// Gives a signed-in user their personal data key, derived from a server secret.
// The key never sits in the database, so table views and dumps show only ciphertext,
// and a normal password reset keeps working (the key doesn't depend on the password).
//
// Secret required: LEDGER_MASTER_KEY (base64 of 32 random bytes). Never change or lose it:
// every user's data is encrypted with keys derived from it.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const ALLOWED = ['https://khan-0910.github.io', 'http://localhost:5173', 'http://localhost:4173']

function cors(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED.includes(origin) ? origin : ALLOWED[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

const enc = new TextEncoder()
const b64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)))

Deno.serve(async (req) => {
  const headers = cors(req.headers.get('Origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers })

  // Who is asking? Verified from their session token.
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data, error } = await sb.auth.getUser()
  if (error || !data.user) return new Response('Unauthorized', { status: 401, headers })

  const secret = Deno.env.get('LEDGER_MASTER_KEY')
  if (!secret) return new Response('Server key not configured', { status: 500, headers })

  // Per-user key = HKDF(master, user id). Same user always gets the same key.
  const master = Uint8Array.from(atob(secret), (c) => c.charCodeAt(0))
  const base = await crypto.subtle.importKey('raw', master, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: enc.encode('ledger-vault-v1'), info: enc.encode(data.user.id) },
    base,
    256,
  )

  return new Response(JSON.stringify({ key: b64(bits) }), {
    headers: { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
})
