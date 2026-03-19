import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import Reveal from '../components/Reveal';
import ErrorMessage from '../components/ErrorMessage';
import TrustBadge from '../components/TrustBadge';
import AIDisclosure from '../components/AIDisclosure';
import Spinner from '../components/Spinner';

const SCAN_MESSAGES = [
  'Initialising breach database connection...',
  'Querying HaveIBeenPwned API...',
  'Scanning 12 billion records...',
  'Cross-referencing breach datasets...',
  'Analysing exposure vectors...',
  'Compiling threat intelligence...',
];

function aggregateDataClasses(breaches) {
  const seen = new Set();
  for (const b of breaches) {
    for (const dc of (b.DataClasses || [])) seen.add(dc);
  }
  return [...seen].sort();
}

function CursedIntel({ breaches, consent }) {
  const [impact, setImpact]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [analysed, setAnalysed]   = useState(false);

  const dataClasses = aggregateDataClasses(breaches);

  const handleAnalyse = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/breach/impact', {
        dataClasses,
        breachCount: breaches.length,
      });
      setImpact(data);
      setAnalysed(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Analysis failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cursed-intel">
      <div className="cursed-intel-header">
        <span className="cursed-intel-label">Cursed Intel</span>
        <span className="cursed-intel-badge">AI</span>
      </div>
      <p className="cursed-intel-sub">
        What can an attacker actually do with your exposed data?
      </p>

      {dataClasses.length > 0 && (
        <div className="cursed-intel-classes">
          {dataClasses.map(dc => (
            <span key={dc} className="cursed-intel-class">{dc}</span>
          ))}
        </div>
      )}

      {!consent ? (
        <p className="cursed-intel-consent-note">
          AI analysis requires consent —{' '}
          <Link to="/six-eyes" className="cursed-intel-consent-link">enable AI features</Link>
        </p>
      ) : !analysed ? (
        <button
          className="btn-primary cursed-intel-btn"
          onClick={handleAnalyse}
          disabled={loading}
        >
          {loading ? 'Analysing…' : 'Analyse my exposure'}
        </button>
      ) : null}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
          <Spinner />
        </div>
      )}

      {error && (
        <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginTop: '0.75rem' }}>{error}</p>
      )}

      {impact && (
        <div className="cursed-intel-result">
          {impact.cached && (
            <p className="cursed-intel-cached">Cached result · analysed recently</p>
          )}
          <p className="cursed-intel-headline">{impact.headline}</p>
          <div className="cursed-intel-explanation">
            {impact.explanation.split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
          {impact.actions?.length > 0 && (
            <div className="cursed-intel-actions">
              <p className="cursed-intel-actions-title">Do this now</p>
              <ul>
                {impact.actions.map((a, i) => (
                  <li key={i} className="cursed-intel-action-item">{a}</li>
                ))}
              </ul>
            </div>
          )}
          <AIDisclosure model="Anthropic Haiku" />
        </div>
      )}
    </div>
  );
}

export default function BreachCheckerPage() {
  const [email, setEmail]     = useState('');
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [scanMsg, setScanMsg] = useState('');
  const [consent, setConsent] = useState(false);
  const scanRef = useRef(null);

  // Load AI consent status on mount
  useEffect(() => {
    api.get('/six-eyes/log')
      .then(({ data }) => setConsent(data.consent?.accepted || false))
      .catch(() => setConsent(false));
  }, []);

  useEffect(() => {
    if (loading) {
      let i = 0;
      setScanMsg(SCAN_MESSAGES[0]);
      scanRef.current = setInterval(() => {
        i = (i + 1) % SCAN_MESSAGES.length;
        setScanMsg(SCAN_MESSAGES[i]);
      }, 700);
    } else {
      clearInterval(scanRef.current);
      setScanMsg('');
    }
    return () => clearInterval(scanRef.current);
  }, [loading]);

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await api.post('/breach/check', { email });
      setResult(data);
      await api.post('/history', {
        type: 'breach',
        input: null,
        result: { breached: data.breached, count: data.count },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Check failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page checker-page">
      <h2>Data Breach Checker</h2>
      <TrustBadge badges={['Server-side only', 'Email never stored', 'Powered by HaveIBeenPwned']} />
      <p className="muted">
        Check if your email has been exposed in a known data breach via HaveIBeenPwned.
      </p>
      <form onSubmit={handleCheck} className="breach-form">
        <input
          type="email"
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Scanning...' : 'Check Now'}
        </button>
      </form>
      <ErrorMessage message={error} />

      {loading && (
        <div className="scan-display">
          <div className="scan-line">
            <span>{scanMsg}</span>
            <span className="scan-cursor">█</span>
          </div>
        </div>
      )}

      {result && !result.breached && (
        <Reveal>
          <div className="breach-result safe" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
            <div className="breach-result-safe-icon">✓</div>
            <div className="threat-verdict threat-verdict--safe">CLEAR</div>
            <div className="breach-result-safe-title">You&apos;re in the clear</div>
            <p className="breach-result-safe-sub">
              No breaches found for this email address in the HaveIBeenPwned database.
            </p>
          </div>
        </Reveal>
      )}

      {result && result.breached && (
        <Reveal>
          <div className="breach-result breached">
            <div className="threat-verdict threat-verdict--danger">EXPOSED</div>
            <div style={{ marginBottom: '0.5rem' }}>
              <div className="breach-result-threat-count">{result.count}</div>
              <div className="breach-result-threat-label">
                breach{result.count !== 1 ? 'es' : ''} found
              </div>
            </div>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem', marginBottom: '0.25rem' }}>
              Your email was exposed in the following data breaches:
            </p>
            <ul className="breach-breach-list">
              {result.breaches.map((b) => (
                <li key={b.Name} className="breach-breach-item">
                  <span className="breach-breach-dot" />
                  <span className="breach-breach-name">{b.Name}</span>
                  <span className="breach-breach-year">{new Date(b.BreachDate).getFullYear()}</span>
                </li>
              ))}
            </ul>

            <CursedIntel breaches={result.breaches} consent={consent} />
          </div>
        </Reveal>
      )}
    </main>
  );
}
