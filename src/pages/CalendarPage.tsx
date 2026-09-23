import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { LoadingView } from '../components/LoadingView';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { fetchCalendar } from '../api/calendar';
import { getApiErrorMessage } from '../api/client';
import { addMonths, endOfMonth, monthLabel, startOfMonth, toDateInputString } from '../utils/format';
import { money } from '../utils/format';
import type { CalendarEvent } from '../api/types';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const SOURCE_LABELS: Record<CalendarEvent['source'], string> = {
  bill: 'Recibo',
  tanda: 'Tanda',
  saving_goal: 'Meta',
  manual: 'Evento',
};

function sourceTone(source: CalendarEvent['source']): 'info' | 'warning' | 'success' | 'neutral' {
  switch (source) {
    case 'bill':
      return 'warning';
    case 'tanda':
      return 'info';
    case 'saving_goal':
      return 'success';
    default:
      return 'neutral';
  }
}

export function CalendarPage() {
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const rangeStart = toDateInputString(startOfMonth(monthAnchor));
  const rangeEnd = toDateInputString(endOfMonth(monthAnchor));

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['calendar', rangeStart, rangeEnd],
    queryFn: () => fetchCalendar(rangeStart, rangeEnd),
  });

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of data?.events ?? []) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
  }, [data]);

  const expenseByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of data?.daily_expenses ?? []) {
      map.set(entry.date, entry.total);
    }
    return map;
  }, [data]);

  const cells = useMemo(() => {
    const first = startOfMonth(monthAnchor);
    const last = endOfMonth(monthAnchor);
    const leading = (first.getDay() + 6) % 7; // Monday-first offset
    const days: (Date | null)[] = Array.from({ length: leading }, () => null);
    for (let d = 1; d <= last.getDate(); d++) {
      days.push(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), d));
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [monthAnchor]);

  const selectedEvents = selectedDate ? (eventsByDate.get(selectedDate) ?? []) : [];
  const todayString = toDateInputString(new Date());

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Calendario</div>
          <div className="page-subtitle">Recibos, tandas y metas del mes</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            label="←"
            variant="secondary"
            size="sm"
            icon
            tooltip="Mes anterior"
            onClick={() => setMonthAnchor((d) => addMonths(d, -1))}
          />
          <span style={{ fontWeight: 600, minWidth: 130, textAlign: 'center', textTransform: 'capitalize' }}>{monthLabel(monthAnchor)}</span>
          <Button
            label="→"
            variant="secondary"
            size="sm"
            icon
            tooltip="Mes siguiente"
            onClick={() => setMonthAnchor((d) => addMonths(d, 1))}
          />
        </div>
      </div>

      {isError && <ErrorBanner message={getApiErrorMessage(error, 'No se pudo cargar el calendario.')} />}

      {isLoading ? (
        <LoadingView />
      ) : (
        <div className="two-col" style={{ alignItems: 'start' }}>
          <Card>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 6 }}>
              {WEEKDAYS.map((w, i) => (
                <div key={i} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                  {w}
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
              {cells.map((date, i) => {
                if (!date) return <div key={i} />;
                const dateString = toDateInputString(date);
                const dayEvents = eventsByDate.get(dateString) ?? [];
                const spend = expenseByDate.get(dateString) ?? 0;
                const isToday = dateString === todayString;
                const isSelected = dateString === selectedDate;
                const dayTooltip = dayEvents.length > 0
                  ? `${dayEvents.length} evento${dayEvents.length > 1 ? 's' : ''} el día ${date.getDate()}`
                  : `Ver el día ${date.getDate()}`;
                return (
                  <button
                    key={i}
                    className="calendar-day tooltip"
                    data-tooltip={dayTooltip}
                    onClick={() => setSelectedDate(dateString)}
                    style={{
                      border: isSelected ? '2px solid var(--primary)' : isToday ? '2px solid var(--info)' : '1px solid var(--border)',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{date.getDate()}</div>
                    {dayEvents.length > 0 && (
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 4 }}>
                        {dayEvents.slice(0, 3).map((ev, idx) => (
                          <span
                            key={idx}
                            className="calendar-day-dot"
                            style={{ background: `var(--${sourceTone(ev.source) === 'neutral' ? 'text-muted' : sourceTone(ev.source)})` }}
                          />
                        ))}
                      </div>
                    )}
                    {spend > 0 && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{money(spend)}</div>}
                  </button>
                );
              })}
            </div>
          </Card>

          <div>
            <div className="section-title">{selectedDate ? `Eventos del ${selectedDate}` : 'Selecciona un día'}</div>
            {!selectedDate ? (
              <Card>
                <EmptyState icon="📅" title="Selecciona un día del calendario" subtitle="Para ver sus recibos, tandas y metas" />
              </Card>
            ) : selectedEvents.length === 0 ? (
              <Card>
                <EmptyState icon="✅" title="Sin eventos este día" />
              </Card>
            ) : (
              <Card style={{ padding: 0 }}>
                {selectedEvents.map((ev, idx) => (
                  <div key={idx} className="list-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: idx === 0 ? 'none' : '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{ev.title}</div>
                      <Badge label={SOURCE_LABELS[ev.source]} tone={sourceTone(ev.source)} />
                    </div>
                    <span style={{ fontWeight: 600 }}>{money(ev.amount)}</span>
                  </div>
                ))}
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
