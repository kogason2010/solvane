import { useMemo, useRef } from 'react';
import { MagneticButton } from '../components/MagneticButton';
import { ArrowRight } from '../components/Icons';
import { SplitText } from '../components/SplitText';
import { useCanvas2D } from '../hooks/useCanvas2D';
import { useReveal } from '../hooks/useReveal';
import { useScrollProgress } from '../hooks/useScrollProgress';
import { ANALYTE_COLORS } from '../utils/chroma';
import { gaussian, normal, rng, smoothstep } from '../utils/math';
import '../styles/final.css';

/**
 * Closing image: the hero's scattered analyte particles converge onto one clean, resolved peak.
 * Scroll drives convergence; the pointer gently disturbs the field.
 */
export function FinalCTA() {
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const pointer = useRef({ x: -9999, y: -9999 });
  useReveal(section);
  useScrollProgress(section, (p) => (progress.current = p), { start: 'top bottom', end: 'center center' });

  const parts = useMemo(() => {
    const r = rng(2024);
    const n = window.innerWidth < 700 ? 900 : 1800;
    return Array.from({ length: n }, (_, i) => {
      const u = i / n;
      return {
        sx: r(),
        sy: r(),
        u, // position along the trace
        jitter: normal(r) * 0.6,
        c: ANALYTE_COLORS[i % 4],
        ph: r() * 6.28,
        size: 0.6 + r() * 1.1,
      };
    });
  }, []);

  const canvas = useCanvas2D(({ ctx, w, h, t }) => {
    const p = smoothstep(0.05, 0.95, progress.current);
    const wide = w > 900;
    const base = h * (wide ? 0.8 : 0.9);
    const x0 = wide ? w * 0.42 : w * 0.06;
    const x1 = w * 0.96;
    const peakH = h * (wide ? 0.55 : 0.32);
    const sig = 0.07;
    const trace = (u: number) => base - gaussian(u, 0.5, sig) * peakH;

    // faint baseline + drawn trace as convergence completes
    ctx.strokeStyle = 'rgba(170,195,225,0.14)';
    ctx.beginPath();
    ctx.moveTo(x0, base);
    ctx.lineTo(x1, base);
    ctx.stroke();
    if (p > 0.6) {
      ctx.strokeStyle = `rgba(233,238,244,${((p - 0.6) / 0.4) * 0.8})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i <= 400; i++) {
        const u = i / 400;
        const x = x0 + u * (x1 - x0);
        if (i === 0) ctx.moveTo(x, trace(u));
        else ctx.lineTo(x, trace(u));
      }
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    const px = pointer.current.x;
    const py = pointer.current.y;
    for (const q of parts) {
      const k = smoothstep(q.u * 0.25, q.u * 0.25 + 0.75, p);
      const e = 1 - Math.pow(1 - k, 3);
      // scattered start drifts gently
      const sx = q.sx * w + Math.sin(t * 0.3 + q.ph) * 14;
      const sy = q.sy * h + Math.cos(t * 0.25 + q.ph) * 14;
      const tx = x0 + q.u * (x1 - x0);
      const ty = trace(q.u) + q.jitter * (1 - e) * 6;
      let x = sx + (tx - sx) * e;
      let y = sy + (ty - sy) * e;
      const dx = x - px;
      const dy = y - py;
      const d2 = dx * dx + dy * dy;
      if (d2 < 12000) {
        const f = (1 - d2 / 12000) * 18;
        const d = Math.sqrt(d2) + 0.001;
        x += (dx / d) * f;
        y += (dy / d) * f;
      }
      ctx.globalAlpha = 0.35 + 0.55 * e;
      ctx.fillStyle = e > 0.95 ? '#e9eef4' : q.c;
      ctx.fillRect(x, y, q.size, q.size);
    }
    ctx.globalAlpha = 1;
  });

  return (
    <section
      id="contact"
      className="final"
      ref={section}
      aria-labelledby="final-title"
      onPointerMove={(e) => {
        const r = (e.currentTarget as HTMLElement).querySelector('canvas')?.getBoundingClientRect();
        if (r) pointer.current = { x: e.clientX - r.left, y: e.clientY - r.top };
      }}
      onPointerLeave={() => (pointer.current = { x: -9999, y: -9999 })}
    >
      <canvas ref={canvas} className="final__canvas" aria-hidden="true" />
      <div className="container final__inner">
        <p className="mono final__eyebrow" data-reveal>
          10 — Start here
        </p>
        <SplitText as="h2" id="final-title" className="h-xl final__title" text="Bring us the difficult samples." />
        <p className="final__sub display grad-text" data-reveal>
          Complexity in. Clarity out.
        </p>
        <div className="final__ctas" data-reveal>
          <MagneticButton href="mailto:hello@solvane.example">
            <span className="btn__label">Start a Conversation</span>
            <ArrowRight />
          </MagneticButton>
          <MagneticButton href="#technology" variant="ghost">
            <span className="btn__label">Explore Technologies</span>
          </MagneticButton>
          <MagneticButton href="#applications" variant="ghost">
            <span className="btn__label">View Applications</span>
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}
