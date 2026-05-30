type Props = {
  label: string;
  value: string;
  detail: string;
};

export function MetricCard({ label, value, detail }: Props) {
  return (
    <div className="metric-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      <p className="metric-detail">{detail}</p>
    </div>
  );
}
