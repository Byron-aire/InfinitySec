import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import TrustBadge from '../components/TrustBadge';
import AIConsentModal from '../components/AIConsentModal';
import AIDisclosure from '../components/AIDisclosure';
import Reveal from '../components/Reveal';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';

const VERDICT_CONFIG = {
  phishing:   { color: 'var(--color-danger)', label: 'Phishing',   icon: '⚠' },
  suspicious: { color: 'var(--color-fair)',   label: 'Suspicious', icon: '?' },
  safe:       { color: 'var(--color-safe)',   label: 'Safe',       icon: '✓' },
};

const SEVERITY_STYLES = {
  critical: { bg: 'rgba(239,68,68,0.12)', color: 'var(--color-danger)',  border: 'rgba(239,68,68,0.3)' },
  high:     { bg: 'rgba(249,115,22,0.12)', color: 'var(--color-fair)',   border: 'rgba(249,115,22,0.3)' },
  medium:   { bg: 'rgba(59,130,246,0.12)', color: 'var(--color-accent)', border: 'rgba(59,130,246,0.3)' },
  low:      { bg: 'rgba(34,211,238,0.10)', color: 'var(--color-cyan)',   border: 'rgba(34,211,238,0.3)' },
  info:     { bg: 'rgba(34,197,94,0.10)',  color: 'var(--color-safe)',   border: 'rgba(34,197,94,0.3)' },
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function SeverityBadge({ severity }) {
  const s = SEVERITY_STYLES[severity] || SEVERITY_STYLES.info;
  return (
    <span
      className="pa-severity-badge"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {severity}
    </span>
  );
}

export default function PhishingAnalyserPage() {
  const [consent, setConsent]               = useState(null);
  const [consentLoading, setConsentLoading] = useState(false);
  const [text, setText]                     = useState('');
  const [inputType, setInputType]           = useState('email');
  const [imageFile, setImageFile]           = useState(null);   // File object
  const [imagePreview, setImagePreview]     = useState(null);   // object URL
  const [dragOver, setDragOver]             = useState(false);
  const [loading, setLoading]               = useState(false);
  const [result, setResult]                 = useState(null);
  const [error, setError]                   = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.get('/six-eyes/log')
      .then(({ data }) => setConsent(data.consent?.accepted || false))
      .catch(() => setConsent(false));
  }, []);

  // Revoke object URL on cleanup
  useEffect(() => {
    return () => { if (imagePreview) URL.revokeObjectURL(imagePreview); };
  }, [imagePreview]);

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

  const applyFile = (file) => {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Image must be JPEG, PNG, WebP, or GIF.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Image too large — max 5MB.');
      return;
    }
    setError('');
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) applyFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) applyFile(file);
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        e.preventDefault();
        applyFile(item.getAsFile());
        return;
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imageFile) return;

    setLoading(true);
    setError('');
    setResult(null);

    // Always use FormData so multer can handle both text and optional file
    const fd = new FormData();
    fd.append('type', inputType);
    if (text.trim()) fd.append('text', text.trim());
    if (imageFile) fd.append('image', imageFile);

    try {
      const { data } = await api.post('/phishing/analyse', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
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
      <main className="page pa-page">
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
          <Spinner />
        </div>
      </main>
    );
  }

  const verdict = result ? VERDICT_CONFIG[result.verdict] || VERDICT_CONFIG.suspicious : null;
  const canSubmit = !loading && (text.trim().length > 0 || imageFile !== null);

  return (
    <main className="page pa-page">
      <h2>Phishing Analyser</h2>
      <TrustBadge badges={['AI-powered detection', 'Server-side only', 'Input not stored']} />
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        Paste a suspicious email or SMS, upload a screenshot, or both.
        Claude analyses it for phishing, smishing, and social engineering tactics.
      </p>

      {!consent ? (
        <AIConsentModal
          onAccept={handleAccept}
          onDecline={() => window.history.back()}
          loading={consentLoading}
        />
      ) : (
        <>
          <form className="pa-form" onSubmit={handleSubmit} onPaste={handlePaste}>
            {/* Email / SMS toggle */}
            <div className="pa-type-row">
              {['email', 'sms'].map(t => (
                <button
                  key={t}
                  type="button"
                  className={`pa-type-btn${inputType === t ? ' pa-type-btn--active' : ''}`}
                  onClick={() => setInputType(t)}
                >
                  {t === 'email' ? 'Email' : 'SMS / Text'}
                </button>
              ))}
            </div>

            {/* Text input */}
            <textarea
              className="pa-textarea"
              placeholder={inputType === 'email'
                ? 'Paste the email contents here — subject, sender, and body…'
                : 'Paste the SMS or text message here…'}
              value={text}
              onChange={e => setText(e.target.value)}
              rows={8}
              disabled={loading}
              spellCheck={false}
              maxLength={8000}
            />
            <div className="pa-char-row">
              <span className="pa-char-count muted">{text.length} / 8000</span>
            </div>

            {/* Image upload zone */}
            <div
              className={`pa-dropzone${dragOver ? ' pa-dropzone--over' : ''}${imagePreview ? ' pa-dropzone--has-image' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !imagePreview && fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && !imagePreview && fileInputRef.current?.click()}
              aria-label="Upload screenshot"
            >
              {imagePreview ? (
                <div className="pa-image-preview-wrap">
                  <img src={imagePreview} alt="Screenshot preview" className="pa-image-preview" />
                  <button
                    type="button"
                    className="pa-image-remove"
                    onClick={e => { e.stopPropagation(); removeImage(); }}
                    aria-label="Remove image"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="pa-dropzone-inner">
                  <span className="pa-dropzone-icon">📎</span>
                  <span className="pa-dropzone-text">
                    Drop a screenshot here, click to browse, or paste (Ctrl+V)
                  </span>
                  <span className="pa-dropzone-sub muted">JPEG · PNG · WebP · GIF · max 5MB</span>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            <button
              className="btn-primary"
              type="submit"
              disabled={!canSubmit}
            >
              {loading ? 'Analysing…' : 'Analyse'}
            </button>
          </form>

          {loading && (
            <div className="pa-loading">
              <Spinner />
              <p className="muted" style={{ marginTop: '0.75rem' }}>Running AI analysis…</p>
            </div>
          )}

          <ErrorMessage message={error} />

          {result && verdict && (
            <Reveal>
              <div className="pa-result">
                {/* Verdict banner */}
                <div
                  className="pa-verdict-banner"
                  style={{
                    borderColor: verdict.color,
                    background: `${verdict.color}12`,
                    boxShadow: `0 0 24px ${verdict.color}20`,
                  }}
                >
                  <span className="pa-verdict-icon" style={{ color: verdict.color }}>
                    {verdict.icon}
                  </span>
                  <div className="pa-verdict-text">
                    <span className="pa-verdict-label" style={{ color: verdict.color }}>
                      {verdict.label}
                    </span>
                    <span className="pa-confidence muted">
                      {result.confidence} confidence
                    </span>
                  </div>
                </div>

                <p className="pa-summary">{result.summary}</p>

                {/* Indicators */}
                {result.indicators?.length > 0 && (
                  <div className="pa-section">
                    <h4 className="pa-section-title">Indicators Found</h4>
                    <ul className="pa-indicators">
                      {result.indicators.map((ind, i) => (
                        <li key={i} className="pa-indicator">
                          <div className="pa-indicator-header">
                            <SeverityBadge severity={ind.severity} />
                            <span className="pa-indicator-category">{ind.category}</span>
                          </div>
                          <p className="pa-indicator-detail">{ind.detail}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suspicious links */}
                {result.suspicious_links?.length > 0 && (
                  <div className="pa-section">
                    <h4 className="pa-section-title">Suspicious Links</h4>
                    <ul className="pa-links">
                      {result.suspicious_links.map((link, i) => (
                        <li key={i} className="pa-link-item">
                          <span style={{ color: 'var(--color-danger)' }}>⚠</span>
                          <code className="pa-link-url">{link}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {result.recommendations?.length > 0 && (
                  <div className="pa-section">
                    <h4 className="pa-section-title">Recommendations</h4>
                    <ul className="pa-recs">
                      {result.recommendations.map((r, i) => (
                        <li key={i} className="pa-rec-item">{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <AIDisclosure model="Claude Sonnet" />
              </div>
            </Reveal>
          )}
        </>
      )}
    </main>
  );
}
