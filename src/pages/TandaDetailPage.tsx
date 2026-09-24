import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { AmountInput } from '../components/AmountInput';
import { Avatar } from '../components/Avatar';
import { LoadingView } from '../components/LoadingView';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { NeonProgressBar } from '../components/NeonProgressBar';
import { DetailBreadcrumb, DetailHero, DetailNotice, SegmentedTabs, type TabDef } from '../components/detail/DetailParts';
import { addTandaMember, fetchTandas, registerTandaPayment } from '../api/tandas';
import { getApiErrorMessage } from '../api/client';
import { useCountUp } from '../hooks/useCountUp';
import { daysLabel, daysUntil, useDetailFeedback } from '../hooks/useDetailFeedback';
import { isValidAmount, parseAmount } from '../utils/amount';
import { dayLabel, money } from '../utils/format';
import type { Tanda, TandaMember } from '../api/types';

type Tab = 'payment' | 'members';

const FREQUENCY_LABELS: Record<Tanda['frequency'], string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
};

const STATUS_META: Record<Tanda['status'], { label: string; className: string }> = {
  active: { label: '🟢 Activa', className: '' },
  completed: { label: '🏆 Completada', className: ' is-success' },
  cancelled: { label: '⛔ Cancelada', className: ' is-danger' },
};

const TABS: TabDef<Tab>[] = [
  { key: 'payment', label: 'Registrar pago', icon: '💸' },
  { key: 'members', label: 'Integrantes', icon: '👥' },
];

type TurnSlot = { turn: number; member: TandaMember | null; state: 'received' | 'current' | 'upcoming' };

function buildTurns(tanda: Tanda): TurnSlot[] {
  const total = Math.max(tanda.num_members, tanda.members?.length ?? 0);
  const byTurn = new Map<number, TandaMember>();
  for (const m of tanda.members ?? []) {
    if (m.pivot?.turn_order) byTurn.set(m.pivot.turn_order, m);
  }
  return Array.from({ length: total }, (_, i) => {
    const turn = i + 1;
    const member = byTurn.get(turn) ?? null;
    const state =
      member?.pivot?.has_received || (tanda.status === 'completed' || turn < tanda.current_round)
        ? 'received'
        : turn === tanda.current_round && tanda.status === 'active'
          ? 'current'
          : 'upcoming';
    return { turn, member, state };
  });
}

export function TandaDetailPage() {
  const { tandaId } = useParams();
  const id = Number(tandaId);
  const queryClient = useQueryClient();
  const { notice, showNotice, celebration, celebrate } = useDetailFeedback();

  const [tab, setTab] = useState<Tab>('payment');
  const [amount, setAmount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tandasQuery = useQuery({ queryKey: ['tandas'], queryFn: fetchTandas });
  const tanda = tandasQuery.data?.find((t) => t.id === id);

  const applyTanda = (updated: Tanda) => {
    queryClient.setQueryData<Tanda[]>(['tandas'], (list) => list?.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
    queryClient.invalidateQueries({ queryKey: ['tandas'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['calendar'] });
  };

  const paymentMutation = useMutation({
    mutationFn: (value: number) => registerTandaPayment(id, value),
    onSuccess: (res, value) => {
      const wasCompleted = tanda?.status === 'completed';
      applyTanda(res.tanda);
      setAmount(null);
      showNotice(`Pago de ${money(value)} registrado`);
      if (!wasCompleted && res.tanda.status === 'completed') celebrate();
    },
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo registrar el pago.')),
  });

  const rounds = Math.max(1, tanda?.num_members ?? 1);
  const pot = tanda ? tanda.pot_amount || tanda.contribution_amount * tanda.num_members : 0;
  const paidTotal = (tanda?.payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const animatedPot = useCountUp(pot);
  const animatedRound = useCountUp(Math.min(tanda?.current_round ?? 0, rounds));
  const animatedPaid = useCountUp(paidTotal);

  if (tandasQuery.isLoading) return <LoadingView />;

  if (!tanda) {
    return (
      <div>
        <DetailBreadcrumb to="/tandas" label="Tandas" />
        {tandasQuery.isError ? (
          <ErrorBanner message={getApiErrorMessage(tandasQuery.error, 'No se pudo cargar la tanda.')} />
        ) : (
          <Card>
            <EmptyState icon="🔎" title="No encontramos esta tanda" subtitle="Puede que se haya eliminado o que no tengas acceso." />
          </Card>
        )}
      </div>
    );
  }

  const isActive = tanda.status === 'active';
  const completed = tanda.status === 'completed';
  const amountText = amount ?? String(tanda.contribution_amount);
  const parsed = parseAmount(amountText);
  const amountValid = isValidAmount(amountText);
  const previewPercent = tab === 'payment' && amountValid && isActive ? Math.min(100, ((tanda.current_round + 1) / rounds) * 100) : null;
  const isLastRound = tanda.current_round >= rounds;

  const days = tanda.next_payment_date ? daysUntil(tanda.next_payment_date) : null;
  const turns = buildTurns(tanda);
  const currentTurn = turns.find((t) => t.state === 'current');
  const freeTurns = turns.filter((t) => !t.member).map((t) => t.turn);
  const ticks = rounds <= 30 ? Array.from({ length: rounds - 1 }, (_, i) => ((i + 1) / rounds) * 100) : [];

  const payments = [...(tanda.payments ?? [])].sort((a, b) =>
    String(b.paid_at ?? b.due_date ?? '').localeCompare(String(a.paid_at ?? a.due_date ?? '')),
  );

  const switchTab = (next: Tab) => {
    setTab(next);
    setError(null);
  };

  const submitPayment = (e: FormEvent) => {
    e.preventDefault();
    if (!amountValid || !isActive || paymentMutation.isPending) return;
    setError(null);
    paymentMutation.mutate(parsed);
  };

  return (
    <div>
      <DetailBreadcrumb to="/tandas" label="Tandas" current={tanda.name} />

      <DetailHero
        gradient={
          completed
            ? 'linear-gradient(135deg, var(--success), #0d6b50 55%, #06121f)'
            : 'linear-gradient(135deg, var(--primary), #2a1f7a 55%, #070a1f)'
        }
        emblem="👥"
        celebrate={celebration}
        tags={
          <>
            <span className={`glass-pill${STATUS_META[tanda.status].className}`}>{STATUS_META[tanda.status].label}</span>
            <span className="glass-pill">🔁 {FREQUENCY_LABELS[tanda.frequency]}</span>
          </>
        }
      >
        <div className="detail-hero-eyebrow">Tanda · {tanda.num_members} integrantes</div>
        <h1 className="detail-hero-name">{tanda.name}</h1>

        <div className="detail-hero-figures">
          <div>
            <div className="detail-hero-amount">{money(animatedPot)}</div>
            <div className="detail-hero-target">bolsa por turno · {money(tanda.contribution_amount)} c/u</div>
          </div>
          <div className="detail-hero-percent">
            {Math.round(animatedRound)}
            <span>/{rounds}</span>
          </div>
        </div>

        <NeonProgressBar
          percent={tanda.progress_percent}
          previewPercent={previewPercent}
          tone={completed ? 'success' : tanda.status === 'cancelled' ? 'danger' : 'primary'}
          ticks={ticks}
          milestones={[
            { at: 0, label: 'Inicio' },
            { at: 50, label: 'Mitad' },
            { at: 100, label: 'Fin' },
          ]}
          label="Rondas completadas"
        />
      </DetailHero>

      <DetailNotice text={notice} />

      <div className="goal-stats-row detail-stats">
        <div className="goal-stat-box">
          <span className="goal-stat-label">Aportación</span>
          <span className="goal-stat-value">{money(tanda.contribution_amount)}</span>
        </div>
        <div className="goal-stat-divider" />
        <div className="goal-stat-box">
          <span className="goal-stat-label">Pagado</span>
          <span className="goal-stat-value">{money(animatedPaid)}</span>
        </div>
        <div className="goal-stat-divider" />
        <div className="goal-stat-box">
          <span className="goal-stat-label">Le toca</span>
          <span className="goal-stat-value detail-stat-ellipsis">
            {currentTurn ? currentTurn.member?.name.split(' ')[0] ?? `Turno ${currentTurn.turn}` : '—'}
          </span>
        </div>
      </div>

      {days != null && isActive && (
        <div className={`detail-deadline${days < 0 ? ' is-overdue' : ''}`}>
          <span aria-hidden="true">📅</span>
          <span>
            {days > 0
              ? `Próximo pago en ${daysLabel(days)} · ${dayLabel(tanda.next_payment_date!)}`
              : days === 0
                ? 'El próximo pago es hoy'
                : `El pago se atrasó ${daysLabel(-days)}`}
          </span>
        </div>
      )}

      <div className="section-title">Turnos</div>
      <div className="turn-track">
        {turns.map((t, i) => (
          <div
            key={t.turn}
            className={`turn-node is-${t.state}${t.member ? '' : ' is-empty'}`}
            style={{ animationDelay: `${Math.min(i, 16) * 50}ms` }}
          >
            <div className="turn-avatar">
              {t.member ? (
                <Avatar name={t.member.name} url={t.member.avatar_url} size={44} />
              ) : (
                <span className="turn-avatar-empty" aria-hidden="true">+</span>
              )}
              {t.state === 'received' && <span className="turn-check" aria-label="Ya recibió">✓</span>}
            </div>
            <div className="turn-number">Turno {t.turn}</div>
            <div className="turn-name">{t.member ? t.member.name.split(' ')[0] : 'Libre'}</div>
            {t.state === 'current' && <div className="turn-flag">Le toca</div>}
          </div>
        ))}
      </div>

      <div className="detail-grid">
        <Card className="detail-action-card">
          <SegmentedTabs tabs={TABS} value={tab} onChange={switchTab} />

          <div key={tab} className="detail-action-body">
            {!!error && <ErrorBanner message={error} />}

            {tab === 'payment' ? (
              !isActive ? (
                <EmptyState
                  icon={completed ? '🏆' : '⛔'}
                  title={completed ? 'Esta tanda ya terminó' : 'Esta tanda está cancelada'}
                  subtitle={completed ? 'Todos los turnos se completaron.' : 'Ya no se pueden registrar pagos.'}
                />
              ) : (
                <form onSubmit={submitPayment}>
                  <AmountInput label="Monto del pago" value={amountText} onChange={setAmount} autoFocus />
                  <div className="chip-row">
                    {[
                      { label: `Aportación · ${money(tanda.contribution_amount)}`, value: tanda.contribution_amount },
                      { label: `Doble · ${money(tanda.contribution_amount * 2)}`, value: tanda.contribution_amount * 2 },
                    ].map((q) => (
                      <button
                        key={q.label}
                        type="button"
                        className={`chip${amountValid && Math.abs(parsed - q.value) < 0.005 ? ' active' : ''}`}
                        onClick={() => setAmount(String(q.value))}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>

                  {amountValid && (
                    <div className="detail-preview">
                      {isLastRound ? (
                        <>🎉 Con este pago se completa la tanda</>
                      ) : (
                        <>
                          La tanda avanzará a la <strong>ronda {tanda.current_round + 1}</strong> de {rounds}
                        </>
                      )}
                    </div>
                  )}

                  <Button type="submit" label="Registrar pago" loading={paymentMutation.isPending} disabled={!amountValid} />
                </form>
              )
            ) : (
              <TandaMembersPanel
                tanda={tanda}
                freeTurns={freeTurns}
                onAdded={(t) => {
                  applyTanda(t);
                  showNotice('Integrante agregado');
                }}
              />
            )}
          </div>
        </Card>

        <div>
          <div className="section-title" style={{ marginTop: 0 }}>Pagos</div>
          {payments.length === 0 ? (
            <Card>
              <EmptyState icon="🕒" title="Aún no hay pagos" subtitle="Los pagos que registres aparecerán aquí" />
            </Card>
          ) : (
            <div className="goal-movements-list">
              {payments.map((p, i) => {
                const payer = tanda.members?.find((m) => m.id === p.user_id);
                return (
                  <div key={p.id} className="goal-movement-row detail-row-animated" style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}>
                    {payer ? (
                      <Avatar name={payer.name} url={payer.avatar_url} size={32} />
                    ) : (
                      <div className="goal-movement-icon" style={{ background: 'var(--success-soft)' }}>💸</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="goal-movement-label">{p.notes || (payer ? `Pago de ${payer.name.split(' ')[0]}` : 'Pago')}</div>
                      {!!(p.paid_at ?? p.due_date) && (
                        <div className="goal-movement-date">{dayLabel(String(p.paid_at ?? p.due_date))}</div>
                      )}
                    </div>
                    <div className="goal-movement-amount" style={{ color: 'var(--success)' }}>
                      +{money(p.amount)}
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

function TandaMembersPanel({
  tanda,
  freeTurns,
  onAdded,
}: {
  tanda: Tanda;
  freeTurns: number[];
  onAdded: (tanda: Tanda) => void;
}) {
  const [email, setEmail] = useState('');
  const [turn, setTurn] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedTurn = turn ?? freeTurns[0] ?? null;

  const mutation = useMutation({
    mutationFn: () => addTandaMember(tanda.id, email.trim(), selectedTurn!),
    onSuccess: (res) => {
      onAdded(res.tanda);
      setEmail('');
      setTurn(null);
    },
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo agregar al integrante.')),
  });

  if (freeTurns.length === 0) {
    return <EmptyState icon="✅" title="Todos los turnos están ocupados" subtitle={`Los ${tanda.num_members} lugares ya tienen integrante.`} />;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!email || selectedTurn == null || mutation.isPending) return;
        setError(null);
        mutation.mutate();
      }}
    >
      {!!error && <ErrorBanner message={error} />}
      <Input
        label="Correo del integrante"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Debe ser un usuario ya registrado"
      />
      <div className="field">
        <label>Turno que le toca</label>
        <div className="chip-row" style={{ marginBottom: 0 }}>
          {freeTurns.map((t) => (
            <button
              key={t}
              type="button"
              className={`chip${selectedTurn === t ? ' active' : ''}`}
              onClick={() => setTurn(t)}
            >
              Turno {t}
            </button>
          ))}
        </div>
      </div>
      <Button type="submit" label="Agregar integrante" loading={mutation.isPending} disabled={!email || selectedTurn == null} />
    </form>
  );
}
