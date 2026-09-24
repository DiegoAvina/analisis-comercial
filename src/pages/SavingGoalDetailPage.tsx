import { useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { AmountInput } from '../components/AmountInput';
import { Avatar } from '../components/Avatar';
import { LoadingView } from '../components/LoadingView';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { NeonProgressBar } from '../components/NeonProgressBar';
import { DetailBreadcrumb, DetailHero, DetailNotice, SegmentedTabs, type TabDef } from '../components/detail/DetailParts';
import {
  addSavingGoalMember,
  contributeSavingGoal,
  fetchSavingGoalMovements,
  fetchSavingGoals,
  uploadSavingGoalImage,
  withdrawSavingGoal,
} from '../api/savingGoals';
import { getApiErrorMessage } from '../api/client';
import { DeleteSavingGoalModal, EditSavingGoalModal } from '../components/SavingGoalDialogs';
import { useAuth } from '../context/AuthContext';
import { useCountUp } from '../hooks/useCountUp';
import { daysLabel, daysUntil, useDetailFeedback } from '../hooks/useDetailFeedback';
import { isValidAmount, parseAmount } from '../utils/amount';
import { dayLabel, money } from '../utils/format';
import type { SavingGoal, SavingGoalMovement } from '../api/types';

type Tab = 'contribute' | 'withdraw' | 'members';

const MOVEMENT_META: Record<SavingGoalMovement['type'], { label: string; icon: string; tone: 'success' | 'danger' }> = {
  deposit: { label: 'Aporte', icon: '⬆️', tone: 'success' },
  auto_from_weekly: { label: 'Distribución automática', icon: '🔁', tone: 'success' },
  withdraw: { label: 'Retiro', icon: '⬇️', tone: 'danger' },
};

const QUICK_AMOUNTS = [100, 500, 1000];

function percentOf(amount: number, target: number): number {
  return target > 0 ? (amount / target) * 100 : 0;
}

export function SavingGoalDetailPage() {
  const { goalId } = useParams();
  const id = Number(goalId);
  const queryClient = useQueryClient();
  const { notice, showNotice, celebration, celebrate } = useDetailFeedback();

  const [tab, setTab] = useState<Tab>('contribute');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'edit' | 'delete' | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const goalsQuery = useQuery({ queryKey: ['saving-goals'], queryFn: fetchSavingGoals });
  const goal = goalsQuery.data?.find((g) => g.id === id);

  const movementsQuery = useQuery({
    queryKey: ['saving-goal-movements', id],
    queryFn: () => fetchSavingGoalMovements(id),
    enabled: !!goal,
  });

  const applyGoal = (updated: SavingGoal) => {
    queryClient.setQueryData<SavingGoal[]>(['saving-goals'], (list) =>
      list?.map((g) => (g.id === updated.id ? { ...g, ...updated } : g)),
    );
    queryClient.invalidateQueries({ queryKey: ['saving-goals'] });
    queryClient.invalidateQueries({ queryKey: ['saving-goal-movements', id] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const moveMutation = useMutation({
    mutationFn: ({ kind, value }: { kind: 'contribute' | 'withdraw'; value: number }) =>
      kind === 'contribute' ? contributeSavingGoal(id, value) : withdrawSavingGoal(id, value),
    onSuccess: (res, { kind, value }) => {
      const wasCompleted = goal?.status === 'completed';
      applyGoal(res.goal);
      setAmount('');
      showNotice(kind === 'contribute' ? `Aporte de ${money(value)} registrado` : `Retiro de ${money(value)} registrado`);
      if (kind === 'contribute' && !wasCompleted && res.goal.status === 'completed') celebrate();
    },
    onError: (e, { kind }) =>
      setError(getApiErrorMessage(e, kind === 'contribute' ? 'No se pudo registrar el aporte.' : 'No se pudo registrar el retiro.')),
  });

  const imageMutation = useMutation({
    mutationFn: (file: File) => uploadSavingGoalImage(id, file),
    onSuccess: (res) => {
      applyGoal(res.goal);
      showNotice('Foto actualizada');
    },
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo subir la foto.')),
  });

  const current = goal?.current_amount ?? 0;
  const target = goal?.target_amount ?? 0;
  const remaining = Math.max(0, target - current);
  const animatedCurrent = useCountUp(current);
  const animatedPercent = useCountUp(goal?.progress_percent ?? 0);
  const animatedRemaining = useCountUp(remaining);

  if (goalsQuery.isLoading) return <LoadingView />;

  if (!goal) {
    return (
      <div>
        <DetailBreadcrumb to="/ahorros" label="Ahorros" />
        {goalsQuery.isError ? (
          <ErrorBanner message={getApiErrorMessage(goalsQuery.error, 'No se pudo cargar la meta.')} />
        ) : (
          <Card>
            <EmptyState icon="🔎" title="No encontramos esta meta" subtitle="Puede que se haya eliminado o que no tengas acceso." />
          </Card>
        )}
      </div>
    );
  }

  const completed = goal.status === 'completed';
  const isOwner = !!user && goal.user_id === user.id;
  const parsed = parseAmount(amount);
  const amountValid = isValidAmount(amount);
  const isMoneyTab = tab === 'contribute' || tab === 'withdraw';
  const overWithdraw = tab === 'withdraw' && amountValid && parsed > current + 0.01;

  const previewAmount = !isMoneyTab || !amountValid ? null : tab === 'contribute' ? current + parsed : Math.max(0, current - parsed);
  const previewPercent = previewAmount == null ? null : percentOf(previewAmount, target);

  const days = goal.deadline ? daysUntil(goal.deadline) : null;
  const weeksLeft = days != null && days > 0 ? Math.max(1, Math.ceil(days / 7)) : null;
  const weeklySuggestion = weeksLeft && remaining > 0 ? remaining / weeksLeft : null;

  const tabs: TabDef<Tab>[] = [
    { key: 'contribute', label: 'Aportar', icon: '⬆️' },
    { key: 'withdraw', label: 'Retirar', icon: '⬇️' },
    ...(goal.is_group ? [{ key: 'members' as const, label: 'Integrantes', icon: '👥' }] : []),
  ];

  const switchTab = (next: Tab) => {
    setTab(next);
    setAmount('');
    setError(null);
  };

  const submitMove = (e: FormEvent) => {
    e.preventDefault();
    if (!isMoneyTab || !amountValid || overWithdraw || moveMutation.isPending) return;
    setError(null);
    moveMutation.mutate({ kind: tab, value: parsed });
  };

  const quickAmounts =
    tab === 'contribute'
      ? [
          ...QUICK_AMOUNTS.map((v) => ({ label: `+${money(v)}`, value: v })),
          ...(remaining > 0 ? [{ label: `Lo que falta · ${money(remaining)}`, value: remaining }] : []),
        ]
      : [
          ...QUICK_AMOUNTS.filter((v) => v < current).map((v) => ({ label: money(v), value: v })),
          ...(current > 0 ? [{ label: `Todo · ${money(current)}`, value: current }] : []),
        ];

  return (
    <div>
      <DetailBreadcrumb to="/ahorros" label="Ahorros" current={goal.name} />

      <DetailHero
        imageUrl={goal.image_url}
        gradient={`linear-gradient(135deg, ${completed ? 'var(--success)' : 'var(--primary)'}, var(--primary-dark) 60%, #0b0d24)`}
        celebrate={celebration}
        tags={
          <>
            {goal.is_group && <span className="glass-pill">👥 Grupal</span>}
            {completed && <span className="glass-pill is-success">🏆 Completada</span>}
          </>
        }
        action={
          <div className="detail-hero-actions">
            {isOwner && (
              <>
                <button
                  type="button"
                  className="glass-pill glass-pill-button tooltip"
                  data-tooltip="Cambia el nombre, el objetivo o la fecha límite"
                  onClick={() => setDialog('edit')}
                >
                  ✏️ <span className="glass-pill-label">Editar</span>
                </button>
                <button
                  type="button"
                  className="glass-pill glass-pill-button glass-pill-danger tooltip"
                  data-tooltip="Elimina esta meta y su historial"
                  aria-label="Eliminar meta"
                  onClick={() => setDialog('delete')}
                >
                  🗑️ <span className="glass-pill-label">Eliminar</span>
                </button>
              </>
            )}
            <button
              type="button"
              className="glass-pill glass-pill-button tooltip"
              data-tooltip="Elige la foto que te motiva a ahorrar"
              disabled={imageMutation.isPending}
              onClick={() => photoInputRef.current?.click()}
            >
              {imageMutation.isPending ? <span className="btn-spinner" aria-hidden="true" /> : '📷'}
              <span className="glass-pill-label">{goal.image_url ? 'Cambiar foto' : 'Agregar foto'}</span>
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp,image/bmp"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setError(null);
                  imageMutation.mutate(file);
                }
                e.target.value = '';
              }}
            />
          </div>
        }
      >
        {!!goal.category && <div className="detail-hero-eyebrow">{goal.category}</div>}
        <h1 className="detail-hero-name">{goal.name}</h1>

        <div className="detail-hero-figures">
          <div>
            <div className="detail-hero-amount">{money(animatedCurrent)}</div>
            <div className="detail-hero-target">de {money(target)}</div>
          </div>
          <div className="detail-hero-percent">
            {Math.round(animatedPercent)}
            <span>%</span>
          </div>
        </div>

        <NeonProgressBar
          percent={goal.progress_percent}
          previewPercent={previewPercent}
          tone={completed ? 'success' : 'primary'}
          milestones
          label="Avance de la meta"
        />
      </DetailHero>

      <DetailNotice text={notice} />

      {dialog === 'edit' && (
        <EditSavingGoalModal
          goal={goal}
          onClose={() => setDialog(null)}
          onSaved={(updated) => {
            showNotice('Meta actualizada');
            if (!completed && updated.status === 'completed') celebrate();
          }}
        />
      )}
      {dialog === 'delete' && (
        <DeleteSavingGoalModal
          goal={goal}
          onClose={() => setDialog(null)}
          onDeleted={() => navigate('/ahorros', { replace: true })}
        />
      )}

      <div className="goal-stats-row detail-stats">
        <div className="goal-stat-box">
          <span className="goal-stat-label">Ahorrado</span>
          <span className="goal-stat-value">{money(animatedCurrent)}</span>
        </div>
        <div className="goal-stat-divider" />
        <div className="goal-stat-box">
          <span className="goal-stat-label">Meta</span>
          <span className="goal-stat-value">{money(target)}</span>
        </div>
        <div className="goal-stat-divider" />
        <div className="goal-stat-box">
          <span className="goal-stat-label">Falta</span>
          <span className="goal-stat-value">{money(animatedRemaining)}</span>
        </div>
      </div>

      {days != null && (
        <div className={`detail-deadline${days < 0 && !completed ? ' is-overdue' : ''}`}>
          <span aria-hidden="true">📅</span>
          <span>
            {completed
              ? `Fecha límite: ${dayLabel(goal.deadline!)}`
              : days > 0
                ? `Faltan ${daysLabel(days)} · ${dayLabel(goal.deadline!)}`
                : days === 0
                  ? 'La fecha límite es hoy'
                  : `La fecha límite pasó hace ${daysLabel(-days)}`}
          </span>
          {weeklySuggestion != null && (
            <span className="detail-deadline-hint">Aporta {money(weeklySuggestion)} por semana para llegar a tiempo</span>
          )}
        </div>
      )}

      <div className="detail-grid">
        <Card className="detail-action-card">
          <SegmentedTabs tabs={tabs} value={tab} onChange={switchTab} />

          <div key={tab} className="detail-action-body">
            {!!error && <ErrorBanner message={error} />}

            {isMoneyTab ? (
              <form onSubmit={submitMove}>
                {tab === 'withdraw' && (
                  <div className="detail-action-hint">Disponible para retirar: {money(current)}</div>
                )}
                <AmountInput
                  label={tab === 'contribute' ? '¿Cuánto quieres aportar?' : '¿Cuánto quieres retirar?'}
                  value={amount}
                  onChange={setAmount}
                  error={overWithdraw ? 'No puedes retirar más de lo ahorrado' : undefined}
                  autoFocus
                />

                {quickAmounts.length > 0 && (
                  <div className="chip-row">
                    {quickAmounts.map((q) => (
                      <button
                        key={q.label}
                        type="button"
                        className={`chip${amountValid && Math.abs(parsed - q.value) < 0.005 ? ' active' : ''}`}
                        onClick={() => setAmount(String(Math.round(q.value * 100) / 100))}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                )}

                {previewAmount != null && !overWithdraw && (
                  <div className={`detail-preview${tab === 'withdraw' ? ' is-loss' : ''}`}>
                    {tab === 'contribute' && previewAmount >= target && !completed ? (
                      <>🎉 ¡Con este aporte completas tu meta!</>
                    ) : tab === 'contribute' ? (
                      <>
                        Llegarás a <strong>{money(previewAmount)}</strong> ({Math.round(previewPercent!)}%)
                      </>
                    ) : (
                      <>
                        Te quedarán <strong>{money(previewAmount)}</strong> ({Math.round(previewPercent!)}%)
                      </>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  label={tab === 'contribute' ? 'Aportar' : 'Retirar'}
                  variant={tab === 'contribute' ? 'primary' : 'danger'}
                  loading={moveMutation.isPending}
                  disabled={!amountValid || overWithdraw || (tab === 'withdraw' && current <= 0)}
                />
              </form>
            ) : (
              <MembersPanel
                goal={goal}
                onAdded={(g) => {
                  applyGoal(g);
                  showNotice('Integrante agregado');
                }}
              />
            )}
          </div>
        </Card>

        <div>
          <div className="section-title" style={{ marginTop: 0 }}>Movimientos</div>

          {movementsQuery.isError && (
            <ErrorBanner message={getApiErrorMessage(movementsQuery.error, 'No se pudo cargar el historial.')} />
          )}

          {movementsQuery.isLoading ? (
            <LoadingView />
          ) : !movementsQuery.data || movementsQuery.data.length === 0 ? (
            <Card>
              <EmptyState icon="🕒" title="Aún no hay movimientos" subtitle="Tus aportes y retiros aparecerán aquí" />
            </Card>
          ) : (
            <div className="goal-movements-list">
              {movementsQuery.data.map((m, i) => {
                const meta = MOVEMENT_META[m.type];
                return (
                  <div
                    key={m.id}
                    className="goal-movement-row detail-row-animated"
                    style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}
                  >
                    <div
                      className="goal-movement-icon"
                      style={{ background: meta.tone === 'success' ? 'var(--success-soft)' : 'var(--danger-soft)' }}
                    >
                      {meta.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="goal-movement-label">{m.description || meta.label}</div>
                      <div className="goal-movement-date">{dayLabel(m.date)}</div>
                    </div>
                    <div
                      className="goal-movement-amount"
                      style={{ color: meta.tone === 'success' ? 'var(--success)' : 'var(--danger)' }}
                    >
                      {meta.tone === 'success' ? '+' : '-'}
                      {money(Math.abs(m.amount))}
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

function MembersPanel({ goal, onAdded }: { goal: SavingGoal; onAdded: (goal: SavingGoal) => void }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => addSavingGoalMember(goal.id, email.trim()),
    onSuccess: (res) => {
      onAdded(res.goal);
      setEmail('');
    },
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo agregar al integrante.')),
  });

  return (
    <div>
      {!!goal.participants?.length && (
        <div className="detail-members-list">
          {goal.participants.map((p) => (
            <div key={p.id} className="detail-member-row">
              <Avatar name={p.name} url={p.avatar_url} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="goal-movement-label">{p.name}</div>
                <div className="goal-movement-date" style={{ textTransform: 'none' }}>{p.email}</div>
              </div>
              {p.pivot?.role === 'owner' && <Badge label="Creador" tone="info" />}
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!email || mutation.isPending) return;
          setError(null);
          mutation.mutate();
        }}
      >
        {!!error && <ErrorBanner message={error} />}
        <Input
          label="Invitar por correo"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Debe ser un usuario ya registrado"
        />
        <Button type="submit" label="Agregar integrante" loading={mutation.isPending} disabled={!email} />
      </form>
    </div>
  );
}
