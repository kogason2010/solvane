import { clamp, gaussian, rng, smoothstep } from '../../utils/math';

const MONO = '500 10.5px "IBM Plex Mono", ui-monospace, monospace';
const LINE = 'rgba(170,195,225,0.32)';
const SOFT = 'rgba(170,195,225,0.12)';
const TEXT = 'rgba(214,226,238,0.9)';
const MUTED = 'rgba(133,146,163,0.95)';
export const DW = 680; // authoring size
export const DH = 440;

type C = CanvasRenderingContext2D;

function label(ctx: C, s: string, x: number, y: number, color = MUTED, align: CanvasTextAlign = 'left') {
  ctx.font = MONO;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(s, x, y);
}
function box(ctx: C, x: number, y: number, w: number, h: number, fill = 'rgba(22,28,37,0.95)') {
  ctx.fillStyle = fill;
  ctx.strokeStyle = LINE;
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.stroke();
}
/** Approximate visible colour for a wavelength (nm); UV is rendered as violet by convention. */
function wl(nm: number, a = 1) {
  let r = 0;
  let g = 0;
  let b = 0;
  if (nm < 440) {
    r = 0.55 - (nm - 380) / 160;
    b = 1;
  } else if (nm < 490) {
    g = (nm - 440) / 50;
    b = 1;
  } else if (nm < 510) {
    g = 1;
    b = (510 - nm) / 20;
  } else if (nm < 580) {
    r = (nm - 510) / 70;
    g = 1;
  } else if (nm < 645) {
    r = 1;
    g = (645 - nm) / 65;
  } else r = 1;
  r = clamp(r);
  return `rgba(${Math.round(80 + r * 175)},${Math.round(80 + g * 175)},${Math.round(90 + b * 165)},${a})`;
}

const R = rng(11);
const PTS = Array.from({ length: 220 }, () => ({ a: R(), b: R(), c: R(), d: R() }));

/* ---------------------------------------------------------------- UV / PDA */
export function drawUV(ctx: C, t: number) {
  const cy = 190;
  // lamp
  box(ctx, 30, cy - 26, 70, 52);
  ctx.fillStyle = 'rgba(235,240,255,0.95)';
  ctx.beginPath();
  ctx.arc(65, cy, 7, 0, Math.PI * 2);
  ctx.fill();
  label(ctx, 'D₂ / W LAMP', 30, cy + 46);
  // broadband beam → flow cell
  const g = ctx.createLinearGradient(100, 0, 260, 0);
  g.addColorStop(0, 'rgba(230,236,255,0.55)');
  g.addColorStop(1, 'rgba(230,236,255,0.35)');
  ctx.fillStyle = g;
  ctx.fillRect(100, cy - 5, 160, 10);
  // flow cell
  ctx.strokeStyle = 'rgba(180,205,235,0.6)';
  ctx.strokeRect(260, cy - 34, 44, 68);
  const band = 0.5 + 0.5 * Math.sin(t * 0.9);
  const conc = smoothstep(0.25, 0.9, band);
  for (let i = 0; i < 40; i++) {
    const p = PTS[i];
    if (p.a > conc) continue;
    ctx.fillStyle = 'rgba(195,155,255,0.9)';
    ctx.beginPath();
    ctx.arc(264 + p.b * 36, cy - 30 + ((p.c + t * 0.15) % 1) * 60, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  label(ctx, 'FLOW CELL · 10 mm', 250, cy + 54);
  // transmitted beam → grating
  ctx.fillStyle = 'rgba(230,236,255,0.32)';
  ctx.fillRect(304, cy - 4, 96, 8);
  ctx.save();
  ctx.translate(410, cy);
  ctx.rotate(-0.35);
  ctx.fillStyle = 'rgba(40,48,60,1)';
  ctx.fillRect(-4, -36, 8, 72);
  ctx.strokeStyle = LINE;
  for (let i = -34; i < 36; i += 3) {
    ctx.beginPath();
    ctx.moveTo(-4, i);
    ctx.lineTo(4, i);
    ctx.stroke();
  }
  ctx.restore();
  label(ctx, 'GRATING', 392, cy + 58);
  // dispersed fan → diode array
  const arrX = 600;
  const top = 70;
  const bot = 330;
  const N = 64;
  for (let i = 0; i < N; i++) {
    const f = i / (N - 1);
    const nm = 200 + f * 400;
    const y = top + f * (bot - top);
    // analyte absorbs strongly near 273 nm
    const A = conc * (0.9 * gaussian(nm, 273, 16) + 1.1 * gaussian(nm, 206, 11));
    const T = Math.pow(10, -A);
    ctx.strokeStyle = wl(Math.max(380, nm + 180), 0.07 * T);
    ctx.beginPath();
    ctx.moveTo(412, cy);
    ctx.lineTo(arrX, y);
    ctx.stroke();
    ctx.fillStyle = wl(Math.max(380, nm + 180), 0.25 + 0.75 * T);
    ctx.fillRect(arrX, y - (bot - top) / N / 2 + 0.5, 14, (bot - top) / N - 1);
  }
  label(ctx, '200 nm', arrX + 20, top + 4);
  label(ctx, '600 nm', arrX + 20, bot + 4);
  label(ctx, 'DIODE ARRAY', arrX - 18, bot + 30);
  label(ctx, 'darker pixels = absorbed wavelengths', 30, 400, MUTED);
  label(ctx, `λmax 273 nm · A = ${(conc * 0.9).toFixed(2)}`, 30, 380, TEXT);
}

/* ---------------------------------------------------------------- Fluorescence */
export function drawFluorescence(ctx: C, t: number) {
  const cx = 300;
  const cy = 230;
  // excitation source
  box(ctx, 20, cy - 24, 70, 48);
  label(ctx, 'EXCITATION', 20, cy + 44);
  label(ctx, 'λex 280 nm', 20, cy + 60, TEXT);
  ctx.fillStyle = wl(400, 0.6);
  ctx.fillRect(90, cy - 4, cx - 30 - 90, 8);
  // monochromator slit
  ctx.strokeStyle = LINE;
  ctx.strokeRect(150, cy - 22, 6, 44);
  // cell
  ctx.strokeStyle = 'rgba(180,205,235,0.6)';
  ctx.strokeRect(cx - 30, cy - 30, 60, 60);
  // beam continues (unabsorbed) to a trap
  ctx.fillStyle = wl(400, 0.25);
  ctx.fillRect(cx + 30, cy - 3, 160, 6);
  box(ctx, cx + 190, cy - 16, 30, 32, 'rgba(14,18,24,1)');
  label(ctx, 'BEAM DUMP', cx + 160, cy + 40);
  // molecules flash and emit isotropically
  for (let i = 0; i < 28; i++) {
    const p = PTS[i];
    const mx = cx - 22 + p.a * 44;
    const my = cy - 22 + p.b * 44;
    const phase = (t * (0.6 + p.c * 0.6) + p.d) % 1;
    const flash = Math.exp(-phase * 6);
    ctx.fillStyle = `rgba(160,140,255,${0.35 + 0.6 * flash})`;
    ctx.beginPath();
    ctx.arc(mx, my, 1.8 + flash * 1.5, 0, Math.PI * 2);
    ctx.fill();
    // emitted photon travelling outward (longer wavelength → greener)
    const ang = p.c * Math.PI * 2;
    const r = phase * 160;
    const px = mx + Math.cos(ang) * r;
    const py = my + Math.sin(ang) * r;
    ctx.fillStyle = wl(500, 0.85 * (1 - phase));
    ctx.beginPath();
    ctx.arc(px, py, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // emission detector at 90°
  ctx.fillStyle = wl(500, 0.18);
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy - 30);
  ctx.lineTo(cx + 14, cy - 30);
  ctx.lineTo(cx + 10, cy - 120);
  ctx.lineTo(cx - 10, cy - 120);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.strokeRect(cx - 24, cy - 102, 48, 6);
  label(ctx, 'EMISSION FILTER', cx + 34, cy - 96);
  box(ctx, cx - 30, cy - 160, 60, 40);
  label(ctx, 'PMT · 90°', cx + 40, cy - 138);
  label(ctx, 'λem 340 nm', cx + 40, cy - 122, TEXT);

  // Stokes shift mini-spectrum
  const gx = 470;
  const gy = 390;
  const gw = 180;
  const gh = 70;
  ctx.strokeStyle = SOFT;
  ctx.beginPath();
  ctx.moveTo(gx, gy);
  ctx.lineTo(gx + gw, gy);
  ctx.stroke();
  const curve = (mu: number, s: number, col: string) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const nm = 240 + (i / 80) * 180;
      const x = gx + (i / 80) * gw;
      const y = gy - gaussian(nm, mu, s) * gh;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.lineWidth = 1;
  };
  curve(280, 12, wl(400, 0.9));
  curve(340, 18, wl(500, 0.9));
  label(ctx, 'EX', gx + ((280 - 240) / 180) * gw - 6, gy - gh - 6, TEXT);
  label(ctx, 'EM', gx + ((340 - 240) / 180) * gw - 6, gy - gh - 6, TEXT);
  label(ctx, 'STOKES SHIFT', gx, gy + 18);
}

/* ---------------------------------------------------------------- Mass spectrometry */
const IONS = Array.from({ length: 70 }, (_, i) => {
  const choices = [138, 195, 196, 217];
  return { mz: choices[i % 4], ph: R(), sp: 0.5 + R() * 0.5, off: R() * 6.28 };
});
export function drawMS(ctx: C, t: number) {
  const cy = 170;
  // ESI emitter
  ctx.strokeStyle = 'rgba(200,210,222,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(10, cy);
  ctx.lineTo(60, cy);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = 'rgba(99,211,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(60, cy);
  ctx.lineTo(130, cy - 34);
  ctx.lineTo(130, cy + 34);
  ctx.closePath();
  ctx.fill();
  label(ctx, 'ESI +', 10, cy + 40);
  // inlet cone
  ctx.strokeStyle = LINE;
  ctx.beginPath();
  ctx.moveTo(140, cy - 40);
  ctx.lineTo(160, cy - 4);
  ctx.moveTo(140, cy + 40);
  ctx.lineTo(160, cy + 4);
  ctx.stroke();
  // quadrupole rods
  const qx0 = 190;
  const qx1 = 500;
  ctx.fillStyle = 'rgba(150,160,175,0.35)';
  ctx.fillRect(qx0, cy - 38, qx1 - qx0, 10);
  ctx.fillRect(qx0, cy + 28, qx1 - qx0, 10);
  label(ctx, 'QUADRUPOLE · RF/DC', qx0, cy - 50);
  // the quad sweeps its transmitted m/z over time
  const scanMin = 100;
  const scanMax = 260;
  const scanPhase = (t * 0.22) % 1;
  const selected = scanMin + scanPhase * (scanMax - scanMin);
  for (const ion of IONS) {
    const prog = (t * 0.35 * ion.sp + ion.ph) % 1;
    // droplets → ions in source
    if (prog < 0.2) {
      const f = prog / 0.2;
      ctx.fillStyle = 'rgba(99,211,255,0.7)';
      ctx.beginPath();
      ctx.arc(60 + f * 100, cy + Math.sin(ion.off) * 30 * f, 1.6, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    const f = (prog - 0.2) / 0.8;
    const x = qx0 + f * (qx1 - qx0 + 80);
    const stable = Math.abs(ion.mz - selected) < 6;
    const amp = stable ? 6 : 6 + f * 120;
    const y = cy + Math.sin(f * 30 + ion.off) * amp;
    if (Math.abs(y - cy) > 30 && !stable) {
      // unstable trajectory: ion strikes a rod and is lost
      continue;
    }
    ctx.fillStyle = stable ? 'rgba(255,184,119,0.95)' : 'rgba(195,155,255,0.7)';
    ctx.beginPath();
    ctx.arc(Math.min(x, qx1 + 70), y, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }
  box(ctx, qx1 + 70, cy - 30, 26, 60);
  label(ctx, 'DETECTOR', qx1 + 40, cy + 48);

  // spectrum builds as the scan passes each ion
  const gx = 40;
  const gy = 410;
  const gw = 600;
  const gh = 120;
  const X = (mz: number) => gx + ((mz - scanMin) / (scanMax - scanMin)) * gw;
  ctx.strokeStyle = SOFT;
  ctx.beginPath();
  ctx.moveTo(gx, gy);
  ctx.lineTo(gx + gw, gy);
  ctx.stroke();
  for (let mz = 100; mz <= 260; mz += 20) label(ctx, String(mz), X(mz), gy + 16, MUTED, 'center');
  const spec = [
    { mz: 138.0662, rel: 0.06 },
    { mz: 195.0877, rel: 1 },
    { mz: 196.0911, rel: 0.104 },
    { mz: 217.0696, rel: 0.175 },
  ];
  for (const s of spec) {
    if (s.mz > selected) continue;
    ctx.fillStyle = s.rel === 1 ? 'rgba(255,184,119,0.95)' : 'rgba(220,230,242,0.8)';
    ctx.fillRect(X(s.mz) - 1, gy - s.rel * gh, 2, s.rel * gh);
    if (s.rel > 0.15) label(ctx, s.mz.toFixed(4), X(s.mz), gy - s.rel * gh - 8, TEXT, 'center');
  }
  ctx.strokeStyle = 'rgba(255,184,119,0.5)';
  ctx.beginPath();
  ctx.moveTo(X(selected), gy);
  ctx.lineTo(X(selected), gy - gh - 10);
  ctx.stroke();
  label(ctx, `m/z ${selected.toFixed(0)}`, X(selected) + 6, gy - gh - 2, 'rgba(255,184,119,0.95)');
  label(ctx, 'm/z →', gx + gw, gy + 32, MUTED, 'right');
}

/* ---------------------------------------------------------------- Conductivity */
export function drawConductivity(ctx: C, t: number) {
  const x0 = 150;
  const x1 = 470;
  const y0 = 90;
  const y1 = 260;
  // electrodes
  ctx.fillStyle = 'rgba(170,180,195,0.6)';
  ctx.fillRect(x0 - 8, y0, 8, y1 - y0);
  ctx.fillRect(x1, y0, 8, y1 - y0);
  label(ctx, 'ELECTRODE', x0 - 40, y1 + 22);
  label(ctx, 'ELECTRODE', x1 - 30, y1 + 22);
  ctx.strokeStyle = SOFT;
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  // AC field indicator
  const field = Math.sin(t * 4);
  label(ctx, field > 0 ? '+' : '−', x0 - 22, y0 + 14, TEXT);
  label(ctx, field > 0 ? '−' : '+', x1 + 16, y0 + 14, TEXT);
  // analyte band passes → ion density varies
  const band = 0.5 + 0.5 * Math.sin(t * 0.7);
  const density = smoothstep(0.2, 0.95, band);
  for (let i = 0; i < 120; i++) {
    const p = PTS[i];
    if (p.d > 0.15 + density * 0.85) continue;
    const pos = p.a > 0.5;
    const baseX = x0 + 14 + p.b * (x1 - x0 - 28);
    const y = y0 + 12 + p.c * (y1 - y0 - 24);
    const x = baseX + field * (pos ? 1 : -1) * 10;
    ctx.fillStyle = pos ? 'rgba(255,184,119,0.9)' : 'rgba(99,211,255,0.9)';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(8,10,14,0.9)';
    ctx.font = '600 7px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(pos ? '+' : '−', x, y + 2.5);
  }
  // trace
  const gx = 40;
  const gy = 410;
  const gw = 600;
  const gh = 90;
  ctx.strokeStyle = SOFT;
  ctx.beginPath();
  ctx.moveTo(gx, gy);
  ctx.lineTo(gx + gw, gy);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(99,211,255,0.9)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 0; i <= 200; i++) {
    const tt = t - (1 - i / 200) * 9;
    const b = smoothstep(0.2, 0.95, 0.5 + 0.5 * Math.sin(tt * 0.7));
    const y = gy - (0.12 + 0.88 * b) * gh;
    const x = gx + (i / 200) * gw;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.lineWidth = 1;
  label(ctx, `κ = ${(1.2 + density * 18.6).toFixed(1)} µS/cm`, gx, gy - gh - 14, TEXT);
  label(ctx, 'SUPPRESSED · background eluent neutralised before the cell', gx, 300, MUTED);
}

/* ---------------------------------------------------------------- TOC / NDIR */
export function drawTOC(ctx: C, t: number) {
  const cy = 170;
  // sample in
  label(ctx, 'SAMPLE', 20, cy - 40);
  // oxidation reactor
  const rx = 170;
  ctx.strokeStyle = 'rgba(255,184,119,0.55)';
  ctx.strokeRect(rx, cy - 60, 120, 120);
  const glow = ctx.createRadialGradient(rx + 60, cy, 5, rx + 60, cy, 80);
  glow.addColorStop(0, 'rgba(255,170,90,0.22)');
  glow.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(rx, cy - 60, 120, 120);
  label(ctx, 'OXIDATION', rx, cy + 80);
  label(ctx, '680 °C catalytic', rx, cy + 96, TEXT);
  // NDIR cell
  const nx = 400;
  const nw = 200;
  ctx.strokeStyle = 'rgba(180,205,235,0.5)';
  ctx.strokeRect(nx, cy - 26, nw, 52);
  box(ctx, nx - 34, cy - 18, 26, 36);
  box(ctx, nx + nw + 8, cy - 18, 26, 36);
  label(ctx, 'IR', nx - 30, cy - 26);
  label(ctx, 'NDIR · 4.26 µm', nx, cy + 46, TEXT);
  label(ctx, 'CO₂ absorbs here', nx, cy + 62);

  let co2InCell = 0;
  for (let i = 0; i < 40; i++) {
    const p = PTS[i];
    const prog = (t * 0.12 + p.a) % 1;
    if (prog < 0.35) {
      // organic molecule: a small carbon chain heading to the reactor
      const f = prog / 0.35;
      const x = 20 + f * (rx + 50 - 20);
      const y = cy - 20 + p.b * 40;
      ctx.strokeStyle = 'rgba(200,210,222,0.7)';
      ctx.beginPath();
      ctx.moveTo(x - 6, y);
      ctx.lineTo(x, y - 3);
      ctx.lineTo(x + 6, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(200,210,222,0.95)';
      [-6, 0, 6].forEach((dx, j) => {
        ctx.beginPath();
        ctx.arc(x + dx, y - (j === 1 ? 3 : 0), 2, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      // carbon has become CO₂ (O=C=O) and flows into the NDIR cell
      const f = (prog - 0.35) / 0.65;
      const x = rx + 60 + f * (nx + nw - rx - 60);
      const y = cy - 16 + p.b * 32 + Math.sin(t * 2 + p.c * 9) * 2;
      if (x > nx && x < nx + nw) co2InCell++;
      ctx.fillStyle = 'rgba(255,90,80,0.9)';
      ctx.beginPath();
      ctx.arc(x - 5, y, 1.8, 0, Math.PI * 2);
      ctx.arc(x + 5, y, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(60,64,72,1)';
      ctx.strokeStyle = 'rgba(200,210,222,0.9)';
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  // IR transmission
  const T = Math.pow(10, -co2InCell * 0.018);
  ctx.fillStyle = `rgba(255,120,90,${(0.15 + 0.35 * T).toFixed(3)})`;
  ctx.fillRect(nx, cy - 3, nw, 6);

  // equation + bars
  label(ctx, 'TOC = TC − IC', 40, 330, TEXT);
  label(ctx, 'Total carbon minus inorganic carbon (carbonate, bicarbonate, dissolved CO₂)', 40, 350);
  const bars = [
    { k: 'TC', v: 0.86 },
    { k: 'IC', v: 0.24 },
    { k: 'TOC', v: 0.62 },
  ];
  bars.forEach((b, i) => {
    const y = 380 + i * 18;
    label(ctx, b.k, 40, y + 4, MUTED);
    ctx.fillStyle = i === 2 ? 'rgba(255,184,119,0.9)' : 'rgba(170,195,225,0.35)';
    ctx.fillRect(84, y - 4, b.v * 300, 6);
  });
}

export const DETECTOR_DRAW = [drawUV, drawFluorescence, drawMS, drawConductivity, drawTOC];
