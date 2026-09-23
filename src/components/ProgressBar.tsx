
export function ProgressBar({
  percent,
  color = 'var(--primary)',
  trackColor,
  height,
}: {
  percent: number;
  color?: string;
  trackColor?: string;
  height?: number;
}) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div className="progress-track" style={{ background: trackColor, height }}>
      <div className="progress-fill" style={{ width: `${clamped}%`, background: color }} />
    </div>
  );
}
