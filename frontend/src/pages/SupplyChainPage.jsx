import { useState, useEffect } from 'react';
import api from '../utils/api';
import TrustBadge from '../components/TrustBadge';
import AIConsentModal from '../components/AIConsentModal';
import AIDisclosure from '../components/AIDisclosure';
import Reveal from '../components/Reveal';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';

const RISK_CONFIG = {
  low:      { color: 'var(--color-safe)',    label: 'Low Risk' },
  medium:   { color: 'var(--color-fair)',    label: 'Medium Risk' },
  high:     { color: 'var(--color-danger)',  label: 'High Risk' },
  critical: { color: 'var(--color-danger)',  label: 'Critical Risk' },
};

const SEVERITY_STYLES = {
  critical: { bg: 'rgba(239,68,68,0.12)', color: 'var(--color-danger)',  border: 'rgba(239,68,68,0.3)' },
  high:     { bg: 'rgba(249,115,22,0.12)', color: 'var(--color-fair)',   border: 'rgba(249,115,22,0.3)' },
  medium:   { bg: 'rgba(59,130,246,0.12)', color: 'var(--color-accent)', border: 'rgba(59,130,246,0.3)' },
  low:      { bg: 'rgba(34,211,238,0.10)', color: 'var(--color-cyan)',   border: 'rgba(34,211,238,0.3)' },
  info:     { bg: 'rgba(107,114,128,0.1)', color: 'var(--color-muted)',  border: 'rgba(107,114,128,0.25)' },
};

const PLACEHOLDER = `{
  "name": "my-app",
  "dependencies": {
    "express": "^4.18.2",
    "lodash": "^4.17.21"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}`;

function SeverityBadge({ severity }) {
  const s = SEVERITY_STYLES[severity] || SEVERITY_STYLES.info;
  return (
    <span
      className="sc-severity-badge"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {severity}
    </span>
  );
}

export default function SupplyChainPage() {
  const [consent, setConsent]               = useState(null);
  const [consentLoading, setConsentLoading] = useState(false);
  const [packageJson, setPackageJson]       = useState('');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!packageJson.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const { data } = await api.post('/supply-chain/scan', { packageJson: packageJson.trim() });
      setResult(data);
    } catch (err) {
      if (err.response?.status === 403) {
        setConsent(false);
      } else {
        setError(err.response?.data?.message || 'Scan failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (consent === null) {
    return (
      <main className="page sc-page">
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
          <Spinner />
        </div>
      </main>
    );
  }

  const riskCfg = result ? RISK_CONFIG[result.risk_level] || RISK_CONFIG.medium : null;

  return (
    <main className="page sc-page">
      <h2>Supply Chain Scanner</h2>
      <TrustBadge badges={['AI-powered analysis', 'Server-side only', 'Input not stored']} />
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        Paste your <code style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>package.json</code> — AI flags typosquatting,
        suspicious packages, version pinning risks, and deprecated dependencies.
      </p>

      {!consent ? (
        <AIConsentModal
          onAccept={handleAccept}
          onDecline={() => window.history.back()}
          loading={consentLoading}
        />
      ) : (
        <>
          <form className="sc-form" onSubmit={handleSubmit}>
            <textarea
              className="sc-textarea"
              placeholder={PLACEHOLDER}
              value={packageJson}
              onChange={e => setPackageJson(e.target.value)}
              rows={12}
              disabled={loading}
              spellCheck={false}
              maxLength={9000}
            />
            <div className="sc-form-footer">
              <span className="sc-char-count muted">{packageJson.length} / 9000 chars</span>
              <button
                className="btn-primary"
                type="submit"
                disabled={loading || !packageJson.trim()}
              >
                {loading ? 'Scanning…' : 'Scan'}
              </button>
            </div>
          </form>

          {loading && (
            <div className="sc-loading">
              <Spinner />
              <p className="muted" style={{ marginTop: '0.75rem' }}>Analysing dependencies…</p>
            </div>
          )}

          <ErrorMessage message={error} />

          {result && riskCfg && (
            <Reveal>
              <div className="sc-result">
                {/* Risk header */}
                <div
                  className="sc-risk-header"
                  style={{
                    borderColor: riskCfg.color,
                    background: `${riskCfg.color}12`,
                    boxShadow: `0 0 24px ${riskCfg.color}18`,
                  }}
                >
                  <div className="sc-risk-label" style={{ color: riskCfg.color }}>
                    {riskCfg.label}
                  </div>
                  <div className="sc-stats">
                    <div className="sc-stat">
                      <span className="sc-stat-value">{result.total_packages ?? '—'}</span>
                      <span className="sc-stat-label muted">packages</span>
                    </div>
                    <div className="sc-stat">
                      <span
                        className="sc-stat-value"
                        style={{ color: (result.flagged_count || 0) > 0 ? 'var(--color-danger)' : 'var(--color-safe)' }}
                      >
                        {result.flagged_count ?? 0}
                      </span>
                      <span className="sc-stat-label muted">flagged</span>
                    </div>
                  </div>
                </div>

                <p className="sc-summary">{result.summary}</p>

                {/* Findings */}
                {result.findings?.length > 0 && (
                  <div className="sc-section">
                    <h4 className="sc-section-title">Findings</h4>
                    <ul className="sc-findings">
                      {result.findings.map((f, i) => (
                        <li key={i} className="sc-finding">
                          <div className="sc-finding-header">
                            <SeverityBadge severity={f.severity} />
                            <code className="sc-pkg-name">{f.package}</code>
                            <span className="sc-finding-issue">{f.issue}</span>
                          </div>
                          <p className="sc-finding-detail">{f.detail}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {result.recommendations?.length > 0 && (
                  <div className="sc-section">
                    <h4 className="sc-section-title">Recommendations</h4>
                    <ul className="sc-recs">
                      {result.recommendations.map((r, i) => (
                        <li key={i} className="sc-rec-item">{r}</li>
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
