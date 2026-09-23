import { api } from './client';
import type { CalendarResponse } from './types';

export function fetchCalendar(startDate: string, endDate: string) {
  return api
    .get<CalendarResponse>('/calendar', { params: { start_date: startDate, end_date: endDate } })
    .then((r) => r.data);
}
