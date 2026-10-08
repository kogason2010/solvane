import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { traceFillFragment, traceLineFragment, traceVertex } from '../../shaders/glass';
import { HERO_ANALYTES, HERO_COLUMN, HERO_SIM_END, heroArrival, heroSigmaT } from '../../utils/chroma';
import { gaussian, smoothstep } from '../../utils/math';
import { heroFrame } from './heroFrame';
import { heroAxisEl, heroLabelEls } from './labels';

const SAMPLES = 900;
export const TRACE = {
  headX: HERO_COLUMN.detector,
  scale: 11 / HERO_SIM_END,
  base: 1.55,
  height: 1.2,
};

/**
 * Strip-chart chromatogram: the newest sample is always written directly above the photodiode,
 * older signal scrolls to the left — so the trace is literally produced by the detector.
 */
export function Chromatogram3D() {
  const { line, fill, uniforms } = useMemo(() => {
    const uniforms = {
      uT: { value: 0 },
      uHeadX: { value: TRACE.headX },
      uScale: { value: TRACE.scale },
      uBase: { value: TRACE.base },
      uHeight: { value: TRACE.height },
      uOpacity: { value: 1 },
    };
    const cols = HERO_ANALYTES.map((a) => new THREE.Color(a.color));
    const neutral = new THREE.Color('#cfe0f2');
    const tArr = new Float32Array(SAMPLES);
    const sArr = new Float32Array(SAMPLES);
    const cArr = new Float32Array(SAMPLES * 3);
    const tmp = new THREE.Color();
    for (let i = 0; i < SAMPLES; i++) {
      const t = (i / (SAMPLES - 1)) * HERO_SIM_END;
      let s = 0;
      tmp.setRGB(0, 0, 0);
      let wsum = 0;
      HERO_ANALYTES.forEach((a, j) => {
        const g = a.area * gaussian(t, heroArrival(a.k), heroSigmaT(a.k));
        s += g;
        tmp.r += cols[j].r * g;
        tmp.g += cols[j].g * g;
        tmp.b += cols[j].b * g;
        wsum += g;
      });
      // tiny deterministic detector noise so the baseline reads as real signal
      s += 0.006 * Math.sin(i * 12.9898) * Math.cos(i * 4.1414);
      const c = wsum > 0.02 ? tmp.multiplyScalar(1 / wsum) : neutral;
      tArr[i] = t;
      sArr[i] = Math.max(0, s);
      cArr.set([c.r, c.g, c.b], i * 3);
    }

    // line
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SAMPLES * 3), 3));
    lg.setAttribute('aT', new THREE.BufferAttribute(tArr, 1));
    lg.setAttribute('aS', new THREE.BufferAttribute(sArr, 1));
    lg.setAttribute('aFill', new THREE.BufferAttribute(new Float32Array(SAMPLES).fill(1), 1));
    lg.setAttribute('aColor', new THREE.BufferAttribute(cArr, 3));
    const lm = new THREE.ShaderMaterial({
      vertexShader: traceVertex,
      fragmentShader: traceLineFragment,
      transparent: true,
      depthWrite: false,
      uniforms,
    });
    const line = new THREE.Line(lg, lm);
    line.frustumCulled = false;

    // fill (curve + baseline pairs)
    const ft = new Float32Array(SAMPLES * 2);
    const fs = new Float32Array(SAMPLES * 2);
    const ff = new Float32Array(SAMPLES * 2);
    const fc = new Float32Array(SAMPLES * 6);
    for (let i = 0; i < SAMPLES; i++) {
      ft[i * 2] = ft[i * 2 + 1] = tArr[i];
      fs[i * 2] = fs[i * 2 + 1] = sArr[i];
      ff[i * 2] = 1;
      ff[i * 2 + 1] = 0;
      fc.set(cArr.subarray(i * 3, i * 3 + 3), i * 6);
      fc.set(cArr.subarray(i * 3, i * 3 + 3), i * 6 + 3);
    }
    const idx: number[] = [];
    for (let i = 0; i < SAMPLES - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SAMPLES * 6), 3));
    fg.setAttribute('aT', new THREE.BufferAttribute(ft, 1));
    fg.setAttribute('aS', new THREE.BufferAttribute(fs, 1));
    fg.setAttribute('aFill', new THREE.BufferAttribute(ff, 1));
    fg.setAttribute('aColor', new THREE.BufferAttribute(fc, 3));
    fg.setIndex(idx);
    const fm = new THREE.ShaderMaterial({
      vertexShader: traceVertex,
      fragmentShader: traceFillFragment,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms,
    });
    const fill = new THREE.Mesh(fg, fm);
    fill.frustumCulled = false;
    return { line, fill, uniforms };
  }, []);

  // baseline axis + link from photodiode to pen head
  const axis = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(-1, 0, 0)]);
    const m = new THREE.LineBasicMaterial({ color: '#7f93ab', transparent: true, opacity: 0.35 });
    const l = new THREE.Line(g, m);
    l.frustumCulled = false;
    return l;
  }, []);
  const head = useMemo(() => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 16, 16),
      new THREE.MeshBasicMaterial({ color: '#e6f3ff', toneMapped: false }),
    );
    return m;
  }, []);

  useEffect(
    () => () => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
      fill.geometry.dispose();
      (fill.material as THREE.Material).dispose();
      axis.geometry.dispose();
      (axis.material as THREE.Material).dispose();
      head.geometry.dispose();
      (head.material as THREE.Material).dispose();
    },
    [line, fill, axis, head],
  );

  const v = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera, size }) => {
    const sim = heroFrame.sim;
    uniforms.uT.value = sim;
    const vis = smoothstep(0.17, 0.26, heroFrame.p);
    uniforms.uOpacity.value = vis;

    // axis grows from the head leftwards as time elapses
    const len = Math.max(0.001, sim * TRACE.scale);
    axis.position.set(TRACE.headX, TRACE.base, 0);
    axis.scale.set(len, 1, 1);
    (axis.material as THREE.LineBasicMaterial).opacity = 0.35 * vis;

    // pen head follows the live signal
    head.position.set(TRACE.headX, TRACE.base + heroFrame.signal * TRACE.height, 0);
    head.visible = vis > 0.01 && heroFrame.p < 0.9;

    // peak annotations
    HERO_ANALYTES.forEach((a, i) => {
      const el = heroLabelEls[i];
      if (!el) return;
      const tR = heroArrival(a.k);
      const st = heroSigmaT(a.k);
      const peakY = a.area; // gaussian peak value at apex (area param is the apex height here)
      v.set(TRACE.headX - (sim - tR) * TRACE.scale, TRACE.base + peakY * TRACE.height + 0.16, 0);
      v.project(camera);
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      const show = smoothstep(tR + st * 1.5, tR + st * 3.5, sim) * smoothstep(0.5, 0.58, heroFrame.p);
      el.style.opacity = show.toFixed(3);
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    });

    const ax = heroAxisEl.current;
    if (ax) {
      v.set(TRACE.headX - sim * TRACE.scale * 0.5, TRACE.base - 0.12, 0);
      v.project(camera);
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      ax.style.opacity = smoothstep(0.84, 0.92, heroFrame.p).toFixed(3);
      ax.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, 0)`;
    }
  });

  return (
    <group>
      <primitive object={fill} renderOrder={6} />
      <primitive object={line} renderOrder={7} />
      <primitive object={axis} />
      <primitive object={head} />
    </group>
  );
}
