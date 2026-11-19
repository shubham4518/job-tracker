export default function Stats({ stats }) {
  if (!stats) return null;
  const tiles = [
    { label: "Total", value: stats.total },
    { label: "Interviewing", value: stats.by_status.interview },
    { label: "Offers", value: stats.by_status.offer },
    { label: "Response rate", value: `${stats.response_rate}%` },
    { label: "Follow-ups due", value: stats.follow_ups_due, alert: stats.follow_ups_due > 0 },
  ];
  return (
    <div className="stats">
      {tiles.map((t) => (
        <div key={t.label} className={`stat ${t.alert ? "alert" : ""}`}>
          <div className="stat-value">{t.value}</div>
          <div className="stat-label">{t.label}</div>
        </div>
      ))}
    </div>
  );
}
