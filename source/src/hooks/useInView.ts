import { useEffect, useState, type RefObject } from 'react';

/** True while the element is within `rootMargin` of the viewport. Used to mount/pause heavy scenes. */
export function useInView<T extends Element>(ref: RefObject<T>, rootMargin = '200px 0px', once = false) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && once) io.disconnect();
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, once]);
  return inView;
}
