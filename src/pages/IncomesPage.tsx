import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
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
import { isValidAmount, parseAmount } from '../utils/amount';
import { money } from '../utils/format';
import type { IncomeFrequency, IncomeOccurrence, IncomeOccurrenceStatus, IncomeSource, IncomeType } from '../api/types';

const FREQUENCY_LABELS: Record<Exclude<IncomeFrequency, 'irregular'>, string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  yearly: 'Anual',
};

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
  const navigate = useNavigate();
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
                  className="list-row clickable-row"
                  role="link"
                  tabIndex={0}
                  aria-label={`Abrir la fuente ${source.name}`}
                  onClick={() => navigate(`/ingresos/fuentes/${source.id}`)}
                  onKeyDown={(e) => {
                    if (e.target === e.currentTarget && e.key === 'Enter') navigate(`/ingresos/fuentes/${source.id}`);
                  }}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--border)' }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {source.name} <span className="row-arrow" aria-hidden="true">→</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {TYPE_LABELS[source.type]}
                      {source.default_amount ? ` · ${money(source.default_amount)}` : ''}
                    </div>
                  </div>
                  <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <Button
                      label="Eliminar"
                      size="sm"
                      variant="danger"
                      tooltip="Elimina esta fuente de ingreso y sus ocurrencias futuras"
                      onClick={() => deleteSourceMutation.mutate(source.id)}
                    />
                  </span>
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
  const [startDate, setStartDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(true);
  const [frequency, setFrequency] = useState<Exclude<IncomeFrequency, 'irregular'>>('biweekly');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const hasAmount = isValidAmount(defaultAmount, 0.01);

  const mutation = useMutation({
    mutationFn: () =>
      createIncomeSource({
        name: name.trim(),
        type,
        default_amount: hasAmount ? parseAmount(defaultAmount) : undefined,
        start_date: startDate.trim() || undefined,
        is_recurring: isRecurring,
        frequency: isRecurring ? frequency : undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-sources'] });
      queryClient.invalidateQueries({ queryKey: ['income-occurrences'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setName('');
      setDefaultAmount('');
      setStartDate('');
      setNotes('');
      onClose();
    },
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo crear la fuente de ingreso.')),
  });

  return (
    <Modal open={open} title="Nueva fuente de ingreso" onClose={onClose} maxWidth={620}>
      {!!error && <ErrorBanner message={error} />}

      <div className="form-row">
        <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sueldo, freelance..." />
        <Select label="Tipo" value={type} onChange={(e) => setType(e.target.value as IncomeType)}>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div className="form-row">
        <AmountInput label="Monto habitual (opcional si es variable)" value={defaultAmount} onChange={setDefaultAmount} />
        <Input
          label="Fecha esperada (opcional)"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>

      <div className="field">
        <label>¿Se repite?</label>
        <div className="chip-row" style={{ marginBottom: 0 }}>
          <button type="button" className={`chip${isRecurring ? ' active' : ''}`} onClick={() => setIsRecurring(true)}>
            Sí, es recurrente
          </button>
          <button type="button" className={`chip${!isRecurring ? ' active' : ''}`} onClick={() => setIsRecurring(false)}>
            No, es único
          </button>
        </div>
      </div>

      {isRecurring && (
        <div className="field">
          <label>Frecuencia</label>
          <div className="chip-row" style={{ marginBottom: 0 }}>
            {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`chip${frequency === value ? ' active' : ''}`}
                onClick={() => setFrequency(value as Exclude<IncomeFrequency, 'irregular'>)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <Input label="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

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
