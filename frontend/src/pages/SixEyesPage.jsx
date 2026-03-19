import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import TrustBadge from '../components/TrustBadge';
import AIConsentModal from '../components/AIConsentModal';
import AIDisclosure from '../components/AIDisclosure';
import Spinner from '../components/Spinner';

function getToken() {
  return localStorage.getItem('token') || '';
}

export default function SixEyesPage() {
  const [consent, setConsent]         = useState(null); // null = loading, true/false = known
  const [consentLoading, setConsentLoading] = useState(false);
  const [messages, setMessages]       = useState([]);   // { role: 'user'|'ai', content: string }
  const [input, setInput]             = useState('');
  const [streaming, setStreaming]      = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [error, setError]             = useState('');
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Load consent status
  useEffect(() => {
    api.get('/six-eyes/log')
      .then(({ data }) => setConsent(data.consent?.accepted || false))
      .catch(() => setConsent(false));
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentText]);

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

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || streaming) return;

    setInput('');
    setError('');
    const userMessage = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMessage]);
    setStreaming(true);
    setCurrentText('');

    try {
      const token = getToken();
      const apiBase = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiBase}/six-eyes/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: msg,
          history: messages.slice(-6), // last 3 exchanges for context
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Request failed');
      }

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let full   = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) {
              full += parsed.text;
              setCurrentText(full);
            }
          } catch (e) {
            if (e.message !== 'Unexpected end of JSON input') throw e;
          }
        }
      }

      setMessages(prev => [...prev, { role: 'ai', content: full }]);
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
      // Remove the user message we optimistically added
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setStreaming(false);
      setCurrentText('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (consent === null) {
    return (
      <main className="page six-eyes-page">
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
          <Spinner />
        </div>
      </main>
    );
  }

  return (
    <main className="page six-eyes-page">
      <div className="six-eyes-header">
        <h2>Six Eyes</h2>
        <Link to="/six-eyes/log" className="six-eyes-log-link muted">Audit log →</Link>
      </div>
      <TrustBadge badges={['Anthropic Haiku', 'Prompts hashed, not stored', 'Consent required']} />
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        Your personal AI security assistant. Ask anything about your posture, the tools, or cybersecurity in general.
      </p>

      {!consent ? (
        <AIConsentModal
          onAccept={handleAccept}
          onDecline={() => window.history.back()}
          loading={consentLoading}
        />
      ) : (
        <div className="six-eyes-chat-wrap">
          <div className="six-eyes-messages">
            {messages.length === 0 && !streaming && (
              <div className="six-eyes-empty">
                <p>Six Eyes is ready. What would you like to know?</p>
                <div className="six-eyes-suggestions">
                  {[
                    'What should I do first to improve my security?',
                    'How does the breach checker work?',
                    'Why is 2FA important and which type is best?',
                    'Explain how the security score is calculated',
                  ].map(s => (
                    <button key={s} className="six-eyes-suggestion" onClick={() => setInput(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`six-eyes-message six-eyes-message--${m.role}`}>
                <span className="six-eyes-message-label">{m.role === 'user' ? 'You' : 'Six Eyes'}</span>
                <p>{m.content}</p>
                {m.role === 'ai' && i === messages.length - 1 && !streaming && (
                  <AIDisclosure />
                )}
              </div>
            ))}

            {streaming && (
              <div className="six-eyes-message six-eyes-message--ai">
                <span className="six-eyes-message-label">Six Eyes</span>
                <p>
                  {currentText || <span className="six-eyes-thinking">Thinking<span className="six-eyes-dots" /></span>}
                  {currentText && <span className="six-eyes-cursor" />}
                </p>
              </div>
            )}

            {error && (
              <p className="muted" style={{ color: 'var(--color-danger)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                {error}
              </p>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="six-eyes-input-row">
            <textarea
              ref={inputRef}
              className="six-eyes-input"
              placeholder="Ask Six Eyes anything about your security…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              maxLength={2000}
              disabled={streaming}
            />
            <button
              className="btn-primary six-eyes-send"
              onClick={handleSend}
              disabled={streaming || !input.trim()}
            >
              {streaming ? '…' : '↑'}
            </button>
          </div>
          <p className="muted" style={{ fontSize: '0.72rem', marginTop: '0.4rem' }}>
            Enter to send · Shift+Enter for new line · 15 messages/hr limit
          </p>
        </div>
      )}
    </main>
  );
}
