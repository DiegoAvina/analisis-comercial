import { CATEGORICAL_PALETTE, CHART_INK } from './palette';
import { money } from '../utils/format';

export interface CategorySlice {
  label: string;
  value: number;
}

/**
 * Parte-del-todo -> barra apilada horizontal (no pie: el skill dataviz no
 * recomienda pie charts). Siempre con leyenda + etiquetas directas, porque
 * 3 de los 8 tonos de la paleta caen bajo 3:1 de contraste.
 */
export function CategoryBreakdown({ slices }: { slices: CategorySlice[] }) {
  const sorted = [...slices].filter((s) => s.value > 0).sort((a, b) => b.value - a.value);
  const total = sorted.reduce((sum, s) => sum + s.value, 0);

  if (total === 0 || sorted.length === 0) {
    return <div style={{ color: CHART_INK.muted, fontSize: 13, padding: '24px 0' }}>Sin gastos registrados todavía.</div>;
  }

  const gap = 2; // px de separación entre segmentos (surface gap)
  const barWidth = 100;

  return (
    <div>
      <svg viewBox={`0 0 ${barWidth} 28`} width="100%" height={28} preserveAspectRatio="none" role="img" aria-label="Gastos por categoría">
        {(() => {
          let x = 0;
          return sorted.map((slice, i) => {
            const width = (slice.value / total) * barWidth;
            const segmentWidth = Math.max(0, width - (i < sorted.length - 1 ? gap / barWidth : 0));
            const rect = (
              <rect
                key={slice.label}
                x={x}
                y={0}
                width={segmentWidth}
                height={28}
                rx={4}
                fill={CATEGORICAL_PALETTE[i % CATEGORICAL_PALETTE.length]}
              />
            );
            x += width;
            return rect;
          });
        })()}
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
        {sorted.map((slice, i) => {
          const percent = (slice.value / total) * 100;
          return (
            <div key={slice.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: CATEGORICAL_PALETTE[i % CATEGORICAL_PALETTE.length],
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, color: CHART_INK.primary, textTransform: 'capitalize' }}>{slice.label}</span>
              <span style={{ color: CHART_INK.secondary }}>{Math.round(percent)}%</span>
              <span style={{ fontWeight: 600, minWidth: 84, textAlign: 'right' }}>{money(slice.value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
