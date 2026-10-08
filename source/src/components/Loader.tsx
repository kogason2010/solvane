import { useEffect, useRef, useState } from 'react';
import { gsap } from '../utils/gsap';
import { toPath, gaussian } from '../utils/math';

const STEPS = ['Sample', 'Separation', 'Detection', 'Ready'];

// a four-peak mini chromatogram that draws while loading
const TRACE = (() => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 200; i++) {
    const x = i / 200;
    const y =
      0.9 * gaussian(x, 0.2, 0.025) + 0.7 * gaussian(x, 0.38, 0.03) + 1.0 * gaussian(x, 0.6, 0.035) + 0.6 * gaussian(x, 0.84, 0.045);
    pts.push([x * 420, 60 - y * 52]);
  }
  return toPath(pts);
})();

/**
 * Short, honest loader: it waits for the hero scene to initialise (min ~1s, max ~3.5s),
 * never a long artificial sequence.
 */
export function Loader({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const path = useRef<SVGPathElement>(null);
  const [step, setStep] = useState(0);
  const [minElapsed, setMinElapsed] = useState(false);
  const [gone, setGone] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const len = path.current?.getTotalLength() ?? 600;
    if (path.current) gsap.set(path.current, { strokeDasharray: len, strokeDashoffset: len });
    const tl = gsap.timeline();
    tl.to(fill.current, { scaleX: 0.85, duration: reduced ? 0.2 : 1.1, ease: 'power2.inOut' }, 0);
    tl.to(path.current, { strokeDashoffset: len * 0.15, duration: reduced ? 0.2 : 1.1, ease: 'power2.inOut' }, 0);
    const timers = [0, 1, 2].map((i) => window.setTimeout(() => setStep(i), i * 320));
    const min = window.setTimeout(() => setMinElapsed(true), reduced ? 200 : 1050);
    const max = window.setTimeout(() => setMinElapsed(true), 3500);
    return () => {
      tl.kill();
      timers.forEach(clearTimeout);
      clearTimeout(min);
      clearTimeout(max);
    };
  }, []);

  const [forced, setForced] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setForced(true), 3500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!minElapsed || !(ready || forced)) return;
    setStep(3);
    const tl = gsap.timeline({
      onComplete: () => {
        setGone(true);
        doneRef.current();
      },
    });
    tl.to(fill.current, { scaleX: 1, duration: 0.35, ease: 'power2.out' })
      .to(path.current, { strokeDashoffset: 0, duration: 0.35, ease: 'power2.out' }, '<')
      .to(root.current, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut' }, '+=0.2');
    return () => {
      tl.kill();
    };
  }, [minElapsed, ready, forced]);

  if (gone) return null;
  return (
    <div className="loader" ref={root} role="status" aria-live="polite" style={{ clipPath: 'inset(0 0 0% 0)' }}>
      <div className="loader__inner">
        <svg className="loader__trace" viewBox="0 0 420 64" preserveAspectRatio="none" aria-hidden="true">
          <line x1="0" y1="60" x2="420" y2="60" stroke="rgba(160,185,215,0.18)" />
          <path ref={path} d={TRACE} fill="none" stroke="url(#ld-g)" strokeWidth="1.4" />
          <defs>
            <linearGradient id="ld-g" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#63d3ff" />
              <stop offset="1" stopColor="#c39bff" />
            </linearGradient>
          </defs>
        </svg>
        <div className="loader__title mono">
          <span className="mono--bright">Initializing analysis</span>
          <span>Solvane</span>
        </div>
        <div className="loader__bar">
          <div className="loader__fill" ref={fill} />
        </div>
        <div className="loader__steps mono">
          {STEPS.map((s, i) => (
            <span key={s} className={`loader__step ${i <= step ? 'is-on' : ''}`}>
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
