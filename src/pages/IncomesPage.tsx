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
import {
  cancelIncomeOccurrence,
  createIncomeSource,
  deleteIncomeSource,
  fetchIncomeOccurrences,
  fetchIncomeSources,
  missIncomeOccurrence,
  receiveIncomeOccurrence,
} from '../api/incomes';
import { getApiErrorMessage } from '../api/client';
import { parseAmount } from '../utils/amount';
import { money } from '../utils/format';
import type { IncomeOccurrence, IncomeOccurrenceStatus, IncomeSource, IncomeType } from '../api/types';

const TYPE_LABELS: Record<IncomeType, string> = {
  salary: 'Sueldo',
  freelance: 'Freelance',
  business: 'Negocio',
  sale: 'Venta',
  investment: 'Inversión',
  bonus: 'Bono',
  gift: 'Regalo',
  refund: 'Reembolso',
  other: 'Otro',
};

const STATUS_LABELS: Record<IncomeOccurrenceStatus, string> = {
  expected: 'Esperado',
  received: 'Recibido',
  partial: 'Parcial',
  missed: 'No recibido',
  cancelled: 'Cancelado',
};

function statusTone(status: IncomeOccurrenceStatus): 'success' | 'danger' | 'warning' | 'info' | 'neutral' {
  switch (status) {
    case 'received':
      return 'success';
    case 'partial':
      return 'warning';
    case 'missed':
      return 'danger';
    case 'cancelled':
      return 'neutral';
    default:
      return 'info';
  }
}

const STATUS_FILTERS: { value: IncomeOccurrenceStatus | 'all'; label: string }[] = [
  { value: 'expected', label: 'Esperados' },
  { value: 'received', label: 'Recibidos' },
  { value: 'partial', label: 'Parciales' },
  { value: 'missed', label: 'No recibidos' },
  { value: 'all', label: 'Todos' },
];

export function IncomesPage() {
  const [statusFilter, setStatusFilter] = useState<IncomeOccurrenceStatus | 'all'>('expected');
  const [sourceFormOpen, setSourceFormOpen] = useState(false);
  const queryClient = useQueryClient();

  const sourcesQuery = useQuery({ queryKey: ['income-sources'], queryFn: fetchIncomeSources });
  const occurrencesQuery = useQuery({
    queryKey: ['income-occurrences', statusFilter],
    queryFn: () => fetchIncomeOccurrences(statusFilter === 'all' ? undefined : { status: statusFilter }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['income-occurrences'] });
    queryClient.invalidateQueries({ queryKey: ['income-sources'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const receiveMutation = useMutation({ mutationFn: (id: number) => receiveIncomeOccurrence(id), onSuccess: invalidate });
  const missMutation = useMutation({ mutationFn: missIncomeOccurrence, onSuccess: invalidate });
  const cancelMutation = useMutation({ mutationFn: cancelIncomeOccurrence, onSuccess: invalidate });
  const deleteSourceMutation = useMutation({ mutationFn: deleteIncomeSource, onSuccess: invalidate });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Ingresos</div>
          <div className="page-subtitle">Tus fuentes de ingreso y su calendario</div>
        </div>
        <Button label="+ Nueva fuente" onClick={() => setSourceFormOpen(true)} />
      </div>

      <div className="two-col" style={{ alignItems: 'start' }}>
        <div>
          <div className="section-title">Fuentes de ingreso</div>
          {sourcesQuery.isError && (
            <ErrorBanner message={getApiErrorMessage(sourcesQuery.error, 'No se pudieron cargar tus fuentes.')} />
          )}
          {sourcesQuery.isLoading ? (
            <LoadingView />
          ) : !sourcesQuery.data || sourcesQuery.data.length === 0 ? (
            <Card>
              <EmptyState icon="💼" title="Aún no tienes fuentes de ingreso" />
            </Card>
          ) : (
            <Card style={{ padding: 0 }}>
              {sourcesQuery.data.map((source: IncomeSource) => (
                <div
                  key={source.id}
                  className="list-row"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--border)' }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{source.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {TYPE_LABELS[source.type]}
                      {source.default_amount ? ` · ${money(source.default_amount)}` : ''}
                    </div>
                  </div>
                  <Button
                    label="Eliminar"
                    size="sm"
                    variant="danger"
                    tooltip="Elimina esta fuente de ingreso y sus ocurrencias futuras"
                    onClick={() => deleteSourceMutation.mutate(source.id)}
                  />
                </div>
              ))}
            </Card>
          )}
        </div>

        <div>
          <div className="section-title">Calendario de ingresos</div>
          <div className="chip-row">
            {STATUS_FILTERS.map((f) => (
              <button key={f.value} className={`chip${statusFilter === f.value ? ' active' : ''}`} onClick={() => setStatusFilter(f.value)}>
                {f.label}
              </button>
            ))}
          </div>

          {occurrencesQuery.isError && (
            <ErrorBanner message={getApiErrorMessage(occurrencesQuery.error, 'No se pudieron cargar tus ingresos.')} />
          )}

          {occurrencesQuery.isLoading ? (
            <LoadingView />
          ) : !occurrencesQuery.data || occurrencesQuery.data.length === 0 ? (
            <Card>
              <EmptyState icon="📭" title="No hay ingresos en esta categoría" />
            </Card>
          ) : (
            <Card style={{ padding: 0 }}>
              {occurrencesQuery.data.map((occ: IncomeOccurrence) => (
                <div key={occ.id} className="list-row" style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{occ.source?.name ?? 'Ingreso'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{occ.expected_date}</div>
                    </div>
                    <Badge label={STATUS_LABELS[occ.status]} tone={statusTone(occ.status)} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>{money(occ.expected_amount)}</span>
                    {occ.status === 'expected' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button
                          label="Recibido"
                          size="sm"
                          tooltip="Marca este ingreso como recibido"
                          onClick={() => receiveMutation.mutate(occ.id)}
                        />
                        <Button
                          label="No llegó"
                          size="sm"
                          variant="secondary"
                          tooltip="Marca que este ingreso no llegó en la fecha esperada"
                          onClick={() => missMutation.mutate(occ.id)}
                        />
                        <Button
                          label="Cancelar"
                          size="sm"
                          variant="danger"
                          tooltip="Cancela este ingreso esperado"
                          onClick={() => cancelMutation.mutate(occ.id)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>

      <IncomeSourceFormModal open={sourceFormOpen} onClose={() => setSourceFormOpen(false)} />
    </div>
  );
}

function IncomeSourceFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<IncomeType>('salary');
  const [defaultAmount, setDefaultAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      createIncomeSource({
        name: name.trim(),
        type,
        default_amount: defaultAmount ? parseAmount(defaultAmount) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-sources'] });
      setName('');
      setDefaultAmount('');
      onClose();
    },
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo crear la fuente de ingreso.')),
  });

  return (
    <Modal open={open} title="Nueva fuente de ingreso" onClose={onClose}>
      {!!error && <ErrorBanner message={error} />}
      <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sueldo, freelance..." />
      <div className="field">
        <label>Tipo</label>
        <select className="input" value={type} onChange={(e) => setType(e.target.value as IncomeType)}>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <AmountInput label="Monto habitual (opcional)" value={defaultAmount} onChange={setDefaultAmount} />
      <div style={{ height: 8 }} />
      <Button
        label="Crear fuente"
        onClick={() => {
          setError(null);
          mutation.mutate();
        }}
        loading={mutation.isPending}
        disabled={!name}
      />
    </Modal>
  );
}
