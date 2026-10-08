export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => clamp((v - a) / (b - a));
export const smoothstep = (a: number, b: number, v: number) => {
  const t = invLerp(a, b, v);
  return t * t * (3 - 2 * t);
};
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const gaussian = (x: number, mu: number, sigma: number) =>
  Math.exp(-((x - mu) * (x - mu)) / (2 * sigma * sigma));

/** Deterministic PRNG (mulberry32) so procedural visuals are identical between renders. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box–Muller normal sample from a uniform generator. */
export function normal(rand: () => number) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Ordinary least squares fit y = m x + b, with coefficient of determination. */
export function linearFit(xs: number[], ys: number[]) {
  const n = xs.length;
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
  }
  const m = sxy / sxx;
  const b = my - m * mx;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    ssRes += (ys[i] - (m * xs[i] + b)) ** 2;
    ssTot += (ys[i] - my) ** 2;
  }
  return { m, b, r2: 1 - ssRes / ssTot };
}

/** Build an SVG path string from points. */
export function toPath(points: [number, number][]) {
  let d = '';
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i];
    d += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2);
  }
  return d;
}
