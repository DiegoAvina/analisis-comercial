import { CHART_INK, SEQUENTIAL_BLUE } from './palette';
import { parseISODate } from '../utils/format';

export interface DailyPoint {
  date: string; // "YYYY-MM-DD"
  total: number;
}

/**
 * Tendencia en el tiempo -> línea, un hue (sequential). Área rellena tenue
 * bajo la línea para reforzar "esto es una serie continua", no puntos
 * sueltos.
 */
export function DailySpendTrend({ data }: { data: DailyPoint[] }) {
  if (data.length === 0 || data.every((d) => d.total === 0)) {
    return <div style={{ color: CHART_INK.muted, fontSize: 13, padding: '24px 0' }}>Sin gastos registrados este mes.</div>;
  }

  const width = 600;
  const height = 180;
  const paddingLeft = 8;
  const paddingRight = 8;
  const paddingTop = 12;
  const paddingBottom = 24;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;
  const max = Math.max(1, ...data.map((d) => d.total));

  const points = data.map((d, i) => {
    const x = paddingLeft + (i / Math.max(1, data.length - 1)) * plotWidth;
    const y = paddingTop + plotHeight - (d.total / max) * plotHeight;
    return { x, y, d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1]!.x} ${paddingTop + plotHeight} L ${points[0]!.x} ${paddingTop + plotHeight} Z`;

  // Etiquetas de eje: día 1, y cada ~5 días.
  const labelEvery = Math.max(1, Math.round(data.length / 6));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Gasto diario del mes">
      <line
        x1={paddingLeft}
        x2={width - paddingRight}
        y1={paddingTop + plotHeight}
        y2={paddingTop + plotHeight}
        stroke={CHART_INK.axis}
        strokeWidth={1}
      />

      <path d={areaPath} fill={SEQUENTIAL_BLUE} opacity={0.12} stroke="none" />
      <path d={linePath} fill="none" stroke={SEQUENTIAL_BLUE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      {points.map((p, i) =>
        i % labelEvery === 0 ? (
          <text key={p.d.date} x={p.x} y={height - 6} textAnchor="middle" fontSize={10} fill={CHART_INK.muted}>
            {parseISODate(p.d.date).getDate()}
          </text>
        ) : null,
      )}
    </svg>
  );
}
