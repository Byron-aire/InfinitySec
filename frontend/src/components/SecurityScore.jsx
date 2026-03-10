import { useMemo } from 'react';

const GRADES = [
  { min: 96, label: 'Special Grade', color: '#F59E0B', desc: 'Untouchable. Maximum protection.' },
  { min: 85, label: 'Semi-Grade 1',  color: '#A78BFA', desc: 'Advanced. Nearly impenetrable.' },
  { min: 70, label: 'Grade 1',       color: '#3B82F6', desc: 'Protected. Strong security posture.' },
  { min: 50, label: 'Grade 2',       color: '#22C55E', desc: 'Developing. Good progress made.' },
  { min: 25, label: 'Grade 3',       color: '#F97316', desc: 'Basic. Room to improve.' },
  { min: 0,  label: 'Grade 4',       color: '#EF4444', desc: 'Unprotected. Take action now.' },
];

function getGrade(score) {
  return GRADES.find(g => score >= g.min) ?? GRADES[GRADES.length - 1];
}

function FactorRow({ label, earned, points }) {
  return (
    <div className="security-factor-row">
      <span style={{ color: earned ? 'var(--color-safe)' : 'var(--color-muted)', fontSize: '0.8rem' }}>
        {earned ? '✓' : '○'}
      </span>
      <span className="security-factor-label" style={{ color: earned ? 'var(--color-text)' : 'var(--color-muted)' }}>
        {label}
      </span>
      <span className="security-factor-pts" style={{ color: earned ? 'var(--color-safe)' : 'var(--color-muted)' }}>
        +{points}
      </span>
    </div>
  );
}

export default function SecurityScore({ history, voidwatchEnabled }) {
  const score = useMemo(() => {
    let s = 0;
    if (voidwatchEnabled) s += 30;
    if (history.some(h => h.type === 'breach')) s += 25;
    if (history.some(h => h.type === 'generated' || (h.type === 'strength' && h.result?.password))) s += 20;
    if (history.some(h => h.type === 'strength')) s += 10;
    try {
      if (JSON.parse(localStorage.getItem('barrier_2fa') || 'false')) s += 15;
    } catch { /* noop */ }
    return Math.min(100, s);
  }, [history, voidwatchEnabled]);

  const grade = getGrade(score);
  const isSpecial = grade.label === 'Special Grade';

  const r = 60, cx = 75, cy = 75;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="security-score-card">
      <div className="security-score-inner">
        <div className="security-score-gauge">
          <svg width="150" height="150" viewBox="0 0 150 150">
            <defs>
              <filter id="score-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {isSpecial && (
                <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="50%" stopColor="#FCD34D" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
              )}
            </defs>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(26,26,62,0.9)" strokeWidth="10" />
            <circle
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={isSpecial ? 'url(#gold-grad)' : grade.color}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
              filter="url(#score-glow)"
              style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
            />
            <text
              x={cx} y={cy - 6}
              textAnchor="middle" dominantBaseline="central"
              fill="#F5F5F5" fontSize="26" fontWeight="700" fontFamily="Inter, sans-serif"
            >
              {score}
            </text>
            <text
              x={cx} y={cy + 14}
              textAnchor="middle" dominantBaseline="central"
              fill={grade.color} fontSize="9" fontWeight="600" fontFamily="Inter, sans-serif"
            >
              / 100
            </text>
          </svg>
        </div>

        <div className="security-score-info">
          <div className="security-score-grade" style={{ color: grade.color }}>
            {grade.label}
            {isSpecial && <span style={{ marginLeft: '0.3rem' }}>★</span>}
          </div>
          <p className="security-score-desc">{grade.desc}</p>
          <div className="security-score-factors">
            <FactorRow label="Void Watch active"   earned={voidwatchEnabled}                                                           points={30} />
            <FactorRow label="Breach check done"   earned={history.some(h => h.type === 'breach')}                                    points={25} />
            <FactorRow label="Password saved"      earned={history.some(h => h.type === 'generated' || (h.type === 'strength' && h.result?.password))} points={20} />
            <FactorRow label="Strength check done" earned={history.some(h => h.type === 'strength')}                                  points={10} />
          </div>
        </div>
      </div>
    </div>
  );
}
