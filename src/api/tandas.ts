import { api } from './client';
import type { Tanda } from './types';

export function fetchTandas() {
  return api.get<Tanda[]>('/tandas').then((r) => r.data);
}

export interface TandaInput {
  name: string;
  description?: string;
  contribution_amount: number;
  num_members: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  start_date: string;
}

export function createTanda(data: TandaInput) {
  return api.post<Tanda>('/tandas', data).then((r) => r.data);
}

export function addTandaMember(id: number, email: string, turnOrder: number) {
  return api
    .post<{ ok: boolean; tanda: Tanda }>(`/tandas/${id}/members`, { email, turn_order: turnOrder })
    .then((r) => r.data);
}

export function registerTandaPayment(id: number, amount: number, notes?: string) {
  return api
    .post<{ ok: boolean; tanda: Tanda }>(`/tandas/${id}/payments`, { amount, notes })
    .then((r) => r.data);
}
