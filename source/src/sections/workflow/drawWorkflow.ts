import { ANALYTE_COLORS } from '../../utils/chroma';
import { clamp, gaussian, normal, rng, smoothstep } from '../../utils/math';
import { CALIBRATION, SAMPLE, sampleResult } from '../../data/analytical';

const MONO = '500 10.5px "IBM Plex Mono", ui-monospace, monospace';
const LINE = 'rgba(170,195,225,0.28)';
const LINE_SOFT = 'rgba(170,195,225,0.12)';
const TEXT = 'rgba(205,218,232,0.85)';
const MUTED = 'rgba(133,146,163,0.9)';

interface Dot {
  pop: number;
  a: number;
  b: number;
  c: number;
  n: number;
}
const rand = rng(404);
const DOTS: Dot[] = Array.from({ length: 360 }, (_, i) => ({
  pop: i % 4,
  a: rand(),
  b: rand(),
  c: rand(),
  n: clamp(normal(rand), -2.6, 2.6),
}));
const K = [0.5, 1.3, 2.4, 3.9];

function weight(s: number, i: number) {
  return 1 - smoothstep(0.32, 0.62, Math.abs(s - (i + 0.5)));
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color = MUTED, align: CanvasTextAlign = 'left') {
  ctx.font = MONO;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(text.toUpperCase(), x, y);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ------------------------------------------------------------- 01 sample */
function drawSample(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, lp: number) {
  const vw = Math.min(150, w * 0.26);
  const vh = vw * 1.9;
  const cx = w / 2;
  const top = h / 2 - vh / 2 + 20;
  const x0 = cx - vw / 2;
  // cap
  ctx.fillStyle = 'rgba(30,38,48,0.9)';
  roundRect(ctx, x0 - 6, top - 34, vw + 12, 34, 4);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.stroke();
  // vial
  ctx.strokeStyle = 'rgba(180,205,235,0.45)';
  ctx.lineWidth = 1.2;
  roundRect(ctx, x0, top, vw, vh, 14);
  ctx.stroke();
  ctx.lineWidth = 1;
  const level = top + vh * 0.38;
  const grd = ctx.createLinearGradient(0, level, 0, top + vh);
  grd.addColorStop(0, 'rgba(120,170,230,0.10)');
  grd.addColorStop(1, 'rgba(120,170,230,0.03)');
  ctx.fillStyle = grd;
  roundRect(ctx, x0 + 3, level, vw - 6, top + vh - level - 3, 11);
  ctx.fill();
  ctx.strokeStyle = 'rgba(160,200,240,0.35)';
  ctx.beginPath();
  ctx.moveTo(x0 + 4, level);
  ctx.lineTo(x0 + vw - 4, level);
  ctx.stroke();

  // needle
  const needleY = top - 120 + smoothstep(0.1, 0.55, lp) * (vh * 0.62 + 90) - smoothstep(0.7, 1, lp) * 60;
  ctx.strokeStyle = 'rgba(200,210,222,0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, top - 160);
  ctx.lineTo(cx, needleY);
  ctx.stroke();
  ctx.lineWidth = 1;

  // mixed analytes
  const liquidH = top + vh - level - 16;
  const draw = smoothstep(0.55, 0.85, lp);
  for (const d of DOTS) {
    let x = x0 + 12 + d.a * (vw - 24) + Math.sin(t * (0.6 + d.c) + d.b * 20) * 4;
    let y = level + 8 + d.b * liquidH + Math.cos(t * (0.5 + d.a) + d.c * 20) * 4;
    // a share of dots is aspirated into the needle
    if (d.c < 0.12) {
      const k = clamp(draw * 1.4 - d.a * 0.4);
      x = x + (cx - x) * k;
      y = y + (needleY - 30 - d.b * 40 - y) * k;
    }
    ctx.fillStyle = 'rgba(205,220,238,0.75)';
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  label(ctx, 'Sample vial · 2 µL injection', cx, top + vh + 34, TEXT, 'center');
}

/* ------------------------------------------------------------- 02 separation */
function drawSeparation(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, lp: number) {
  const L = w * 0.78;
  const x0 = (w - L) / 2;
  const cy = h / 2;
  const R = 22;
  // column body
  ctx.strokeStyle = 'rgba(180,205,235,0.45)';
  roundRect(ctx, x0, cy - R, L, R * 2, 6);
  ctx.stroke();
  // packing
  ctx.fillStyle = 'rgba(140,160,185,0.12)';
  for (let i = 0; i < 260; i++) {
    const px = x0 + 6 + ((i * 73.13) % 1) * 0 + (i / 260) * (L - 12);
    const py = cy - R + 5 + (((i * 0.618) % 1) * (R * 2 - 10));
    ctx.beginPath();
    ctx.arc(px, py, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // flow arrow
  label(ctx, 'Mobile phase →', x0, cy - R - 16);
  label(ctx, 'Stationary phase · C18, 1.7 µm', x0 + L, cy + R + 26, MUTED, 'right');

  const sim = smoothstep(0.05, 0.95, lp) * 1.0;
  for (const d of DOTS) {
    const k = K[d.pop];
    const v = 1 / (1 + k);
    const dist = sim * 2.7 * v;
    const sigma = 0.012 + 0.03 * Math.sqrt(dist);
    const xn = 0.02 + dist + d.n * sigma;
    if (xn > 1.02) continue;
    const x = x0 + xn * L;
    const y = cy + (d.b - 0.5) * (R * 2 - 10) + Math.sin(t * 2 + d.a * 30) * 1.2;
    ctx.fillStyle = ANALYTE_COLORS[d.pop];
    ctx.globalAlpha *= 0.9;
    ctx.beginPath();
    ctx.arc(x, y, 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha /= 0.9;
  }
  // band legend
  ['Weak interaction', '', '', 'Strong interaction'].forEach((s, i) => {
    if (!s) return;
    ctx.fillStyle = ANALYTE_COLORS[i];
    ctx.beginPath();
    ctx.arc(x0 + (i === 0 ? 4 : L - 120), cy + R + 52, 3, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, s, x0 + (i === 0 ? 14 : L - 110), cy + R + 56);
  });
}

/* ------------------------------------------------------------- 03 detection */
function drawDetection(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, lp: number) {
  const cx = w * 0.36;
  const cy = h / 2;
  // channel
  ctx.strokeStyle = 'rgba(180,205,235,0.4)';
  ctx.beginPath();
  ctx.moveTo(w * 0.04, cy - 10);
  ctx.lineTo(w * 0.62, cy - 10);
  ctx.moveTo(w * 0.04, cy + 10);
  ctx.lineTo(w * 0.62, cy + 10);
  ctx.stroke();
  // cell window
  ctx.strokeStyle = LINE;
  ctx.strokeRect(cx - 26, cy - 26, 52, 52);

  // band passes through at a position driven by lp
  const bandX = w * 0.04 + lp * w * 0.6;
  const inBeam = gaussian(bandX, cx, 26);
  const A = 0.85 * inBeam;
  const T = Math.pow(10, -A);
  // beam
  const lampY = cy + 120;
  const diodeY = cy - 120;
  const bg = ctx.createLinearGradient(0, lampY, 0, cy);
  bg.addColorStop(0, 'rgba(150,180,255,0.0)');
  bg.addColorStop(0.2, 'rgba(150,180,255,0.55)');
  bg.addColorStop(1, 'rgba(150,180,255,0.55)');
  ctx.fillStyle = bg;
  ctx.fillRect(cx - 5, cy, 10, lampY - cy - 14);
  ctx.fillStyle = `rgba(150,180,255,${(0.55 * T).toFixed(3)})`;
  ctx.fillRect(cx - 5, diodeY + 14, 10, cy - diodeY - 14);
  // lamp + photodiode
  ctx.fillStyle = 'rgba(28,35,45,1)';
  ctx.strokeStyle = LINE;
  roundRect(ctx, cx - 30, lampY - 14, 60, 28, 4);
  ctx.fill();
  ctx.stroke();
  roundRect(ctx, cx - 26, diodeY - 14, 52, 28, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = `rgba(${Math.round(120 + 100 * T)},${Math.round(150 + 90 * T)},255,1)`;
  ctx.fillRect(cx - 9, diodeY + 10, 18, 4);
  label(ctx, 'Deuterium lamp · 273 nm', cx + 44, lampY + 4);
  label(ctx, 'Photodiode', cx + 40, diodeY + 4);
  label(ctx, `I/I₀ = ${T.toFixed(2)}`, cx + 40, diodeY + 22, TEXT);

  // band dots
  for (const d of DOTS) {
    if (d.pop !== 2) continue;
    const x = bandX + d.n * 14;
    const y = cy + (d.b - 0.5) * 16;
    ctx.fillStyle = ANALYTE_COLORS[2];
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // live trace (absorbance vs time) on the right
  const gx = w * 0.68;
  const gw = w * 0.28;
  const gy = cy + 60;
  const gh = 120;
  ctx.strokeStyle = LINE_SOFT;
  ctx.beginPath();
  ctx.moveTo(gx, gy);
  ctx.lineTo(gx + gw, gy);
  ctx.moveTo(gx, gy);
  ctx.lineTo(gx, gy - gh);
  ctx.stroke();
  ctx.strokeStyle = ANALYTE_COLORS[2];
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  const N = 120;
  for (let i = 0; i <= N; i++) {
    const f = i / N;
    if (f > lp) break;
    const bx = w * 0.04 + f * w * 0.6;
    const a = 0.85 * gaussian(bx, cx, 26);
    const x = gx + f * gw;
    const y = gy - a * gh;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.lineWidth = 1;
  label(ctx, `A = ${A.toFixed(3)} AU`, gx, gy - gh - 10, TEXT);
  label(ctx, 'time →', gx + gw, gy + 18, MUTED, 'right');
  label(ctx, 'A = −log₁₀(I/I₀) = ε·b·c', w * 0.04, cy + 170, MUTED);
}

/* ------------------------------------------------------------- 04 quantitation */
function drawQuant(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, lp: number) {
  const res = sampleResult();
  const gx = w * 0.06;
  const gw = w * 0.5;
  const gy = h / 2 + 110;
  const gh = 230;
  const mu = gx + gw * 0.5;
  const sig = gw * 0.07;
  ctx.strokeStyle = LINE_SOFT;
  ctx.beginPath();
  ctx.moveTo(gx, gy);
  ctx.lineTo(gx + gw, gy);
  ctx.stroke();
  // integrated area grows with lp
  const fillTo = mu - 3.2 * sig + smoothstep(0.05, 0.6, lp) * 6.4 * sig;
  ctx.beginPath();
  ctx.moveTo(mu - 3.2 * sig, gy);
  for (let x = mu - 3.2 * sig; x <= fillTo; x += 1) ctx.lineTo(x, gy - gaussian(x, mu, sig) * gh);
  ctx.lineTo(fillTo, gy);
  ctx.closePath();
  const fg = ctx.createLinearGradient(0, gy - gh, 0, gy);
  fg.addColorStop(0, 'rgba(195,155,255,0.45)');
  fg.addColorStop(1, 'rgba(99,211,255,0.08)');
  ctx.fillStyle = fg;
  ctx.fill();
  ctx.strokeStyle = '#e4ecf5';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let x = gx; x <= gx + gw; x += 1) {
    const y = gy - gaussian(x, mu, sig) * gh;
    if (x === gx) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.lineWidth = 1;
  // integration markers
  ctx.strokeStyle = 'rgba(255,184,119,0.7)';
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(mu - 3.2 * sig, gy + 8);
  ctx.lineTo(mu - 3.2 * sig, gy - 30);
  ctx.moveTo(mu + 3.2 * sig, gy + 8);
  ctx.lineTo(mu + 3.2 * sig, gy - 30);
  ctx.stroke();
  ctx.setLineDash([]);
  const areaShown = SAMPLE.caffeineArea * smoothstep(0.05, 0.6, lp);
  label(ctx, `Caffeine · tR ${SAMPLE.caffeineTR.toFixed(2)} min`, mu, gy - gh - 18, TEXT, 'center');
  label(ctx, `Area ${areaShown.toFixed(1)} mAU·s`, mu, gy + 26, TEXT, 'center');

  // calibration inset
  const cx0 = w * 0.64;
  const cw = w * 0.3;
  const cy0 = h / 2 + 60;
  const ch = 170;
  const maxC = 15;
  const maxA = 1600;
  const X = (c: number) => cx0 + (c / maxC) * cw;
  const Y = (a: number) => cy0 - (a / maxA) * ch;
  ctx.strokeStyle = LINE_SOFT;
  ctx.beginPath();
  ctx.moveTo(cx0, cy0);
  ctx.lineTo(cx0 + cw, cy0);
  ctx.moveTo(cx0, cy0);
  ctx.lineTo(cx0, cy0 - ch);
  ctx.stroke();
  const { m, b } = CALIBRATION.fit;
  ctx.strokeStyle = 'rgba(99,211,255,0.6)';
  ctx.beginPath();
  ctx.moveTo(X(0), Y(b));
  ctx.lineTo(X(maxC), Y(m * maxC + b));
  ctx.stroke();
  CALIBRATION.conc.forEach((c, i) => {
    if (c > maxC) return;
    ctx.fillStyle = '#cfe6ff';
    ctx.beginPath();
    ctx.arc(X(c), Y(CALIBRATION.area[i]), 2.6, 0, Math.PI * 2);
    ctx.fill();
  });
  const k = smoothstep(0.55, 0.95, lp);
  if (k > 0) {
    const ux = X(res.inVial);
    const uy = Y(SAMPLE.caffeineArea);
    ctx.strokeStyle = `rgba(255,184,119,${0.8 * k})`;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(cx0, uy);
    ctx.lineTo(cx0 + (ux - cx0) * k, uy);
    if (k > 0.5) {
      ctx.moveTo(ux, uy);
      ctx.lineTo(ux, uy + (cy0 - uy) * smoothstep(0.5, 1, k));
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffb877';
    ctx.beginPath();
    ctx.arc(ux, uy, 4, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, `${res.inVial.toFixed(2)} µg/mL`, ux, cy0 + 20, `rgba(255,184,119,${k})`, 'center');
  }
  label(ctx, 'Calibration · 7 levels', cx0, cy0 - ch - 12, TEXT);
}

export function drawWorkflow(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, progress: number) {
  const s = clamp(progress) * 4;
  // the drawings are authored for ~640×560; scale down uniformly on small canvases
  const sc = Math.min(1, h / 560, w / 600);
  const W = w / sc;
  const H = h / sc;
  const stages = [drawSample, drawSeparation, drawDetection, drawQuant];
  stages.forEach((fn, i) => {
    const wgt = weight(s, i);
    if (wgt < 0.01) return;
    const lp = clamp(s - i);
    ctx.save();
    ctx.scale(sc, sc);
    ctx.globalAlpha = wgt;
    ctx.translate(0, (1 - wgt) * 18 * (s > i + 0.5 ? -1 : 1));
    fn(ctx, W, H, t, lp);
    ctx.restore();
  });
}
