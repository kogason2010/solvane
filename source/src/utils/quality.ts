export type QualityTier = 'high' | 'medium' | 'low';

export interface QualityProfile {
  tier: QualityTier;
  isMobile: boolean;
  heroParticles: number;
  bedParticles: number;
  moleculeField: number;
  dpr: [number, number];
}

let cached: QualityProfile | null = null;

/**
 * Coarse device classification used to size particle budgets before the first frame.
 * A runtime FPS monitor (see AdaptiveDpr) refines resolution afterwards.
 */
export function getQuality(): QualityProfile {
  if (cached) return cached;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.innerWidth < 820;
  const isMobile = coarse && narrow;
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 8;

  let tier: QualityTier = 'high';
  if (isMobile || cores <= 4 || mem <= 4) tier = 'medium';
  if ((isMobile && (cores <= 4 || mem <= 3)) || cores <= 2) tier = 'low';

  const table: Record<QualityTier, Omit<QualityProfile, 'tier' | 'isMobile'>> = {
    high: { heroParticles: 26000, bedParticles: 5000, moleculeField: 140, dpr: [1, 1.8] },
    medium: { heroParticles: 14000, bedParticles: 2800, moleculeField: 80, dpr: [1, 1.5] },
    low: { heroParticles: 7000, bedParticles: 1400, moleculeField: 40, dpr: [0.75, 1.25] },
  };
  cached = { tier, isMobile, ...table[tier] };
  return cached;
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
