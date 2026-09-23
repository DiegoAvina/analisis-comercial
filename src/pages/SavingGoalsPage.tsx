import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { AmountInput } from '../components/AmountInput';
import { Modal } from '../components/Modal';
import { GoalCoverImage } from '../components/GoalCoverImage';
import { Avatar } from '../components/Avatar';
import { LoadingView } from '../components/LoadingView';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import {
  addSavingGoalMember,
  contributeSavingGoal,
  createSavingGoal,
  fetchSavingGoalMovements,
  fetchSavingGoals,
  uploadSavingGoalImage,
  withdrawSavingGoal,
} from '../api/savingGoals';
import { getApiErrorMessage } from '../api/client';
import { isValidAmount, parseAmount } from '../utils/amount';
import { dayLabel, money } from '../utils/format';
import type { SavingGoal, SavingGoalMovement } from '../api/types';

const MOVEMENT_META: Record<SavingGoalMovement['type'], { label: string; icon: string; tone: 'success' | 'danger' }> = {
  deposit: { label: 'Aporte', icon: '⬆️', tone: 'success' },
  auto_from_weekly: { label: 'Distribución automática', icon: '🔁', tone: 'success' },
  withdraw: { label: 'Retiro', icon: '⬇️', tone: 'danger' },
};

export function SavingGoalsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [activeGoal, setActiveGoal] = useState<SavingGoal | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({ queryKey: ['saving-goals'], queryFn: fetchSavingGoals });

  const invalidate = (updatedGoal?: SavingGoal) => {
    queryClient.invalidateQueries({ queryKey: ['saving-goals'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    if (activeGoal) {
      queryClient.invalidateQueries({ queryKey: ['saving-goal-movements', activeGoal.id] });
    }
    if (updatedGoal) {
      setActiveGoal((current) => (current && current.id === updatedGoal.id ? updatedGoal : current));
    }
  };

  const imageMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => uploadSavingGoalImage(id, file),
    onMutate: ({ id }) => setUploadingId(id),
    onSuccess: (res) => {
      invalidate();
      setActiveGoal((current) => (current && current.id === res.goal.id ? res.goal : current));
    },
    onSettled: () => setUploadingId(null),
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Ahorros</div>
          <div className="page-subtitle">Tus metas y avances</div>
        </div>
        <Button label="+ Nueva meta" onClick={() => setFormOpen(true)} />
      </div>

      {isError && <ErrorBanner message={getApiErrorMessage(error, 'No se pudieron cargar tus metas.')} />}

      {isLoading ? (
        <LoadingView />
      ) : !data || data.length === 0 ? (
        <Card>
          <EmptyState icon="🎯" title="Aún no tienes metas de ahorro" subtitle="Crea una para empezar a juntar" />
        </Card>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {data.map((goal) => (
            <Card key={goal.id} style={{ padding: 0, overflow: 'hidden' }}>
              <GoalCoverImage
                imageUrl={goal.image_url}
                percent={goal.progress_percent}
                completed={goal.status === 'completed'}
                uploading={uploadingId === goal.id}
                onChangePhoto={(file) => imageMutation.mutate({ id: goal.id, file })}
                variant="card"
              />

              <div style={{ padding: 'var(--space-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{goal.name}</div>
                    {!!goal.category && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{goal.category}</div>}
                  </div>
                  {goal.status === 'completed' ? (
                    <Badge label="Completada" tone="success" />
                  ) : goal.is_group ? (
                    <Badge label="Grupal" tone="info" />
                  ) : null}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                  <span>{money(goal.current_amount)}</span>
                  <span>de {money(goal.target_amount)}</span>
                </div>

                {goal.participants && goal.participants.length > 0 && (
                  <div className="goal-participants-row" style={{ marginBottom: 12 }}>
                    {goal.participants.map((p) => (
                      <div key={p.id} className="goal-participant-chip">
                        <Avatar name={p.name} url={p.avatar_url} size={22} />
                        <span className="goal-participant-name">{p.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  label="Aportar / gestionar"
                  variant="secondary"
                  size="sm"
                  tooltip="Registra un aporte o invita a más personas a esta meta"
                  onClick={() => setActiveGoal(goal)}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      <SavingGoalFormModal open={formOpen} onClose={() => setFormOpen(false)} />
      {activeGoal && (
        <SavingGoalDetailModal
          goal={activeGoal}
          onClose={() => setActiveGoal(null)}
          onChanged={invalidate}
          onUploadImage={(file) => imageMutation.mutate({ id: activeGoal.id, file })}
          uploadingImage={uploadingId === activeGoal.id}
        />
      )}
    </div>
  );
}

function SavingGoalFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      createSavingGoal({
        name: name.trim(),
        target_amount: parseAmount(targetAmount),
        deadline: deadline.trim() || undefined,
        is_group: isGroup,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saving-goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setName('');
      setTargetAmount('');
      setDeadline('');
      setIsGroup(false);
      onClose();
    },
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo crear la meta.')),
  });

  return (
    <Modal open={open} title="Nueva meta de ahorro" onClose={onClose}>
      {!!error && <ErrorBanner message={error} />}
      <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Vacaciones, laptop..." />
      <AmountInput label="Monto objetivo" value={targetAmount} onChange={setTargetAmount} />
      <Input label="Fecha límite (opcional)" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, margin: '4px 0 12px', cursor: 'pointer' }}>
        <input type="checkbox" checked={isGroup} onChange={(e) => setIsGroup(e.target.checked)} />
        Es una meta grupal (varias personas aportan)
      </label>
      <Button
        label="Crear meta"
        onClick={() => {
          setError(null);
          mutation.mutate();
        }}
        loading={mutation.isPending}
        disabled={!name || !isValidAmount(targetAmount)}
      />
    </Modal>
  );
}

function SavingGoalDetailModal({
  goal,
  onClose,
  onChanged,
  onUploadImage,
  uploadingImage,
}: {
  goal: SavingGoal;
  onClose: () => void;
  onChanged: (updatedGoal?: SavingGoal) => void;
  onUploadImage: (file: File) => void;
  uploadingImage: boolean;
}) {
  const [action, setAction] = useState<'contribute' | 'withdraw' | 'add-member' | null>(null);

  const movementsQuery = useQuery({
    queryKey: ['saving-goal-movements', goal.id],
    queryFn: () => fetchSavingGoalMovements(goal.id),
  });

  const remaining = Math.max(0, goal.target_amount - goal.current_amount);

  return (
    <Modal open title={goal.name} onClose={onClose} maxWidth={560}>
      <div style={{ marginBottom: 20 }}>
        <GoalCoverImage
          imageUrl={goal.image_url}
          name={goal.name}
          percent={goal.progress_percent}
          completed={goal.status === 'completed'}
          uploading={uploadingImage}
          onChangePhoto={onUploadImage}
          variant="hero"
        />
      </div>

      {(goal.is_group || goal.status === 'completed') && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {goal.is_group && <Badge label="Grupal" tone="info" />}
          {goal.status === 'completed' && <Badge label="Completada" tone="success" />}
        </div>
      )}

      <div className="goal-stats-row" style={{ marginBottom: 16 }}>
        <div className="goal-stat-box">
          <span className="goal-stat-label">Ahorrado</span>
          <span className="goal-stat-value">{money(goal.current_amount)}</span>
        </div>
        <div className="goal-stat-divider" />
        <div className="goal-stat-box">
          <span className="goal-stat-label">Meta</span>
          <span className="goal-stat-value">{money(goal.target_amount)}</span>
        </div>
        <div className="goal-stat-divider" />
        <div className="goal-stat-box">
          <span className="goal-stat-label">Falta</span>
          <span className="goal-stat-value">{money(remaining)}</span>
        </div>
      </div>

      {!!goal.deadline && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          <span>📅</span>
          <span>Fecha límite: {goal.deadline}</span>
        </div>
      )}

      {goal.is_group && !!goal.participants?.length && (
        <div className="goal-participants-row" style={{ marginBottom: 16 }}>
          {goal.participants.map((p) => (
            <div key={p.id} className="goal-participant-chip">
              <Avatar name={p.name} url={p.avatar_url} size={24} />
              <span className="goal-participant-name">{p.name}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        <Button label="Aportar" size="sm" onClick={() => setAction('contribute')} />
        <Button
          label="Retirar"
          size="sm"
          variant="secondary"
          onClick={() => setAction('withdraw')}
          disabled={goal.current_amount <= 0}
        />
        {goal.is_group && (
          <Button label="Agregar integrante" size="sm" variant="ghost" onClick={() => setAction('add-member')} />
        )}
      </div>

      <div className="section-title" style={{ marginTop: 0 }}>Movimientos</div>

      {movementsQuery.isError && (
        <ErrorBanner message={getApiErrorMessage(movementsQuery.error, 'No se pudo cargar el historial.')} />
      )}

      {movementsQuery.isLoading ? (
        <LoadingView />
      ) : !movementsQuery.data || movementsQuery.data.length === 0 ? (
        <EmptyState icon="🕒" title="Aún no hay movimientos" subtitle="Tus aportes y retiros aparecerán aquí" />
      ) : (
        <div className="goal-movements-list">
          {movementsQuery.data.map((m) => {
            const meta = MOVEMENT_META[m.type];
            return (
              <div key={m.id} className="goal-movement-row">
                <div
                  className="goal-movement-icon"
                  style={{
                    background: meta.tone === 'success' ? 'var(--success-soft)' : 'var(--danger-soft)',
                  }}
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

      {action === 'contribute' && (
        <ContributeModal goalId={goal.id} onClose={() => setAction(null)} onChanged={onChanged} />
      )}
      {action === 'withdraw' && (
        <WithdrawModal goalId={goal.id} maxAmount={goal.current_amount} onClose={() => setAction(null)} onChanged={onChanged} />
      )}
      {action === 'add-member' && (
        <AddGoalMemberModal goalId={goal.id} onClose={() => setAction(null)} onChanged={onChanged} />
      )}
    </Modal>
  );
}

function ContributeModal({
  goalId,
  onClose,
  onChanged,
}: {
  goalId: number;
  onClose: () => void;
  onChanged: (updatedGoal?: SavingGoal) => void;
}) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => contributeSavingGoal(goalId, parseAmount(amount)),
    onSuccess: (res) => {
      onChanged(res.goal);
      setAmount('');
      onClose();
    },
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo registrar el aporte.')),
  });

  return (
    <Modal open title="Aportar a la meta" onClose={onClose}>
      {!!error && <ErrorBanner message={error} />}
      <AmountInput label="Monto a aportar" value={amount} onChange={setAmount} />
      <div style={{ height: 8 }} />
      <Button
        label="Aportar"
        onClick={() => {
          setError(null);
          mutation.mutate();
        }}
        loading={mutation.isPending}
        disabled={!isValidAmount(amount)}
      />
    </Modal>
  );
}

function WithdrawModal({
  goalId,
  maxAmount,
  onClose,
  onChanged,
}: {
  goalId: number;
  maxAmount: number;
  onClose: () => void;
  onChanged: (updatedGoal?: SavingGoal) => void;
}) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const parsed = parseAmount(amount);
  const withinLimit = isValidAmount(amount) && parsed <= maxAmount + 0.01;

  const mutation = useMutation({
    mutationFn: () => withdrawSavingGoal(goalId, parsed),
    onSuccess: (res) => {
      onChanged(res.goal);
      setAmount('');
      onClose();
    },
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo registrar el retiro.')),
  });

  return (
    <Modal open title="Retirar de la meta" onClose={onClose}>
      {!!error && <ErrorBanner message={error} />}
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
        Disponible para retirar: {money(maxAmount)}
      </div>
      <AmountInput label="Monto a retirar" value={amount} onChange={setAmount} />
      <div style={{ height: 8 }} />
      <Button
        label="Retirar"
        variant="danger"
        onClick={() => {
          setError(null);
          mutation.mutate();
        }}
        loading={mutation.isPending}
        disabled={!withinLimit}
      />
    </Modal>
  );
}

function AddGoalMemberModal({
  goalId,
  onClose,
  onChanged,
}: {
  goalId: number;
  onClose: () => void;
  onChanged: (updatedGoal?: SavingGoal) => void;
}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => addSavingGoalMember(goalId, email.trim()),
    onSuccess: (res) => {
      onChanged(res.goal);
      setEmail('');
      onClose();
    },
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo agregar al integrante.')),
  });

  return (
    <Modal open title="Agregar integrante" onClose={onClose}>
      {!!error && <ErrorBanner message={error} />}
      <Input
        label="Correo del integrante"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Debe ser un usuario ya registrado"
      />
      <div style={{ height: 8 }} />
      <Button
        label="Agregar"
        onClick={() => {
          setError(null);
          mutation.mutate();
        }}
        loading={mutation.isPending}
        disabled={!email}
      />
    </Modal>
  );
}
