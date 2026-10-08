import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { BRAND, NAV } from '../data/content';
import { ScrollTrigger } from '../utils/gsap';
import { scrollToTarget, getLenis } from '../hooks/useSmoothScroll';
import { BrandMark } from './Icons';
import { MagneticButton } from './MagneticButton';

export function Nav() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const bar = useRef<HTMLDivElement>(null);
  const burger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const triggers: ScrollTrigger[] = [];
    triggers.push(
      ScrollTrigger.create({
        trigger: '#science',
        start: 'top 85%',
        onToggle: (self) => setSolid(self.isActive || self.progress > 0),
        end: 'max',
      }),
    );
    triggers.push(
      ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate: (self) => {
          if (bar.current) bar.current.style.transform = `scaleX(${self.progress.toFixed(4)})`;
        },
      }),
    );
    NAV.forEach((n) => {
      const el = document.querySelector(n.href);
      if (!el) return;
      triggers.push(
        ScrollTrigger.create({
          trigger: el,
          start: 'top 50%',
          end: 'bottom 50%',
          onToggle: (self) => self.isActive && setActive(n.href),
        }),
      );
    });
    return () => triggers.forEach((t) => t.kill());
  }, []);

  // lock scrolling while the mobile menu is open; Escape closes it
  useEffect(() => {
    const lenis = getLenis();
    if (open) lenis?.stop();
    else lenis?.start();
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
        burger.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const go = (href: string) => (e: MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    // allow the menu to start closing before scrolling
    window.setTimeout(() => scrollToTarget(href), open ? 120 : 0);
  };

  return (
    <>
      <header className={`nav ${solid || open ? 'is-solid' : ''}`}>
        <div className="container nav__inner">
          <a href="#top" className="brand" onClick={go('#top')} aria-label={`${BRAND.name} — back to top`}>
            <BrandMark />
            <span>{BRAND.name}</span>
          </a>
          <nav aria-label="Primary">
            <ul className="nav__links">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a href={n.href} className="link-u" aria-current={active === n.href ? 'true' : undefined} onClick={go(n.href)}>
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <MagneticButton href="#contact" variant="ghost" className="nav__cta">
            <span className="btn__label">Contact</span>
          </MagneticButton>
          <button
            ref={burger}
            className="nav__burger"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            <span />
          </button>
        </div>
        <div className="nav__progress" ref={bar} aria-hidden="true" />
      </header>

      <div id="mobile-menu" className={`mobile-menu ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <nav aria-label="Mobile">
          <ol>
            {[...NAV, { label: 'Contact', href: '#contact' }].map((n, i) => (
              <li key={n.href}>
                <a href={n.href} onClick={go(n.href)} tabIndex={open ? 0 : -1}>
                  <span>{n.label}</span>
                  <span className="mono">0{i + 1}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <p className="mono">Solvane is a fictional analytical science studio.</p>
      </div>
    </>
  );
}
