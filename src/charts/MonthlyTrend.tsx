import { CATEGORICAL_PALETTE, CHART_INK } from './palette';
import { money, monthKeyLabel } from '../utils/format';

export interface MonthlyPoint {
  month: string; // "YYYY-MM"
  income: number;
  expenses: number;
}

const INCOME_COLOR = CATEGORICAL_PALETTE[0]; // azul
const EXPENSE_COLOR = CATEGORICAL_PALETTE[1]; // naranja

/**
 * Comparar dos series por mes -> barras agrupadas, color categórico fijo
 * (2 series: cómodo con color solo, pero igual llevan etiqueta directa).
 * Un solo eje (nunca dual-axis).
 */
export function MonthlyTrend({ data }: { data: MonthlyPoint[] }) {
  if (data.every((d) => d.income === 0 && d.expenses === 0)) {
    return <div style={{ color: CHART_INK.muted, fontSize: 13, padding: '24px 0' }}>Sin movimientos en este periodo.</div>;
  }

  const width = 600;
  const height = 220;
  const paddingLeft = 8;
  const paddingBottom = 24;
  const paddingTop = 12;
  const plotHeight = height - paddingBottom - paddingTop;
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expenses]));
  const groupWidth = (width - paddingLeft) / data.length;
  const barWidth = Math.min(28, groupWidth * 0.3);
  const gridLines = 4;

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 13 }}>
        <Legend color={INCOME_COLOR} label="Ingresos" />
        <Legend color={EXPENSE_COLOR} label="Gastos" />
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Ingresos vs gastos por mes">
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const y = paddingTop + (plotHeight / gridLines) * i;
          return <line key={i} x1={paddingLeft} x2={width} y1={y} y2={y} stroke={CHART_INK.grid} strokeWidth={1} />;
        })}

        {data.map((d, i) => {
          const groupX = paddingLeft + i * groupWidth + groupWidth / 2;
          const incomeHeight = (d.income / max) * plotHeight;
          const expenseHeight = (d.expenses / max) * plotHeight;

          return (
            <g key={d.month}>
              <rect
                x={groupX - barWidth - 2}
                y={paddingTop + plotHeight - incomeHeight}
                width={barWidth}
                height={incomeHeight}
                rx={3}
                fill={INCOME_COLOR}
              />
              <rect
                x={groupX + 2}
                y={paddingTop + plotHeight - expenseHeight}
                width={barWidth}
                height={expenseHeight}
                rx={3}
                fill={EXPENSE_COLOR}
              />
              <text x={groupX} y={height - 6} textAnchor="middle" fontSize={11} fill={CHART_INK.muted}>
                {monthKeyLabel(d.month)}
              </text>
            </g>
          );
        })}

        <line
          x1={paddingLeft}
          x2={width}
          y1={paddingTop + plotHeight}
          y2={paddingTop + plotHeight}
          stroke={CHART_INK.axis}
          strokeWidth={1}
        />
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
        {data.map((d) => (
          <div key={d.month} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: CHART_INK.secondary }}>
            <span style={{ textTransform: 'capitalize' }}>{monthKeyLabel(d.month)}</span>
            <span>
              {money(d.income)} · {money(d.expenses)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: color, display: 'inline-block' }} />
      {label}
    </span>
  );
}
