import type { CSSProperties, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * Piezas compartidas por las vistas de detalle (meta, tanda, recibo, fuente
 * de ingreso): ruta de regreso, hero, pestañas, aviso de éxito y confeti.
 */

export function DetailBreadcrumb({ to, label, current }: { to: string; label: string; current?: string }) {
  return (
    <nav className="detail-breadcrumb" aria-label="Ruta">
      <Link to={to} className="detail-back">
        <span aria-hidden="true">←</span> {label}
      </Link>
      {!!current && (
        <>
          <span className="detail-breadcrumb-sep" aria-hidden="true">/</span>
          <span className="detail-breadcrumb-current">{current}</span>
        </>
      )}
    </nav>
  );
}

/**
 * Envoltorio que hace navegable toda una tarjeta (clic, Enter o espacio).
 * Los botones internos deben llamar `stopPropagation` si hacen otra cosa.
 */
export function LinkCard({
  to,
  label,
  index = 0,
  children,
}: {
  to: string;
  label: string;
  index?: number;
  children: ReactNode;
}) {
  const navigate = useNavigate();

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={label}
      className="goal-card-link"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
      onClick={() => navigate(to)}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          navigate(to);
        }
      }}
    >
      {children}
    </div>
  );
}

export function CardCta({ label }: { label: string }) {
  return (
    <div className="goal-card-cta">
      {label} <span aria-hidden="true">→</span>
    </div>
  );
}

interface HeroProps {
  /** Foto de fondo; si no hay, se usa `gradient`. */
  imageUrl?: string | null;
  gradient: string;
  /** Emoji grande que flota en el hero cuando no hay foto. */
  emblem?: string;
  tags?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  celebrate?: number | null;
}

export function DetailHero({ imageUrl, gradient, emblem, tags, action, children, celebrate }: HeroProps) {
  return (
    <section className="detail-hero">
      <div
        className="detail-hero-bg"
        style={{ backgroundImage: imageUrl ? `url("${imageUrl}")` : gradient }}
      />
      {!imageUrl && !!emblem && (
        <div className="detail-hero-emblem" aria-hidden="true">
          <span>{emblem}</span>
        </div>
      )}
      <div className="detail-hero-grid" aria-hidden="true" />
      <div className="detail-hero-scrim" aria-hidden="true" />

      <div className="detail-hero-top">
        <div className="detail-hero-tags">{tags}</div>
        {action}
      </div>

      <div className="detail-hero-content">{children}</div>

      {celebrate != null && <Confetti key={celebrate} />}
    </section>
  );
}

export interface TabDef<T extends string> {
  key: T;
  label: string;
  icon: string;
}

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: TabDef<T>[];
  value: T;
  onChange: (next: T) => void;
}) {
  const index = Math.max(0, tabs.findIndex((t) => t.key === value));

  return (
    <div
      className="segmented"
      style={{ ['--n' as string]: tabs.length, ['--i' as string]: index } as CSSProperties}
      role="tablist"
    >
      <span className="segmented-indicator" aria-hidden="true" />
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={value === t.key}
          className={value === t.key ? 'active' : ''}
          onClick={() => onChange(t.key)}
        >
          <span aria-hidden="true">{t.icon}</span> {t.label}
        </button>
      ))}
    </div>
  );
}

export function DetailNotice({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div key={text} className="detail-notice" role="status">
      <span aria-hidden="true">✅</span> {text}
    </div>
  );
}

const CONFETTI_COLORS = ['#FFD166', '#43E6FF', '#7CFFCB', '#FF7AB6', '#FFFFFF'];

export function Confetti() {
  return (
    <div className="detail-confetti" aria-hidden="true">
      {Array.from({ length: 28 }, (_, i) => (
        <span
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animationDelay: `${(i % 7) * 60}ms`,
            ['--drift' as string]: `${((i * 53) % 120) - 60}px`,
            ['--spin' as string]: `${(i % 2 ? 1 : -1) * (240 + ((i * 31) % 300))}deg`,
          }}
        />
      ))}
    </div>
  );
}
