import { lazy, Suspense, useRef, useState } from 'react';
import { SectionIndex } from '../components/SectionIndex';
import { MODULES } from '../data/instrument';
import { useInView } from '../hooks/useInView';
import { useScrollProgress } from '../hooks/useScrollProgress';
import { instrumentState } from '../utils/scrollStore';
import { scrollToY } from '../hooks/useSmoothScroll';
import '../styles/instrument.css';

const InstrumentCanvas = lazy(() => import('../three/InstrumentCanvas'));

/** Scroll stretch: overview → each of the six modules → overview. */
function activeFromProgress(p: number) {
  if (p < 0.1) return -1;
  if (p > 0.93) return 6;
  return Math.min(5, Math.floor(((p - 0.1) / 0.83) * 6));
}

export function Instrument({ webgl, reducedMotion }: { webgl: boolean; reducedMotion: boolean }) {
  const section = useRef<HTMLElement>(null);
  const near = useInView(section, '600px 0px');
  const visible = useInView(section, '0px');
  const [active, setActive] = useState(-1);

  useScrollProgress(section, (p) => {
    instrumentState.progress = p;
    const a = activeFromProgress(p);
    instrumentState.active = a;
    setActive((prev) => (prev === a ? prev : a));
  });

  const jump = (i: number) => {
    const sec = section.current;
    if (!sec) return;
    const range = sec.offsetHeight - window.innerHeight;
    const p = 0.1 + ((i + 0.5) / 6) * 0.83;
    const top = sec.getBoundingClientRect().top + window.scrollY + range * p;
    scrollToY(top);
  };

  const mod = active >= 0 && active < 6 ? MODULES[active] : null;

  return (
    <section className="instrument" ref={section} aria-labelledby="inst-title">
      <div className="instrument__sticky">
        {webgl && near ? (
          <Suspense fallback={null}>
            <InstrumentCanvas active={visible} reducedMotion={reducedMotion} />
          </Suspense>
        ) : null}
        <div className="instrument__shade" aria-hidden="true" />

        <div className="container instrument__overlay">
          <header className="instrument__head">
            <SectionIndex num="08" label="Instrument ecosystem" />
            <h2 id="inst-title" className="h-md">
              Meridian. <span className="muted">One modular path from vial to verdict.</span>
            </h2>
          </header>

          <div className="instrument__detail" aria-live="polite">
            {mod ? (
              <div key={mod.id} className="instrument__card">
                <p className="mono">
                  <span className="instrument__card-num">0{active + 1}</span> / 06
                </p>
                <h3 className="h-sm">{mod.name}</h3>
                <p>{mod.text}</p>
              </div>
            ) : (
              <div key="overview" className="instrument__card">
                <p className="mono">System overview</p>
                <p>
                  Follow the sample: pumped, injected, separated, detected twice, and reported. Scroll to step through each
                  module.
                </p>
              </div>
            )}
          </div>

          <ol className="instrument__index" aria-label="Modules">
            {MODULES.map((m, i) => (
              <li key={m.id}>
                <button className={`mono ${i === active ? 'is-active' : ''} ${i < active ? 'is-past' : ''}`} onClick={() => jump(i)}>
                  <span>0{i + 1}</span> {m.name}
                </button>
              </li>
            ))}
          </ol>
        </div>
        <p className="instrument__note mono">Fictional system · rendered in real time</p>
      </div>
    </section>
  );
}
