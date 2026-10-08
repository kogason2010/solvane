import { useRef, useState } from 'react';
import { SectionIndex } from '../components/SectionIndex';
import { SplitText } from '../components/SplitText';
import { useCanvas2D } from '../hooks/useCanvas2D';
import { useReveal } from '../hooks/useReveal';
import { useScrollProgress } from '../hooks/useScrollProgress';
import { drawWorkflow } from './workflow/drawWorkflow';
import '../styles/workflow.css';

const STAGES = [
  {
    title: 'Sample',
    verb: 'Prepare & inject',
    text: 'A precise volume — often just a few microlitres — is drawn from the vial and injected into the flowing mobile phase.',
  },
  {
    title: 'Separation',
    verb: 'Resolve',
    text: 'Under high pressure the sample crosses a column packed with micron-scale particles. Compounds that interact more strongly with the stationary phase are retained longer.',
  },
  {
    title: 'Detection',
    verb: 'Measure',
    text: 'At the outlet, each eluting band is converted into an electrical signal — by absorbance, fluorescence, conductivity or mass.',
  },
  {
    title: 'Quantitation',
    verb: 'Answer',
    text: 'Peak area is proportional to amount. Read against calibration standards, every peak becomes a concentration.',
  },
];

export function Workflow() {
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [stage, setStage] = useState(0);
  const bars = useRef<(HTMLSpanElement | null)[]>([]);

  useReveal(section);
  useScrollProgress(
    section,
    (p) => {
      // the pinned stretch is the region after the intro block
      progress.current = p;
      const s = Math.min(3, Math.floor(p * 4));
      setStage((prev) => (prev === s ? prev : s));
      bars.current.forEach((b, i) => {
        if (b) b.style.transform = `scaleX(${Math.min(1, Math.max(0, p * 4 - i)).toFixed(3)})`;
      });
    },
    { start: 'top top', end: 'bottom bottom' },
  );

  const canvas = useCanvas2D(({ ctx, w, h, t }) => drawWorkflow(ctx, w, h, t, progress.current));

  return (
    <section id="science" className="workflow" ref={section} aria-labelledby="workflow-title">
      <div className="workflow__sticky">
        <div className="container workflow__grid">
          <div className="workflow__text">
            <SectionIndex num="02" label="From sample to signal" />
            <SplitText as="h2" id="workflow-title" className="h-md workflow__title" text="Four steps between a vial and an answer." />

            <div className="workflow__stage-num display" aria-hidden="true">
              <span key={stage}>0{stage + 1}</span>
            </div>

            <ol className="workflow__stages">
              {STAGES.map((s, i) => (
                <li key={s.title} className={`workflow-stage ${i === stage ? 'is-active' : ''}`} aria-current={i === stage ? 'step' : undefined}>
                  <div className="workflow-stage__head">
                    <span className="mono">{s.verb}</span>
                    <h3 className="h-sm">{s.title}</h3>
                  </div>
                  <p className="workflow-stage__text">{s.text}</p>
                  <span className="workflow-stage__bar" aria-hidden="true">
                    <span ref={(el) => (bars.current[i] = el)} />
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="workflow__viz">
            <canvas
              ref={canvas}
              className="workflow__canvas"
              role="img"
              aria-label="Animated diagram: a sample is injected from a vial, separated in a packed column into four bands, detected by UV absorbance in a flow cell, and quantified by integrating the peak and reading it against a calibration line."
            />
            <div className="workflow__frame" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
