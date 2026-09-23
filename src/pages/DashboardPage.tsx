import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { ProgressBar } from '../components/ProgressBar';
import { LoadingView } from '../components/LoadingView';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { KpiCard } from '../components/KpiCard';
import { CategoryBreakdown } from '../charts/CategoryBreakdown';
import { DailySpendTrend } from '../charts/DailySpendTrend';
import { MonthlyTrend } from '../charts/MonthlyTrend';
import { fetchDashboard } from '../api/dashboard';
import { fetchExpenses } from '../api/expenses';
import { fetchMonthlySummary } from '../api/reports';
import { getApiErrorMessage } from '../api/client';
import { money } from '../utils/format';

const TYPE_LABELS: Record<string, string> = {
  food: 'Comida',
  transport: 'Transporte',
  purchase: 'Compra',
  other: 'Otro',
  bill: 'Recibos',
  income_distribution_saving: 'A metas',
  income_distribution_tanda: 'A tandas',
};

export function DashboardPage() {
  const navigate = useNavigate();

  const dashboardQuery = useQuery({ queryKey: ['dashboard'], queryFn: fetchDashboard });
  const expensesQuery = useQuery({ queryKey: ['expenses', 'month'], queryFn: () => fetchExpenses('month') });
  const summaryQuery = useQuery({ queryKey: ['reports', 'monthly-summary'], queryFn: () => fetchMonthlySummary(6) });

  const categorySlices = useMemo(() => {
    const expenses = expensesQuery.data?.expenses ?? [];
    const byType = new Map<string, number>();
    for (const e of expenses) {
      byType.set(e.type, (byType.get(e.type) ?? 0) + e.amount);
    }
    return Array.from(byType.entries()).map(([type, value]) => ({
      label: TYPE_LABELS[type] ?? type,
      value,
    }));
  }, [expensesQuery.data]);

  const monthlyTrendData = useMemo(
    () =>
      (summaryQuery.data?.months ?? []).map((m) => ({
        month: m.month,
        income: m.income_received,
        expenses: m.expenses_total,
      })),
    [summaryQuery.data],
  );

  const dailySpend = dashboardQuery.data?.calendar.daily_expenses ?? [];

  if (dashboardQuery.isLoading) return <LoadingView />;
  const data = dashboardQuery.data;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Inicio</div>
          <div className="page-subtitle">Tu resumen financiero</div>
        </div>
      </div>

      {dashboardQuery.isError && (
        <ErrorBanner message={getApiErrorMessage(dashboardQuery.error, 'No se pudo cargar el dashboard.')} />
      )}

      {data && (
        <>
          <Card style={{ background: 'var(--primary)', color: '#fff', marginBottom: 20 }}>
            <div style={{ opacity: 0.85, fontSize: 14 }}>Disponible esta semana</div>
            <div style={{ fontSize: 34, fontWeight: 700, margin: '4px 0 16px' }}>{money(data.income.available_this_week)}</div>
            <div style={{ display: 'flex', gap: 32, fontSize: 13, opacity: 0.9 }}>
              <span>Sueldo: {money(data.income.weekly_income)}</span>
              <span>Gastado: {money(data.income.spent_this_week)}</span>
            </div>
          </Card>

          <div className="kpi-grid">
            <KpiCard icon="💰" label="Ahorro total" value={money(data.savings.total)} tone="primary" onClick={() => navigate('/ahorros')} />
            <KpiCard
              icon="🧾"
              label="Recibos pendientes"
              value={String(data.bills.pending_count)}
              tone={data.bills.pending_count > 0 ? 'warning' : 'success'}
              onClick={() => navigate('/recibos')}
            />
            <KpiCard icon="👥" label="Tandas activas" value={String(data.tandas.active_count)} tone="primary" onClick={() => navigate('/tandas')} />
            <KpiCard
              icon="⏳"
              label="Ingresos pendientes"
              value={money(data.incomes.pending_this_month)}
              tone="warning"
              onClick={() => navigate('/ingresos')}
            />
          </div>

          <div className="two-col" style={{ marginBottom: 20 }}>
            <Card>
              <div className="card-title">Gastos por categoría (este mes)</div>
              <CategoryBreakdown slices={categorySlices} />
            </Card>
            <Card>
              <div className="card-title">Gasto diario (este mes)</div>
              <DailySpendTrend data={dailySpend} />
            </Card>
          </div>

          <Card style={{ marginBottom: 20 }}>
            <div className="card-title">Ingresos vs gastos (últimos 6 meses)</div>
            <MonthlyTrend data={monthlyTrendData} />
          </Card>

          <div className="two-col">
            <div>
              <div className="section-title">Próximo ingreso</div>
              <Card>
                {data.incomes.next_income ? (
                  <Row title={data.incomes.next_income.source?.name ?? 'Ingreso'} subtitle={data.incomes.next_income.expected_date} amount={money(data.incomes.next_income.expected_amount)} />
                ) : (
                  <EmptyState icon="💰" title="Sin ingresos esperados próximamente" />
                )}
              </Card>

              <div className="section-title">Próximos recibos</div>
              <Card>
                {data.bills.next.length === 0 ? (
                  <EmptyState icon="✅" title="No tienes recibos pendientes" />
                ) : (
                  data.bills.next.map((bill) => (
                    <Row key={bill.id} title={bill.name} subtitle={bill.due_date ?? ''} amount={money(bill.amount)} />
                  ))
                )}
              </Card>
            </div>

            <div>
              <div className="section-title">Metas de ahorro</div>
              <Card>
                {data.goals.length === 0 ? (
                  <EmptyState icon="🎯" title="Aún no tienes metas de ahorro" />
                ) : (
                  data.goals.map((goal) => (
                    <div key={goal.id} style={{ padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontWeight: 600 }}>{goal.name}</span>
                        {goal.status === 'completed' ? (
                          <Badge label="Completada" tone="success" />
                        ) : (
                          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{Math.round(goal.progress_percent)}%</span>
                        )}
                      </div>
                      <ProgressBar percent={goal.progress_percent} color={goal.status === 'completed' ? 'var(--success)' : 'var(--primary)'} />
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        {money(goal.current_amount)} de {money(goal.target_amount)}
                      </div>
                    </div>
                  ))
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ title, subtitle, amount }: { title: string; subtitle: string; amount: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</div>
      </div>
      <div style={{ fontWeight: 600 }}>{amount}</div>
    </div>
  );
}
