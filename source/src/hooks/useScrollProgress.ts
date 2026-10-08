import { useEffect, useRef, type RefObject } from 'react';
import { ScrollTrigger } from '../utils/gsap';

/**
 * Maps the scroll position across `ref` (top of element at top of viewport → bottom at bottom)
 * to 0..1 and calls `onProgress` without re-rendering React.
 */
export function useScrollProgress(
  ref: RefObject<HTMLElement>,
  onProgress: (p: number) => void,
  opts: { start?: string; end?: string } = {},
) {
  const cb = useRef(onProgress);
  cb.current = onProgress;
  useEffect(() => {
    if (!ref.current) return;
    const st = ScrollTrigger.create({
      trigger: ref.current,
      start: opts.start ?? 'top top',
      end: opts.end ?? 'bottom bottom',
      onUpdate: (self) => cb.current(self.progress),
      onRefresh: (self) => cb.current(self.progress),
    });
    return () => st.kill();
  }, [ref, opts.start, opts.end]);
}
