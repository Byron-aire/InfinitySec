import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ALL_COMMANDS = [
  { id: 'checker',     label: 'Password Checker',   desc: 'Analyse password strength in real time',      path: '/checker',     category: 'Tools',   auth: true },
  { id: 'breach',      label: 'Breach Checker',      desc: 'Check if your email appears in breaches',     path: '/breach',      category: 'Tools',   auth: true },
  { id: 'generator',   label: 'Password Generator',  desc: 'Generate cryptographically secure passwords', path: '/generator',   category: 'Tools',   auth: true },
  { id: 'barrier',     label: 'The Barrier — 2FA',   desc: 'Track 2FA across 27 platforms',               path: '/barrier',     category: 'Tools',   auth: true },
  { id: 'ssl',         label: 'SSL Checker',          desc: 'Inspect any domain\'s certificate',           path: '/ssl',         category: 'Tools',   auth: true },
  { id: 'convergence', label: 'Convergence',          desc: 'Scan URLs for malware and phishing',          path: '/convergence', category: 'Tools',   auth: true },
  { id: 'voidwatch',   label: 'Void Watch',           desc: 'Weekly automated breach monitoring',          path: '/voidwatch',   category: 'Tools',   auth: true },
  { id: 'dashboard',   label: 'Dashboard',            desc: 'Activity, stats, and history',                path: '/dashboard',   category: 'Account', auth: true },
  { id: 'sessions',    label: 'Sessions',             desc: 'Manage active sessions and panic button',     path: '/sessions',    category: 'Account', auth: true },
  { id: 'account',     label: 'Privacy Dashboard',    desc: 'Your data, rights, and export',               path: '/account',     category: 'Account', auth: true },
  { id: 'six-eyes',        label: 'Six Eyes',          desc: 'AI security assistant — ask anything',          path: '/six-eyes',        category: 'AI', auth: true },
  { id: 'domain-strength', label: 'Domain Strength',  desc: 'AI-powered domain security analysis',           path: '/domain-strength', category: 'AI', auth: true },
  { id: 'six-eyes-log',    label: 'AI Audit Log',     desc: 'Review your AI interaction history',            path: '/six-eyes/log',    category: 'AI', auth: true },
  { id: 'tips',        label: 'Security Tips',        desc: 'Passwords, phishing, privacy, AI',            path: '/tips',        category: 'Learn',   auth: false },
  { id: 'privacy',     label: 'Privacy Policy',       desc: 'GDPR policy and data practices',              path: '/privacy',     category: 'Learn',   auth: false },
];

const CATEGORIES = ['AI', 'Tools', 'Account', 'Learn'];

export default function CommandPalette({ open, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const visible = ALL_COMMANDS.filter(c => !c.auth || user);

  const filtered = query.trim()
    ? visible.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.desc.toLowerCase().includes(query.toLowerCase())
      )
    : visible;

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => { setSelected(0); }, [query]);

  const go = useCallback((path) => {
    onClose();
    navigate(path);
  }, [navigate, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === 'Enter' && filtered[selected]) go(filtered[selected].path);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, filtered, selected, go, onClose]);

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-selected="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  if (!open) return null;

  // Build grouped structure when not searching
  let flatIndex = 0;
  const grouped = CATEGORIES.map(cat => ({
    cat,
    items: filtered.filter(c => c.category === cat),
  })).filter(g => g.items.length > 0);

  const isSearching = query.trim().length > 0;

  return (
    <div className="cmd-overlay" onMouseDown={onClose}>
      <div className="cmd-modal" onMouseDown={e => e.stopPropagation()}>

        <div className="cmd-search-row">
          <span className="cmd-search-icon">⌘</span>
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Search tools and pages…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button className="cmd-clear btn-ghost" onClick={() => setQuery('')}>✕</button>
          )}
        </div>

        <div className="cmd-list" ref={listRef}>
          {filtered.length === 0 && (
            <p className="cmd-empty">No results for &ldquo;{query}&rdquo;</p>
          )}

          {isSearching
            ? filtered.map((cmd, i) => (
                <button
                  key={cmd.id}
                  className={`cmd-item${i === selected ? ' cmd-item--selected' : ''}`}
                  data-selected={i === selected}
                  onClick={() => go(cmd.path)}
                  onMouseEnter={() => setSelected(i)}
                >
                  <span className="cmd-item-label">{cmd.label}</span>
                  <span className="cmd-item-desc">{cmd.desc}</span>
                </button>
              ))
            : grouped.map(({ cat, items }) => (
                <div key={cat}>
                  <div className="cmd-group-label">{cat}</div>
                  {items.map(cmd => {
                    const i = flatIndex++;
                    return (
                      <button
                        key={cmd.id}
                        className={`cmd-item${i === selected ? ' cmd-item--selected' : ''}`}
                        data-selected={i === selected}
                        onClick={() => go(cmd.path)}
                        onMouseEnter={() => setSelected(i)}
                      >
                        <span className="cmd-item-label">{cmd.label}</span>
                        <span className="cmd-item-desc">{cmd.desc}</span>
                      </button>
                    );
                  })}
                </div>
              ))
          }
        </div>

        <div className="cmd-footer">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
