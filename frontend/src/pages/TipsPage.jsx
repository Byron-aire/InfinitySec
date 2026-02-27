import { useState, useEffect } from 'react';
import api from '../utils/api';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';

const CATEGORIES = ['All', 'Passwords', 'Phishing', 'Privacy', 'AI'];

export default function TipsPage() {
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

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

  return (
    <main className="page tips-page">
      <h2>Security Tips</h2>
      <div className="category-filters">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => {
              setActiveCategory(cat);
              setLoading(true);
            }}
          >
            {cat}
          </button>
        ))}
      </div>
      <ErrorMessage message={error} />
      {loading ? (
        <Spinner />
      ) : (
        <div className="tips-grid">
          {tips.map((tip) => (
            <div key={tip._id} className="tip-card">
              <span className="tip-category" data-cat={tip.category}>{tip.category}</span>
              <h3>{tip.title}</h3>
              <p>{tip.content}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
