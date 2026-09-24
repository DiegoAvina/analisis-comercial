import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from './Modal';
import { Input } from './Input';
import { AmountInput } from './AmountInput';
import { Button } from './Button';
import { ErrorBanner } from './ErrorBanner';
import { createExpense } from '../api/expenses';
import { getApiErrorMessage } from '../api/client';
import { isValidAmount, parseAmount } from '../utils/amount';

const EXPENSE_TYPES = [
  { value: 'food', label: 'Comida', icon: '🍔' },
  { value: 'transport', label: 'Transporte', icon: '🚌' },
  { value: 'purchase', label: 'Compra', icon: '🛍️' },
  { value: 'other', label: 'Otro', icon: '📦' },
];

function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function ExpenseFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('food');
  const [date, setDate] = useState(todayIso);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      createExpense({
        amount: parseAmount(amount),
        type,
        date: date || undefined,
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      setAmount('');
      setType('food');
      setDate(todayIso());
      setDescription('');
      onClose();
    },
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo registrar el gasto.')),
  });

  return (
    <Modal open={open} title="Agregar gasto" onClose={onClose}>
      {!!error && <ErrorBanner message={error} />}
      <AmountInput value={amount} onChange={setAmount} autoFocus />
      <div className="field">
        <label>Categoría</label>
        <div className="chip-row" style={{ marginBottom: 0 }}>
          {EXPENSE_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`chip${type === t.value ? ' active' : ''}`}
              onClick={() => setType(t.value)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>
      <Input label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <Input
        label="Descripción (opcional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Tacos, gasolina, súper..."
        maxLength={255}
      />
      <div style={{ height: 8 }} />
      <Button
        label="Guardar gasto"
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
