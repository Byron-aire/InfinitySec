import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

const PLATFORMS = [
  // Email
  { id: 'gmail',      name: 'Gmail',               category: 'Email',    methods: ['App', 'Hardware'] },
  { id: 'outlook',    name: 'Outlook / Hotmail',    category: 'Email',    methods: ['App', 'SMS'] },
  { id: 'yahoo',      name: 'Yahoo Mail',           category: 'Email',    methods: ['App', 'SMS'] },
  { id: 'protonmail', name: 'ProtonMail',           category: 'Email',    methods: ['App', 'Hardware'] },
  { id: 'icloud',     name: 'iCloud / Apple ID',    category: 'Email',    methods: ['App', 'SMS'] },
  // Social
  { id: 'instagram',  name: 'Instagram',            category: 'Social',   methods: ['App', 'SMS'] },
  { id: 'twitter',    name: 'X / Twitter',          category: 'Social',   methods: ['App', 'SMS', 'Hardware'] },
  { id: 'facebook',   name: 'Facebook',             category: 'Social',   methods: ['App', 'SMS', 'Hardware'] },
  { id: 'linkedin',   name: 'LinkedIn',             category: 'Social',   methods: ['App', 'SMS'] },
  { id: 'discord',    name: 'Discord',              category: 'Social',   methods: ['App', 'SMS', 'Hardware'] },
  { id: 'tiktok',     name: 'TikTok',               category: 'Social',   methods: ['SMS'] },
  // Finance
  { id: 'paypal',     name: 'PayPal',               category: 'Finance',  methods: ['App', 'SMS', 'Hardware'] },
  { id: 'revolut',    name: 'Revolut',              category: 'Finance',  methods: ['App'] },
  { id: 'coinbase',   name: 'Coinbase',             category: 'Finance',  methods: ['App', 'SMS', 'Hardware'] },
  { id: 'binance',    name: 'Binance',              category: 'Finance',  methods: ['App', 'Hardware'] },
  { id: 'cashapp',    name: 'Cash App',             category: 'Finance',  methods: ['SMS'] },
  // Work
  { id: 'github',     name: 'GitHub',               category: 'Work',     methods: ['App', 'SMS', 'Hardware'] },
  { id: 'google_w',   name: 'Google Workspace',     category: 'Work',     methods: ['App', 'SMS', 'Hardware'] },
  { id: 'slack',      name: 'Slack',                category: 'Work',     methods: ['App', 'SMS'] },
  { id: 'dropbox',    name: 'Dropbox',              category: 'Work',     methods: ['App', 'SMS', 'Hardware'] },
  { id: 'notion',     name: 'Notion',               category: 'Work',     methods: ['App'] },
  // Gaming
  { id: 'steam',      name: 'Steam',                category: 'Gaming',   methods: ['App', 'SMS'] },
  { id: 'epic',       name: 'Epic Games',           category: 'Gaming',   methods: ['App', 'SMS'] },
  { id: 'psn',        name: 'PlayStation Network',  category: 'Gaming',   methods: ['App', 'SMS'] },
  { id: 'xbox',       name: 'Xbox / Microsoft',     category: 'Gaming',   methods: ['App', 'SMS', 'Hardware'] },
  // Shopping
  { id: 'amazon',     name: 'Amazon',               category: 'Shopping', methods: ['App', 'SMS'] },
  { id: 'ebay',       name: 'eBay',                 category: 'Shopping', methods: ['App', 'SMS'] },
];

const CATEGORIES = ['Email', 'Social', 'Finance', 'Work', 'Gaming', 'Shopping'];

const METHOD_STYLE = {
  App:      { background: 'rgba(34,197,94,0.12)',   color: 'var(--color-safe)' },
  SMS:      { background: 'rgba(249,115,22,0.12)',  color: 'var(--color-fair)' },
  Hardware: { background: 'rgba(167,139,250,0.12)', color: 'var(--color-blue)' },
};

const STORAGE_KEY = (id) => `barrier_${id}`;

export default function TwoFAPage() {
  const { user } = useAuth();
  const [checked, setChecked] = useState(new Set());

  useEffect(() => {
    if (!user) return;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY(user.id)) || '[]');
      setChecked(new Set(saved));
    } catch {
      setChecked(new Set());
    }
  }, [user]);

  const toggle = (id) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      if (user) {
        localStorage.setItem(STORAGE_KEY(user.id), JSON.stringify([...next]));
      }
      return next;
    });
  };

  const total = PLATFORMS.length;
  const secured = checked.size;
  const pct = Math.round((secured / total) * 100);

  const barColor = useMemo(() => {
    if (pct >= 80) return 'var(--color-safe)';
    if (pct >= 50) return 'var(--color-fair)';
    return 'var(--color-danger)';
  }, [pct]);

  return (
    <main className="page barrier-page">
      <h2>The Barrier</h2>
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        Track which of your accounts have two-factor authentication enabled. Check off each one as you secure it.
      </p>

      <div className="barrier-progress-card">
        <div className="barrier-progress-header">
          <span className="stat-value" style={{ color: barColor }}>{secured}</span>
          <span className="barrier-progress-label">/ {total} platforms secured</span>
          <span className="barrier-pct" style={{ color: barColor, marginLeft: 'auto' }}>{pct}%</span>
        </div>
        <div className="barrier-bar-track">
          <div
            className="barrier-bar-fill"
            style={{ width: `${pct}%`, background: barColor, boxShadow: `0 0 10px ${barColor}55` }}
          />
        </div>
      </div>

      <div className="barrier-tip">
        <span style={{ color: 'var(--color-safe)', fontWeight: 600 }}>App</span> (TOTP authenticator) is always safer than{' '}
        <span style={{ color: 'var(--color-fair)', fontWeight: 600 }}>SMS</span> — SIM swaps are real. Use{' '}
        <span style={{ color: 'var(--color-text)' }}>Aegis, Authy, or Google Authenticator</span>.{' '}
        <span style={{ color: 'var(--color-blue)', fontWeight: 600 }}>Hardware</span> keys (YubiKey) are the gold standard.
      </div>

      {CATEGORIES.map(cat => {
        const platforms = PLATFORMS.filter(p => p.category === cat);
        return (
          <div key={cat} className="barrier-category">
            <h3 className="barrier-category-title">{cat}</h3>
            <div className="barrier-list">
              {platforms.map(p => (
                <label key={p.id} className={`barrier-item${checked.has(p.id) ? ' barrier-item--checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked.has(p.id)}
                    onChange={() => toggle(p.id)}
                  />
                  <span className="barrier-name">{p.name}</span>
                  <div className="barrier-methods">
                    {p.methods.map(m => (
                      <span key={m} className="barrier-method-badge" style={METHOD_STYLE[m]}>{m}</span>
                    ))}
                  </div>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </main>
  );
}
