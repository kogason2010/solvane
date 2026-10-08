import { useMemo, useRef, useState } from 'react';
import { SectionIndex } from '../components/SectionIndex';
import { SplitText } from '../components/SplitText';
import { CountUp } from '../components/CountUp';
import { useCanvas2D } from '../hooks/useCanvas2D';
import { useReveal } from '../hooks/useReveal';
import { CASE_AFTER, CASE_BEFORE, minResolution, peakHeight, resolution, type Peak } from '../utils/chroma';
import { drawChromatogram } from './separation/drawChromatogram';
import '../styles/case.css';

function resolvedPairs(peaks: Peak[]) {
  const s = [...peaks].sort((a, b) => a.tR - b.tR);
  let n = 0;
  for (let i = 0; i < s.length - 1; i++) if (resolution(s[i], s[i + 1]) >= 1.5) n++;
  return { n, of: s.length - 1 };
}

const STEPS = ['Complex mixture', 'Poor separation', 'Optimised method', 'Improved resolution', 'Reliable quantitation'];

export function CaseStudy() {
  const section = useRef<HTMLElement>(null);
  const [split, setSplit] = useState(50);
  const splitRef = useRef(50);
  splitRef.current = split;
  const dragging = useRef(false);
  const wrap = useRef<HTMLDivElement>(null);
  useReveal(section);

  const stats = useMemo(
    () => ({
      before: { rs: minResolution(CASE_BEFORE), pairs: resolvedPairs(CASE_BEFORE), time: CASE_BEFORE[CASE_BEFORE.length - 1].tR },
      after: { rs: minResolution(CASE_AFTER), pairs: resolvedPairs(CASE_AFTER), time: CASE_AFTER[CASE_AFTER.length - 1].tR },
    }),
    [],
  );

  const tMax = 9.2;
  const yBefore = Math.max(...CASE_BEFORE.map(peakHeight)) * 1.1;
  const yAfter = Math.max(...CASE_AFTER.map(peakHeight)) * 1.15;

  const canvas = useCanvas2D(({ ctx, w, h }) => {
    const sx = (splitRef.current / 100) * w;
    const half = h / 2;
    const pad = { l: 40, r: 12, t: 30, b: 30 };
    // after (optimised) — full width, bottom half
    ctx.save();
    ctx.translate(0, half);
    drawChromatogram(ctx, w, half, { peaks: CASE_AFTER, tMax, yMax: yAfter, pad, xLabel: 'min', noise: yAfter * 0.002 });
    ctx.restore();
    // before — top half
    drawChromatogram(ctx, w, half, {
      peaks: CASE_BEFORE.map((p) => ({ ...p, color: '#ffb877' })),
      tMax,
      yMax: yBefore,
      pad,
      noise: yBefore * 0.004,
      lineColor: 'rgba(255,214,176,0.9)',
    });
    // shared retention-time reading line under the handle
    ctx.strokeStyle = 'rgba(233,238,244,0.35)';
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(sx, 8);
    ctx.lineTo(sx, h - 8);
    ctx.stroke();
    ctx.setLineDash([]);
    const t = ((sx - pad.l) / (w - pad.l - pad.r)) * tMax;
    if (t > 0 && t < tMax) {
      ctx.font = '500 10.5px "IBM Plex Mono", monospace';
      ctx.fillStyle = 'rgba(233,238,244,0.9)';
      ctx.textAlign = sx > w - 90 ? 'right' : 'left';
      ctx.fillText(`${t.toFixed(2)} min`, sx + (sx > w - 90 ? -8 : 8), half - 6);
    }
  });

  const setFromClient = (clientX: number) => {
    const r = wrap.current?.getBoundingClientRect();
    if (!r) return;
    setSplit(Math.max(4, Math.min(96, ((clientX - r.left) / r.width) * 100)));
  };

  return (
    <section className="case section" ref={section} aria-labelledby="case-title">
      <div className="container">
        <div className="case__head">
          <div>
            <SectionIndex num="09" label="Performance story" />
            <SplitText as="h2" id="case-title" className="h-lg" text="Twelve analytes. Zero overlaps." />
          </div>
          <div>
            <p className="lede" data-reveal>
              A twelve-component mixture first ran as a crowded cluster. A shallower gradient, a different stationary-phase
              selectivity and a smaller particle size spread every peak to baseline — and made each one quantifiable.
            </p>
            <p className="illustrative" data-reveal>
              <span className="dot" style={{ background: 'var(--amber)', boxShadow: '0 0 10px var(--amber)' }} /> Illustrative
              example · simulated data
            </p>
          </div>
        </div>

        <ol className="case__steps mono" data-reveal>
          {STEPS.map((s, i) => (
            <li key={s}>
              <span className="case__step-num">0{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>

        <div
          className="case__compare"
          ref={wrap}
          onPointerDown={(e) => {
            dragging.current = true;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            setFromClient(e.clientX);
          }}
          onPointerMove={(e) => dragging.current && setFromClient(e.clientX)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
        >
          <canvas
            ref={canvas}
            className="case__canvas"
            role="img"
            aria-label={`Before: twelve analytes between 1.1 and 2.8 minutes with a minimum resolution of ${stats.before.rs.toFixed(
              2,
            )}. After optimisation: twelve analytes between 1.25 and 8.4 minutes, minimum resolution ${stats.after.rs.toFixed(2)}.`}
          />
          <div className="case__labels" aria-hidden="true">
            <span className="mono case__label case__label--before">Before · generic gradient</span>
            <span className="mono case__label case__label--after">After · optimised method</span>
          </div>
          <div className="case__handle" style={{ left: `${split}%` }} aria-hidden="true">
            <span>⇆</span>
          </div>
          <input
            className="case__range"
            type="range"
            min={4}
            max={96}
            value={split}
            onChange={(e) => setSplit(Number(e.target.value))}
            aria-label="Move the retention-time reading line across both chromatograms"
          />
        </div>

        <dl className="case__stats">
          <div>
            <dt className="mono">Critical resolution</dt>
            <dd>
              <span className="case__before">{stats.before.rs.toFixed(2)}</span>
              <span className="case__arrow">→</span>
              <CountUp className="display case__after" value={stats.after.rs} decimals={2} />
            </dd>
          </div>
          <div>
            <dt className="mono">Pairs at baseline (Rs ≥ 1.5)</dt>
            <dd>
              <span className="case__before">
                {stats.before.pairs.n}/{stats.before.pairs.of}
              </span>
              <span className="case__arrow">→</span>
              <span className="display case__after">
                {stats.after.pairs.n}/{stats.after.pairs.of}
              </span>
            </dd>
          </div>
          <div>
            <dt className="mono">Quantitation limit</dt>
            <dd>
              <span className="display case__after">0.05</span>
              <span className="case__unit mono">mg/L · sub-ppm</span>
            </dd>
          </div>
          <div>
            <dt className="mono">Linearity · 0.1–20 mg/L</dt>
            <dd>
              <span className="display case__after">R² 0.9996</span>
            </dd>
          </div>
        </dl>
        <p className="case__fine body-s">
          Run time increases from {stats.before.time.toFixed(1)} to {stats.after.time.toFixed(1)} minutes — the trade made for
          resolving every pair. Values are simulated to illustrate method development and are not performance claims.
        </p>
      </div>
    </section>
  );
}
