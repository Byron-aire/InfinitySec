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

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (h < 1)  return 'just now';
  if (h < 24) return `${h}h ago`;
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
}

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
        <button className="tip-expand-btn" onClick={() => setExpanded(e => !e)}>
          {expanded ? 'Show less ↑' : 'Read more ↓'}
        </button>
      )}
    </div>
  );
}

function NewsCard({ item }) {
  const domain = (() => {
    try { return new URL(item.link).hostname.replace('www.', ''); } catch { return ''; }
  })();
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="news-card"
    >
      <div className="news-card-header">
        <span className="news-source-badge" style={{ borderColor: item.color, color: item.color }}>
          {item.source}
        </span>
        <span className="news-card-date">{timeAgo(item.date)}</span>
      </div>
      <h3 className="news-card-title">{item.title}</h3>
      {item.summary && (
        <p className="news-card-summary">
          {item.summary.length > 140 ? item.summary.slice(0, 140).trimEnd() + '…' : item.summary}
        </p>
      )}
      <div className="news-card-footer">
        <span className="news-card-domain">{domain}</span>
        <span className="news-card-arrow">↗</span>
      </div>
    </a>
  );
}

function StatsBar({ all }) {
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

function TipsTab({ allTips }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [query, setQuery] = useState('');

  const categoryFiltered = useMemo(() =>
    activeCategory === 'All' ? allTips : allTips.filter(t => t.category === activeCategory),
    [allTips, activeCategory]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categoryFiltered;
    return categoryFiltered.filter(
      t => t.title.toLowerCase().includes(q) || t.content.toLowerCase().includes(q)
    );
  }, [categoryFiltered, query]);

  const featured = allTips[0] || null;

  return (
    <>
      <StatsBar all={allTips} />

      <div className="tips-search-row">
        <input
          type="text"
          className="tips-search"
          placeholder="Search tips..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && (
          <button className="btn-ghost tips-search-clear" onClick={() => setQuery('')}>✕</button>
        )}
      </div>

      <div className="category-filters">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`filter-btn ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => { setActiveCategory(cat.id); setQuery(''); }}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      <p className="muted" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
        {query
          ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''} for "${query}"`
          : `${filtered.length} tip${filtered.length !== 1 ? 's' : ''}${activeCategory !== 'All' ? ` in ${activeCategory}` : ''}`
        }
      </p>

      {!query && activeCategory === 'All' && featured && (
        <Reveal>
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

      {filtered.length === 0 ? (
        <p className="muted">{query ? `No tips match "${query}".` : 'No tips in this category.'}</p>
      ) : (
        <Reveal delay={80}>
          <div className="tips-grid">
            {(query || activeCategory !== 'All' ? filtered : filtered.slice(1)).map(tip => (
              <TipCard key={tip._id} tip={tip} />
            ))}
          </div>
        </Reveal>
      )}
    </>
  );
}

function FeedTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cachedAt, setCachedAt] = useState(null);
  const [activeSource, setActiveSource] = useState('All');

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const { data } = await api.get('/news');
        setItems(data.items);
        setCachedAt(data.cachedAt);
      } catch {
        setError('Could not load the security feed. Try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  const sources = useMemo(() => {
    const seen = new Set();
    items.forEach(i => seen.add(i.source));
    return ['All', ...seen];
  }, [items]);

  const filtered = useMemo(() =>
    activeSource === 'All' ? items : items.filter(i => i.source === activeSource),
    [items, activeSource]
  );

  if (loading) return <div style={{ marginTop: '2rem' }}><Spinner /></div>;
  if (error)   return <ErrorMessage message={error} />;

  return (
    <>
      <div className="feed-meta">
        <div className="feed-source-filters">
          {sources.map(src => (
            <button
              key={src}
              className={`filter-btn ${activeSource === src ? 'active' : ''}`}
              onClick={() => setActiveSource(src)}
            >
              {src}
            </button>
          ))}
        </div>
        <span className="feed-cache-label muted">
          {cachedAt ? `Updated ${timeAgo(cachedAt)}` : ''}
        </span>
      </div>

      <p className="muted" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
        {filtered.length} article{filtered.length !== 1 ? 's' : ''} from {activeSource === 'All' ? 'all sources' : activeSource}
      </p>

      <Reveal>
        <div className="news-grid">
          {filtered.map((item, i) => <NewsCard key={item.link || i} item={item} />)}
        </div>
      </Reveal>
    </>
  );
}

export default function TipsPage() {
  const [allTips, setAllTips] = useState([]);
  const [tipsLoading, setTipsLoading] = useState(true);
  const [tipsError, setTipsError] = useState('');
  const [activeTab, setActiveTab] = useState('tips');

  useEffect(() => {
    api.get('/tips')
      .then(({ data }) => setAllTips(data))
      .catch(() => setTipsError('Failed to load tips'))
      .finally(() => setTipsLoading(false));
  }, []);

  return (
    <main className="page tips-page">
      <Reveal>
        <h2>Security Learning Hub</h2>
        <p className="muted" style={{ marginBottom: '1.5rem' }}>
          {allTips.length} expert tips across 6 categories, plus live security news from trusted sources.
        </p>
      </Reveal>

      <Reveal delay={60}>
        <div className="hub-tabs">
          <button
            className={`hub-tab ${activeTab === 'tips' ? 'hub-tab--active' : ''}`}
            onClick={() => setActiveTab('tips')}
          >
            Tips &amp; Guides
          </button>
          <button
            className={`hub-tab ${activeTab === 'feed' ? 'hub-tab--active' : ''}`}
            onClick={() => setActiveTab('feed')}
          >
            Security Feed
            <span className="hub-tab-live">LIVE</span>
          </button>
        </div>
      </Reveal>

      <ErrorMessage message={tipsError} />

      {activeTab === 'tips' && (
        tipsLoading ? <Spinner /> : <TipsTab allTips={allTips} />
      )}

      {activeTab === 'feed' && <FeedTab />}
    </main>
  );
}
