/**
 * A small, honest chromatography model shared by every visual on the site.
 *
 * - Retention:  tR = t0 · (1 + k)
 * - Band width: σ_t = tR / √N           (N = plate number)
 * - Resolution: Rs = ΔtR / (2 · (σ1 + σ2))   (equivalent to 2ΔtR / (w1 + w2) with w = 4σ)
 * - Selectivity: α = k2 / k1
 * - Solvent strength (reversed phase, linear solvent strength model):
 *     log10 k = log10 kw − S · φ    (φ = organic fraction of the mobile phase)
 *
 * Analytes separate because they partition differently between the mobile and stationary
 * phase — never because one is "heavier".
 */
import { gaussian } from './math';

export interface Peak {
  id: string;
  label: string;
  tR: number; // minutes
  sigma: number; // minutes
  area: number; // arbitrary area units (mAU·s)
  color: string;
}

export const ANALYTE_COLORS = ['#63d3ff', '#8ea2ff', '#c39bff', '#ffb877'];

export function retentionTime(t0: number, k: number) {
  return t0 * (1 + k);
}

export function bandSigma(tR: number, plates: number) {
  return tR / Math.sqrt(plates);
}

export function resolution(a: Peak, b: Peak) {
  return Math.abs(b.tR - a.tR) / (2 * (a.sigma + b.sigma));
}

export function peakHeight(p: Peak) {
  return p.area / (p.sigma * Math.sqrt(2 * Math.PI));
}

export function signalAt(t: number, peaks: Peak[], baseline = 0) {
  let s = baseline;
  for (const p of peaks) s += peakHeight(p) * gaussian(t, p.tR, p.sigma);
  return s;
}

/** Minimum resolution between adjacent peaks (after sorting by retention). */
export function minResolution(peaks: Peak[]) {
  const s = [...peaks].sort((a, b) => a.tR - b.tR);
  let min = Infinity;
  for (let i = 0; i < s.length - 1; i++) min = Math.min(min, resolution(s[i], s[i + 1]));
  return min;
}

/* ------------------------------------------------------------------ */
/* Hero: four analyte populations with distinct retention factors.     */
/* ------------------------------------------------------------------ */
export const HERO_ANALYTES = [
  { k: 0.6, color: ANALYTE_COLORS[0], area: 1.0 },
  { k: 1.4, color: ANALYTE_COLORS[1], area: 0.8 },
  { k: 2.4, color: ANALYTE_COLORS[2], area: 1.15 },
  { k: 3.8, color: ANALYTE_COLORS[3], area: 0.7 },
];

/** World-space geometry of the hero column (scene units). */
export const HERO_COLUMN = {
  inlet: -5.0, // x where the column bed starts
  outlet: 5.0, // x where the column bed ends
  detector: 6.1, // x of the optical flow cell
  radius: 0.34,
  velocity: 1.0, // mobile-phase linear velocity, scene units / sim-second
  sigma0: 0.12, // injection band half-width
  dispersion: 0.075, // band broadening coefficient (σ grows with √distance)
  simToMinutes: 0.1, // 1 sim-second ≙ 0.1 min on the displayed time axis
};

/** Retention time (sim seconds) for a population to reach the detector. */
export function heroArrival(k: number) {
  const dist = HERO_COLUMN.detector - HERO_COLUMN.inlet;
  return (dist * (1 + k)) / HERO_COLUMN.velocity;
}

/** Temporal σ of a population's band when it crosses the detector. */
export function heroSigmaT(k: number) {
  const dist = HERO_COLUMN.detector - HERO_COLUMN.inlet;
  const sx = HERO_COLUMN.sigma0 + HERO_COLUMN.dispersion * Math.sqrt(dist) * 1.0;
  const v = HERO_COLUMN.velocity / (1 + k);
  return sx / v;
}

export const HERO_SIM_END = heroArrival(HERO_ANALYTES[3].k) + 8;

export function heroSignal(tSim: number) {
  let s = 0;
  for (const a of HERO_ANALYTES) {
    const tr = heroArrival(a.k);
    const st = heroSigmaT(a.k);
    s += a.area * gaussian(tSim, tr, st);
  }
  return s;
}

/* ------------------------------------------------------------------ */
/* Separation section: LSS model with an elution-order reversal.       */
/* ------------------------------------------------------------------ */
export const LSS = {
  t0: 0.6,
  plates: 8000,
  analytes: [
    { id: 'A', label: 'Analyte A', logKw: 1.8, S: 3.6, area: 30, color: ANALYTE_COLORS[0] },
    { id: 'B', label: 'Analyte B', logKw: 2.3, S: 4.3, area: 22, color: ANALYTE_COLORS[1] },
    { id: 'C', label: 'Analyte C', logKw: 2.5, S: 4.8, area: 26, color: ANALYTE_COLORS[2] },
    { id: 'D', label: 'Analyte D', logKw: 2.75, S: 4.6, area: 34, color: ANALYTE_COLORS[3] },
  ],
};

export function lssPeaks(phi: number): (Peak & { k: number })[] {
  return LSS.analytes.map((a) => {
    const k = Math.pow(10, a.logKw - a.S * phi);
    const tR = retentionTime(LSS.t0, k);
    return { id: a.id, label: a.label, k, tR, sigma: bandSigma(tR, LSS.plates), area: a.area, color: a.color };
  });
}

/* ------------------------------------------------------------------ */
/* Case study: 12 analytes before / after method optimisation.         */
/* Illustrative, simulated data.                                       */
/* ------------------------------------------------------------------ */
const CASE_AREAS = [18, 26, 14, 22, 30, 12, 24, 19, 28, 16, 21, 25];
const BEFORE_TR = [1.1, 1.22, 1.31, 1.36, 1.62, 1.7, 1.92, 1.98, 2.3, 2.42, 2.71, 2.8];
const AFTER_TR = [1.25, 1.62, 2.05, 2.5, 3.02, 3.55, 4.18, 4.86, 5.62, 6.45, 7.38, 8.4];

function casePeaks(trs: number[], plates: number): Peak[] {
  return trs.map((tR, i) => ({
    id: `P${i + 1}`,
    label: `${i + 1}`,
    tR,
    sigma: bandSigma(tR, plates),
    area: CASE_AREAS[i],
    color: ANALYTE_COLORS[i % 4],
  }));
}

export const CASE_BEFORE = casePeaks(BEFORE_TR, 3000);
export const CASE_AFTER = casePeaks(AFTER_TR, 15000);
