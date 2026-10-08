import { lazy, Suspense, useRef } from 'react';
import { SectionIndex } from '../components/SectionIndex';
import { useInView } from '../hooks/useInView';
import { useScrollProgress } from '../hooks/useScrollProgress';
import { moleculeState } from '../utils/scrollStore';
import { smoothstep } from '../utils/math';
import '../styles/molecular.css';

const MolecularCanvas = lazy(() => import('../three/MolecularCanvas'));

const LINES = [
  { k: 'Identify', v: 'Retention time, UV spectrum and accurate mass agree on one structure.' },
  { k: 'Quantify', v: 'Peak area against calibration standards gives how much is present.' },
  { k: 'Confirm', v: 'Orthogonal evidence — not a single number — separates an answer from a guess.' },
];

export function Molecular({ webgl, reducedMotion }: { webgl: boolean; reducedMotion: boolean }) {
  const section = useRef<HTMLElement>(null);
  const near = useInView(section, '600px 0px');
  const visible = useInView(section, '0px');
  const title = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const lines = useRef<(HTMLLIElement | null)[]>([]);

  useScrollProgress(section, (p) => {
    moleculeState.progress = p;
    if (title.current) {
      const o = smoothstep(0.02, 0.15, p) * (1 - smoothstep(0.88, 1, p));
      title.current.style.opacity = o.toFixed(3);
      title.current.style.transform = `translate3d(0, ${((1 - smoothstep(0.02, 0.2, p)) * 40).toFixed(1)}px, 0)`;
    }
    if (card.current) {
      const o = smoothstep(0.5, 0.62, p) * (1 - smoothstep(0.92, 1, p));
      card.current.style.opacity = o.toFixed(3);
      card.current.style.transform = `translate3d(0, ${((1 - smoothstep(0.5, 0.65, p)) * 24).toFixed(1)}px, 0)`;
    }
    lines.current.forEach((el, i) => {
      if (!el) return;
      const o = smoothstep(0.3 + i * 0.1, 0.4 + i * 0.1, p) * (1 - smoothstep(0.92, 1, p));
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translate3d(0, ${((1 - o) * 16).toFixed(1)}px, 0)`;
    });
  });

  return (
    <section className="molecular" ref={section} aria-labelledby="mol-title">
      <div className="molecular__sticky">
        {webgl && near ? (
          <Suspense fallback={null}>
            <MolecularCanvas active={visible} reducedMotion={reducedMotion} />
          </Suspense>
        ) : (
          !webgl && (
            <img
              className="molecular__fallback"
              src="assets/images/molecular-field.png"
              alt="Rendered field of small organic molecules with a caffeine molecule in focus."
            />
          )
        )}
        <div className="molecular__shade" aria-hidden="true" />

        <div className="container molecular__overlay">
          <div className="molecular__title" ref={title}>
            <SectionIndex num="05" label="Molecular resolution" />
            <h2 id="mol-title" className="h-lg">
              Thousands of compounds.
              <br />
              <span className="grad-text">One answer each.</span>
            </h2>
            <ul className="molecular__lines">
              {LINES.map((l, i) => (
                <li key={l.k} ref={(el) => (lines.current[i] = el)}>
                  <span className="mono">{l.k}</span>
                  <p>{l.v}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="molecular__card" ref={card}>
            <p className="mono">Resolved component</p>
            <p className="molecular__card-name display">Caffeine</p>
            <dl>
              <div>
                <dt className="mono">Formula</dt>
                <dd>C₈H₁₀N₄O₂</dd>
              </div>
              <div>
                <dt className="mono">[M+H]⁺</dt>
                <dd>m/z 195.0877</dd>
              </div>
              <div>
                <dt className="mono">λmax</dt>
                <dd>273 nm</dd>
              </div>
            </dl>
            <p className="molecular__card-note">
              Molecular models are illustrative. Instruments measure the collective signal of countless molecules — not
              pictures of single ones.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
