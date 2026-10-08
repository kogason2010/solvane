import { linearFit } from '../utils/math';

/**
 * One coherent, illustrative dataset used across the Workflow and Data sections:
 * caffeine in an energy drink by reversed-phase HPLC-UV, confirmed by LC-MS.
 *
 * Real reference values: caffeine C8H10N4O2, monoisotopic mass 194.0804 Da;
 * [M+H]+ m/z 195.0877; [M+Na]+ m/z 217.0696; λmax ≈ 273 nm in water/methanol.
 * Calibration responses and noise are simulated for illustration.
 */
export const CALIBRATION = (() => {
  const conc = [0.5, 1, 2.5, 5, 10, 25, 50]; // µg/mL
  const slope = 103.6; // mAU·s per µg/mL (simulated response factor)
  const intercept = 0.8;
  const noise = [0.6, -1.1, 2.3, -3.0, 4.1, -6.5, 9.0];
  const area = conc.map((c, i) => slope * c + intercept + noise[i]);
  const fit = linearFit(conc, area);
  return { conc, area, fit };
})();

export const SAMPLE = {
  name: 'Energy drink',
  dilution: 25,
  caffeineArea: 1285.4, // mAU·s
  caffeineTR: 3.42, // min
  peakHeight: 182.3, // mAU
  noisePP: 0.17, // mAU, peak-to-peak baseline noise
};

export function sampleResult() {
  const { m, b } = CALIBRATION.fit;
  const inVial = (SAMPLE.caffeineArea - b) / m; // µg/mL in the injected solution
  const original = inVial * SAMPLE.dilution; // µg/mL == mg/L in the drink
  const sn = (2 * SAMPLE.peakHeight) / SAMPLE.noisePP;
  return { inVial, original, sn };
}

/** Chromatogram of the diluted sample (UV 273 nm). Caffeine is the dominant peak. */
export const SAMPLE_PEAKS = [
  { tR: 1.31, sigma: 0.035, h: 22, label: '1.31' },
  { tR: 1.86, sigma: 0.04, h: 48, label: '1.86' },
  { tR: 3.42, sigma: 0.058, h: 182.3, label: 'Caffeine' },
  { tR: 4.7, sigma: 0.07, h: 14, label: '4.70' },
  { tR: 6.08, sigma: 0.085, h: 31, label: '6.08' },
];

/** UV absorbance spectrum of caffeine (normalised), modelled from its two characteristic bands. */
export function caffeineUV(lambda: number) {
  const g = (mu: number, s: number) => Math.exp(-((lambda - mu) ** 2) / (2 * s * s));
  return 1.0 * g(206, 11) + 0.62 * g(273, 15.5) + 0.04 * g(240, 30);
}

/** ESI+ full-scan mass spectrum around caffeine. Relative abundances are illustrative. */
export const MASS_SPEC = [
  { mz: 138.0662, rel: 6, label: '' },
  { mz: 195.0877, rel: 100, label: '[M+H]⁺' },
  { mz: 196.0911, rel: 10.4, label: '' },
  { mz: 197.0932, rel: 1.1, label: '' },
  { mz: 217.0696, rel: 17.5, label: '[M+Na]⁺' },
  { mz: 218.073, rel: 1.8, label: '' },
];
