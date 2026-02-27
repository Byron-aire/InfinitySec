import { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';

const CATEGORIES = ['All', 'Passwords', 'Phishing', 'Privacy', 'AI'];

export default function TipsPage() {
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const fetchTips = async () => {
      try {
        const params = activeCategory !== 'All' ? { category: activeCategory } : {};
        const { data } = await api.get('/tips', { params });
        setTips(data);
      } catch {
        setError('Failed to load tips');
      } finally {
        setLoading(false);
      }
    };
    fetchTips();
  }, [activeCategory]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tips;
    return tips.filter(
      (tip) =>
        tip.title.toLowerCase().includes(q) ||
        tip.content.toLowerCase().includes(q)
    );
  }, [tips, query]);

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setLoading(true);
    setQuery('');
  };

  return (
    <main className="page tips-page">
      <h2>Security Tips</h2>

      <div className="tips-search-row">
        <input
          type="text"
          className="tips-search"
          placeholder="Search tips..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button className="btn-ghost tips-search-clear" onClick={() => setQuery('')}>
            ✕
          </button>
        )}
      </div>

      <div className="category-filters">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => handleCategoryChange(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <ErrorMessage message={error} />

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <p className="muted">
          {query ? `No tips found for "${query}".` : 'No tips in this category.'}
        </p>
      ) : (
        <>
          {query && (
            <p className="muted tips-result-count">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
            </p>
          )}
          <div className="tips-grid">
            {filtered.map((tip) => (
              <div key={tip._id} className="tip-card">
                <span className="tip-category" data-cat={tip.category}>{tip.category}</span>
                <h3>{tip.title}</h3>
                <p>{tip.content}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
