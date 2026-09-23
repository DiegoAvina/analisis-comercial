import React from 'react';

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

export function Avatar({ name, url, size = 36 }: { name: string; url?: string | null; size?: number }) {
  const style: React.CSSProperties = { width: size, height: size, fontSize: size * 0.38 };

  if (url) {
    return <img src={url} alt={name} className="avatar" style={style} />;
  }

  return (
    <div className="avatar" style={style}>
      {initialsFor(name)}
    </div>
  );
}
