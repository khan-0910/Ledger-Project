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
          <li>Your money data is <b>encrypted on your device</b> before it is saved. Our database holds only scrambled data.</li>
          <li>We don't sell data, show ads, or use tracking or analytics scripts.</li>
          <li>You can export your data or delete your account at any time from Settings.</li>
        </ul>

        <h2>What we store</h2>
        <ul>
          <li><b>Your email address and a hashed password</b>, so you can log in. Our sign-in provider stores these; we can see your email, never your password.</li>
          <li><b>Your ledger</b>: balances, savings split, transactions, budgets, goals, recurring payments, the name you give us, and your settings. This is stored as one encrypted block.</li>
        </ul>
        <p>We don't ask for bank logins, card numbers, account numbers or government IDs, and you shouldn't enter them in notes.</p>

        <h2>Who can see your data</h2>
        <p>
          You, whenever you're logged in. Your ledger is encrypted in your browser (AES-256-GCM) with a key unique to your account.
          That key is made on demand by a secured server function from a secret that is never stored in the database, and it is only
          handed to you after you sign in. So the database, its backups, and anyone browsing or leaking its tables see only ciphertext.
        </p>
        <p>
          To be straight with you: because the server can make your key, the person running Ledger could, in principle, deliberately
          decrypt your data using that secret. We don't, and nothing in our normal tools shows it. This is what lets a normal password
          reset work without you ever losing your data. What we see in day-to-day running: your email, when your account was made,
          when you last signed in, and the size of your encrypted data.
        </p>

        <h2>If you forget your password</h2>
        <p>Use "Forgot password" to get a reset email. Your data stays safe and opens as usual with your new password.</p>

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
