
export function EmptyState({ icon = '📭', title, subtitle }: { icon?: string; title: string; subtitle?: string }) {
  return (
    <div className="empty-state">
      <div style={{ fontSize: 32 }}>{icon}</div>
      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{title}</div>
      {!!subtitle && <div>{subtitle}</div>}
    </div>
  );
}
