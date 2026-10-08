import { HERO_SIM_END } from '../../utils/chroma';
import { clamp, invLerp, lerp, smoothstep } from '../../utils/math';

/**
 * The hero's choreography, expressed as pure functions of scroll progress p ∈ [0, 1].
 *
 *  0.00–0.10  Sample      — mixed plug turning slowly, headline
 *  0.10–0.20  Injection   — plug is drawn into the column inlet
 *  0.18–0.46  Separation  — sim clock 0 → 15 s (bands pull apart, all four visible in the bed)
 *  0.46–0.86  Detection   — sim clock 15 s → end (bands cross the flow cell, trace is written)
 *  0.86–1.00  Insight     — camera pulls back to frame the finished chromatogram
 */
export const PHASES = [
  { id: 'sample', label: 'Sample', start: 0.0, end: 0.2 },
  { id: 'separation', label: 'Separation', start: 0.2, end: 0.47 },
  { id: 'detection', label: 'Detection', start: 0.47, end: 0.66 },
  { id: 'signal', label: 'Signal', start: 0.66, end: 0.86 },
  { id: 'insight', label: 'Insight', start: 0.86, end: 1.0 },
] as const;

const SIM_SPLIT = 15;

export function simClock(p: number) {
  if (p < 0.18) return 0;
  if (p < 0.46) return lerp(0, SIM_SPLIT, invLerp(0.18, 0.46, p));
  return lerp(SIM_SPLIT, HERO_SIM_END, invLerp(0.46, 0.86, p));
}

export function injectAmount(p: number) {
  return smoothstep(0.09, 0.2, p);
}

/** How much analyte colour is revealed (mixture looks uniform until separation is visible). */
export function revealAmount(p: number) {
  return smoothstep(0.24, 0.4, p);
}

export function particleFade(p: number) {
  return lerp(1, 0.35, smoothstep(0.9, 1.0, p));
}

export interface CamKey {
  p: number;
  pos: [number, number, number];
  target: [number, number, number];
}

export const CAMERA_KEYS: CamKey[] = [
  { p: 0.0, pos: [-9.6, 0.9, 6.6], target: [-9.1, 0.35, 0] },
  { p: 0.1, pos: [-8.6, 0.7, 5.4], target: [-7.8, 0.25, 0] },
  { p: 0.2, pos: [-6.6, 0.8, 4.4], target: [-5.0, 0.05, 0] },
  { p: 0.3, pos: [-3.8, 1.05, 4.6], target: [-2.6, 0.0, 0] },
  { p: 0.44, pos: [1.3, 1.5, 11.6], target: [1.7, 0.3, 0] },
  { p: 0.56, pos: [4.4, 1.6, 7.8], target: [5.1, 0.95, 0] },
  { p: 0.7, pos: [3.9, 1.9, 9.4], target: [3.8, 1.3, 0] },
  { p: 0.84, pos: [2.6, 2.0, 11.4], target: [2.0, 1.15, 0] },
  { p: 1.0, pos: [1.4, 1.9, 14.0], target: [1.4, 1.0, 0] },
];

/** Reduced-motion: a single composed frame that shows the whole instrument path. */
export const STATIC_CAMERA: CamKey = { p: 0, pos: [0.6, 1.6, 14.5], target: [0.6, 0.9, 0] };

export function cameraAt(p: number, out: { pos: number[]; target: number[] }) {
  const keys = CAMERA_KEYS;
  let i = 0;
  while (i < keys.length - 2 && p > keys[i + 1].p) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const t = clamp((p - a.p) / (b.p - a.p));
  const e = t * t * (3 - 2 * t);
  for (let j = 0; j < 3; j++) {
    out.pos[j] = lerp(a.pos[j], b.pos[j], e);
    out.target[j] = lerp(a.target[j], b.target[j], e);
  }
  return out;
}

export function activePhase(p: number) {
  for (let i = PHASES.length - 1; i >= 0; i--) if (p >= PHASES[i].start) return i;
  return 0;
}
