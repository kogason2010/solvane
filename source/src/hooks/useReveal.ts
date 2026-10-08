import { useEffect, type RefObject } from 'react';
import { gsap } from '../utils/gsap';

/**
 * Entrance choreography for a section:
 *   [data-split]  → words rise out of masks
 *   [data-reveal] → fade + lift, staggered in DOM order
 *   [data-draw]   → SVG strokes draw on
 * Reduced motion: everything is shown immediately.
 */
export function useReveal(ref: RefObject<HTMLElement>, deps: unknown[] = []) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = gsap.context(() => {
      if (reduced) return;
      root.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
        gsap.from(el.querySelectorAll('.split-word > span'), {
          yPercent: 110,
          duration: 1.2,
          stagger: 0.045,
          ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 88%' },
        });
      });
      root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
        const delay = parseFloat(el.dataset.delay ?? '0');
        gsap.from(el, {
          y: 28,
          opacity: 0,
          duration: 1.1,
          delay,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 90%' },
        });
      });
      root.querySelectorAll<SVGPathElement>('[data-draw]').forEach((el) => {
        const len = el.getTotalLength();
        gsap.fromTo(
          el,
          { strokeDasharray: len, strokeDashoffset: len },
          {
            strokeDashoffset: 0,
            duration: 2.2,
            ease: 'power2.inOut',
            scrollTrigger: { trigger: el, start: 'top 85%' },
          },
        );
      });
    }, root);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
