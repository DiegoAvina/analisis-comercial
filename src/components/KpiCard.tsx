
type Tone = 'primary' | 'success' | 'danger' | 'warning' | 'info';

const TONE_COLORS: Record<Tone, { bg: string; fg: string }> = {
  primary: { bg: 'var(--primary-soft)', fg: 'var(--primary-dark)' },
  success: { bg: 'var(--success-soft)', fg: 'var(--success)' },
  danger: { bg: 'var(--danger-soft)', fg: 'var(--danger)' },
  warning: { bg: 'var(--warning-soft)', fg: 'var(--warning)' },
  info: { bg: 'var(--info-soft)', fg: 'var(--info)' },
};

interface Props {
  icon: string;
  label: string;
  value: string;
  tone?: Tone;
  onClick?: () => void;
}

export function KpiCard({ icon, label, value, tone = 'primary', onClick }: Props) {
  const t = TONE_COLORS[tone];

  return (
    <button className="kpi-card" onClick={onClick} disabled={!onClick}>
      <div className="kpi-icon" style={{ background: t.bg, color: t.fg }}>
        {icon}
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
    </button>
  );
}
