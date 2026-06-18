import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import Spinner from './Spinner';

const GRADE_COLORS = {
  Maximum:   '#e2c78a',
  Excellent: '#4ade80',
  Strong:    '#34b97a',
  Moderate:  '#e0a83e',
  Basic:     '#f06a7c',
  Exposed:   '#e23048',
};

function Gauge({ score, grade, color }) {
  const r = 58, cx = 72, cy = 72;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  return (
    <svg width="144" height="144" viewBox="0 0 144 144" className="score-gauge">
      <defs>
        <filter id="score-panel-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
      <circle
        cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} filter="url(#score-panel-glow)"
        style={{ transition: 'stroke-dashoffset 0.7s var(--ease-glass), stroke 0.3s ease' }}
      />
      <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="central"
        fill="#f7f4ee" fontSize="30" fontWeight="700" fontFamily="-apple-system, system-ui, sans-serif">{score}</text>
      <text x={cx} y={cy + 18} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize="11" fontWeight="600" fontFamily="-apple-system, system-ui, sans-serif">{grade}</text>
    </svg>
  );
}

function Sparkline({ trend }) {
  if (!trend || trend.length < 2) return null;
  const w = 200, h = 40, pad = 3;
  const xs = trend.map((_, i) => pad + (i / (trend.length - 1)) * (w - pad * 2));
  const ys = trend.map(t => h - pad - (t.score / 100) * (h - pad * 2));
  const pts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  return (
    <div className="score-spark">
      <span className="score-spark-label">Your trend</span>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <polyline points={pts} fill="none" stroke="var(--color-accent)" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="3" fill="var(--color-accent)" />
      </svg>
    </div>
  );
}

export default function SecurityScorePanel() {
  const [data, setData]     = useState(null);
  const [loading, setLoad]  = useState(true);

  useEffect(() => {
    api.get('/score')
      .then(({ data }) => setData(data))
      .catch(() => setData(null))
      .finally(() => setLoad(false));
  }, []);

  if (loading) {
    return <div className="score-panel score-panel--loading"><Spinner /></div>;
  }
  if (!data) return null;

  const color = GRADE_COLORS[data.grade] || 'var(--color-accent)';
  const delta = data.milestones?.delta;
  const topActions = (data.nextActions || []).slice(0, 3);

  return (
    <div className="score-panel sheen">
      <div className="score-panel-main">
        <div className="score-panel-gauge-wrap">
          <Gauge score={data.score} grade={data.grade} color={color} />
          {delta != null && delta !== 0 && (
            <span className={`score-delta${delta > 0 ? ' score-delta--up' : ' score-delta--down'}`}>
              {delta > 0 ? '▲' : '▼'} {Math.abs(delta)} since last visit
            </span>
          )}
        </div>

        <div className="score-panel-body">
          <div className="score-panel-head">
            <h3 className="score-panel-title">Security Score</h3>
            {data.milestones?.best > data.score && (
              <span className="score-best">Best: {data.milestones.best}</span>
            )}
          </div>

          {topActions.length > 0 ? (
            <>
              <p className="score-panel-sub">Do this next to raise your score:</p>
              <div className="score-actions">
                {topActions.map(a => (
                  <Link key={a.key} to={a.route} className="score-action">
                    <span className="score-action-label">{a.label}</span>
                    <span className="score-action-points">+{a.points}</span>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <p className="score-panel-sub score-panel-allgreen">
              ★ Every factor is green — you&apos;re fully fortified. Keep monitoring active.
            </p>
          )}

          <Sparkline trend={data.trend} />
        </div>
      </div>
    </div>
  );
}
