import { useEffect, useRef } from 'react';

export interface Canvas2DFrame {
  ctx: CanvasRenderingContext2D;
  w: number; // CSS pixels
  h: number;
  t: number; // seconds since mount
  dt: number;
}

/**
 * Hi-DPI 2D canvas with a rAF loop that only runs while the canvas is on screen.
 * `draw` is read through a ref so it can close over fresh props without restarting the loop.
 */
export function useCanvas2D(draw: (f: Canvas2DFrame) => void, opts: { maxDpr?: number; animate?: boolean } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const animate = opts.animate ?? true;
  const maxDpr = opts.maxDpr ?? 2;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = false;
    const start = performance.now();
    let last = start;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      frame(performance.now(), true);
    };

    const frame = (now: number, once = false) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      drawRef.current({ ctx, w, h, t: (now - start) / 1000, dt });
      if (!once && animate && visible) raf = requestAnimationFrame((n) => frame(n));
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting;
      if (visible && !was) {
        last = performance.now();
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame((n) => frame(n));
      }
    });
    io.observe(canvas);
    resize();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [animate, maxDpr]);

  return canvasRef;
}
