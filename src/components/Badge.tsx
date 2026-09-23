
type Tone = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return <span className={`badge badge-${tone}`}>{label}</span>;
}
