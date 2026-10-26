import { Link } from 'react-router-dom'
import LedgerLogo from '../components/Logo'

const UPDATED = '26 October 2026'

/** Plain-language privacy policy. Public at /privacy for everyone. */
export default function Privacy() {
  return (
    <div className="auth-page" style={{ alignItems: 'start' }}>
      <div className="auth-head">
        <Link to="/" className="logo-link auth-logo" aria-label="Back to Ledger home">
          <LedgerLogo size={34} />
          <span className="logo-word">Ledger</span>
        </Link>
      </div>
      <article className="card privacy-doc" style={{ maxWidth: 760, width: '100%', margin: '0 auto 48px', padding: 'clamp(22px, 4vw, 44px)', lineHeight: 1.65 }}>
        <h1 style={{ marginTop: 0 }}>Privacy policy</h1>
        <p className="faint">Last updated {UPDATED}</p>

        <h2>The short version</h2>
        <ul>
          <li>Your money data is <b>encrypted on your device</b> before it is saved. We store only scrambled data we can't read.</li>
          <li>We don't sell data, show ads, or use tracking or analytics scripts.</li>
          <li>You can export your data or delete your account at any time from Settings.</li>
        </ul>

        <h2>What we store</h2>
        <ul>
          <li><b>Your email address and a hashed password</b>, so you can log in. Our sign-in provider stores these; we can see your email, never your password.</li>
          <li><b>Your ledger</b>: balances, savings split, transactions, budgets, goals, recurring payments, the name you give us, and your settings. This is stored as one encrypted block.</li>
          <li><b>Your encrypted key</b>: the key that unlocks your ledger, itself locked by your password and, separately, by your recovery code. Without one of those, it is useless.</li>
        </ul>
        <p>We don't ask for bank logins, card numbers, account numbers or government IDs, and you shouldn't enter them in notes.</p>

        <h2>Who can see your data</h2>
        <p>
          Only you, on a device where you've entered your password or recovery code. The encryption (AES-256-GCM, key derived
          with PBKDF2) happens in your browser. The server, the people who run Ledger, and anyone who got into the database would see
          only ciphertext. What we <i>can</i> see: your email, when your account was made, when you last signed in, and how big your
          encrypted data is.
        </p>

        <h2>If you forget your password</h2>
        <p>
          When you set up your account you get a <b>recovery code</b>. Keep it safe. After a password reset, it unlocks your data and
          re-locks it with your new password. We can't see or resend the code. If you lose both your password and the code, your old
          data can't be recovered by anyone; you can wipe it and start fresh.
        </p>

        <h2>Services we use</h2>
        <ul>
          <li><b>Supabase</b>: sign-in and database hosting (stores your email and encrypted data).</li>
          <li><b>GitHub Pages</b>: serves the website files. Like any web host, it sees your IP address when you load the site.</li>
          <li><b>Google Fonts</b>: loads the typefaces. Google sees your IP address when fonts load.</li>
        </ul>

        <h2>Demo mode</h2>
        <p>"Try the demo" keeps sample data only in your browser's local storage. It is never sent to us. Clearing your browser data removes it.</p>

        <h2>Your rights</h2>
        <ul>
          <li><b>Export</b>: Settings → Export CSV downloads your transactions.</li>
          <li><b>Delete</b>: Settings → Delete account removes your account, keys and data from our database at once. Backups held by our hosting provider roll off within their normal retention window.</li>
          <li><b>Correct</b>: edit anything in the app at any time.</li>
        </ul>
        <p>
          These match your rights under India's Digital Personal Data Protection Act, 2023, and similar laws elsewhere. We process
          your data only to run Ledger for you, based on your consent when you sign up. You can withdraw that consent by deleting your account.
        </p>

        <h2>Security</h2>
        <p>
          Besides encryption: passwords must be 8+ characters and not common ones, repeated wrong logins are slowed down, database rows are
          locked to their owner, and the site runs a strict Content Security Policy. No system is perfect; if we ever learn of a breach that
          affects you, we will tell you.
        </p>

        <h2>Children</h2>
        <p>Ledger is meant for students aged 18 and over. If you are under 18, please use it with a parent or guardian's consent.</p>

        <h2>Changes and contact</h2>
        <p>
          If this policy changes, we'll update the date above. Questions or requests: open an issue on the project's{' '}
          <a href="https://github.com/khan-0910/Ledger-Project/issues" target="_blank" rel="noreferrer noopener">GitHub page</a>.
        </p>

        <p style={{ marginTop: 32 }}><Link className="btn btn-primary" to="/">Back to Ledger</Link></p>
      </article>
    </div>
  )
}
