import { api } from './client';
import type { Expense } from './types';

export interface ExpensesResponse {
  scope: 'week' | 'month' | 'range';
  start: string;
  end: string;
  expenses: Expense[];
}

export function fetchExpenses(scope: 'week' | 'month' = 'week') {
  return api.get<ExpensesResponse>('/expenses', { params: { scope } }).then((r) => r.data);
}

export function fetchExpensesRange(startDate: string, endDate: string) {
  return api
    .get<ExpensesResponse>('/expenses', { params: { start_date: startDate, end_date: endDate } })
    .then((r) => r.data);
}

export interface ExpenseInput {
  amount: number;
  type: string;
  date?: string;
  description?: string;
}

export function createExpense(data: ExpenseInput) {
  return api.post('/expenses', data).then((r) => r.data);
}

export function deleteExpense(id: number) {
  return api.delete(`/expenses/${id}`);
}
