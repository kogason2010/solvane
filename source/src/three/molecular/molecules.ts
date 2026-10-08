/**
 * Procedural molecular geometry (Å-scale scene units). Ring atoms are generated from regular
 * polygons with ~1.4 Å bonds; substituents point radially outward; methyl hydrogens are placed
 * tetrahedrally. Accurate enough to read as real chemistry, light enough to build at runtime.
 */
export type Element = 'C' | 'H' | 'N' | 'O';
export interface Atom {
  el: Element;
  p: [number, number, number];
}
export interface Bond {
  a: number;
  b: number;
  order: 1 | 2;
}
export interface Molecule {
  name: string;
  formula: string;
  atoms: Atom[];
  bonds: Bond[];
}

export const ELEMENT_STYLE: Record<Element, { r: number; color: string }> = {
  C: { r: 0.34, color: '#3b4452' },
  H: { r: 0.2, color: '#dbe3ec' },
  N: { r: 0.33, color: '#6e98ff' },
  O: { r: 0.32, color: '#ff9470' },
};

type V2 = [number, number];
const add = (a: V2, b: V2, s = 1): V2 => [a[0] + b[0] * s, a[1] + b[1] * s];
const norm = (a: V2): V2 => {
  const l = Math.hypot(a[0], a[1]);
  return [a[0] / l, a[1] / l];
};

class Builder {
  atoms: Atom[] = [];
  bonds: Bond[] = [];
  atom(el: Element, p: V2, z = 0) {
    this.atoms.push({ el, p: [p[0], p[1], z] });
    return this.atoms.length - 1;
  }
  bond(a: number, b: number, order: 1 | 2 = 1) {
    this.bonds.push({ a, b, order });
  }
  /** Methyl group on `onto`, pointing along `dir`. */
  methyl(onto: number, dir: V2) {
    const base = this.atoms[onto].p;
    const d = norm(dir);
    const c = this.atom('C', add([base[0], base[1]], d, 1.47));
    const cp = this.atoms[c].p;
    const perp: V2 = [-d[1], d[0]];
    for (let i = 0; i < 3; i++) {
      const th = (i * 2 * Math.PI) / 3 + 0.5;
      const x = cp[0] + 1.09 * (0.334 * d[0] + 0.943 * Math.cos(th) * perp[0]);
      const y = cp[1] + 1.09 * (0.334 * d[1] + 0.943 * Math.cos(th) * perp[1]);
      const z = 1.09 * 0.943 * Math.sin(th);
      this.bond(c, this.atom('H', [x, y], z));
    }
    return c;
  }
  center() {
    const n = this.atoms.length;
    const c = [0, 0, 0];
    this.atoms.forEach((a) => a.p.forEach((v, i) => (c[i] += v / n)));
    this.atoms.forEach((a) => {
      a.p = [a.p[0] - c[0], a.p[1] - c[1], a.p[2] - c[2]];
    });
  }
}

/** Caffeine, C8H10N4O2 (1,3,7-trimethylxanthine). */
export function caffeine(): Molecule {
  const m = new Builder();
  const N1 = m.atom('N', [-1.212, 0.7]);
  const C2 = m.atom('C', [0, 1.4]);
  const N3 = m.atom('N', [1.212, 0.7]);
  const C4 = m.atom('C', [1.212, -0.7]);
  const C5 = m.atom('C', [0, -1.4]);
  const C6 = m.atom('C', [-1.212, -0.7]);
  const N7 = m.atom('N', [0.291, -2.769]);
  const C8 = m.atom('C', [1.683, -2.916]);
  const N9 = m.atom('N', [2.253, -1.637]);
  m.bond(N1, C2);
  m.bond(C2, N3);
  m.bond(N3, C4);
  m.bond(C4, C5, 2);
  m.bond(C5, C6);
  m.bond(C6, N1);
  m.bond(C5, N7);
  m.bond(N7, C8);
  m.bond(C8, N9, 2);
  m.bond(N9, C4);
  m.bond(C2, m.atom('O', [0, 2.63]), 2);
  m.bond(C6, m.atom('O', [-2.277, -1.315]), 2);
  m.bond(N1, m.methyl(N1, [-0.866, 0.5]));
  m.bond(N3, m.methyl(N3, [0.866, 0.5]));
  m.bond(N7, m.methyl(N7, [-0.669, -0.743]));
  m.bond(C8, m.atom('H', [2.222, -3.851]));
  m.center();
  return { name: 'Caffeine', formula: 'C₈H₁₀N₄O₂', atoms: m.atoms, bonds: m.bonds };
}

/** Paracetamol (acetaminophen), C8H9NO2. */
export function paracetamol(): Molecule {
  const m = new Builder();
  const ring: number[] = [];
  const angs = [90, 30, -30, -90, -150, 150];
  angs.forEach((a) => {
    const r = (a * Math.PI) / 180;
    ring.push(m.atom('C', [1.4 * Math.cos(r), 1.4 * Math.sin(r)]));
  });
  for (let i = 0; i < 6; i++) m.bond(ring[i], ring[(i + 1) % 6], i % 2 === 0 ? 2 : 1);
  [1, 2, 4, 5].forEach((i) => {
    const r = (angs[i] * Math.PI) / 180;
    m.bond(ring[i], m.atom('H', [2.48 * Math.cos(r), 2.48 * Math.sin(r)]));
  });
  const O = m.atom('O', [0, 2.76]);
  m.bond(ring[0], O);
  m.bond(O, m.atom('H', [0.82, 3.3]));
  const N = m.atom('N', [0, -2.8]);
  m.bond(ring[3], N);
  m.bond(N, m.atom('H', [-0.9, -3.28]));
  const Cc = m.atom('C', [1.2, -3.5]);
  m.bond(N, Cc);
  m.bond(Cc, m.atom('O', [2.28, -2.95]), 2);
  m.bond(Cc, m.methyl(Cc, [0, -1]));
  m.center();
  return { name: 'Paracetamol', formula: 'C₈H₉NO₂', atoms: m.atoms, bonds: m.bonds };
}

/** Benzoic acid, C7H6O2. */
export function benzoicAcid(): Molecule {
  const m = new Builder();
  const ring: number[] = [];
  const angs = [90, 30, -30, -90, -150, 150];
  angs.forEach((a) => {
    const r = (a * Math.PI) / 180;
    ring.push(m.atom('C', [1.4 * Math.cos(r), 1.4 * Math.sin(r)]));
  });
  for (let i = 0; i < 6; i++) m.bond(ring[i], ring[(i + 1) % 6], i % 2 === 0 ? 2 : 1);
  [1, 2, 3, 4, 5].forEach((i) => {
    const r = (angs[i] * Math.PI) / 180;
    m.bond(ring[i], m.atom('H', [2.48 * Math.cos(r), 2.48 * Math.sin(r)]));
  });
  const C = m.atom('C', [0, 2.9]);
  m.bond(ring[0], C);
  m.bond(C, m.atom('O', [1.07, 3.52]), 2);
  const O = m.atom('O', [-1.07, 3.52]);
  m.bond(C, O);
  m.bond(O, m.atom('H', [-1.0, 4.48]));
  m.center();
  return { name: 'Benzoic acid', formula: 'C₇H₆O₂', atoms: m.atoms, bonds: m.bonds };
}
