import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { AmountInput } from '../components/AmountInput';
import { LoadingView } from '../components/LoadingView';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { NeonProgressBar } from '../components/NeonProgressBar';
import { DistributionRulesPanel } from '../components/DistributionRulesPanel';
import { DetailBreadcrumb, DetailHero, DetailNotice, SegmentedTabs, type TabDef } from '../components/detail/DetailParts';
import {
  cancelIncomeOccurrence,
  createIncomeOccurrence,
  deleteIncomeSource,
  fetchIncomeSource,
  missIncomeOccurrence,
  receiveIncomeOccurrence,
} from '../api/incomes';
import { getApiErrorMessage } from '../api/client';
import { useCountUp } from '../hooks/useCountUp';
import { daysLabel, daysUntil, useDetailFeedback } from '../hooks/useDetailFeedback';
import { isValidAmount, parseAmount } from '../utils/amount';
import { dayLabel, money, toDateInputString } from '../utils/format';
import type { IncomeFrequency, IncomeOccurrence, IncomeOccurrenceStatus, IncomeType } from '../api/types';

type Tab = 'pending' | 'register' | 'rules';

const TABS: TabDef<Tab>[] = [
  { key: 'pending', label: 'Por cobrar', icon: '⏳' },
  { key: 'register', label: 'Registrar', icon: '➕' },
  { key: 'rules', label: 'Reglas', icon: '🔀' },
];

const TYPE_EMBLEMS: Record<IncomeType, string> = {
  salary: '💼',
  freelance: '💻',
  business: '🏪',
  sale: '🏷️',
  investment: '📈',
  bonus: '🎁',
  gift: '🎀',
  refund: '↩️',
  other: '💰',
};

const FREQUENCY_LABELS: Record<IncomeFrequency, string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  yearly: 'Anual',
  irregular: 'Irregular',
};

const STATUS_META: Record<IncomeOccurrenceStatus, { label: string; tone: 'success' | 'danger' | 'warning' | 'info' | 'neutral'; icon: string }> = {
  expected: { label: 'Esperado', tone: 'info', icon: '⏳' },
  received: { label: 'Recibido', tone: 'success', icon: '✅' },
  partial: { label: 'Parcial', tone: 'warning', icon: '◐' },
  missed: { label: 'No llegó', tone: 'danger', icon: '✖️' },
  cancelled: { label: 'Cancelado', tone: 'neutral', icon: '⛔' },
};

function received(o: IncomeOccurrence): number {
  return o.status === 'received' || o.status === 'partial' ? Number(o.received_amount ?? o.expected_amount) : 0;
}

export function IncomeSourceDetailPage() {
  const { sourceId } = useParams();
  const id = Number(sourceId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notice, showNotice, celebration, celebrate } = useDetailFeedback();

  const [tab, setTab] = useState<Tab>('pending');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [amount, setAmount] = useState<string | null>(null);
  const [date, setDate] = useState(() => toDateInputString(new Date()));
  const [alreadyReceived, setAlreadyReceived] = useState(true);

  const sourceQuery = useQuery({ queryKey: ['income-source', id], queryFn: () => fetchIncomeSource(id) });
  const source = sourceQuery.data;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['income-source', id] });
    queryClient.invalidateQueries({ queryKey: ['income-sources'] });
    queryClient.invalidateQueries({ queryKey: ['income-occurrences'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['calendar'] });
  };

  const occurrenceAction = useMutation({
    mutationFn: ({ kind, occ }: { kind: 'receive' | 'miss' | 'cancel'; occ: IncomeOccurrence }) =>
      kind === 'receive' ? receiveIncomeOccurrence(occ.id) : kind === 'miss' ? missIncomeOccurrence(occ.id) : cancelIncomeOccurrence(occ.id),
    onSuccess: (_, { kind, occ }) => {
      invalidate();
      if (kind === 'receive') {
        showNotice(`Recibiste ${money(occ.expected_amount)}`);
        celebrate();
      } else {
        showNotice(kind === 'miss' ? 'Marcado como no recibido' : 'Ingreso cancelado');
      }
    },
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo actualizar el ingreso.')),
  });

  const registerMutation = useMutation({
    mutationFn: async ({ value, when, receiveNow }: { value: number; when: string; receiveNow: boolean }) => {
      const occ = await createIncomeOccurrence(id, { expected_amount: value, expected_date: when });
      if (receiveNow) await receiveIncomeOccurrence(occ.id, { amount: value, date: when });
      return occ;
    },
    onSuccess: (_, { value, receiveNow }) => {
      invalidate();
      setAmount(null);
      showNotice(receiveNow ? `Ingreso de ${money(value)} registrado` : `Ingreso esperado de ${money(value)} agendado`);
      if (receiveNow) celebrate();
    },
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo registrar el ingreso.')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteIncomeSource(id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['income-source', id] });
      queryClient.invalidateQueries({ queryKey: ['income-sources'] });
      queryClient.invalidateQueries({ queryKey: ['income-occurrences'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate('/ingresos', { replace: true });
    },
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo eliminar la fuente.')),
  });

  const occurrences = useMemo(() => source?.occurrences ?? [], [source]);

  const period = useMemo(() => {
    const now = new Date();
    const monthKey = toDateInputString(now).slice(0, 7);
    const yearKey = monthKey.slice(0, 4);
    const live = occurrences.filter((o) => o.status !== 'cancelled');
    const inMonth = live.filter((o) => o.expected_date.slice(0, 7) === monthKey);
    const scope = inMonth.length > 0 ? inMonth : live.filter((o) => o.expected_date.slice(0, 4) === yearKey);
    return {
      label: inMonth.length > 0 ? 'este mes' : 'este año',
      expected: scope.reduce((s, o) => s + Number(o.expected_amount), 0),
      received: scope.reduce((s, o) => s + received(o), 0),
    };
  }, [occurrences]);

  const animatedReceived = useCountUp(period.received);
  const percent = period.expected > 0 ? (period.received / period.expected) * 100 : 0;
  const animatedPercent = useCountUp(percent);

  if (sourceQuery.isLoading) return <LoadingView />;

  if (!source) {
    return (
      <div>
        <DetailBreadcrumb to="/ingresos" label="Ingresos" />
        {sourceQuery.isError ? (
          <ErrorBanner message={getApiErrorMessage(sourceQuery.error, 'No se pudo cargar la fuente de ingreso.')} />
        ) : (
          <Card>
            <EmptyState icon="🔎" title="No encontramos esta fuente de ingreso" />
          </Card>
        )}
      </div>
    );
  }

  const pending = occurrences
    .filter((o) => o.status === 'expected')
    .sort((a, b) => a.expected_date.localeCompare(b.expected_date));
  const history = [...occurrences].sort((a, b) => b.expected_date.localeCompare(a.expected_date));
  const totalReceived = occurrences.reduce((s, o) => s + received(o), 0);
  const next = pending[0];
  const nextDays = next ? daysUntil(next.expected_date) : null;

  const amountText = amount ?? (source.default_amount ? String(source.default_amount) : '');
  const parsed = parseAmount(amountText);
  const amountValid = isValidAmount(amountText);
  const todayKey = toDateInputString(new Date());
  const inPeriod = period.label === 'este mes' ? date.slice(0, 7) === todayKey.slice(0, 7) : date.slice(0, 4) === todayKey.slice(0, 4);
  const previewPercent =
    tab === 'register' && amountValid && alreadyReceived && inPeriod && period.expected > 0
      ? ((period.received + parsed) / Math.max(period.expected, period.received + parsed)) * 100
      : null;

  const switchTab = (next: Tab) => {
    setTab(next);
    setError(null);
  };

  const submitRegister = (e: FormEvent) => {
    e.preventDefault();
    if (!amountValid || !date || registerMutation.isPending) return;
    setError(null);
    registerMutation.mutate({ value: parsed, when: date, receiveNow: alreadyReceived });
  };

  return (
    <div>
      <DetailBreadcrumb to="/ingresos" label="Ingresos" current={source.name} />

      <DetailHero
        gradient="linear-gradient(135deg, var(--success), var(--primary-dark) 60%, #070a1f)"
        emblem={TYPE_EMBLEMS[source.type] ?? '💰'}
        celebrate={celebration}
        tags={
          <>
            <span className="glass-pill">{TYPE_EMBLEMS[source.type]} {source.type_label}</span>
            {source.is_recurring && source.frequency && <span className="glass-pill">🔁 {FREQUENCY_LABELS[source.frequency]}</span>}
            {!source.active && <span className="glass-pill is-danger">Inactiva</span>}
          </>
        }
      >
        <div className="detail-hero-eyebrow">
          Fuente de ingreso{source.default_amount ? ` · ${money(source.default_amount)} habitual` : ''}
        </div>
        <h1 className="detail-hero-name">{source.name}</h1>

        <div className="detail-hero-figures">
          <div>
            <div className="detail-hero-amount">{money(animatedReceived)}</div>
            <div className="detail-hero-target">
              recibido {period.label} de {money(period.expected)} esperado
            </div>
          </div>
          <div className="detail-hero-percent">
            {Math.round(Math.min(animatedPercent, 999))}
            <span>%</span>
          </div>
        </div>

        <NeonProgressBar
          percent={percent}
          previewPercent={previewPercent}
          tone={percent >= 100 ? 'success' : 'primary'}
          milestones
          label={`Ingreso recibido ${period.label}`}
        />
      </DetailHero>

      <DetailNotice text={notice} />

      <div className="goal-stats-row detail-stats">
        <div className="goal-stat-box">
          <span className="goal-stat-label">Por cobrar</span>
          <span className="goal-stat-value">{pending.length}</span>
        </div>
        <div className="goal-stat-divider" />
        <div className="goal-stat-box">
          <span className="goal-stat-label">Total recibido</span>
          <span className="goal-stat-value">{money(totalReceived)}</span>
        </div>
        <div className="goal-stat-divider" />
        <div className="goal-stat-box">
          <span className="goal-stat-label">Registros</span>
          <span className="goal-stat-value">{occurrences.length}</span>
        </div>
      </div>

      {next && nextDays != null && (
        <div className={`detail-deadline${nextDays < 0 ? ' is-overdue' : ''}`}>
          <span aria-hidden="true">📅</span>
          <span>
            {nextDays > 0
              ? `Próximo ingreso en ${daysLabel(nextDays)} · ${dayLabel(next.expected_date)}`
              : nextDays === 0
                ? 'El próximo ingreso llega hoy'
                : `Un ingreso esperado lleva ${daysLabel(-nextDays)} de retraso`}
          </span>
          <span className="detail-deadline-hint">{money(next.expected_amount)}</span>
        </div>
      )}

      <div className="detail-grid">
        <Card className="detail-action-card">
          <SegmentedTabs tabs={TABS} value={tab} onChange={switchTab} />

          <div key={tab} className="detail-action-body">
            {!!error && <ErrorBanner message={error} />}

            {tab === 'pending' ? (
              pending.length === 0 ? (
                <EmptyState icon="🎉" title="No tienes ingresos por cobrar" subtitle="Registra uno nuevo en la otra pestaña" />
              ) : (
                <div className="detail-members-list" style={{ marginBottom: 0 }}>
                  {pending.map((o, i) => {
                    const d = daysUntil(o.expected_date);
                    const busy = occurrenceAction.isPending && occurrenceAction.variables?.occ.id === o.id;
                    return (
                      <div key={o.id} className="pending-income" style={{ animationDelay: `${Math.min(i, 10) * 45}ms` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                          <div>
                            <div className="goal-movement-label" style={{ fontSize: 16 }}>{money(o.expected_amount)}</div>
                            <div className="goal-movement-date">{dayLabel(o.expected_date)}</div>
                          </div>
                          <Badge
                            label={d > 0 ? `En ${daysLabel(d)}` : d === 0 ? 'Hoy' : `${daysLabel(-d)} tarde`}
                            tone={d < 0 ? 'danger' : d <= 2 ? 'warning' : 'info'}
                          />
                        </div>
                        <div className="pending-income-actions">
                          <Button
                            label="✓ Ya llegó"
                            size="sm"
                            loading={busy && occurrenceAction.variables?.kind === 'receive'}
                            disabled={occurrenceAction.isPending}
                            onClick={() => { setError(null); occurrenceAction.mutate({ kind: 'receive', occ: o }); }}
                          />
                          <Button
                            label="No llegó"
                            size="sm"
                            variant="secondary"
                            disabled={occurrenceAction.isPending}
                            onClick={() => { setError(null); occurrenceAction.mutate({ kind: 'miss', occ: o }); }}
                          />
                          <Button
                            label="Cancelar"
                            size="sm"
                            variant="ghost"
                            disabled={occurrenceAction.isPending}
                            onClick={() => { setError(null); occurrenceAction.mutate({ kind: 'cancel', occ: o }); }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : tab === 'rules' ? (
              <DistributionRulesPanel source={source} onChanged={showNotice} />
            ) : (
              <form onSubmit={submitRegister}>
                <AmountInput label="Monto" value={amountText} onChange={setAmount} autoFocus />
                {!!source.default_amount && (
                  <div className="chip-row">
                    <button
                      type="button"
                      className={`chip${amountValid && Math.abs(parsed - source.default_amount) < 0.005 ? ' active' : ''}`}
                      onClick={() => setAmount(String(source.default_amount))}
                    >
                      Habitual · {money(source.default_amount)}
                    </button>
                  </div>
                )}
                <Input label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                <div className="field">
                  <label>¿Ya lo recibiste?</label>
                  <div className="chip-row" style={{ marginBottom: 0 }}>
                    <button type="button" className={`chip${alreadyReceived ? ' active' : ''}`} onClick={() => setAlreadyReceived(true)}>
                      ✅ Sí, ya llegó
                    </button>
                    <button type="button" className={`chip${!alreadyReceived ? ' active' : ''}`} onClick={() => setAlreadyReceived(false)}>
                      ⏳ No, lo espero
                    </button>
                  </div>
                </div>
                {amountValid && (
                  <div className="detail-preview">
                    {alreadyReceived ? (
                      <>Se sumarán <strong>{money(parsed)}</strong> a tu dinero disponible</>
                    ) : (
                      <>Quedará como ingreso esperado para el <strong>{dayLabel(date)}</strong></>
                    )}
                  </div>
                )}
                <Button
                  type="submit"
                  label={alreadyReceived ? 'Registrar ingreso' : 'Agendar ingreso'}
                  loading={registerMutation.isPending}
                  disabled={!amountValid || !date}
                />
              </form>
            )}
          </div>

          <div className="detail-danger-zone">
            {confirmDelete ? (
              <div className="detail-confirm">
                <span>¿Eliminar esta fuente y sus ingresos futuros?</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button label="Cancelar" size="sm" variant="secondary" onClick={() => setConfirmDelete(false)} />
                  <Button label="Sí, eliminar" size="sm" variant="danger" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate()} />
                </div>
              </div>
            ) : (
              <Button label="Eliminar fuente" size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} />
            )}
          </div>
        </Card>

        <div>
          <div className="section-title" style={{ marginTop: 0 }}>Historial</div>
          {history.length === 0 ? (
            <Card>
              <EmptyState icon="🕒" title="Aún no hay ingresos registrados" />
            </Card>
          ) : (
            <div className="goal-movements-list">
              {history.map((o, i) => {
                const meta = STATUS_META[o.status];
                const value = o.status === 'received' || o.status === 'partial' ? received(o) : Number(o.expected_amount);
                return (
                  <div key={o.id} className="goal-movement-row detail-row-animated" style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}>
                    <div
                      className="goal-movement-icon"
                      style={{ background: meta.tone === 'success' ? 'var(--success-soft)' : meta.tone === 'danger' ? 'var(--danger-soft)' : 'var(--surface-alt)' }}
                    >
                      {meta.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="goal-movement-label">{o.notes || meta.label}</div>
                      <div className="goal-movement-date">{dayLabel(o.received_date ?? o.expected_date)}</div>
                    </div>
                    <div
                      className="goal-movement-amount"
                      style={{
                        color: meta.tone === 'success' || meta.tone === 'warning' ? 'var(--success)' : 'var(--text-muted)',
                        textDecoration: o.status === 'cancelled' || o.status === 'missed' ? 'line-through' : undefined,
                      }}
                    >
                      {meta.tone === 'success' || meta.tone === 'warning' ? '+' : ''}
                      {money(value)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
