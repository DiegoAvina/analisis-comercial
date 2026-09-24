import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from './Badge';
import { Button } from './Button';
import { AmountInput } from './AmountInput';
import { EmptyState } from './EmptyState';
import { ErrorBanner } from './ErrorBanner';
import { LoadingView } from './LoadingView';
import { NeonProgressBar } from './NeonProgressBar';
import { createDistributionRule, deleteDistributionRule, fetchDistributionRules } from '../api/incomes';
import { fetchSavingGoals } from '../api/savingGoals';
import { fetchTandas } from '../api/tandas';
import { fetchBills } from '../api/bills';
import { getApiErrorMessage } from '../api/client';
import { isValidAmount, parseAmount } from '../utils/amount';
import { money } from '../utils/format';
import type { DistributionTargetType, IncomeSource } from '../api/types';

type Tone = 'success' | 'info' | 'warning' | 'neutral';

// Mismos emojis que usa cada sección en su propia vista, para que una regla
// se reconozca de un vistazo sin tener que leer la etiqueta.
const TARGET_TYPES: { value: DistributionTargetType; label: string; plural: string; icon: string; tone: Tone }[] = [
  { value: 'saving_goal', label: 'Meta de ahorro', plural: 'metas de ahorro', icon: '🎯', tone: 'success' },
  { value: 'tanda', label: 'Tanda', plural: 'tandas', icon: '👥', tone: 'info' },
  { value: 'bill', label: 'Recibo', plural: 'recibos pendientes', icon: '🧾', tone: 'warning' },
  { value: 'free', label: 'Disponible / libre', plural: '', icon: '👛', tone: 'neutral' },
];

const TONE_BG: Record<Tone, string> = {
  success: 'var(--success-soft)',
  info: 'var(--info-soft)',
  warning: 'var(--warning-soft)',
  neutral: 'var(--surface-alt)',
};

/**
 * Reglas de distribución de una fuente de ingreso: cada vez que se recibe,
 * el ingreso se reparte entre metas, tandas y recibos según estas reglas.
 */
export function DistributionRulesPanel({ source, onChanged }: { source: IncomeSource; onChanged?: (text: string) => void }) {
  const [targetType, setTargetType] = useState<DistributionTargetType>('saving_goal');
  const [targetId, setTargetId] = useState<number | null>(null);
  const [mode, setMode] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const rulesQuery = useQuery({
    queryKey: ['distribution-rules', source.id],
    queryFn: () => fetchDistributionRules(source.id),
  });

  // Se cargan las tres listas sin importar el tipo seleccionado: las reglas
  // existentes pueden ser de cualquier tipo y hay que mostrar el nombre real
  // de su destino (no solo "Meta de ahorro") para distinguir dos metas.
  const goalsQuery = useQuery({ queryKey: ['saving-goals'], queryFn: fetchSavingGoals });
  const tandasQuery = useQuery({ queryKey: ['tandas'], queryFn: fetchTandas });
  const billsQuery = useQuery({ queryKey: ['bills', 'pending'], queryFn: () => fetchBills('pending') });

  const targetsByType: Record<Exclude<DistributionTargetType, 'free'>, { id: number; label: string }[]> = {
    saving_goal: (goalsQuery.data ?? []).map((g) => ({ id: g.id, label: g.name })),
    tanda: (tandasQuery.data ?? []).map((t) => ({ id: t.id, label: t.name })),
    bill: (billsQuery.data ?? []).map((b) => ({ id: b.id, label: b.name })),
  };
  const targets = targetType === 'free' ? [] : targetsByType[targetType];
  const typeMeta = TARGET_TYPES.find((t) => t.value === targetType)!;

  function targetLabel(type: DistributionTargetType, id: number | null): string | null {
    if (type === 'free' || id == null) return null;
    return targetsByType[type].find((t) => t.id === id)?.label ?? null;
  }

  const rules = rulesQuery.data ?? [];
  const percentAllocated = rules.filter((r) => r.mode === 'percent').reduce((sum, r) => sum + Number(r.value), 0);
  const fixedAllocated = rules.filter((r) => r.mode === 'fixed').reduce((sum, r) => sum + Number(r.value), 0);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['distribution-rules', source.id] });
    queryClient.invalidateQueries({ queryKey: ['income-source', source.id] });
    queryClient.invalidateQueries({ queryKey: ['income-sources'] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createDistributionRule(source.id, {
        target_type: targetType,
        target_id: targetType === 'free' ? undefined : (targetId ?? undefined),
        mode,
        value: parseAmount(value),
      }),
    onSuccess: () => {
      invalidate();
      setTargetId(null);
      setValue('');
      onChanged?.('Regla agregada');
    },
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo crear la regla.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (ruleId: number) => deleteDistributionRule(ruleId),
    onSuccess: () => {
      invalidate();
      onChanged?.('Regla eliminada');
    },
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo eliminar la regla.')),
  });

  const valueValid = isValidAmount(value, 0.01);
  const overPercent = mode === 'percent' && valueValid && percentAllocated + parseAmount(value) > 100.001;
  const canSubmit = valueValid && (targetType === 'free' || targetId != null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || createMutation.isPending) return;
    setError(null);
    createMutation.mutate();
  };

  return (
    <div>
      <div className="detail-action-hint">
        Cada vez que recibas este ingreso, se repartirá automáticamente entre tus metas, tandas y recibos según estas
        reglas.
      </div>

      {!!error && <ErrorBanner message={error} />}

      {rulesQuery.isLoading ? (
        <LoadingView />
      ) : rules.length === 0 ? (
        <EmptyState icon="🔀" title="Sin reglas todavía" subtitle="Agrega una abajo para repartir este ingreso automáticamente" />
      ) : (
        <>
          {percentAllocated > 0 && (
            <div className="rules-allocated">
              <div className="rules-allocated-head">
                <span>Asignado por porcentaje</span>
                <strong style={{ color: percentAllocated > 100 ? 'var(--danger)' : undefined }}>
                  {Math.round(percentAllocated)}%
                </strong>
              </div>
              <NeonProgressBar
                percent={percentAllocated}
                tone={percentAllocated > 100 ? 'danger' : 'primary'}
                size="sm"
                surface="light"
                label="Porcentaje del ingreso asignado"
              />
              {percentAllocated > 100 && (
                <div className="rules-allocated-warning">Tus reglas suman más del 100% del ingreso.</div>
              )}
            </div>
          )}
          {fixedAllocated > 0 && (
            <div className="detail-action-hint">Montos fijos por pago: {money(fixedAllocated)}</div>
          )}

          <div className="detail-members-list">
            {rules.map((rule) => {
              const meta = TARGET_TYPES.find((t) => t.value === rule.target_type);
              const label = targetLabel(rule.target_type, rule.target_id);
              const deleting = deleteMutation.isPending && deleteMutation.variables === rule.id;
              return (
                <div key={rule.id} className="detail-member-row">
                  <div className="goal-movement-icon" style={{ background: TONE_BG[meta?.tone ?? 'neutral'] }}>
                    {meta?.icon ?? '•'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="goal-movement-label">{label ?? meta?.label ?? rule.target_type}</div>
                    {!!label && <div className="goal-movement-date" style={{ textTransform: 'none' }}>{meta?.label}</div>}
                  </div>
                  <Badge label={rule.mode === 'percent' ? `${Number(rule.value)}%` : money(rule.value)} tone={meta?.tone} />
                  <button
                    type="button"
                    className="rule-delete tooltip"
                    data-tooltip="Eliminar regla"
                    aria-label="Eliminar regla"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      setError(null);
                      deleteMutation.mutate(rule.id);
                    }}
                  >
                    {deleting ? <span className="btn-spinner" aria-hidden="true" /> : '🗑️'}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      <form onSubmit={submit} className="rules-form">
        <div className="section-title" style={{ marginTop: 0, fontSize: 15 }}>Agregar regla</div>

        <div className="field">
          <label>1. ¿A dónde va?</label>
          <div className="chip-row" style={{ marginBottom: 0 }}>
            {TARGET_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                className={`chip${targetType === t.value ? ' active' : ''}`}
                onClick={() => {
                  setTargetType(t.value);
                  setTargetId(null);
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {targetType !== 'free' && (
          <div className="field">
            <label>¿Cuál?</label>
            {targets.length === 0 ? (
              <div className="detail-action-hint" style={{ margin: 0 }}>
                No tienes {typeMeta.plural} todavía.
              </div>
            ) : (
              <div className="chip-row" style={{ marginBottom: 0 }}>
                {targets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`chip${targetId === t.id ? ' active' : ''}`}
                    onClick={() => setTargetId(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="field">
          <label>2. ¿Cuánto?</label>
          <div className="chip-row" style={{ marginBottom: 0 }}>
            <button type="button" className={`chip${mode === 'percent' ? ' active' : ''}`} onClick={() => setMode('percent')}>
              ％ Porcentaje
            </button>
            <button type="button" className={`chip${mode === 'fixed' ? ' active' : ''}`} onClick={() => setMode('fixed')}>
              💵 Monto fijo
            </button>
          </div>
        </div>

        <AmountInput
          label={mode === 'percent' ? 'Porcentaje (%)' : 'Monto fijo'}
          value={value}
          onChange={setValue}
          placeholder={mode === 'percent' ? '10' : '0.00'}
        />

        {valueValid && (
          <div className={`detail-preview${overPercent ? ' is-loss' : ''}`}>
            {overPercent ? (
              <>⚠️ Con esta regla asignarías {Math.round(percentAllocated + parseAmount(value))}% del ingreso</>
            ) : mode === 'percent' ? (
              <>
                Se apartará el <strong>{parseAmount(value)}%</strong> de cada pago de “{source.name}”
                {source.default_amount ? <> (≈ {money((source.default_amount * parseAmount(value)) / 100)})</> : null}
              </>
            ) : (
              <>
                Se apartarán <strong>{money(parseAmount(value))}</strong> de cada pago de “{source.name}”
              </>
            )}
          </div>
        )}

        <Button type="submit" label="Agregar regla" loading={createMutation.isPending} disabled={!canSubmit} />
      </form>
    </div>
  );
}
