import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import TrustBadge from '../components/TrustBadge';
import AIConsentModal from '../components/AIConsentModal';
import AIDisclosure from '../components/AIDisclosure';
import Reveal from '../components/Reveal';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';

const QUICK_STAGES = [
  'Verifying SSL certificate…',
  'Checking threat databases…',
  'Inspecting security headers…',
];

const DEEP_STAGES = [
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
  critical: { bg: 'rgba(226,48,72,0.12)', color: 'var(--color-danger)',  border: 'rgba(226,48,72,0.3)' },
  high:     { bg: 'rgba(224,168,62,0.12)', color: 'var(--color-fair)',   border: 'rgba(224,168,62,0.3)' },
  medium:   { bg: 'rgba(226,199,138,0.12)', color: 'var(--color-gold)', border: 'rgba(226,199,138,0.3)' },
  low:      { bg: 'rgba(52,185,122,0.10)', color: 'var(--color-safe)',   border: 'rgba(52,185,122,0.3)' },
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
  const [mode, setMode]                     = useState('quick'); // 'quick' (no AI) | 'deep' (AI)
  const [domain, setDomain]                 = useState('');
  const [loading, setLoading]               = useState(false);
  const [stageIdx, setStageIdx]             = useState(0);
  const [result, setResult]                 = useState(null);
  const [error, setError]                   = useState('');
  const [showSignals, setShowSignals]       = useState(false);
  const stageTimer = useRef(null);

  const STAGES = mode === 'deep' ? DEEP_STAGES : QUICK_STAGES;

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
      idx = Math.min(idx + 1, STAGES.length - 1);
      setStageIdx(idx);
    }, mode === 'deep' ? 1800 : 700);
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

    const endpoint = mode === 'deep' ? '/domain-strength/check' : '/domain-strength/quick';

    try {
      const { data } = await api.post(endpoint, { domain: clean });
      setResult(data);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Scan failed. Please try again.';
      if (err.response?.status === 403 && mode === 'deep') {
        setConsent(false);
      } else {
        setError(msg);
      }
    } finally {
      stopStages();
      setLoading(false);
    }
  };

  // Quick scan needs no consent; only gate the deep (AI) mode once consent status is known.
  const needsConsentGate = mode === 'deep' && consent === false;

  return (
    <main className="page ds-page">
      <h2>Domain Inspector</h2>
      <TrustBadge badges={['SSL · headers · Safe Browsing', 'Server-side only', 'Quick or AI deep scan']} />
      <p className="muted" style={{ marginBottom: '1.25rem' }}>
        Inspect any domain. <strong>Quick scan</strong> runs SSL, security headers, and Google Safe
        Browsing instantly. <strong>Deep scan</strong> adds domain-age intelligence and an AI-synthesised
        score, grade, and recommendations.
      </p>

      <div className="ds-mode-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={mode === 'quick'}
          className={`ds-mode-tab${mode === 'quick' ? ' ds-mode-tab--active' : ''}`}
          onClick={() => { setMode('quick'); setResult(null); setError(''); }}
        >
          Quick scan
          <span className="ds-mode-sub">SSL · headers · threats · instant</span>
        </button>
        <button
          role="tab"
          aria-selected={mode === 'deep'}
          className={`ds-mode-tab${mode === 'deep' ? ' ds-mode-tab--active' : ''}`}
          onClick={() => { setMode('deep'); setResult(null); setError(''); }}
        >
          Deep scan
          <span className="ds-mode-sub">+ domain age · AI score · AI</span>
        </button>
      </div>

      {needsConsentGate ? (
        <AIConsentModal
          onAccept={handleAccept}
          onDecline={() => setMode('quick')}
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
              {loading ? (mode === 'deep' ? 'Analysing…' : 'Scanning…') : (mode === 'deep' ? 'Deep scan' : 'Quick scan')}
            </button>
          </form>

          {loading && (
            <div className="ds-loading">
              <Spinner />
              <p className="ds-loading-stage">{STAGES[stageIdx]}</p>
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

                {result.recommendations?.length > 0 && (
                  <div className="ds-section">
                    <h4 className="ds-section-title">Recommendations</h4>
                    <ul className="ds-recommendations">
                      {result.recommendations.map((r, i) => (
                        <li key={i} className="ds-rec-item">{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.mode === 'quick' && (
                  <div className="ds-section">
                    <p className="muted" style={{ fontSize: '0.85rem' }}>
                      Want domain-age signals, an AI-synthesised score, and tailored recommendations?{' '}
                      <button type="button" className="ds-signals-toggle" onClick={() => { setMode('deep'); setResult(null); }}>
                        Run a deep scan →
                      </button>
                    </p>
                  </div>
                )}

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

                {result.mode !== 'quick' && <AIDisclosure model="Anthropic Sonnet" />}
              </div>
            </Reveal>
          )}
        </>
      )}
    </main>
  );
}
