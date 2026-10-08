import { useEffect, useRef } from 'react';
import { SectionIndex } from '../components/SectionIndex';
import { SplitText } from '../components/SplitText';
import { APPLICATIONS } from '../data/applications';
import { useReveal } from '../hooks/useReveal';
import { ScrollTrigger } from '../utils/gsap';
import '../styles/applications.css';

/**
 * Horizontal gallery driven by vertical scroll (desktop): the section's height is set to the
 * track's overflow so the sticky viewport translates the track 1:1 with scroll.
 * Narrow screens get a native, swipeable scroll-snap row instead.
 */
export function Applications() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useReveal(section);

  useEffect(() => {
    const sec = section.current;
    const tr = track.current;
    if (!sec || !tr) return;
    const mq = window.matchMedia('(min-width: 901px)');
    let st: ScrollTrigger | null = null;

    const setup = () => {
      st?.kill();
      st = null;
      tr.style.transform = '';
      sec.style.height = '';
      if (!mq.matches) return;
      const distance = Math.max(0, tr.scrollWidth - window.innerWidth);
      sec.style.height = `${distance + window.innerHeight}px`;
      const cards = Array.from(tr.querySelectorAll<HTMLElement>('.app-card'));
      st = ScrollTrigger.create({
        trigger: sec,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          const x = -distance * self.progress;
          tr.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
          const i = Math.min(APPLICATIONS.length - 1, Math.round(self.progress * (APPLICATIONS.length - 1)));
          if (counter.current) counter.current.textContent = String(i + 1).padStart(2, '0');
          if (bar.current) bar.current.style.transform = `scaleX(${self.progress.toFixed(4)})`;
          // subtle parallax inside each image
          const vw = window.innerWidth;
          cards.forEach((c) => {
            const r = c.getBoundingClientRect();
            const center = (r.left + r.width / 2 - vw / 2) / vw;
            const img = c.querySelector<HTMLElement>('img');
            if (img) img.style.transform = `translate3d(${(-center * 40).toFixed(1)}px,0,0) scale(1.12)`;
          });
        },
      });
      ScrollTrigger.refresh();
    };

    setup();
    const onResize = () => setup();
    mq.addEventListener('change', onResize);
    window.addEventListener('resize', onResize);
    return () => {
      st?.kill();
      mq.removeEventListener('change', onResize);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <section id="applications" className="apps" ref={section} aria-labelledby="apps-title">
      <div className="apps__sticky">
        <div className="apps__track" ref={track}>
          <div className="apps__intro">
            <SectionIndex num="07" label="Applications" />
            <SplitText as="h2" id="apps-title" className="h-lg" text="Wherever the answer is in the sample." />
            <p className="lede" data-reveal>
              The same principles — separate, detect, quantify — answer very different questions across industries.
            </p>
            <div className="apps__meta mono" aria-hidden="true">
              <span>
                <span ref={counter}>01</span> / {String(APPLICATIONS.length).padStart(2, '0')}
              </span>
              <span className="apps__bar">
                <span ref={bar} />
              </span>
            </div>
          </div>

          {APPLICATIONS.map((a, i) => (
            <article key={a.id} className="app-card" aria-labelledby={`app-${a.id}`}>
              <div className="app-card__media">
                <img src={`assets/images/applications/${a.id}.webp`} alt={a.alt} loading="lazy" decoding="async" width={1000} height={1250} />
                <span className="app-card__num mono">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div className="app-card__body">
                <h3 id={`app-${a.id}`} className="h-md app-card__title">
                  {a.name}
                </h3>
                <p className="app-card__line">{a.line}</p>
                <ul className="app-card__tags">
                  {a.measures.map((m) => (
                    <li key={m} className="tag">
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
          <div className="apps__end" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
