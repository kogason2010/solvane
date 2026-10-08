import { useEffect, useRef } from 'react';
import { CountUp } from '../components/CountUp';
import { SectionIndex } from '../components/SectionIndex';
import { SplitText } from '../components/SplitText';
import { useReveal } from '../hooks/useReveal';
import { CALIBRATION, SAMPLE, sampleResult } from '../data/analytical';
import { gsap } from '../utils/gsap';
import { CalibrationCurve, MassSpectrum, SampleChromatogram, UVSpectrum } from './data/Charts';
import '../styles/data.css';

export function DataSection() {
  const section = useRef<HTMLElement>(null);
  const res = sampleResult();
  useReveal(section);

  // chart-specific entrances: stems grow, points pop, fills fade
  useEffect(() => {
    const root = section.current;
    if (!root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      root.querySelectorAll<SVGElement>('.chart').forEach((svg) => {
        const st = { trigger: svg, start: 'top 85%' };
        const grow = svg.querySelectorAll('[data-grow]');
        if (grow.length)
          gsap.from(grow, { scaleY: 0, transformOrigin: '50% 100%', transformBox: 'fill-box', duration: 1.1, stagger: 0.08, ease: 'expo.out', scrollTrigger: st });
        const pop = svg.querySelectorAll('[data-pop]');
        if (pop.length)
          gsap.from(pop, { scale: 0, transformOrigin: '50% 50%', transformBox: 'fill-box', duration: 0.7, stagger: 0.07, delay: 0.6, ease: 'back.out(2)', scrollTrigger: st });
        const fade = svg.querySelectorAll('[data-fade]');
        if (fade.length) gsap.from(fade, { opacity: 0, duration: 1.4, delay: 1.2, scrollTrigger: st });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="data" className="data section" ref={section} aria-labelledby="data-title">
      <div className="container">
        <div className="data__head">
          <div>
            <SectionIndex num="06" label="Data becomes knowledge" />
            <SplitText as="h2" id="data-title" className="h-lg" text="One injection. Four kinds of evidence." />
          </div>
          <p className="lede" data-reveal>
            A single run of an energy drink produces a chromatogram, a spectrum for every peak, an accurate mass and — through
            calibration — a concentration. Each line of evidence checks the others.
          </p>
        </div>

        <div className="data__grid">
          <figure className="data-card data-card--chrom" data-reveal>
            <figcaption className="data-card__cap">
              <span className="mono">A · Chromatogram</span>
              <span className="mono muted">HPLC-UV · C18 · 273 nm</span>
            </figcaption>
            <SampleChromatogram />
          </figure>

          <figure className="data-card" data-reveal data-delay="0.05">
            <figcaption className="data-card__cap">
              <span className="mono">B · UV spectrum</span>
              <span className="mono muted">PDA · apex of peak 3</span>
            </figcaption>
            <UVSpectrum />
          </figure>

          <figure className="data-card" data-reveal data-delay="0.1">
            <figcaption className="data-card__cap">
              <span className="mono">C · Mass spectrum</span>
              <span className="mono muted">ESI+ · full scan</span>
            </figcaption>
            <MassSpectrum />
          </figure>

          <figure className="data-card" data-reveal data-delay="0.15">
            <figcaption className="data-card__cap">
              <span className="mono">D · Calibration</span>
              <span className="mono muted">{CALIBRATION.conc.length} levels · 0.5–50 µg/mL</span>
            </figcaption>
            <CalibrationCurve />
          </figure>

          <div className="data-result" data-reveal data-delay="0.2">
            <p className="mono">Result · caffeine in sample</p>
            <p className="data-result__value display">
              <CountUp value={res.original} decimals={0} />
              <span className="data-result__unit">mg/L</span>
            </p>
            <ol className="data-result__chain">
              <li>
                <span className="mono">Peak area</span>
                <span>{SAMPLE.caffeineArea.toFixed(1)} mAU·s</span>
              </li>
              <li>
                <span className="mono">From calibration</span>
                <span>{res.inVial.toFixed(2)} µg/mL</span>
              </li>
              <li>
                <span className="mono">× dilution</span>
                <span>1 : {SAMPLE.dilution}</span>
              </li>
              <li>
                <span className="mono">Identity</span>
                <span>tR + λmax + m/z agree</span>
              </li>
            </ol>
            <p className="data-result__note">Illustrative data. Equivalent to {(res.original / 10).toFixed(0)} mg per 100 mL.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
