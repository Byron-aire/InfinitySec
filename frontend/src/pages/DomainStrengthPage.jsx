import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import TrustBadge from '../components/TrustBadge';
import AIConsentModal from '../components/AIConsentModal';
import AIDisclosure from '../components/AIDisclosure';
import Reveal from '../components/Reveal';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';

const LOADING_STAGES = [
  'Verifying SSL certificate…',
  'Checking threat databases…',
  'Inspecting security headers…',
  'Looking up domain registration…',
  'Running AI analysis…',
];

const GRADE_COLORS = {
  A: 'var(--color-safe)',
  B: 'var(--color-very-strong)',
  C: 'var(--color-fair)',
  D: 'var(--color-danger)',
  F: 'var(--color-danger)',
};

const SEVERITY_STYLES = {
  critical: { bg: 'rgba(239,68,68,0.12)', color: 'var(--color-danger)',  border: 'rgba(239,68,68,0.3)' },
  high:     { bg: 'rgba(249,115,22,0.12)', color: 'var(--color-fair)',   border: 'rgba(249,115,22,0.3)' },
  medium:   { bg: 'rgba(59,130,246,0.12)', color: 'var(--color-accent)', border: 'rgba(59,130,246,0.3)' },
  low:      { bg: 'rgba(34,211,238,0.10)', color: 'var(--color-cyan)',   border: 'rgba(34,211,238,0.3)' },
  info:     { bg: 'rgba(107,114,128,0.1)', color: 'var(--color-muted)',  border: 'rgba(107,114,128,0.25)' },
};

function SeverityBadge({ severity }) {
  const s = SEVERITY_STYLES[severity] || SEVERITY_STYLES.info;
  return (
    <span
      className="ds-severity-badge"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {severity}
    </span>
  );
}

function ScoreDisplay({ score, grade }) {
  const color = GRADE_COLORS[grade] || 'var(--color-muted)';
  return (
    <div className="ds-score-wrap">
      <div className="ds-score-ring" style={{ borderColor: color, boxShadow: `0 0 28px ${color}40` }}>
        <span className="ds-score-number" style={{ color }}>{score}</span>
        <span className="ds-score-label">/ 100</span>
      </div>
      <div className="ds-grade-wrap">
        <span className="ds-grade" style={{ color, border: `2px solid ${color}`, boxShadow: `0 0 14px ${color}30` }}>
          {grade}
        </span>
        <span className="ds-grade-label">grade</span>
      </div>
    </div>
  );
}

function HeadersTable({ headers }) {
  if (!headers) return <p className="muted" style={{ fontSize: '0.875rem' }}>Header data unavailable.</p>;

  const rows = [
    { label: 'HSTS',                   ok: headers.hsts },
    { label: 'Content-Security-Policy',ok: headers.csp },
    { label: 'X-Frame-Options',        ok: headers.xFrameOptions },
    { label: 'X-Content-Type-Options', ok: headers.xContentTypeOptions },
    { label: 'Referrer-Policy',        ok: headers.referrerPolicy },
    { label: 'Permissions-Policy',     ok: headers.permissionsPolicy },
  ];

  return (
    <div className="ds-headers-grid">
      {rows.map(r => (
        <div key={r.label} className="ds-header-row">
          <span className="ds-header-name">{r.label}</span>
          <span style={{ color: r.ok ? 'var(--color-safe)' : 'var(--color-danger)', fontWeight: 600, fontSize: '0.85rem' }}>
            {r.ok ? '✓' : '✗'}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function DomainStrengthPage() {
  const [consent, setConsent]               = useState(null);
  const [consentLoading, setConsentLoading] = useState(false);
  const [domain, setDomain]                 = useState('');
  const [loading, setLoading]               = useState(false);
  const [stageIdx, setStageIdx]             = useState(0);
  const [result, setResult]                 = useState(null);
  const [error, setError]                   = useState('');
  const [showSignals, setShowSignals]       = useState(false);
  const stageTimer = useRef(null);

  // Load consent status (reuse six-eyes log endpoint)
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

  const startStages = () => {
    setStageIdx(0);
    let idx = 0;
    stageTimer.current = setInterval(() => {
      idx = Math.min(idx + 1, LOADING_STAGES.length - 1);
      setStageIdx(idx);
    }, 1800);
  };

  const stopStages = () => {
    clearInterval(stageTimer.current);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clean = domain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
    if (!clean) return;
    setLoading(true);
    setError('');
    setResult(null);
    setShowSignals(false);
    startStages();

    try {
      const { data } = await api.post('/domain-strength/check', { domain: clean });
      setResult(data);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Analysis failed. Please try again.';
      if (err.response?.status === 403) {
        setConsent(false);
      } else {
        setError(msg);
      }
    } finally {
      stopStages();
      setLoading(false);
    }
  };

  if (consent === null) {
    return (
      <main className="page ds-page">
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
          <Spinner />
        </div>
      </main>
    );
  }

  return (
    <main className="page ds-page">
      <h2>Domain Strength</h2>
      <TrustBadge badges={['AI-powered analysis', 'Server-side only', 'Results cached 24hr']} />
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        Multi-stage domain security analysis — SSL, security headers, threat intelligence, and domain age,
        synthesised by AI into a single score.
      </p>

      {!consent ? (
        <AIConsentModal
          onAccept={handleAccept}
          onDecline={() => window.history.back()}
          loading={consentLoading}
        />
      ) : (
        <>
          <form className="ds-form" onSubmit={handleSubmit}>
            <input
              type="text"
              className="ds-input"
              placeholder="example.com"
              value={domain}
              onChange={e => setDomain(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              disabled={loading}
            />
            <button className="btn-primary" type="submit" disabled={loading || !domain.trim()}>
              {loading ? 'Analysing…' : 'Analyse'}
            </button>
          </form>

          {loading && (
            <div className="ds-loading">
              <Spinner />
              <p className="ds-loading-stage">{LOADING_STAGES[stageIdx]}</p>
            </div>
          )}

          <ErrorMessage message={error} />

          {result && (
            <Reveal>
              <div className="ds-result">
                {result.cached && (
                  <p className="ds-cached-notice">Cached result · analysed within the last 24 hours</p>
                )}

                <div className="ds-result-header">
                  <ScoreDisplay score={result.score} grade={result.grade} />
                  <div className="ds-result-meta">
                    <span className="ds-domain-label">{result.domain}</span>
                    <p className="ds-summary">{result.summary}</p>
                  </div>
                </div>

                <div className="ds-section">
                  <h4 className="ds-section-title">Findings</h4>
                  <ul className="ds-findings">
                    {(result.findings || []).map((f, i) => (
                      <li key={i} className="ds-finding">
                        <div className="ds-finding-header">
                          <SeverityBadge severity={f.severity} />
                          <span className="ds-finding-title">{f.title}</span>
                        </div>
                        <p className="ds-finding-detail">{f.detail}</p>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="ds-section">
                  <h4 className="ds-section-title">Recommendations</h4>
                  <ul className="ds-recommendations">
                    {(result.recommendations || []).map((r, i) => (
                      <li key={i} className="ds-rec-item">{r}</li>
                    ))}
                  </ul>
                </div>

                <div className="ds-section">
                  <button
                    className="ds-signals-toggle"
                    onClick={() => setShowSignals(v => !v)}
                  >
                    {showSignals ? '▲ Hide raw signals' : '▼ Show raw signals'}
                  </button>
                  {showSignals && (
                    <div className="ds-signals">
                      <div className="ds-signals-grid">
                        <div>
                          <p className="ds-section-title">SSL</p>
                          {result.signals?.ssl ? (
                            <div className="ds-mini-grid">
                              <span className="ds-mini-label">Valid</span>
                              <span style={{ color: result.signals.ssl.valid ? 'var(--color-safe)' : 'var(--color-danger)' }}>
                                {result.signals.ssl.valid ? 'Yes' : 'No'}
                              </span>
                              <span className="ds-mini-label">Days left</span>
                              <span>{result.signals.ssl.daysRemaining ?? '—'}</span>
                              <span className="ds-mini-label">Issuer</span>
                              <span className="ds-mini-value">{result.signals.ssl.issuer || '—'}</span>
                            </div>
                          ) : <p className="muted" style={{ fontSize: '0.8rem' }}>Unavailable</p>}
                        </div>

                        <div>
                          <p className="ds-section-title">Security Headers</p>
                          <HeadersTable headers={result.signals?.securityHeaders} />
                        </div>

                        <div>
                          <p className="ds-section-title">Domain Age</p>
                          {result.signals?.domainAge ? (
                            <div className="ds-mini-grid">
                              <span className="ds-mini-label">Registered</span>
                              <span className="ds-mini-value">
                                {result.signals.domainAge.registrationDate
                                  ? new Date(result.signals.domainAge.registrationDate).getFullYear()
                                  : '—'}
                              </span>
                              <span className="ds-mini-label">Age</span>
                              <span>{result.signals.domainAge.ageYears != null ? `${result.signals.domainAge.ageYears} yrs` : '—'}</span>
                              <span className="ds-mini-label">Expires</span>
                              <span className="ds-mini-value">
                                {result.signals.domainAge.expirationDate
                                  ? new Date(result.signals.domainAge.expirationDate).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })
                                  : '—'}
                              </span>
                            </div>
                          ) : <p className="muted" style={{ fontSize: '0.8rem' }}>Unavailable</p>}
                        </div>

                        <div>
                          <p className="ds-section-title">Safe Browsing</p>
                          {result.signals?.safeBrowsing ? (
                            <p style={{ color: result.signals.safeBrowsing.safe ? 'var(--color-safe)' : 'var(--color-danger)', fontWeight: 600, fontSize: '0.9rem' }}>
                              {result.signals.safeBrowsing.safe ? 'No threats detected' : `Threats: ${result.signals.safeBrowsing.threats.join(', ')}`}
                            </p>
                          ) : <p className="muted" style={{ fontSize: '0.8rem' }}>Unavailable</p>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <AIDisclosure model="Claude Sonnet" />
              </div>
            </Reveal>
          )}
        </>
      )}
    </main>
  );
}
