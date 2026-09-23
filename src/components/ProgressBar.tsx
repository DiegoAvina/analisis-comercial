
export function ProgressBar({ percent, color = 'var(--primary)' }: { percent: number; color?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${clamped}%`, background: color }} />
    </div>
  );
}
