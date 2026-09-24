import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { AmountInput } from '../components/AmountInput';
import { Modal } from '../components/Modal';
import { NeonProgressBar } from '../components/NeonProgressBar';
import { CardCta, LinkCard } from '../components/detail/DetailParts';
import { LoadingView } from '../components/LoadingView';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { createTanda, fetchTandas } from '../api/tandas';
import { getApiErrorMessage } from '../api/client';
import { isValidAmount, parseAmount } from '../utils/amount';
import { dayLabel, money } from '../utils/format';
import type { Tanda } from '../api/types';

const FREQUENCY_LABELS: Record<Tanda['frequency'], string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
};

export function TandasPage() {
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading, isError, error } = useQuery({ queryKey: ['tandas'], queryFn: fetchTandas });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Tandas</div>
          <div className="page-subtitle">Tus rondas de ahorro colectivo</div>
        </div>
        <Button label="+ Nueva tanda" onClick={() => setFormOpen(true)} />
      </div>

      {isError && <ErrorBanner message={getApiErrorMessage(error, 'No se pudieron cargar tus tandas.')} />}

      {isLoading ? (
        <LoadingView />
      ) : !data || data.length === 0 ? (
        <Card>
          <EmptyState icon="👥" title="Aún no tienes tandas" subtitle="Crea una para empezar a organizarte con tu grupo" />
        </Card>
      ) : (
        <div className="kpi-grid">
          {data.map((tanda, i) => (
            <LinkCard key={tanda.id} to={`/tandas/${tanda.id}`} label={`Abrir la tanda ${tanda.name}`} index={i}>
              <Card className="goal-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{tanda.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{FREQUENCY_LABELS[tanda.frequency]} · {tanda.num_members} integrantes</div>
                  </div>
                  <Badge
                    label={tanda.status === 'active' ? 'Activa' : tanda.status === 'completed' ? 'Completada' : 'Cancelada'}
                    tone={tanda.status === 'active' ? 'info' : tanda.status === 'completed' ? 'success' : 'danger'}
                  />
                </div>

                <NeonProgressBar
                  percent={tanda.progress_percent}
                  tone={tanda.status === 'completed' ? 'success' : tanda.status === 'cancelled' ? 'danger' : 'primary'}
                  size="sm"
                  surface="light"
                  label="Rondas completadas"
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)', margin: '8px 0' }}>
                  <span>Ronda {Math.min(tanda.current_round, tanda.num_members)} de {tanda.num_members}</span>
                  <span>{money(tanda.contribution_amount)} / aportación</span>
                </div>
                {tanda.next_payment_date && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, textTransform: 'capitalize' }}>
                    Próximo pago: {dayLabel(tanda.next_payment_date)}
                  </div>
                )}

                <CardCta label="Pagos y turnos" />
              </Card>
            </LinkCard>
          ))}
        </div>
      )}

      <TandaFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}

function TandaFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [numMembers, setNumMembers] = useState('');
  const [frequency, setFrequency] = useState<Tanda['frequency']>('monthly');
  const [startDate, setStartDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      createTanda({
        name: name.trim(),
        contribution_amount: parseAmount(amount),
        num_members: Number(numMembers),
        frequency,
        start_date: startDate.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tandas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setName('');
      setAmount('');
      setNumMembers('');
      setStartDate('');
      onClose();
    },
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo crear la tanda.')),
  });

  return (
    <Modal open={open} title="Nueva tanda" onClose={onClose}>
      {!!error && <ErrorBanner message={error} />}
      <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tanda familiar..." />
      <AmountInput label="Aportación por integrante" value={amount} onChange={setAmount} />
      <Input
        label="Número de integrantes"
        type="number"
        min={2}
        value={numMembers}
        onChange={(e) => setNumMembers(e.target.value)}
      />
      <Select label="Frecuencia" value={frequency} onChange={(e) => setFrequency(e.target.value as Tanda['frequency'])}>
        <option value="weekly">Semanal</option>
        <option value="biweekly">Quincenal</option>
        <option value="monthly">Mensual</option>
      </Select>
      <Input label="Fecha de inicio" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      <div style={{ height: 8 }} />
      <Button
        label="Crear tanda"
        onClick={() => {
          setError(null);
          mutation.mutate();
        }}
        loading={mutation.isPending}
        disabled={!name || !isValidAmount(amount) || !numMembers || !startDate}
      />
    </Modal>
  );
}
