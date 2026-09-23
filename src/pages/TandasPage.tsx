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
import { addTandaMember, createTanda, fetchTandas, registerTandaPayment } from '../api/tandas';
import { getApiErrorMessage } from '../api/client';
import { isValidAmount, parseAmount } from '../utils/amount';
import { money } from '../utils/format';
import type { Tanda } from '../api/types';

const FREQUENCY_LABELS: Record<Tanda['frequency'], string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
};

export function TandasPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [activeTanda, setActiveTanda] = useState<Tanda | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({ queryKey: ['tandas'], queryFn: fetchTandas });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['tandas'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

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
          {data.map((tanda) => (
            <Card key={tanda.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{tanda.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{FREQUENCY_LABELS[tanda.frequency]} · {tanda.num_members} integrantes</div>
                </div>
                <Badge
                  label={tanda.status === 'active' ? 'Activa' : tanda.status === 'completed' ? 'Completada' : 'Cancelada'}
                  tone={tanda.status === 'active' ? 'info' : tanda.status === 'completed' ? 'success' : 'danger'}
                />
              </div>

              <ProgressBar percent={tanda.progress_percent} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)', margin: '6px 0 8px' }}>
                <span>Ronda {tanda.current_round} de {tanda.num_members}</span>
                <span>{money(tanda.contribution_amount)} / aportación</span>
              </div>
              {tanda.next_payment_date && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Próximo pago: {tanda.next_payment_date}</div>
              )}

              <Button
                label="Gestionar"
                variant="secondary"
                size="sm"
                tooltip="Registra pagos o invita integrantes a esta tanda"
                onClick={() => setActiveTanda(tanda)}
              />
            </Card>
          ))}
        </div>
      )}

      <TandaFormModal open={formOpen} onClose={() => setFormOpen(false)} />
      {activeTanda && <TandaDetailModal tanda={activeTanda} onClose={() => setActiveTanda(null)} onChanged={invalidate} />}
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
      <div className="field">
        <label>Frecuencia</label>
        <select className="input" value={frequency} onChange={(e) => setFrequency(e.target.value as Tanda['frequency'])}>
          <option value="weekly">Semanal</option>
          <option value="biweekly">Quincenal</option>
          <option value="monthly">Mensual</option>
        </select>
      </div>
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

function TandaDetailModal({ tanda, onClose, onChanged }: { tanda: Tanda; onClose: () => void; onChanged: () => void }) {
  const [memberEmail, setMemberEmail] = useState('');
  const [turnOrder, setTurnOrder] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const memberMutation = useMutation({
    mutationFn: () => addTandaMember(tanda.id, memberEmail.trim(), Number(turnOrder)),
    onSuccess: () => {
      onChanged();
      setMemberEmail('');
      setTurnOrder('');
    },
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo agregar al integrante.')),
  });

  const paymentMutation = useMutation({
    mutationFn: () => registerTandaPayment(tanda.id, parseAmount(paymentAmount)),
    onSuccess: () => {
      onChanged();
      setPaymentAmount('');
      onClose();
    },
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo registrar el pago.')),
  });

  return (
    <Modal open title={tanda.name} onClose={onClose}>
      {!!error && <ErrorBanner message={error} />}

      {tanda.members && tanda.members.length > 0 && (
        <>
          <div className="section-title">Integrantes</div>
          <Card style={{ marginBottom: 16 }}>
            {tanda.members.map((m) => (
              <div key={m.id} className="list-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                <span>{m.name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  Turno {m.pivot?.turn_order} {m.pivot?.has_received ? '· recibió' : ''}
                </span>
              </div>
            ))}
          </Card>
        </>
      )}

      <div className="section-title">Registrar pago</div>
      <AmountInput value={paymentAmount} onChange={setPaymentAmount} />
      <Button
        label="Registrar pago"
        onClick={() => {
          setError(null);
          paymentMutation.mutate();
        }}
        loading={paymentMutation.isPending}
        disabled={!isValidAmount(paymentAmount)}
      />

      <div className="section-title" style={{ marginTop: 20 }}>Agregar integrante</div>
      <Input label="Correo" type="email" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} placeholder="correo@ejemplo.com" />
      <Input label="Turno" type="number" min={1} value={turnOrder} onChange={(e) => setTurnOrder(e.target.value)} />
      <Button
        label="Invitar"
        variant="secondary"
        onClick={() => {
          setError(null);
          memberMutation.mutate();
        }}
        loading={memberMutation.isPending}
        disabled={!memberEmail || !turnOrder}
      />
    </Modal>
  );
}
