export default function TrustBadge({ badges }) {
  return (
    <div className="trust-badges">
      {badges.map(b => (
        <span key={b} className="trust-badge">{b}</span>
      ))}
    </div>
  );
}
