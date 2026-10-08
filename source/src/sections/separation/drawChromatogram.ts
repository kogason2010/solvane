import { type Peak, peakHeight, resolution, signalAt } from '../../utils/chroma';
import { gaussian } from '../../utils/math';

const MONO = '500 10.5px "IBM Plex Mono", ui-monospace, monospace';

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export interface ChromOpts {
  peaks: Peak[];
  tMax: number;
  yMax: number;
  pad?: { l: number; r: number; t: number; b: number };
  annotate?: boolean;
  draw?: number; // 0..1 how much of the trace is drawn (left → right)
  noise?: number;
  xLabel?: string;
  yLabel?: string;
  lineColor?: string;
}

/**
 * Generic chromatogram renderer with optional teaching annotations:
 * retention time marker, integrated peak area, and the critical-pair resolution bracket.
 */
export function drawChromatogram(ctx: CanvasRenderingContext2D, w: number, h: number, o: ChromOpts) {
  const pad = o.pad ?? { l: 44, r: 16, t: 40, b: 36 };
  const gx = pad.l;
  const gy = h - pad.b;
  const gw = w - pad.l - pad.r;
  const gh = h - pad.t - pad.b;
  const X = (t: number) => gx + (t / o.tMax) * gw;
  const Y = (s: number) => gy - (s / o.yMax) * gh;
  const draw = o.draw ?? 1;

  // grid
  ctx.font = MONO;
  ctx.strokeStyle = 'rgba(170,195,225,0.08)';
  ctx.fillStyle = 'rgba(133,146,163,0.9)';
  ctx.textAlign = 'center';
  const step = o.tMax > 12 ? 2 : o.tMax > 5 ? 1 : 0.5;
  for (let t = 0; t <= o.tMax + 1e-6; t += step) {
    const x = X(t);
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x, pad.t);
    ctx.stroke();
    ctx.fillText(t.toFixed(step < 1 ? 1 : 0), x, gy + 18);
  }
  ctx.strokeStyle = 'rgba(170,195,225,0.28)';
  ctx.beginPath();
  ctx.moveTo(gx, gy);
  ctx.lineTo(gx + gw, gy);
  ctx.stroke();
  if (o.xLabel) {
    ctx.textAlign = 'right';
    ctx.fillText(o.xLabel.toUpperCase(), gx + gw, gy + 32);
  }
  if (o.yLabel) {
    ctx.save();
    ctx.translate(gx - 30, pad.t + gh / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(o.yLabel.toUpperCase(), 0, 0);
    ctx.restore();
  }

  // per-peak filled areas
  const tEnd = o.tMax * draw;
  for (const p of o.peaks) {
    const a = Math.max(0, p.tR - 4 * p.sigma);
    const b = Math.min(tEnd, p.tR + 4 * p.sigma);
    if (b <= a) continue;
    const grd = ctx.createLinearGradient(0, Y(peakHeight(p)), 0, gy);
    grd.addColorStop(0, hexA(p.color, 0.32));
    grd.addColorStop(1, hexA(p.color, 0.02));
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(X(a), gy);
    const n = 60;
    for (let i = 0; i <= n; i++) {
      const t = a + ((b - a) * i) / n;
      ctx.lineTo(X(t), Y(peakHeight(p) * gaussian(t, p.tR, p.sigma)));
    }
    ctx.lineTo(X(b), gy);
    ctx.closePath();
    ctx.fill();
  }

  // trace
  ctx.strokeStyle = o.lineColor ?? '#e6eef7';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  const N = Math.max(200, Math.floor(gw * 1.5));
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * o.tMax;
    if (t > tEnd) break;
    let s = signalAt(t, o.peaks);
    if (o.noise) s += o.noise * Math.sin(i * 12.9898) * Math.cos(i * 78.233);
    const x = X(t);
    const y = Y(Math.min(s, o.yMax * 1.05));
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.lineWidth = 1;

  if (!o.annotate || draw < 0.999) return { X, Y };

  const sorted = [...o.peaks].sort((a, b) => a.tR - b.tR);

  // retention time marker on the first peak
  const p0 = sorted[0];
  ctx.setLineDash([2, 4]);
  ctx.strokeStyle = 'rgba(220,235,250,0.45)';
  ctx.beginPath();
  ctx.moveTo(X(p0.tR), gy);
  ctx.lineTo(X(p0.tR), Y(peakHeight(p0)) - 26);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(232,240,248,0.95)';
  ctx.fillText(`tR ${p0.tR.toFixed(2)}`, X(p0.tR), Y(peakHeight(p0)) - 32);

  // critical pair
  let ci = 0;
  let minRs = Infinity;
  for (let i = 0; i < sorted.length - 1; i++) {
    const r = resolution(sorted[i], sorted[i + 1]);
    if (r < minRs) {
      minRs = r;
      ci = i;
    }
  }
  const a = sorted[ci];
  const b = sorted[ci + 1];
  const top = Math.min(Y(peakHeight(a)), Y(peakHeight(b)), Y(signalAt((a.tR + b.tR) / 2, o.peaks))) - 14;
  const xa = X(a.tR);
  const xb = X(b.tR);
  const ok = minRs >= 1.5;
  ctx.strokeStyle = ok ? 'rgba(99,211,255,0.85)' : 'rgba(255,184,119,0.9)';
  ctx.beginPath();
  ctx.moveTo(xa, top + 6);
  ctx.lineTo(xa, top);
  ctx.lineTo(xb, top);
  ctx.lineTo(xb, top + 6);
  ctx.stroke();
  ctx.fillStyle = ok ? 'rgba(99,211,255,1)' : 'rgba(255,184,119,1)';
  ctx.fillText(`Rs ${minRs.toFixed(2)}`, (xa + xb) / 2, top - 8);

  // integrated area label on the largest isolated peak
  const big = [...sorted].sort((p, q) => q.area - p.area).find((p) => p !== a && p !== b) ?? sorted[sorted.length - 1];
  ctx.fillStyle = 'rgba(232,240,248,0.85)';
  ctx.fillText('Peak area', X(big.tR), gy - 10 - Math.min(peakHeight(big) / o.yMax, 1) * gh * 0.25);
  return { X, Y };
}
