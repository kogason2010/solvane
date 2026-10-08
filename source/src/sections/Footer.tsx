import { BrandMark } from '../components/Icons';
import { BRAND, NAV } from '../data/content';
import { scrollToTarget } from '../hooks/useSmoothScroll';
import '../styles/footer.css';

const COLUMNS = [
  { title: 'Science', items: ['Separation', 'Detection', 'Quantitation', 'Method development'] },
  { title: 'Technology', items: ['UHPLC', 'LC-MS', 'Ion chromatography', 'TOC analysis'] },
  { title: 'Company', items: ['About', 'Careers', 'Press', 'Contact'] },
];

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__top">
          <div className="footer__brand">
            <a
              href="#top"
              className="brand"
              onClick={(e) => {
                e.preventDefault();
                scrollToTarget('#top');
              }}
            >
              <BrandMark />
              <span>{BRAND.name}</span>
            </a>
            <p className="body-s">Separation, detection and data systems for analytical science.</p>
          </div>
          {COLUMNS.map((c) => (
            <nav key={c.title} aria-label={c.title} className="footer__col">
              <p className="mono">{c.title}</p>
              <ul>
                {c.items.map((i) => (
                  <li key={i}>
                    <span className="footer__item">{i}</span>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="footer__word display" aria-hidden="true">
          {BRAND.name}
        </div>
        <div className="footer__bottom mono">
          <span>© {new Date().getFullYear()} Solvane — a fictional company created for a design study.</span>
          <span>No regulatory, certification or performance claims are made. All data illustrative.</span>
          <span className="footer__links">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="link-u"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToTarget(n.href);
                }}
              >
                {n.label}
              </a>
            ))}
          </span>
        </div>
      </div>
    </footer>
  );
}
