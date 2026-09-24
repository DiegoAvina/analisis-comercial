import { api } from './client';
import type {
  DistributionPreview,
  IncomeDistributionRule,
  IncomeFrequency,
  IncomeOccurrence,
  IncomeOccurrenceStatus,
  IncomeSource,
  IncomeType,
} from './types';

export function fetchIncomeSources() {
  return api.get<IncomeSource[]>('/income-sources').then((r) => r.data);
}

export function fetchIncomeSource(id: number) {
  return api.get<IncomeSource>(`/income-sources/${id}`).then((r) => r.data);
}

export interface IncomeSourceInput {
  name: string;
  type: IncomeType;
  default_amount?: number;
  estimated_min_amount?: number;
  estimated_max_amount?: number;
  frequency?: IncomeFrequency;
  is_recurring?: boolean;
  start_date?: string;
  notes?: string;
}

export function createIncomeSource(data: IncomeSourceInput) {
  return api.post<IncomeSource>('/income-sources', data).then((r) => r.data);
}

export function deleteIncomeSource(id: number) {
  return api.delete(`/income-sources/${id}`);
}

export function fetchIncomeOccurrences(params?: { status?: IncomeOccurrenceStatus; month?: string }) {
  return api.get<IncomeOccurrence[]>('/income-occurrences', { params }).then((r) => r.data);
}

export function createIncomeOccurrence(
  sourceId: number,
  data: { expected_amount: number; expected_date: string; notes?: string },
) {
  return api.post<IncomeOccurrence>(`/income-sources/${sourceId}/occurrences`, data).then((r) => r.data);
}

export function receiveIncomeOccurrence(id: number, data?: { amount?: number; date?: string }) {
  return api.post<IncomeOccurrence>(`/income-occurrences/${id}/receive`, data ?? {}).then((r) => r.data);
}

export function missIncomeOccurrence(id: number) {
  return api.post<IncomeOccurrence>(`/income-occurrences/${id}/miss`).then((r) => r.data);
}

export function cancelIncomeOccurrence(id: number) {
  return api.post<IncomeOccurrence>(`/income-occurrences/${id}/cancel`).then((r) => r.data);
}

export function fetchDistributionPreview(occurrenceId: number) {
  return api.get<DistributionPreview>(`/income-occurrences/${occurrenceId}/distribution-preview`).then((r) => r.data);
}

export interface DistributionAllocationInput {
  target_type: 'saving_goal' | 'tanda' | 'bill' | 'free';
  target_id?: number | null;
  amount: number;
}

export function distributeIncomeOccurrence(occurrenceId: number, allocations: DistributionAllocationInput[]) {
  return api
    .post<IncomeOccurrence>(`/income-occurrences/${occurrenceId}/distribute`, { allocations })
    .then((r) => r.data);
}

export function fetchDistributionRules(sourceId: number) {
  return api.get<IncomeDistributionRule[]>(`/income-sources/${sourceId}/distribution-rules`).then((r) => r.data);
}

export interface DistributionRuleInput {
  target_type: 'saving_goal' | 'tanda' | 'bill' | 'free';
  target_id?: number | null;
  mode: 'percent' | 'fixed';
  value: number;
  order?: number;
}

export function createDistributionRule(sourceId: number, data: DistributionRuleInput) {
  return api.post<IncomeDistributionRule>(`/income-sources/${sourceId}/distribution-rules`, data).then((r) => r.data);
}

export function deleteDistributionRule(ruleId: number) {
  return api.delete(`/income-distribution-rules/${ruleId}`);
}
