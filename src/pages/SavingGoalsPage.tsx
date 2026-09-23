import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { AmountInput } from '../components/AmountInput';
import { Modal } from '../components/Modal';
import { ProgressBar } from '../components/ProgressBar';
import { LoadingView } from '../components/LoadingView';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { addSavingGoalMember, contributeSavingGoal, createSavingGoal, fetchSavingGoals } from '../api/savingGoals';
import { getApiErrorMessage } from '../api/client';
import { isValidAmount, parseAmount } from '../utils/amount';
import { money } from '../utils/format';
import type { SavingGoal } from '../api/types';

export function SavingGoalsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [activeGoal, setActiveGoal] = useState<SavingGoal | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({ queryKey: ['saving-goals'], queryFn: fetchSavingGoals });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['saving-goals'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

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
        <div className="kpi-grid">
          {data.map((goal) => (
            <Card key={goal.id}>
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

              <ProgressBar percent={goal.progress_percent} color={goal.status === 'completed' ? 'var(--success)' : 'var(--primary)'} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)', margin: '6px 0 16px' }}>
                <span>{money(goal.current_amount)}</span>
                <span>de {money(goal.target_amount)}</span>
              </div>

              {goal.participants && goal.participants.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {goal.participants.map((p) => (
                    <span key={p.id} className="badge badge-neutral" style={{ marginRight: 4 }}>
                      {p.name}
                    </span>
                  ))}
                </div>
              )}

              <Button label="Aportar / gestionar" variant="secondary" size="sm" onClick={() => setActiveGoal(goal)} />
            </Card>
          ))}
        </div>
      )}

      <SavingGoalFormModal open={formOpen} onClose={() => setFormOpen(false)} />
      {activeGoal && <SavingGoalDetailModal goal={activeGoal} onClose={() => setActiveGoal(null)} onChanged={invalidate} />}
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

function SavingGoalDetailModal({ goal, onClose, onChanged }: { goal: SavingGoal; onClose: () => void; onChanged: () => void }) {
  const [amount, setAmount] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const contributeMutation = useMutation({
    mutationFn: () => contributeSavingGoal(goal.id, parseAmount(amount)),
    onSuccess: () => {
      onChanged();
      setAmount('');
      onClose();
    },
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo registrar el aporte.')),
  });

  const memberMutation = useMutation({
    mutationFn: () => addSavingGoalMember(goal.id, memberEmail.trim()),
    onSuccess: () => {
      onChanged();
      setMemberEmail('');
    },
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo agregar al integrante.')),
  });

  return (
    <Modal open title={goal.name} onClose={onClose}>
      {!!error && <ErrorBanner message={error} />}

      <div className="section-title">Aportar</div>
      <AmountInput value={amount} onChange={setAmount} />
      <Button
        label="Registrar aporte"
        onClick={() => {
          setError(null);
          contributeMutation.mutate();
        }}
        loading={contributeMutation.isPending}
        disabled={!isValidAmount(amount)}
      />

      {goal.is_group && (
        <>
          <div className="section-title" style={{ marginTop: 20 }}>Agregar integrante</div>
          <Input
            label="Correo del integrante"
            type="email"
            value={memberEmail}
            onChange={(e) => setMemberEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
          />
          <Button
            label="Invitar"
            variant="secondary"
            onClick={() => {
              setError(null);
              memberMutation.mutate();
            }}
            loading={memberMutation.isPending}
            disabled={!memberEmail}
          />
        </>
      )}
    </Modal>
  );
}
