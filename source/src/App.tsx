import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader } from './components/Loader';
import { Nav } from './components/Nav';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useSmoothScroll } from './hooks/useSmoothScroll';
import { ScrollTrigger } from './utils/gsap';
import { hasWebGL } from './utils/quality';
import { Hero } from './sections/Hero';
import { Workflow } from './sections/Workflow';
import { Separation } from './sections/Separation';
import { Detection } from './sections/Detection';
import { Molecular } from './sections/Molecular';
import { DataSection } from './sections/DataSection';
import { Applications } from './sections/Applications';
import { Instrument } from './sections/Instrument';
import { CaseStudy } from './sections/CaseStudy';
import { FinalCTA } from './sections/FinalCTA';
import { Footer } from './sections/Footer';

export default function App() {
  const reducedMotion = useReducedMotion();
  const webgl = useMemo(() => hasWebGL(), []);
  const [sceneReady, setSceneReady] = useState(false);
  const [introDone, setIntroDone] = useState(false);

  useSmoothScroll(!reducedMotion);

  // keep the page at the top during the loader; recompute triggers once fonts/layout settle
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 1500);
    return () => clearTimeout(t);
  }, []);

  const onSceneReady = useCallback(() => setSceneReady(true), []);
  const onIntroDone = useCallback(() => {
    setIntroDone(true);
    ScrollTrigger.refresh();
  }, []);

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Loader ready={sceneReady} onDone={onIntroDone} />
      <Nav />
      <main id="main">
        <Hero webgl={webgl} reducedMotion={reducedMotion} onSceneReady={onSceneReady} introPlayed={introDone} />
        <Workflow />
        <Separation />
        <Detection />
        <Molecular webgl={webgl} reducedMotion={reducedMotion} />
        <DataSection />
        <Applications />
        <Instrument webgl={webgl} reducedMotion={reducedMotion} />
        <CaseStudy />
        <FinalCTA />
      </main>
      <Footer />
      <div className="grain" aria-hidden="true" style={{ backgroundImage: 'url(assets/textures/grain.png)' }} />
    </>
  );
}
