// Small shared presentational primitives.

// Header statistic.
export function Stat({ label, value, tone }) {
  return (
    <div className={`stat ${tone === "red" ? "stat-red" : ""}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

// Zone heading (number + title + subtitle).
export function ZoneHeading({ number, title, subtitle }) {
  return (
    <div className="zona-basliq">
      <span className="zona-nomre">{number}</span>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

// KPI metric card.
export function Metric({ value, label, tone }) {
  return (
    <div className={`metric ${tone ? `metric-${tone}` : ""}`}>
      <span className="metric-value">{value}</span>
      <span className="metric-label">{label}</span>
    </div>
  );
}

// Key/value row.
export function Row({ k, v }) {
  return (
    <div className="kv-row">
      <span className="kv-k">{k}</span>
      <span className="kv-v">{v}</span>
    </div>
  );
}

// Titled text block.
export function Block({ title, text }) {
  return (
    <div className="block">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
