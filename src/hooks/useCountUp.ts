import { useEffect, useRef, useState } from 'react';

/**
 * Anima un número desde su valor anterior (0 la primera vez) hasta `target`.
 * Respeta `prefers-reduced-motion`: en ese caso salta directo al valor final.
 */
export function useCountUp(target: number, duration = 1100): number {
  const [value, setValue] = useState(0);
  const currentRef = useRef(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const from = currentRef.current;
    const total = reduceMotion ? 0 : duration;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const t = total === 0 ? 1 : Math.min(1, (now - start) / total);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (target - from) * eased;
      currentRef.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}
