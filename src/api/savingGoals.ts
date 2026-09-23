import { api } from './client';
import type { SavingGoal, SavingGoalMovement } from './types';

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

export function contributeSavingGoal(id: number, amount: number, description?: string) {
  return api
    .post<{ ok: boolean; goal: SavingGoal }>(`/saving-goals/${id}/contribute`, { amount, description })
    .then((r) => r.data);
}

export function withdrawSavingGoal(id: number, amount: number, description?: string) {
  return api
    .post<{ ok: boolean; goal: SavingGoal }>(`/saving-goals/${id}/withdraw`, { amount, description })
    .then((r) => r.data);
}

export function fetchSavingGoalMovements(id: number) {
  return api.get<SavingGoalMovement[]>(`/saving-goals/${id}/movements`).then((r) => r.data);
}

export function addSavingGoalMember(id: number, email: string, expectedContribution?: number) {
  return api
    .post<{ ok: boolean; goal: SavingGoal }>(`/saving-goals/${id}/members`, {
      email,
      expected_contribution: expectedContribution,
    })
    .then((r) => r.data);
}

export function uploadSavingGoalImage(id: number, file: File) {
  const form = new FormData();
  form.append('image', file);

  return api
    .post<{ ok: boolean; goal: SavingGoal }>(`/saving-goals/${id}/image`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
}
