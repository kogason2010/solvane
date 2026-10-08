import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '../utils/gsap';

interface Props {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
}

/** Number that counts up the first time it scrolls into view (instant under reduced motion). */
export function CountUp({ value, decimals = 0, duration = 1.8, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = fmt(value);
      return;
    }
    const obj = { v: 0 };
    el.textContent = fmt(0);
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () =>
        gsap.to(obj, {
          v: value,
          duration,
          ease: 'power3.out',
          onUpdate: () => {
            el.textContent = fmt(obj.v);
          },
        }),
    });
    return () => st.kill();
  }, [value, decimals, duration]);
  return (
    <span ref={ref} className={className} aria-label={String(value.toFixed(decimals))}>
      {value.toFixed(decimals)}
    </span>
  );
}
