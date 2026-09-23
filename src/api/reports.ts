import { api } from './client';
import type { MonthlySummaryResponse } from './types';

export function fetchMonthlySummary(months = 6) {
  return api.get<MonthlySummaryResponse>('/reports/monthly-summary', { params: { months } }).then((r) => r.data);
}
