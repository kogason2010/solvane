import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { HERO_COPY, HERO_PHASES } from '../data/content';
import { MagneticButton } from '../components/MagneticButton';
import { ArrowDown, ArrowRight } from '../components/Icons';
import { useInView } from '../hooks/useInView';
import { useScrollProgress } from '../hooks/useScrollProgress';
import { heroState } from '../utils/scrollStore';
import { HERO_ANALYTES, HERO_COLUMN, heroArrival } from '../utils/chroma';
import { smoothstep } from '../utils/math';
import { heroFrame } from '../three/hero/heroFrame';
import { heroAxisEl, heroLabelEls } from '../three/hero/labels';
import { PHASES, activePhase } from '../three/hero/timeline';
import { gsap } from '../utils/gsap';
import '../styles/hero.css';

const HeroCanvas = lazy(() => import('../three/HeroCanvas'));

interface Props {
  webgl: boolean;
  reducedMotion: boolean;
  onSceneReady: () => void;
  introPlayed: boolean;
}

export function Hero({ webgl, reducedMotion, onSceneReady, introPlayed }: Props) {
  const section = useRef<HTMLElement>(null);
  const intro = useRef<HTMLDivElement>(null);
  const railFill = useRef<HTMLDivElement>(null);
  const scrollCue = useRef<HTMLDivElement>(null);
  const readT = useRef<HTMLSpanElement>(null);
  const readA = useRef<HTMLSpanElement>(null);
  const readout = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState(0);
  const phaseRef = useRef(0);
  const visible = useInView(section, '0px');

  // scroll → progress (consumed by WebGL) + DOM choreography
  useScrollProgress(section, (p) => {
    heroState.progress = p;
    const i = p < 0.075 ? -1 : activePhase(p);
    if (i !== phaseRef.current) {
      phaseRef.current = i;
      setPhase(i);
    }
    if (intro.current) {
      const o = 1 - smoothstep(0.015, 0.07, p);
      intro.current.style.opacity = o.toFixed(3);
      intro.current.style.transform = `translate3d(0, ${(-p * 900).toFixed(1)}px, 0)`;
      intro.current.style.visibility = o < 0.01 ? 'hidden' : 'visible';
    }
    if (railFill.current) {
      railFill.current.style.transform = `scaleY(${p.toFixed(4)})`;
      const rail = railFill.current.parentElement?.parentElement;
      if (rail) rail.style.opacity = smoothstep(0.03, 0.09, p).toFixed(3);
    }
    if (scrollCue.current) scrollCue.current.style.opacity = (1 - smoothstep(0.0, 0.03, p)).toFixed(3);
    if (readout.current) readout.current.style.opacity = smoothstep(0.17, 0.24, p).toFixed(3);
  });

  // pointer → normalized coordinates for camera parallax + particle field
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      heroState.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      heroState.pointerY = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  // live instrument readout (reads the same values that drive the detector)
  useEffect(() => {
    if (!visible) return;
    let raf = 0;
    const loop = () => {
      if (readT.current) readT.current.textContent = (heroFrame.sim * HERO_COLUMN.simToMinutes).toFixed(2);
      if (readA.current) readA.current.textContent = (heroFrame.signal * 0.95).toFixed(3);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  // headline entrance after the loader lifts
  useEffect(() => {
    if (!introPlayed || !intro.current) return;
    if (reducedMotion) return;
    const ctx = gsap.context(() => {
      gsap.from('.hero__line > span', { yPercent: 115, duration: 1.5, stagger: 0.1, ease: 'expo.out' });
      gsap.from('.hero__fade', { y: 20, opacity: 0, duration: 1.2, stagger: 0.08, delay: 0.35, ease: 'power3.out' });
    }, intro);
    return () => ctx.revert();
  }, [introPlayed, reducedMotion]);

  return (
    <section id="top" className="hero" ref={section} aria-labelledby="hero-title">
      <div className="hero__sticky">
        <div className="hero__bg" aria-hidden="true" />

        {webgl ? (
          <Suspense fallback={null}>
            <HeroCanvas active={visible} reducedMotion={reducedMotion} onReady={onSceneReady} />
          </Suspense>
        ) : (
          <img
            className="hero__fallback"
            src="assets/images/hero-fallback.png"
            alt="Illustration of a sample separating inside a glass column into four coloured bands, with the resulting chromatogram above."
            onLoad={onSceneReady}
            onError={onSceneReady}
          />
        )}

        <div className="hero__vignette" aria-hidden="true" />

        {/* peak annotations positioned by the WebGL scene */}
        <div className="hero__labels" aria-hidden="true">
          {HERO_ANALYTES.map((a, i) => (
            <div
              key={i}
              className="peak-label"
              ref={(el) => {
                heroLabelEls[i] = el;
              }}
              style={{ ['--c' as string]: a.color }}
            >
              <span className="peak-label__dot" />
              <span className="mono">tR {(heroArrival(a.k) * HERO_COLUMN.simToMinutes).toFixed(2)} min</span>
            </div>
          ))}
          <div className="axis-label mono" ref={(el) => (heroAxisEl.current = el)}>
            Retention time (min) &nbsp;→
          </div>
        </div>

        <div className="hero__intro container" ref={intro}>
          <p className="mono hero__fade hero__eyebrow">
            <span className="dot" aria-hidden="true" /> {HERO_COPY.eyebrow}
          </p>
          <h1 id="hero-title" className="h-xl hero__title">
            {HERO_COPY.headline.map((l, i) => (
              <span className="hero__line" key={i}>
                <span className={i === 1 ? 'grad-text' : undefined}>{l}</span>
              </span>
            ))}
          </h1>
          <p className="lede hero__fade hero__lede">{HERO_COPY.lede}</p>
          <div className="hero__ctas hero__fade">
            <MagneticButton href="#science">
              <span className="btn__label">Explore the Science</span>
              <ArrowRight />
            </MagneticButton>
            <MagneticButton href="#technology" variant="ghost">
              <span className="btn__label">View Capabilities</span>
            </MagneticButton>
          </div>
        </div>

        {/* phase captions */}
        <div className="hero__captions container" aria-live="polite">
          {HERO_PHASES.map((c, i) => (
            <div key={c.num} className={`hero-caption ${phase === i ? 'is-active' : ''}`} aria-hidden={phase !== i}>
              <p className="mono hero-caption__num">
                <span>{c.num}</span> / 05
              </p>
              <h2 className="h-lg hero-caption__title">{c.title}</h2>
              <p className="hero-caption__text">{c.text}</p>
            </div>
          ))}
        </div>

        {/* progress rail */}
        <div className="hero__rail" aria-hidden="true">
          <div className="hero__rail-track">
            <div className="hero__rail-fill" ref={railFill} />
          </div>
          <ol>
            {PHASES.map((ph, i) => (
              <li key={ph.id} className={`mono ${phase >= i ? 'is-on' : ''} ${phase === i ? 'is-current' : ''}`}>
                {ph.label}
              </li>
            ))}
          </ol>
        </div>

        <div className="hero__readout mono" ref={readout} aria-hidden="true">
          <span>
            t <span ref={readT}>0.00</span> min
          </span>
          <span className="hero__readout-sep" />
          <span>
            A<sub>254</sub> <span ref={readA}>0.000</span> AU
          </span>
        </div>

        <div className="hero__scroll mono" ref={scrollCue}>
          <span>Scroll to run the sample</span>
          <span className="hero__scroll-line" aria-hidden="true">
            <ArrowDown className="hero__scroll-icon" />
          </span>
        </div>
      </div>
    </section>
  );
}
