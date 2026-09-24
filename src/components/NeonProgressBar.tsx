import { useEffect, useState } from 'react';

export type NeonTone = 'primary' | 'success' | 'warning' | 'danger';

interface Props {
  percent: number;
  /** Porcentaje que resultaría del movimiento que el usuario está capturando. */
  previewPercent?: number | null;
  tone?: NeonTone;
  size?: 'lg' | 'sm';
  /** 'dark' = sobre una foto o degradado (hero). 'light' = sobre una tarjeta clara. */
  surface?: 'dark' | 'light';
  /** Posiciones (0–100) de las marcas verticales; por defecto cada 25%. */
  ticks?: number[];
  /** Etiquetas bajo la barra; `true` usa 0/25/50/75/100%. */
  milestones?: boolean | { at: number; label: string }[];
  label?: string;
}

const DEFAULT_TICKS = [25, 50, 75];
const DEFAULT_MILESTONES = [0, 25, 50, 75, 100].map((at) => ({ at, label: `${at}%` }));

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/**
 * Barra de avance "neón": se llena animada al montarse, tiene un flujo de
 * energía continuo, marcas verticales y un destello cada vez que el avance
 * cambia. Con `previewPercent` dibuja un segmento fantasma con el resultado
 * del movimiento que el usuario está por registrar.
 */
export function NeonProgressBar({
  percent,
  previewPercent,
  tone = 'primary',
  size = 'lg',
  surface = 'dark',
  ticks = DEFAULT_TICKS,
  milestones,
  label = 'Avance',
}: Props) {
  const target = clamp(percent);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setShown(target));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [target]);

  const preview = previewPercent == null ? null : clamp(previewPercent);
  const hasPreview = preview != null && Math.abs(preview - target) > 0.05;
  const isLoss = hasPreview && preview! < target;
  const ghostLeft = hasPreview ? Math.min(preview!, target) : 0;
  const ghostWidth = hasPreview ? Math.abs(preview! - target) : 0;

  const milestoneList = milestones === true ? DEFAULT_MILESTONES : milestones || null;
  const classes = ['gpb', `gpb-${size}`, `gpb-on-${surface}`, `gpb-tone-${tone}`].join(' ');

  return (
    <div className={classes}>
      <div
        className="gpb-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(target)}
        aria-label={label}
      >
        <div className="gpb-fill" style={{ width: `${shown}%` }}>
          <span className="gpb-stripes" />
          <span className="gpb-sheen" />
        </div>

        {hasPreview && (
          <div
            className={`gpb-ghost${isLoss ? ' is-loss' : ''}`}
            style={{ left: `${ghostLeft}%`, width: `${ghostWidth}%` }}
          />
        )}

        <div className="gpb-ticks" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} style={{ left: `${t}%` }} />
          ))}
        </div>

        {shown > 0.5 && <span className="gpb-head" style={{ left: `${shown}%` }} aria-hidden="true" />}
        <span key={target} className="gpb-flash" aria-hidden="true" />
      </div>

      {milestoneList && (
        <div className="gpb-milestones" aria-hidden="true">
          {milestoneList.map((m) => (
            <span key={m.at} className={target >= m.at && target > 0 ? 'reached' : ''} style={{ left: `${m.at}%` }}>
              {m.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
