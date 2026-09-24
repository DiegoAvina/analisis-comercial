import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { LoadingView } from '../components/LoadingView';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { NeonProgressBar, type NeonTone } from '../components/NeonProgressBar';
import { DetailBreadcrumb, DetailHero, DetailNotice } from '../components/detail/DetailParts';
import { deleteBill, fetchBill, markBillPaid } from '../api/bills';
import { getApiErrorMessage } from '../api/client';
import { useCountUp } from '../hooks/useCountUp';
import { daysLabel, daysUntil, useDetailFeedback } from '../hooks/useDetailFeedback';
import { dayLabel, money } from '../utils/format';
import type { Bill } from '../api/types';

/** Ventana (en días) que representa la barra de cercanía al vencimiento. */
const WINDOW_DAYS = 30;

const TONE_GRADIENTS: Record<NeonTone, string> = {
  primary: 'linear-gradient(135deg, var(--primary), #2a1f7a 55%, #070a1f)',
  success: 'linear-gradient(135deg, var(--success), #0d6b50 55%, #06121f)',
  warning: 'linear-gradient(135deg, var(--warning), #8a4b0f 55%, #1a0d05)',
  danger: 'linear-gradient(135deg, var(--danger), #7a1f2a 55%, #1a0508)',
};

function billTone(bill: Bill, days: number | null): NeonTone {
  if (bill.is_paid) return 'success';
  if (bill.is_overdue || (days != null && days < 0)) return 'danger';
  if (days != null && days <= 3) return 'warning';
  return 'primary';
}

export function BillDetailPage() {
  const { billId } = useParams();
  const id = Number(billId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notice, showNotice, celebration, celebrate } = useDetailFeedback();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const billQuery = useQuery({ queryKey: ['bill', id], queryFn: () => fetchBill(id) });
  const bill = billQuery.data;

  const invalidateLists = () => {
    queryClient.invalidateQueries({ queryKey: ['bills'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['calendar'] });
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
  };

  const payMutation = useMutation({
    mutationFn: () => markBillPaid(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(['bill', id], updated);
      invalidateLists();
      showNotice('Recibo marcado como pagado');
      celebrate();
    },
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo marcar como pagado.')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteBill(id),
    onSuccess: () => {
      invalidateLists();
      queryClient.removeQueries({ queryKey: ['bill', id] });
      navigate('/recibos', { replace: true });
    },
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo eliminar el recibo.')),
  });

  const days = bill?.due_date ? daysUntil(bill.due_date) : null;
  const animatedAmount = useCountUp(bill?.amount ?? 0);
  const animatedDays = useCountUp(days != null ? Math.abs(days) : 0, 900);

  if (billQuery.isLoading) return <LoadingView />;

  if (!bill) {
    return (
      <div>
        <DetailBreadcrumb to="/recibos" label="Recibos" />
        {billQuery.isError ? (
          <ErrorBanner message={getApiErrorMessage(billQuery.error, 'No se pudo cargar el recibo.')} />
        ) : (
          <Card>
            <EmptyState icon="🔎" title="No encontramos este recibo" />
          </Card>
        )}
      </div>
    );
  }

  const tone = billTone(bill, days);
  const percent = bill.is_paid ? 100 : days == null ? 0 : ((WINDOW_DAYS - Math.max(0, days)) / WINDOW_DAYS) * 100;

  const countdownLabel = bill.is_paid
    ? 'pagado'
    : days == null
      ? 'sin fecha'
      : days > 0
        ? days === 1 ? 'día para vencer' : 'días para vencer'
        : days === 0
          ? 'vence hoy'
          : days === -1 ? 'día de atraso' : 'días de atraso';

  return (
    <div>
      <DetailBreadcrumb to="/recibos" label="Recibos" current={bill.name} />

      <DetailHero
        gradient={TONE_GRADIENTS[tone]}
        emblem={bill.is_paid ? '✅' : '🧾'}
        celebrate={celebration}
        tags={
          <>
            <span
              className={`glass-pill${tone === 'success' ? ' is-success' : tone === 'danger' ? ' is-danger' : tone === 'warning' ? ' is-warning' : ''}`}
            >
              {bill.status_text ?? (bill.is_paid ? 'Pagado' : 'Pendiente')}
            </span>
            {bill.auto_debit && <span className="glass-pill">⚡ Domiciliado</span>}
            {!!bill.category && <span className="glass-pill">🏷️ {bill.category}</span>}
          </>
        }
      >
        {!!bill.provider && <div className="detail-hero-eyebrow">{bill.provider}</div>}
        <h1 className="detail-hero-name">{bill.name}</h1>

        <div className="detail-hero-figures">
          <div>
            <div className="detail-hero-amount">{money(animatedAmount)}</div>
            <div className="detail-hero-target">
              {bill.is_paid && bill.paid_at
                ? `Pagado el ${dayLabel(bill.paid_at)}`
                : bill.due_date
                  ? `Vence el ${dayLabel(bill.due_date)}`
                  : 'Sin fecha de vencimiento'}
            </div>
          </div>
          <div className="detail-hero-percent detail-hero-countdown">
            {bill.is_paid ? '✓' : days == null || days === 0 ? '—' : Math.round(animatedDays)}
            <span>{countdownLabel}</span>
          </div>
        </div>

        <NeonProgressBar
          percent={percent}
          tone={tone}
          ticks={[33.33, 66.67, 90]}
          milestones={[
            { at: 0, label: `${WINDOW_DAYS} días` },
            { at: 50, label: `${WINDOW_DAYS / 2} días` },
            { at: 100, label: 'Vence' },
          ]}
          label="Cercanía a la fecha de vencimiento"
        />
      </DetailHero>

      <DetailNotice text={notice} />

      <div className="detail-grid">
        <Card className="detail-action-card">
          {!!error && <ErrorBanner message={error} />}

          {bill.is_paid ? (
            <div className="detail-paid-state">
              <div className="detail-paid-check" aria-hidden="true">✓</div>
              <div style={{ fontWeight: 700, fontSize: 17 }}>Este recibo ya está pagado</div>
              {!!bill.paid_at && <div className="detail-action-hint" style={{ margin: 0 }}>Pagado el {dayLabel(bill.paid_at)}</div>}
            </div>
          ) : (
            <div className="detail-action-body">
              <div className="card-title" style={{ marginBottom: 6 }}>¿Ya lo pagaste?</div>
              <div className="detail-action-hint">
                Se registrará como pagado hoy y el monto de {money(bill.amount)} se sumará a tus gastos de la semana.
              </div>
              <div className={`detail-preview${tone === 'danger' ? ' is-loss' : ''}`}>
                {days == null
                  ? 'Este recibo no tiene fecha de vencimiento.'
                  : days > 0
                    ? `Te quedan ${daysLabel(days)} para pagarlo a tiempo.`
                    : days === 0
                      ? 'Hoy es el último día para pagarlo.'
                      : `Lleva ${daysLabel(-days)} de atraso.`}
              </div>
              <Button label="Marcar como pagado" onClick={() => { setError(null); payMutation.mutate(); }} loading={payMutation.isPending} />
            </div>
          )}

          <div className="detail-danger-zone">
            {confirmDelete ? (
              <div className="detail-confirm">
                <span>¿Eliminar este recibo? No se puede deshacer.</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button label="Cancelar" size="sm" variant="secondary" onClick={() => setConfirmDelete(false)} />
                  <Button label="Sí, eliminar" size="sm" variant="danger" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate()} />
                </div>
              </div>
            ) : (
              <Button label="Eliminar recibo" size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} />
            )}
          </div>
        </Card>

        <div>
          <div className="section-title" style={{ marginTop: 0 }}>Detalles</div>
          <div className="goal-movements-list">
            {[
              { icon: '🏢', label: 'Proveedor', value: bill.provider ?? '—' },
              { icon: '📅', label: 'Vencimiento', value: bill.due_date ? dayLabel(bill.due_date) : '—' },
              { icon: '🏷️', label: 'Categoría', value: bill.category ?? '—' },
              { icon: '⚡', label: 'Cargo automático', value: bill.auto_debit ? 'Sí' : 'No' },
              ...(bill.description ? [{ icon: '📝', label: 'Descripción', value: bill.description }] : []),
            ].map((row, i) => (
              <div key={row.label} className="goal-movement-row detail-row-animated" style={{ animationDelay: `${i * 45}ms` }}>
                <div className="goal-movement-icon" style={{ background: 'var(--surface-alt)' }}>{row.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="goal-movement-date" style={{ textTransform: 'none', marginTop: 0 }}>{row.label}</div>
                  <div className="goal-movement-label" style={{ textTransform: row.label === 'Vencimiento' ? 'capitalize' : undefined }}>
                    {row.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
