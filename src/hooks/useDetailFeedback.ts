import { useEffect, useRef, useState } from 'react';
import { parseISODate } from '../utils/format';

const NOTICE_MS = 3500;
const CONFETTI_MS = 2400;

/**
 * Estado de retroalimentación de las vistas de detalle: un aviso de éxito que
 * se oculta solo y una marca de celebración (confeti) de corta duración.
 * También sube el scroll al inicio al abrir la vista.
 */
export function useDetailFeedback() {
  const [notice, setNotice] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<number | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    const pending = timers.current;
    return () => pending.forEach((t) => clearTimeout(t));
  }, []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const showNotice = (text: string) => {
    setNotice(text);
    later(() => setNotice((current) => (current === text ? null : current)), NOTICE_MS);
  };

  const celebrate = () => {
    const stamp = Date.now();
    setCelebration(stamp);
    later(() => setCelebration((current) => (current === stamp ? null : current)), CONFETTI_MS);
  };

  return { notice, showNotice, celebration, celebrate };
}

export function daysUntil(isoDate: string): number {
  const target = parseISODate(isoDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function daysLabel(n: number): string {
  return `${n} ${Math.abs(n) === 1 ? 'día' : 'días'}`;
}
