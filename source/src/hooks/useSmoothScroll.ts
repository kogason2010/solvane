import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger } from '../utils/gsap';

let lenisInstance: Lenis | null = null;

export function getLenis() {
  return lenisInstance;
}

/** Smooth scrolling for anchors; falls back to native scrolling for reduced motion. */
export function scrollToTarget(target: string | HTMLElement) {
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
  if (!el) return;
  if (lenisInstance) lenisInstance.scrollTo(el, { offset: 0, duration: 1.6 });
  else el.scrollIntoView({ behavior: 'auto' });
}

export function scrollToY(y: number) {
  if (lenisInstance) lenisInstance.scrollTo(y, { duration: 1.4 });
  else window.scrollTo({ top: y, behavior: 'auto' });
}

/** Lenis drives the scroll; GSAP's ticker drives Lenis so ScrollTrigger stays in lockstep. */
export function useSmoothScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.2,
    });
    lenisInstance = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisInstance = null;
    };
  }, [enabled]);
}
