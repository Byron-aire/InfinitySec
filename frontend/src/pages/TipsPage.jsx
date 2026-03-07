import { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import Reveal from '../components/Reveal';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';

const CATEGORIES = [
  { id: 'All',       icon: '◈',  label: 'All' },
  { id: 'Passwords', icon: '🔑', label: 'Passwords' },
  { id: 'Phishing',  icon: '🎣', label: 'Phishing' },
  { id: 'Privacy',   icon: '🛡',  label: 'Privacy' },
  { id: 'AI',        icon: '🤖', label: 'AI' },
  { id: 'Network',   icon: '🌐', label: 'Network' },
  { id: 'Devices',   icon: '💻', label: 'Devices' },
];

const PREVIEW_LENGTH = 130;

function TipCard({ tip }) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = tip.content.length > PREVIEW_LENGTH;
  const cat = CATEGORIES.find(c => c.id === tip.category) || {};

  return (
    <div className={`tip-card ${expanded ? 'tip-card--expanded' : ''}`}>
      <span className="tip-category" data-cat={tip.category}>
        <span className="tip-cat-icon">{cat.icon}</span> {tip.category}
      </span>
      <h3>{tip.title}</h3>
      <p className="tip-content">
        {needsTruncation && !expanded
          ? tip.content.slice(0, PREVIEW_LENGTH).trimEnd() + '…'
          : tip.content}
      </p>
      {needsTruncation && (
        <button
          className="tip-expand-btn"
          onClick={() => setExpanded(e => !e)}
        >
          {expanded ? 'Show less ↑' : 'Read more ↓'}
        </button>
      )}
    </div>
  );
}

function StatsBar({ all, active, query, filteredCount }) {
  const catCounts = useMemo(() => {
    const counts = {};
    all.forEach(t => { counts[t.category] = (counts[t.category] || 0) + 1; });
    return counts;
  }, [all]);

  return (
    <div className="tips-stats-bar">
      <div className="tips-stat">
        <span className="tips-stat-value">{all.length}</span>
        <span className="tips-stat-label">total tips</span>
      </div>
      {Object.entries(catCounts).map(([cat, count]) => {
        const c = CATEGORIES.find(x => x.id === cat) || {};
        return (
          <div key={cat} className="tips-stat">
            <span className="tips-stat-value">{count}</span>
            <span className="tips-stat-label">{c.icon} {cat}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function TipsPage() {
  const [allTips, setAllTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const fetchTips = async () => {
      try {
        const { data } = await api.get('/tips');
        setAllTips(data);
      } catch {
        setError('Failed to load tips');
      } finally {
        setLoading(false);
      }
    };
    fetchTips();
  }, []);

  const categoryFiltered = useMemo(() => {
    if (activeCategory === 'All') return allTips;
    return allTips.filter(t => t.category === activeCategory);
  }, [allTips, activeCategory]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categoryFiltered;
    return categoryFiltered.filter(
      tip => tip.title.toLowerCase().includes(q) || tip.content.toLowerCase().includes(q)
    );
  }, [categoryFiltered, query]);

  const featured = useMemo(() => allTips[0] || null, [allTips]);

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setQuery('');
  };

  return (
    <main className="page tips-page">
      <Reveal>
        <h2>Security Learning Hub</h2>
        <p className="muted" style={{ marginBottom: '1.5rem' }}>
          {allTips.length} expert tips across {CATEGORIES.length - 1} categories — practical advice you can act on today.
        </p>
      </Reveal>

      {!loading && !error && allTips.length > 0 && (
        <Reveal delay={60}>
          <StatsBar all={allTips} active={activeCategory} query={query} filteredCount={filtered.length} />
        </Reveal>
      )}

      <Reveal delay={100}>
        <div className="tips-search-row">
          <input
            type="text"
            className="tips-search"
            placeholder="Search all tips..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="btn-ghost tips-search-clear" onClick={() => setQuery('')}>✕</button>
          )}
        </div>

        <div className="category-filters">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`filter-btn ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => handleCategoryChange(cat.id)}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </Reveal>

      <ErrorMessage message={error} />

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <p className="muted">
          {query ? `No tips match "${query}".` : 'No tips in this category.'}
        </p>
      ) : (
        <>
          <div className="tips-result-meta muted" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
            {query
              ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''} for "${query}"`
              : `${filtered.length} tip${filtered.length !== 1 ? 's' : ''}${activeCategory !== 'All' ? ` in ${activeCategory}` : ''}`
            }
          </div>

          {!query && activeCategory === 'All' && featured && (
            <Reveal delay={80}>
              <div className="tip-featured">
                <div className="tip-featured-label">Featured tip</div>
                <h3>{featured.title}</h3>
                <p>{featured.content}</p>
                <span className="tip-category" data-cat={featured.category} style={{ marginTop: '1rem', display: 'inline-block' }}>
                  {CATEGORIES.find(c => c.id === featured.category)?.icon} {featured.category}
                </span>
              </div>
            </Reveal>
          )}

          <Reveal delay={120}>
            <div className="tips-grid">
              {(query || activeCategory !== 'All' ? filtered : filtered.slice(1)).map((tip) => (
                <TipCard key={tip._id} tip={tip} />
              ))}
            </div>
          </Reveal>
        </>
      )}
    </main>
  );
}
