import { useMemo, useRef, useState } from 'react';
import { SectionIndex } from '../components/SectionIndex';
import { SplitText } from '../components/SplitText';
import { useCanvas2D } from '../hooks/useCanvas2D';
import { useReveal } from '../hooks/useReveal';
import { useScrollProgress } from '../hooks/useScrollProgress';
import { lssPeaks, minResolution, peakHeight, resolution } from '../utils/chroma';
import { clamp, lerp, normal, rng, smoothstep } from '../utils/math';
import { drawChromatogram } from './separation/drawChromatogram';
import '../styles/separation.css';

const PHI_START = 0.62;
const PHI_END = 0.31;

const rand = rng(77);
const BAND_DOTS = Array.from({ length: 900 }, (_, i) => ({
  pop: i % 4,
  n: clamp(normal(rand), -2.8, 2.8),
  y: rand(),
  ph: rand() * 6.28,
}));

function useSmoothed(target: number) {
  const ref = useRef(target);
  return { ref, step: (dt: number) => (ref.current += (target - ref.current) * (1 - Math.exp(-dt * 6))) };
}

export function Separation() {
  const section = useRef<HTMLElement>(null);
  const [phi, setPhi] = useState(PHI_START);
  const phiRef = useRef(PHI_START);
  const manual = useRef<{ at: number } | null>(null);
  const progress = useRef(0);

  useReveal(section);
  useScrollProgress(
    section,
    (p) => {
      progress.current = p;
      if (manual.current && Math.abs(p - manual.current.at) < 0.08) return;
      manual.current = null;
      const v = lerp(PHI_START, PHI_END, smoothstep(0.12, 0.78, p));
      const rounded = Math.round(v * 200) / 200;
      if (rounded !== phiRef.current) {
        phiRef.current = rounded;
        setPhi(rounded);
      }
    },
    { start: 'top top', end: 'bottom bottom' },
  );

  const peaks = useMemo(() => lssPeaks(phi), [phi]);
  const sorted = useMemo(() => [...peaks].sort((a, b) => a.tR - b.tR), [peaks]);
  const crit = useMemo(() => {
    let idx = 0;
    let m = Infinity;
    for (let i = 0; i < sorted.length - 1; i++) {
      const r = resolution(sorted[i], sorted[i + 1]);
      if (r < m) {
        m = r;
        idx = i;
      }
    }
    const a = sorted[idx];
    const b = sorted[idx + 1];
    return { a, b, rs: m, alpha: Math.max(a.k, b.k) / Math.min(a.k, b.k) };
  }, [sorted]);

  const tMaxTarget = Math.max(2.5, sorted[sorted.length - 1].tR * 1.18);
  const yMaxTarget = Math.max(...peaks.map(peakHeight)) * 1.25;
  const tMax = useSmoothed(tMaxTarget);
  const yMax = useSmoothed(yMaxTarget);

  const chromCanvas = useCanvas2D(({ ctx, w, h, dt }) => {
    tMax.step(dt);
    yMax.step(dt);
    drawChromatogram(ctx, w, h, {
      peaks,
      tMax: tMax.ref.current,
      yMax: yMax.ref.current,
      annotate: true,
      noise: yMax.ref.current * 0.002,
      xLabel: 'Retention time (min)',
      yLabel: 'Absorbance',
      pad: { l: 44, r: 12, t: 44, b: 44 },
    });
  });

  const columnCanvas = useCanvas2D(({ ctx, w, h, t }) => {
    const L = w - 2;
    const cy = h / 2;
    const R = Math.min(30, h * 0.36);
    // housing
    ctx.strokeStyle = 'rgba(180,205,235,0.4)';
    ctx.strokeRect(1, cy - R, L, R * 2);
    ctx.fillStyle = 'rgba(140,160,185,0.07)';
    for (let i = 0; i < 160; i++) {
      ctx.beginPath();
      ctx.arc(4 + (i / 160) * (L - 8), cy - R + 4 + ((i * 0.618) % 1) * (R * 2 - 8), 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // bands, looping injections
    const cycle = 6.5;
    const tau = (t % cycle) / cycle;
    const tm = tMax.ref.current;
    for (const d of BAND_DOTS) {
      const p = peaks[d.pop];
      const pos = (tau * tm * 1.05) / p.tR;
      if (pos > 1.02) continue;
      const sig = 0.006 + (pos * 2.6) / Math.sqrt(8000);
      const x = 1 + (pos + d.n * sig) * L;
      if (x < 1 || x > L) continue;
      const y = cy + (d.y - 0.5) * (R * 2 - 8) + Math.sin(t * 2 + d.ph) * 1.2;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });

  const ok = crit.rs >= 1.5;
  const runTime = sorted[sorted.length - 1].tR;

  return (
    <section className="separation" ref={section} aria-labelledby="sep-title">
      <div className="separation__sticky">
        <div className="container separation__inner">
          <header className="separation__head">
            <div>
              <SectionIndex num="03" label="Separation" />
              <SplitText as="h2" id="sep-title" className="h-lg" text="Change the chemistry. Change the answer." />
            </div>
            <p className="lede separation__lede" data-reveal>
              Retention depends on how strongly each compound partitions into the stationary phase. Shift the mobile phase and
              those interactions shift too — sometimes enough to reverse the elution order.
            </p>
          </header>

          <div className="separation__stage">
            <div className="separation__column">
              <div className="separation__column-labels mono">
                <span>Inlet</span>
                <span>Column · 100 × 2.1 mm</span>
                <span>Outlet → detector</span>
              </div>
              <canvas ref={columnCanvas} className="separation__column-canvas" aria-hidden="true" />
            </div>

            <div className="separation__grid">
              <div className="separation__chrom">
                <canvas
                  ref={chromCanvas}
                  className="separation__chrom-canvas"
                  role="img"
                  aria-label={`Chromatogram at ${Math.round(phi * 100)} percent organic: ${sorted
                    .map((p) => `${p.label} at ${p.tR.toFixed(2)} minutes`)
                    .join(', ')}. Critical pair resolution ${crit.rs.toFixed(2)}.`}
                />
              </div>

              <aside className="separation__panel" aria-label="Separation metrics">
                <label className="sep-control">
                  <span className="mono">Mobile phase strength</span>
                  <span className="sep-control__value display">
                    {Math.round(phi * 100)}
                    <small>% organic</small>
                  </span>
                  <input
                    type="range"
                    min={28}
                    max={66}
                    step={1}
                    value={Math.round(phi * 100)}
                    onChange={(e) => {
                      const v = Number(e.target.value) / 100;
                      manual.current = { at: progress.current };
                      phiRef.current = v;
                      setPhi(v);
                    }}
                    aria-valuetext={`${Math.round(phi * 100)} percent organic modifier`}
                  />
                  <span className="sep-control__scale mono">
                    <span>Weaker · longer</span>
                    <span>Stronger · faster</span>
                  </span>
                </label>

                <dl className="sep-metrics">
                  <div className={`sep-metric ${ok ? 'is-ok' : 'is-warn'}`}>
                    <dt className="mono">Resolution · critical pair</dt>
                    <dd>
                      <span className="display">{crit.rs.toFixed(2)}</span>
                      <span className="mono">
                        {crit.a.id}/{crit.b.id} · {ok ? 'baseline resolved' : 'co-eluting'}
                      </span>
                    </dd>
                  </div>
                  <div className="sep-metric">
                    <dt className="mono">Selectivity α</dt>
                    <dd>
                      <span className="display">{crit.alpha.toFixed(3)}</span>
                      <span className="mono">k₂ / k₁</span>
                    </dd>
                  </div>
                  <div className="sep-metric">
                    <dt className="mono">Run time</dt>
                    <dd>
                      <span className="display">{runTime.toFixed(1)}</span>
                      <span className="mono">min</span>
                    </dd>
                  </div>
                </dl>

                <table className="sep-table">
                  <caption className="sr-only">Retention time, retention factor and peak area per analyte</caption>
                  <thead>
                    <tr className="mono">
                      <th scope="col">Analyte</th>
                      <th scope="col">tR (min)</th>
                      <th scope="col">k</th>
                      <th scope="col">Area</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((p) => (
                      <tr key={p.id}>
                        <th scope="row">
                          <span className="sep-swatch" style={{ background: p.color }} /> {p.id}
                        </th>
                        <td>{p.tR.toFixed(2)}</td>
                        <td>{p.k.toFixed(2)}</td>
                        <td>{p.area.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </aside>
            </div>
          </div>
          <p className="separation__note body-s">
            Modelled with the linear solvent-strength relationship log k = log k<sub>w</sub> − S·φ and N = 8,000 plates.
            Peak area stays constant as conditions change — the amount injected doesn’t.
          </p>
        </div>
      </div>
    </section>
  );
}
