const Parser = require('rss-parser');

const parser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': 'InfinitySec/2.0 RSS Reader' },
});

const FEEDS = [
  {
    url:    'https://krebsonsecurity.com/feed/',
    source: 'Krebs on Security',
    color:  '#3B82F6',
  },
  {
    url:    'https://thehackernews.com/feeds/posts/default',
    source: 'The Hacker News',
    color:  '#EF4444',
  },
  {
    url:    'https://www.troyhunt.com/rss/',
    source: 'Troy Hunt',
    color:  '#A78BFA',
  },
  {
    url:    'https://isc.sans.edu/rssfeed_full.xml',
    source: 'SANS ISC',
    color:  '#22D3EE',
  },
];

// in-memory cache
let cache = { items: [], fetchedAt: 0 };
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function fetchFeed({ url, source, color }) {
  try {
    const feed = await parser.parseURL(url);
    return feed.items.slice(0, 15).map(item => ({
      title:     item.title || '',
      link:      item.link  || item.guid || '',
      summary:   item.contentSnippet || item.summary || '',
      date:      item.pubDate || item.isoDate || null,
      source,
      color,
    }));
  } catch {
    return [];
  }
}

async function getNews(req, res) {
  const now = Date.now();

  if (cache.items.length && now - cache.fetchedAt < CACHE_TTL_MS) {
    return res.json({ items: cache.items, cachedAt: new Date(cache.fetchedAt).toISOString() });
  }

  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const merged  = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);

  // sort newest first, dedupe by link
  const seen = new Set();
  const items = merged
    .filter(item => {
      if (!item.link || seen.has(item.link)) return false;
      seen.add(item.link);
      return true;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 40);

  cache = { items, fetchedAt: now };
  res.json({ items, cachedAt: new Date(now).toISOString() });
}

module.exports = { getNews };
