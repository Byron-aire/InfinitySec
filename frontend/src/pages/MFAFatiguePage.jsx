import { useState, useEffect } from 'react';
import api from '../utils/api';
import TrustBadge from '../components/TrustBadge';
import AIConsentModal from '../components/AIConsentModal';
import AIDisclosure from '../components/AIDisclosure';
import Reveal from '../components/Reveal';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';

const ACCOUNT_TYPES = [
  { value: 'email',   label: 'Email',           icon: '✉' },
  { value: 'banking', label: 'Banking',          icon: '🏦' },
  { value: 'work',    label: 'Work / Corporate', icon: '💼' },
  { value: 'social',  label: 'Social Media',     icon: '👥' },
  { value: 'cloud',   label: 'Cloud Storage',    icon: '☁' },
  { value: 'crypto',  label: 'Crypto / Finance', icon: '₿' },
  { value: 'vpn',     label: 'VPN / Security',   icon: '🔒' },
];

const MFA_METHODS = [
  { value: 'hardware-key', label: 'Hardware Key (FIDO2 / Passkey)', strength: 'best',   color: 'var(--color-safe)' },
  { value: 'totp',         label: 'TOTP App (Google Auth, Authy)', strength: 'strong', color: 'var(--color-very-strong)' },
  { value: 'push',         label: 'Push Notification (Duo, MS Auth)', strength: 'medium', color: 'var(--color-fair)' },
  { value: 'sms',          label: 'SMS / Voice OTP',                strength: 'weak',   color: 'var(--color-danger)' },
  { value: 'email-otp',    label: 'Email OTP',                      strength: 'weak',   color: 'var(--color-danger)' },
  { value: 'none',         label: 'No MFA',                         strength: 'none',   color: 'var(--color-danger)' },
];

const RATING_COLORS = {
  Strong:   'var(--color-safe)',
  Moderate: 'var(--color-fair)',
  Weak:     'var(--color-danger)',
  Critical: 'var(--color-danger)',
};

const SEVERITY_STYLES = {
  critical: { bg: 'rgba(239,68,68,0.12)', color: 'var(--color-danger)',      border: 'rgba(239,68,68,0.3)' },
  high:     { bg: 'rgba(249,115,22,0.12)', color: 'var(--color-fair)',        border: 'rgba(249,115,22,0.3)' },
  medium:   { bg: 'rgba(59,130,246,0.12)', color: 'var(--color-accent)',      border: 'rgba(59,130,246,0.3)' },
  low:      { bg: 'rgba(34,211,238,0.10)', color: 'var(--color-cyan)',        border: 'rgba(34,211,238,0.3)' },
  info:     { bg: 'rgba(34,197,94,0.10)',  color: 'var(--color-safe)',        border: 'rgba(34,197,94,0.3)' },
};

function SeverityBadge({ severity }) {
  const s = SEVERITY_STYLES[severity] || SEVERITY_STYLES.info;
  return (
    <span
      className="mfa-severity-badge"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {severity}
    </span>
  );
}

const DEFAULT_ACCOUNTS = ACCOUNT_TYPES.map(at => ({
  type: at.value,
  label: at.label,
  method: 'totp',
  enabled: at.value === 'email' || at.value === 'banking',
}));

export default function MFAFatiguePage() {
  const [consent, setConsent]               = useState(null);
  const [consentLoading, setConsentLoading] = useState(false);
  const [accounts, setAccounts]             = useState(DEFAULT_ACCOUNTS);
  const [loading, setLoading]               = useState(false);
  const [result, setResult]                 = useState(null);
  const [error, setError]                   = useState('');

  useEffect(() => {
    api.get('/six-eyes/log')
      .then(({ data }) => setConsent(data.consent?.accepted || false))
      .catch(() => setConsent(false));
  }, []);

  const handleAccept = async () => {
    setConsentLoading(true);
    try {
      await api.post('/six-eyes/consent');
      setConsent(true);
    } catch {
      setError('Could not save consent. Please try again.');
    } finally {
      setConsentLoading(false);
    }
  };

  const toggleAccount = (idx) => {
    setAccounts(prev => prev.map((a, i) => i === idx ? { ...a, enabled: !a.enabled } : a));
  };

  const setMethod = (idx, method) => {
    setAccounts(prev => prev.map((a, i) => i === idx ? { ...a, method } : a));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = accounts
      .filter(a => a.enabled)
      .map(a => ({ type: a.type, method: a.method, label: a.label }));

    if (payload.length === 0) {
      setError('Enable at least one account to analyse.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const { data } = await api.post('/mfa-fatigue/check', { accounts: payload });
      setResult(data);
    } catch (err) {
      if (err.response?.status === 403) {
        setConsent(false);
      } else {
        setError(err.response?.data?.message || 'Analysis failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (consent === null) {
    return (
      <main className="page mfa-page">
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
          <Spinner />
        </div>
      </main>
    );
  }

  const ratingColor = result ? RATING_COLORS[result.overall_rating] || 'var(--color-muted)' : null;

  return (
    <main className="page mfa-page">
      <h2>MFA Fatigue Checker</h2>
      <TrustBadge badges={['AI-powered analysis', 'No passwords collected', 'Server-side only']} />
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        Select your MFA method for each account type. AI rates your setup against MFA fatigue attacks
        and recommends upgrades to phishing-resistant authentication.
      </p>

      {!consent ? (
        <AIConsentModal
          onAccept={handleAccept}
          onDecline={() => window.history.back()}
          loading={consentLoading}
        />
      ) : (
        <>
          <form className="mfa-form" onSubmit={handleSubmit}>
            <div className="mfa-accounts">
              {accounts.map((account, idx) => {
                const accountType = ACCOUNT_TYPES.find(at => at.value === account.type);
                const methodConfig = MFA_METHODS.find(m => m.value === account.method);
                return (
                  <div
                    key={account.type}
                    className={`mfa-account-row${account.enabled ? '' : ' mfa-account-row--disabled'}`}
                  >
                    <label className="mfa-account-toggle">
                      <input
                        type="checkbox"
                        checked={account.enabled}
                        onChange={() => toggleAccount(idx)}
                        className="mfa-checkbox"
                      />
                      <span className="mfa-account-icon">{accountType?.icon}</span>
                      <span className="mfa-account-label">{account.label}</span>
                    </label>

                    {account.enabled && (
                      <select
                        className="mfa-method-select"
                        value={account.method}
                        onChange={e => setMethod(idx, e.target.value)}
                        style={{ borderColor: methodConfig?.color || 'var(--color-border)' }}
                      >
                        {MFA_METHODS.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mfa-legend">
              {MFA_METHODS.map(m => (
                <span key={m.value} className="mfa-legend-item">
                  <span className="mfa-legend-dot" style={{ background: m.color }} />
                  <span className="mfa-legend-label muted">{m.label.split('(')[0].trim()}</span>
                </span>
              ))}
            </div>

            <button
              className="btn-primary mfa-submit"
              type="submit"
              disabled={loading || accounts.filter(a => a.enabled).length === 0}
            >
              {loading ? 'Analysing…' : 'Analyse My MFA Setup'}
            </button>
          </form>

          {loading && (
            <div className="mfa-loading">
              <Spinner />
              <p className="muted" style={{ marginTop: '0.75rem' }}>Rating your MFA posture…</p>
            </div>
          )}

          <ErrorMessage message={error} />

          {result && ratingColor && (
            <Reveal>
              <div className="mfa-result">
                {/* Score header */}
                <div className="mfa-score-header">
                  <div className="mfa-score-ring" style={{ borderColor: ratingColor, boxShadow: `0 0 28px ${ratingColor}40` }}>
                    <span className="mfa-score-number" style={{ color: ratingColor }}>{result.overall_score}</span>
                    <span className="mfa-score-sub">/ 100</span>
                  </div>
                  <div className="mfa-score-meta">
                    <span className="mfa-rating" style={{ color: ratingColor }}>{result.overall_rating}</span>
                    <span
                      className="mfa-fatigue-risk"
                      style={{
                        color: result.fatigue_risk === 'low' ? 'var(--color-safe)' : result.fatigue_risk === 'medium' ? 'var(--color-fair)' : 'var(--color-danger)',
                      }}
                    >
                      Fatigue risk: {result.fatigue_risk}
                    </span>
                  </div>
                </div>

                <p className="mfa-summary">{result.summary}</p>

                {/* Per-account findings */}
                {result.findings?.length > 0 && (
                  <div className="mfa-section">
                    <h4 className="mfa-section-title">Account Analysis</h4>
                    <ul className="mfa-findings">
                      {result.findings.map((f, i) => (
                        <li key={i} className="mfa-finding">
                          <div className="mfa-finding-header">
                            <SeverityBadge severity={f.severity} />
                            <span className="mfa-finding-account">{f.account}</span>
                            <span className="mfa-finding-method muted">{f.method}</span>
                          </div>
                          <p className="mfa-finding-vuln">{f.vulnerability}</p>
                          <p className="mfa-finding-rec">
                            <span style={{ color: 'var(--color-accent)' }}>→</span> {f.recommendation}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Overall recommendations */}
                {result.recommendations?.length > 0 && (
                  <div className="mfa-section">
                    <h4 className="mfa-section-title">Priority Actions</h4>
                    <ul className="mfa-recs">
                      {result.recommendations.map((r, i) => (
                        <li key={i} className="mfa-rec-item">{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <AIDisclosure model="Anthropic Sonnet" />
              </div>
            </Reveal>
          )}
        </>
      )}
    </main>
  );
}
