import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { AmountInput } from '../components/AmountInput';
import { Modal } from '../components/Modal';
import { GoalCoverImage } from '../components/GoalCoverImage';
import { NeonProgressBar } from '../components/NeonProgressBar';
import { CardCta, LinkCard } from '../components/detail/DetailParts';
import { Avatar } from '../components/Avatar';
import { LoadingView } from '../components/LoadingView';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { createSavingGoal, fetchSavingGoals, uploadSavingGoalImage } from '../api/savingGoals';
import { getApiErrorMessage } from '../api/client';
import { DeleteSavingGoalModal, EditSavingGoalModal } from '../components/SavingGoalDialogs';
import { useAuth } from '../context/AuthContext';
import type { SavingGoal } from '../api/types';
import { isValidAmount, parseAmount } from '../utils/amount';
import { money } from '../utils/format';

export function SavingGoalsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<{ kind: 'edit' | 'delete'; goal: SavingGoal } | null>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({ queryKey: ['saving-goals'], queryFn: fetchSavingGoals });

  const imageMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => uploadSavingGoalImage(id, file),
    onMutate: ({ id }) => setUploadingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saving-goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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
          {data.map((goal, i) => (
              <LinkCard key={goal.id} to={`/ahorros/${goal.id}`} label={`Abrir la meta ${goal.name}`} index={i}>
                <Card className="goal-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <GoalCoverImage
                    imageUrl={goal.image_url}
                    percent={goal.progress_percent}
                    completed={goal.status === 'completed'}
                    uploading={uploadingId === goal.id}
                    onChangePhoto={(file) => imageMutation.mutate({ id: goal.id, file })}
                    onEdit={goal.user_id === user?.id ? () => setDialog({ kind: 'edit', goal }) : undefined}
                    onDelete={goal.user_id === user?.id ? () => setDialog({ kind: 'delete', goal }) : undefined}
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

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{money(goal.current_amount)}</span>
                      <span>de {money(goal.target_amount)}</span>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <NeonProgressBar
                        percent={goal.progress_percent}
                        tone={goal.status === 'completed' ? 'success' : 'primary'}
                        size="sm"
                        surface="light"
                      />
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

                    <CardCta label="Aportar y gestionar" />
                  </div>
                </Card>
              </LinkCard>
          ))}
        </div>
      )}

      <SavingGoalFormModal open={formOpen} onClose={() => setFormOpen(false)} />
      {dialog?.kind === 'edit' && <EditSavingGoalModal goal={dialog.goal} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'delete' && <DeleteSavingGoalModal goal={dialog.goal} onClose={() => setDialog(null)} />}
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

