import { api } from './client';
import type { SavingGoal } from './types';

export function fetchSavingGoals() {
  return api.get<SavingGoal[]>('/saving-goals').then((r) => r.data);
}

export interface SavingGoalInput {
  name: string;
  description?: string;
  target_amount: number;
  current_amount?: number;
  deadline?: string;
  category?: string;
  is_group?: boolean;
}

export function createSavingGoal(data: SavingGoalInput) {
  return api.post<SavingGoal>('/saving-goals', data).then((r) => r.data);
}

export function contributeSavingGoal(id: number, amount: number) {
  return api
    .post<{ ok: boolean; goal: SavingGoal }>(`/saving-goals/${id}/contribute`, { amount })
    .then((r) => r.data);
}

export function addSavingGoalMember(id: number, email: string, expectedContribution?: number) {
  return api
    .post<{ ok: boolean; goal: SavingGoal }>(`/saving-goals/${id}/members`, {
      email,
      expected_contribution: expectedContribution,
    })
    .then((r) => r.data);
}
