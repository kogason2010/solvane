import { useMemo } from 'react';
import { CALIBRATION, MASS_SPEC, SAMPLE, SAMPLE_PEAKS, caffeineUV, sampleResult } from '../../data/analytical';
import { gaussian, toPath } from '../../utils/math';

const AX = 'rgba(170,195,225,0.28)';
const GRID = 'rgba(170,195,225,0.07)';
const TXT = 'rgba(133,146,163,1)';
const FONT = { fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, letterSpacing: '0.04em' };

interface Frame {
  w: number;
  h: number;
  l: number;
  r: number;
  t: number;
  b: number;
}
const sx = (f: Frame, v: number, min: number, max: number) => f.l + ((v - min) / (max - min)) * (f.w - f.l - f.r);
const sy = (f: Frame, v: number, min: number, max: number) => f.h - f.b - ((v - min) / (max - min)) * (f.h - f.t - f.b);

function Axes({ f, xt, yt, xmin, xmax, ymin, ymax, xl, yl, fmt = (v: number) => String(v) }: {
  f: Frame;
  xt: number[];
  yt: number[];
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
  xl: string;
  yl: string;
  fmt?: (v: number) => string;
}) {
  return (
    <g style={FONT}>
      {yt.map((v) => (
        <g key={`y${v}`}>
          <line x1={f.l} x2={f.w - f.r} y1={sy(f, v, ymin, ymax)} y2={sy(f, v, ymin, ymax)} stroke={GRID} />
          <text x={f.l - 8} y={sy(f, v, ymin, ymax) + 3} fill={TXT} textAnchor="end">
            {v}
          </text>
        </g>
      ))}
      {xt.map((v) => (
        <text key={`x${v}`} x={sx(f, v, xmin, xmax)} y={f.h - f.b + 16} fill={TXT} textAnchor="middle">
          {fmt(v)}
        </text>
      ))}
      <line x1={f.l} x2={f.w - f.r} y1={f.h - f.b} y2={f.h - f.b} stroke={AX} />
      <text x={f.w - f.r} y={f.h - 4} fill={TXT} textAnchor="end">
        {xl.toUpperCase()}
      </text>
      <text x={f.l} y={f.t - 10} fill={TXT}>
        {yl.toUpperCase()}
      </text>
    </g>
  );
}

/* ----------------------------------------------------------- chromatogram */
export function SampleChromatogram() {
  const f: Frame = { w: 760, h: 300, l: 44, r: 16, t: 34, b: 34 };
  const tmax = 7;
  const ymax = 200;
  const { d, fill } = useMemo(() => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 700; i++) {
      const t = (i / 700) * tmax;
      let s = 0.6 + 0.4 * Math.sin(i * 12.9898) * Math.cos(i * 4.1414) * 0.4;
      for (const p of SAMPLE_PEAKS) s += p.h * gaussian(t, p.tR, p.sigma);
      pts.push([sx(f, t, 0, tmax), sy(f, s, 0, ymax)]);
    }
    const c = SAMPLE_PEAKS[2];
    const fp: [number, number][] = [];
    for (let t = c.tR - 3.5 * c.sigma; t <= c.tR + 3.5 * c.sigma; t += 0.004) {
      fp.push([sx(f, t, 0, tmax), sy(f, c.h * gaussian(t, c.tR, c.sigma) + 0.6, 0, ymax)]);
    }
    const fill =
      toPath(fp) +
      `L${fp[fp.length - 1][0]} ${sy(f, 0.6, 0, ymax)}L${fp[0][0]} ${sy(f, 0.6, 0, ymax)}Z`;
    return { d: toPath(pts), fill };
  }, []);
  const c = SAMPLE_PEAKS[2];
  const res = sampleResult();
  return (
    <svg viewBox={`0 0 ${f.w} ${f.h}`} className="chart" role="img" aria-label={`Chromatogram of the diluted energy drink at 273 nm. Caffeine elutes at ${c.tR} minutes with a peak area of ${SAMPLE.caffeineArea} mAU·s and signal-to-noise of ${Math.round(res.sn)}.`}>
      <defs>
        <linearGradient id="cg-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c39bff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#63d3ff" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <Axes f={f} xt={[0, 1, 2, 3, 4, 5, 6, 7]} yt={[0, 50, 100, 150, 200]} xmin={0} xmax={tmax} ymin={0} ymax={ymax} xl="Retention time (min)" yl="mAU · 273 nm" />
      <path d={fill} fill="url(#cg-fill)" data-fade />
      <path d={d} fill="none" stroke="#e6eef7" strokeWidth="1.3" data-draw />
      {SAMPLE_PEAKS.map((p) => (
        <text key={p.tR} x={sx(f, p.tR, 0, tmax)} y={sy(f, p.h, 0, ymax) - 10} textAnchor="middle" style={FONT} fill={p === c ? '#e9eef4' : TXT}>
          {p.label}
        </text>
      ))}
      {/* integration baseline drop-lines */}
      {[c.tR - 3.5 * c.sigma, c.tR + 3.5 * c.sigma].map((t, i) => (
        <line key={i} x1={sx(f, t, 0, tmax)} x2={sx(f, t, 0, tmax)} y1={sy(f, 0, 0, ymax) + 6} y2={sy(f, 12, 0, ymax)} stroke="#ffb877" strokeDasharray="2 3" />
      ))}
      <g style={FONT}>
        <text x={sx(f, c.tR, 0, tmax) + 22} y={sy(f, 110, 0, ymax)} fill="#ffb877">
          AREA {SAMPLE.caffeineArea.toFixed(1)} mAU·s
        </text>
        <text x={sx(f, c.tR, 0, tmax) + 22} y={sy(f, 110, 0, ymax) + 15} fill={TXT}>
          S/N {Math.round(res.sn).toLocaleString('en-US')}
        </text>
      </g>
    </svg>
  );
}

/* ----------------------------------------------------------- UV spectrum */
export function UVSpectrum() {
  const f: Frame = { w: 380, h: 240, l: 36, r: 12, t: 30, b: 34 };
  const d = useMemo(() => {
    const pts: [number, number][] = [];
    for (let nm = 200; nm <= 350; nm += 1) pts.push([sx(f, nm, 200, 350), sy(f, caffeineUV(nm), 0, 1.1)]);
    return toPath(pts);
  }, []);
  return (
    <svg viewBox={`0 0 ${f.w} ${f.h}`} className="chart" role="img" aria-label="UV absorbance spectrum of the caffeine peak with maxima near 206 and 273 nanometres.">
      <Axes f={f} xt={[200, 250, 300, 350]} yt={[0, 0.5, 1]} xmin={200} xmax={350} ymin={0} ymax={1.1} xl="Wavelength (nm)" yl="Abs (norm.)" />
      <path d={d} fill="none" stroke="#63d3ff" strokeWidth="1.4" data-draw />
      <line x1={sx(f, 273, 200, 350)} x2={sx(f, 273, 200, 350)} y1={sy(f, 0, 0, 1.1)} y2={sy(f, 0.62, 0, 1.1) - 8} stroke="rgba(99,211,255,0.5)" strokeDasharray="2 3" />
      <text x={sx(f, 273, 200, 350) + 6} y={sy(f, 0.62, 0, 1.1) - 10} style={FONT} fill="#e9eef4">
        λmax 273
      </text>
    </svg>
  );
}

/* ----------------------------------------------------------- mass spectrum */
export function MassSpectrum() {
  const f: Frame = { w: 380, h: 240, l: 36, r: 12, t: 30, b: 34 };
  return (
    <svg viewBox={`0 0 ${f.w} ${f.h}`} className="chart" role="img" aria-label="ESI positive mass spectrum: base peak protonated caffeine at m/z 195.0877, sodium adduct at 217.0696, and isotope peak at 196.0911.">
      <Axes f={f} xt={[130, 160, 190, 220]} yt={[0, 50, 100]} xmin={125} xmax={230} ymin={0} ymax={115} xl="m/z" yl="Rel. abundance %" />
      {MASS_SPEC.map((m) => (
        <g key={m.mz}>
          <line
            x1={sx(f, m.mz, 125, 230)}
            x2={sx(f, m.mz, 125, 230)}
            y1={sy(f, 0, 0, 115)}
            y2={sy(f, m.rel, 0, 115)}
            stroke={m.rel === 100 ? '#ffb877' : '#c9d6e6'}
            strokeWidth="2"
            data-grow
          />
          {m.label && (
            <text x={sx(f, m.mz, 125, 230)} y={sy(f, m.rel, 0, 115) - 18} textAnchor="middle" style={FONT} fill="#e9eef4">
              {m.mz.toFixed(4)}
            </text>
          )}
          {m.label && (
            <text x={sx(f, m.mz, 125, 230)} y={sy(f, m.rel, 0, 115) - 6} textAnchor="middle" style={FONT} fill={TXT}>
              {m.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

/* ----------------------------------------------------------- calibration */
export function CalibrationCurve() {
  const f: Frame = { w: 380, h: 260, l: 44, r: 12, t: 30, b: 34 };
  const { m, b, r2 } = CALIBRATION.fit;
  const res = sampleResult();
  const X = (c: number) => sx(f, c, 0, 52);
  const Y = (a: number) => sy(f, a, 0, 5600);
  return (
    <svg viewBox={`0 0 ${f.w} ${f.h}`} className="chart" role="img" aria-label={`Seven-level calibration from 0.5 to 50 micrograms per millilitre, linear fit with R squared ${r2.toFixed(5)}. The sample reads ${res.inVial.toFixed(2)} micrograms per millilitre.`}>
      <Axes f={f} xt={[0, 10, 20, 30, 40, 50]} yt={[0, 2000, 4000]} xmin={0} xmax={52} ymin={0} ymax={5600} xl="Concentration (µg/mL)" yl="Peak area (mAU·s)" />
      <line x1={X(0)} y1={Y(b)} x2={X(52)} y2={Y(m * 52 + b)} stroke="rgba(99,211,255,0.7)" strokeWidth="1.2" data-draw />
      {CALIBRATION.conc.map((c, i) => (
        <circle key={c} cx={X(c)} cy={Y(CALIBRATION.area[i])} r="3.2" fill="#dbe9f8" data-pop />
      ))}
      <circle cx={X(res.inVial)} cy={Y(SAMPLE.caffeineArea)} r="4.5" fill="#ffb877" data-pop />
      <line x1={X(res.inVial)} x2={X(res.inVial)} y1={Y(SAMPLE.caffeineArea)} y2={Y(0)} stroke="#ffb877" strokeDasharray="2 3" />
      <g style={FONT}>
        <text x={X(res.inVial) + 8} y={Y(SAMPLE.caffeineArea) - 8} fill="#ffb877">
          SAMPLE
        </text>
        <text x={f.l + 8} y={f.t + 10} fill="#e9eef4">
          y = {m.toFixed(2)}x {b < 0 ? '−' : '+'} {Math.abs(b).toFixed(2)}
        </text>
        <text x={f.l + 8} y={f.t + 25} fill={TXT}>
          R² = {r2.toFixed(5)}
        </text>
      </g>
    </svg>
  );
}
