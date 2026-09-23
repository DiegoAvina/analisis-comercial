import { api } from './client';
import type { Bill } from './types';

export type BillFilter = 'pending' | 'paid' | 'overdue' | 'all';

export function fetchBills(status: BillFilter = 'pending') {
  return api.get<Bill[]>('/bills', { params: { status } }).then((r) => r.data);
}

export interface BillInput {
  name: string;
  provider?: string;
  description?: string;
  amount: number;
  due_date: string;
  category?: string;
  auto_debit?: boolean;
}

export function createBill(data: BillInput) {
  return api.post<Bill>('/bills', data).then((r) => r.data);
}

export function markBillPaid(id: number) {
  return api.put<Bill>(`/bills/${id}`, { status: 'paid' }).then((r) => r.data);
}

export function deleteBill(id: number) {
  return api.delete(`/bills/${id}`);
}
