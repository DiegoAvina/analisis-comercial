import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from './Modal';
import { Input } from './Input';
import { AmountInput } from './AmountInput';
import { Button } from './Button';
import { ErrorBanner } from './ErrorBanner';
import { deleteSavingGoal, updateSavingGoal } from '../api/savingGoals';
import { getApiErrorMessage } from '../api/client';
import { isValidAmount, parseAmount } from '../utils/amount';
import { money } from '../utils/format';
import type { SavingGoal } from '../api/types';

/**
 * Edita nombre, objetivo, fecha límite y categoría de una meta. Se monta solo
 * mientras está abierto, así el formulario siempre arranca con los datos
 * actuales de la meta.
 */
export function EditSavingGoalModal({
  goal,
  onClose,
  onSaved,
}: {
  goal: SavingGoal;
  onClose: () => void;
  onSaved?: (goal: SavingGoal) => void;
}) {
  const [name, setName] = useState(goal.name);
  const [targetAmount, setTargetAmount] = useState(String(goal.target_amount));
  const [deadline, setDeadline] = useState(goal.deadline?.slice(0, 10) ?? '');
  const [category, setCategory] = useState(goal.category ?? '');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const target = parseAmount(targetAmount);
  const willComplete = isValidAmount(targetAmount) && goal.current_amount >= target;

  const mutation = useMutation({
    mutationFn: () =>
      updateSavingGoal(goal.id, {
        name: name.trim(),
        target_amount: target,
        deadline: deadline || null,
        category: category.trim() || undefined,
      }),
    onSuccess: (res) => {
      queryClient.setQueryData<SavingGoal[]>(['saving-goals'], (list) =>
        list?.map((g) => (g.id === res.goal.id ? { ...g, ...res.goal } : g)),
      );
      queryClient.invalidateQueries({ queryKey: ['saving-goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      onSaved?.(res.goal);
      onClose();
    },
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo guardar la meta.')),
  });

  return (
    <Modal open title="Editar meta" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || !isValidAmount(targetAmount) || mutation.isPending) return;
          setError(null);
          mutation.mutate();
        }}
      >
        {!!error && <ErrorBanner message={error} />}
        <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <AmountInput label="Monto objetivo" value={targetAmount} onChange={setTargetAmount} />
        {willComplete && goal.status !== 'completed' && (
          <div className="detail-preview">🎉 Con este objetivo la meta quedará completada ({money(goal.current_amount)} ahorrados)</div>
        )}
        <Input label="Fecha límite (opcional)" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        <Input label="Categoría (opcional)" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Viajes, tecnología..." />
        <div style={{ height: 8 }} />
        <Button type="submit" label="Guardar cambios" loading={mutation.isPending} disabled={!name.trim() || !isValidAmount(targetAmount)} />
      </form>
    </Modal>
  );
}

/** Confirmación para eliminar una meta; avisa si todavía tiene dinero ahorrado. */
export function DeleteSavingGoalModal({
  goal,
  onClose,
  onDeleted,
}: {
  goal: SavingGoal;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deleteSavingGoal(goal.id),
    onSuccess: () => {
      onDeleted?.();
      queryClient.setQueryData<SavingGoal[]>(['saving-goals'], (list) => list?.filter((g) => g.id !== goal.id));
      queryClient.removeQueries({ queryKey: ['saving-goal-movements', goal.id] });
      queryClient.invalidateQueries({ queryKey: ['saving-goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      onClose();
    },
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo eliminar la meta.')),
  });

  return (
    <Modal open title="Eliminar meta" onClose={onClose}>
      {!!error && <ErrorBanner message={error} />}
      <div className="delete-goal-body">
        <div className="delete-goal-icon" aria-hidden="true">🗑️</div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>¿Eliminar “{goal.name}”?</div>
        <div className="detail-action-hint" style={{ margin: 0 }}>
          Se borrarán la meta, su foto y todo su historial de movimientos. No se puede deshacer.
        </div>
        {goal.current_amount > 0 && (
          <div className="detail-preview is-loss" style={{ margin: 0 }}>
            ⚠️ Esta meta todavía tiene <strong>{money(goal.current_amount)}</strong> ahorrados. Retíralos antes si quieres conservar el registro.
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <div style={{ flex: 1, display: 'grid' }}>
          <Button label="Cancelar" variant="secondary" onClick={onClose} />
        </div>
        <div style={{ flex: 1, display: 'grid' }}>
          <Button
            label="Sí, eliminar"
            variant="danger"
            loading={mutation.isPending}
            onClick={() => {
              setError(null);
              mutation.mutate();
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
