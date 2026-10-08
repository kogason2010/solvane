import { useEffect, useRef, type ReactNode } from 'react';
import { gsap } from '../utils/gsap';
import { scrollToTarget } from '../hooks/useSmoothScroll';

interface Props {
  href: string;
  variant?: 'primary' | 'ghost';
  children: ReactNode;
  className?: string;
}

/** Pill button with a subtle magnetic pull on fine pointers. Anchors scroll smoothly. */
export function MagneticButton({ href, variant = 'primary', children, className = '' }: Props) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const label = el.querySelector('.btn__label');
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      xTo(dx * 0.22);
      yTo(dy * 0.3);
      if (label) gsap.to(label, { x: dx * 0.08, y: dy * 0.1, duration: 0.6 });
    };
    const leave = () => {
      xTo(0);
      yTo(0);
      if (label) gsap.to(label, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)' });
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, []);

  return (
    <a
      ref={ref}
      href={href}
      className={`btn btn--${variant} ${className}`}
      onClick={(e) => {
        if (href.startsWith('#')) {
          e.preventDefault();
          scrollToTarget(href);
        }
      }}
    >
      {children}
    </a>
  );
}
