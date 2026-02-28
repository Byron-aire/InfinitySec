import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivacyPage() {
  const { user } = useAuth();

  return (
    <main className="page">
      <h2 style={{ color: 'var(--color-accent)', marginBottom: '0.5rem' }}>Privacy Policy</h2>
      <p className="muted" style={{ marginBottom: '2rem' }}>
        Plain English. No legal jargon. Last updated: February 2026.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        <section>
          <h3 style={{ marginBottom: '0.75rem' }}>What InfinitySec is</h3>
          <p className="muted">
            InfinitySec is a personal cybersecurity toolkit. It helps you check password strength,
            detect data breaches, generate secure passwords, and learn security best practices.
            It is not a password manager — we do not store your passwords.
          </p>
        </section>

        <section>
          <h3 style={{ marginBottom: '0.75rem' }}>What we store</h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[
              ['Your username and email address', 'Used to identify your account.'],
              ['Your hashed password', 'Encrypted with bcrypt. We cannot read it. It is never stored in plain text.'],
              ['Password strength check results', 'We save the score and criteria — never the password you typed. The password never leaves your browser.'],
              ['Breach check results', 'We save whether breaches were found and which services were affected. We never store the email address you checked.'],
              ['Generated password metadata', 'Length, character options, and the label you gave it. The password itself is stored only if you explicitly save it.'],
            ].map(([what, why]) => (
              <li key={what} style={{
                background: '#161616',
                border: '1px solid #2C1A1A',
                borderRadius: 'var(--radius)',
                padding: '0.9rem 1rem',
              }}>
                <strong style={{ display: 'block', marginBottom: '0.25rem' }}>{what}</strong>
                <span className="muted" style={{ fontSize: '0.9rem' }}>{why}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 style={{ marginBottom: '0.75rem' }}>What we never store</h3>
          <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }} className="muted">
            <li>The password you type into the strength checker</li>
            <li>The email address you submit for breach checking</li>
            <li>Any payment information (InfinitySec is free)</li>
            <li>Your IP address or location</li>
            <li>Any third-party tracking cookies or analytics</li>
          </ul>
        </section>

        <section>
          <h3 style={{ marginBottom: '0.75rem' }}>Third-party services</h3>
          <p className="muted" style={{ marginBottom: '0.75rem' }}>
            Breach checking uses the{' '}
            <a href="https://haveibeenpwned.com" target="_blank" rel="noreferrer">
              HaveIBeenPwned API
            </a>
            . We send a partial hash of the email — not the full address — to check for breaches.
            HaveIBeenPwned's own privacy policy applies to that request.
          </p>
          <p className="muted">
            No other third-party services receive your data.
          </p>
        </section>

        <section>
          <h3 style={{ marginBottom: '0.75rem' }}>Your rights (GDPR)</h3>
          <p className="muted" style={{ marginBottom: '0.75rem' }}>
            You have the right to access, export, and permanently delete all data we hold about you.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {user ? (
              <>
                <Link to="/dashboard" className="btn-secondary">
                  Go to Dashboard → Danger Zone to delete your account
                </Link>
              </>
            ) : (
              <p className="muted">Log in to access your data export and account deletion options.</p>
            )}
          </div>
        </section>

        <section>
          <h3 style={{ marginBottom: '0.75rem' }}>Data retention</h3>
          <p className="muted">
            Your data is stored for as long as your account exists. When you delete your account,
            all data — including your history — is permanently and immediately deleted.
            There are no backups retained after deletion.
          </p>
        </section>

        <section>
          <h3 style={{ marginBottom: '0.75rem' }}>Contact</h3>
          <p className="muted">
            Questions about this policy? This project is open for feedback via GitHub.
          </p>
        </section>

      </div>
    </main>
  );
}
