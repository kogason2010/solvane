import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { SectionIndex } from '../components/SectionIndex';
import { SplitText } from '../components/SplitText';
import { DETECTORS } from '../data/detectors';
import { useCanvas2D } from '../hooks/useCanvas2D';
import { useInView } from '../hooks/useInView';
import { useReveal } from '../hooks/useReveal';
import { DETECTOR_DRAW, DH, DW } from './detection/drawDetectors';
import '../styles/detection.css';

const AUTO_MS = 7000;

export function Detection() {
  const section = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const fade = useRef({ from: 0, to: 0, k: 1 });
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const inView = useInView(section, '-20% 0px');
  const timerBar = useRef<HTMLSpanElement>(null);

  useReveal(section);

  const select = (i: number, user = true) => {
    if (i === active) return;
    fade.current = { from: active, to: i, k: 0 };
    setActive(i);
    if (user) setPaused(true);
  };

  // auto-advance while visible and not interacted with
  useEffect(() => {
    if (!inView || paused) return;
    const id = window.setTimeout(() => select((active + 1) % DETECTORS.length, false), AUTO_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, inView, paused]);

  useEffect(() => {
    const el = timerBar.current;
    if (!el) return;
    el.style.transition = 'none';
    el.style.transform = 'scaleX(0)';
    if (!inView || paused) return;
    // force reflow so the transition restarts
    void el.offsetWidth;
    el.style.transition = `transform ${AUTO_MS}ms linear`;
    el.style.transform = 'scaleX(1)';
  }, [active, inView, paused]);

  const canvas = useCanvas2D(({ ctx, w, h, t, dt }) => {
    const f = fade.current;
    f.k = Math.min(1, f.k + dt * 2.2);
    const sc = Math.min(w / DW, h / DH);
    const ox = (w - DW * sc) / 2;
    const oy = (h - DH * sc) / 2;
    const draw = (i: number, a: number) => {
      if (a <= 0.01) return;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(sc, sc);
      ctx.globalAlpha = a;
      DETECTOR_DRAW[i](ctx, t);
      ctx.restore();
    };
    if (f.k < 1 && f.from !== f.to) draw(f.from, 1 - f.k);
    draw(f.to, f.k);
  });

  const onKey = (e: KeyboardEvent) => {
    let n = active;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (active + 1) % DETECTORS.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (active - 1 + DETECTORS.length) % DETECTORS.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = DETECTORS.length - 1;
    else return;
    e.preventDefault();
    select(n);
    tabs.current[n]?.focus();
  };

  const d = DETECTORS[active];

  return (
    <section id="technology" className="detection section" ref={section} aria-labelledby="det-title">
      <div className="container">
        <div className="detection__head">
          <SectionIndex num="04" label="Detection technologies" />
          <SplitText as="h2" id="det-title" className="h-lg detection__title" text="Five ways to see a molecule." />
          <p className="lede" data-reveal>
            No single detector sees everything. Each converts a different physical property — light absorbed, light emitted,
            mass, charge or carbon content — into a signal you can measure.
          </p>
        </div>

        <div className="detection__body">
          <div className="detection__tabs" role="tablist" aria-label="Detection technologies" aria-orientation="vertical" onKeyDown={onKey}>
            {DETECTORS.map((det, i) => (
              <button
                key={det.id}
                ref={(el) => (tabs.current[i] = el)}
                role="tab"
                id={`det-tab-${det.id}`}
                aria-selected={i === active}
                aria-controls="det-panel"
                tabIndex={i === active ? 0 : -1}
                className={`det-tab ${i === active ? 'is-active' : ''}`}
                onClick={() => select(i)}
              >
                <span className="mono det-tab__num">0{i + 1}</span>
                <span className="det-tab__name">{det.name}</span>
                {i === active && (
                  <span className="det-tab__timer" aria-hidden="true">
                    <span ref={timerBar} />
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="detection__panel" id="det-panel" role="tabpanel" aria-labelledby={`det-tab-${d.id}`}>
            <div className="detection__viz">
              <canvas ref={canvas} className="detection__canvas" role="img" aria-label={`${d.full}: ${d.principle}`} />
            </div>
            <div className="detection__info" key={d.id}>
              <p className="mono detection__full">{d.full}</p>
              <p className="detection__principle">{d.principle}</p>
              <dl className="detection__specs">
                <div>
                  <dt className="mono">Measures</dt>
                  <dd>{d.measures}</dd>
                </div>
                <div>
                  <dt className="mono">Best for</dt>
                  <dd>{d.bestFor}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
