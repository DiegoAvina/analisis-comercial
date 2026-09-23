import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { AmountInput } from '../components/AmountInput';
import { Modal } from '../components/Modal';
import { LoadingView } from '../components/LoadingView';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { type BillFilter, createBill, deleteBill, fetchBills, markBillPaid } from '../api/bills';
import { getApiErrorMessage } from '../api/client';
import { isValidAmount, parseAmount } from '../utils/amount';
import { money } from '../utils/format';
import type { Bill } from '../api/types';

const FILTERS: { value: BillFilter; label: string }[] = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'overdue', label: 'Vencidos' },
  { value: 'paid', label: 'Pagados' },
  { value: 'all', label: 'Todos' },
];

function badgeTone(bill: Bill): 'success' | 'danger' | 'warning' | 'neutral' {
  if (bill.is_paid) return 'success';
  if (bill.is_overdue) return 'danger';
  if (bill.days_until_due != null && bill.days_until_due <= 2) return 'warning';
  return 'neutral';
}

export function BillsPage() {
  const [filter, setFilter] = useState<BillFilter>('pending');
  const [formOpen, setFormOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['bills', filter],
    queryFn: () => fetchBills(filter),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['bills'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const payMutation = useMutation({ mutationFn: markBillPaid, onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: deleteBill, onSuccess: invalidate });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Recibos</div>
          <div className="page-subtitle">Tus pagos y facturas</div>
        </div>
        <Button label="+ Nuevo recibo" onClick={() => setFormOpen(true)} />
      </div>

      <div className="chip-row">
        {FILTERS.map((f) => (
          <button key={f.value} className={`chip${filter === f.value ? ' active' : ''}`} onClick={() => setFilter(f.value)}>
            {f.label}
          </button>
        ))}
      </div>

      {isError && <ErrorBanner message={getApiErrorMessage(error, 'No se pudieron cargar los recibos.')} />}

      {isLoading ? (
        <LoadingView />
      ) : !data || data.length === 0 ? (
        <Card>
          <EmptyState icon="🧾" title="No hay recibos en esta categoría" />
        </Card>
      ) : (
        <Card style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Proveedor</th>
                <th>Vence</th>
                <th>Estado</th>
                <th>Monto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((bill) => (
                <tr key={bill.id}>
                  <td style={{ fontWeight: 600 }}>{bill.name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{bill.provider ?? '—'}</td>
                  <td>{bill.due_date}</td>
                  <td>
                    <Badge label={bill.status_text ?? bill.status} tone={badgeTone(bill)} />
                  </td>
                  <td style={{ fontWeight: 600 }}>{money(bill.amount)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      {!bill.is_paid && (
                        <Button
                          label="Pagar"
                          size="sm"
                          variant="secondary"
                          tooltip="Marca este recibo como pagado"
                          onClick={() => payMutation.mutate(bill.id)}
                        />
                      )}
                      <Button
                        label="Eliminar"
                        size="sm"
                        variant="danger"
                        tooltip="Elimina este recibo permanentemente"
                        onClick={() => deleteMutation.mutate(bill.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <BillFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}

function BillFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      createBill({
        name: name.trim(),
        provider: provider.trim() || undefined,
        amount: parseAmount(amount),
        due_date: dueDate.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setName('');
      setProvider('');
      setAmount('');
      setDueDate('');
      onClose();
    },
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo crear el recibo.')),
  });

  return (
    <Modal open={open} title="Nuevo recibo" onClose={onClose}>
      {!!error && <ErrorBanner message={error} />}
      <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} placeholder="Luz, agua, internet..." />
      <Input label="Proveedor (opcional)" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="CFE, Telmex..." />
      <AmountInput value={amount} onChange={setAmount} />
      <Input label="Fecha de vencimiento" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      <div style={{ height: 8 }} />
      <Button
        label="Guardar recibo"
        onClick={() => {
          setError(null);
          mutation.mutate();
        }}
        loading={mutation.isPending}
        disabled={!name || !isValidAmount(amount) || !dueDate}
      />
    </Modal>
  );
}
