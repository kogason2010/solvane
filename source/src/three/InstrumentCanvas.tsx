import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { MODULES } from '../data/instrument';
import { flowTubeFragment, flowTubeVertex } from '../shaders/flowTube';
import { getQuality } from '../utils/quality';
import { heroState, instrumentState } from '../utils/scrollStore';
import { gaussian } from '../utils/math';
import { AdaptiveDpr } from './shared/AdaptiveDpr';
import { StudioEnvironment } from './shared/StudioEnvironment';

const GAP = 0.28;

/** Row layout: modules stand side by side on a plinth, centred on x = 0. */
function layout() {
  const solids = MODULES.slice(0, 5);
  const total = solids.reduce((s, m) => s + m.size[0], 0) + GAP * (solids.length - 1);
  let x = -total / 2;
  const out = solids.map((m) => {
    const cx = x + m.size[0] / 2;
    x += m.size[0] + GAP;
    return { ...m, pos: new THREE.Vector3(cx, m.size[1] / 2, 0) };
  });
  // data system: a floating display above and behind the stack
  const d = MODULES[5];
  out.push({ ...d, pos: new THREE.Vector3(total / 2 - 1.3, 3.05, -0.9) });
  return out;
}
const LAYOUT = layout();

function screenTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 640;
  const g = c.getContext('2d')!;
  g.fillStyle = '#05080d';
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = 'rgba(170,195,225,0.12)';
  for (let x = 60; x < 1000; x += 80) {
    g.beginPath();
    g.moveTo(x, 60);
    g.lineTo(x, 560);
    g.stroke();
  }
  g.strokeStyle = 'rgba(170,195,225,0.4)';
  g.beginPath();
  g.moveTo(60, 560);
  g.lineTo(980, 560);
  g.stroke();
  const peaks = [
    [0.18, 0.012, 0.5],
    [0.31, 0.014, 0.85],
    [0.47, 0.016, 0.6],
    [0.6, 0.018, 1],
    [0.78, 0.02, 0.4],
  ];
  const cols = ['#63d3ff', '#8ea2ff', '#c39bff', '#ffb877', '#63d3ff'];
  peaks.forEach(([m, s, h], i) => {
    g.fillStyle = cols[i] + '40';
    g.beginPath();
    g.moveTo(60 + (m - 4 * s) * 920, 560);
    for (let t = m - 4 * s; t <= m + 4 * s; t += 0.001) g.lineTo(60 + t * 920, 560 - gaussian(t, m, s) * h * 440);
    g.lineTo(60 + (m + 4 * s) * 920, 560);
    g.fill();
  });
  g.strokeStyle = '#e6eef7';
  g.lineWidth = 3;
  g.beginPath();
  for (let i = 0; i <= 920; i++) {
    const t = i / 920;
    let y = 0;
    peaks.forEach(([m, s, h]) => (y += gaussian(t, m, s) * h));
    if (i === 0) g.moveTo(60 + i, 560 - y * 440);
    else g.lineTo(60 + i, 560 - y * 440);
  }
  g.stroke();
  g.fillStyle = 'rgba(205,218,232,0.85)';
  g.font = '500 22px monospace';
  g.fillText('SOLVANE · RUN 0417 · 5 PEAKS · ALL Rs > 2.0', 60, 40);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function Stack() {
  const strips = useRef<THREE.MeshBasicMaterial[]>([]);
  const tubeMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: flowTubeVertex,
        fragmentShader: flowTubeFragment,
        transparent: true,
        depthWrite: false,
        uniforms: { uTime: { value: 0 }, uHead: { value: 0 } },
      }),
    [],
  );
  const body = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#171c24', metalness: 0.55, roughness: 0.38, envMapIntensity: 0.9 }),
    [],
  );
  const bezel = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#262d38', metalness: 0.8, roughness: 0.25, envMapIntensity: 1.1 }),
    [],
  );
  const metal = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#a7b1be', metalness: 1, roughness: 0.22, envMapIntensity: 1.2 }),
    [],
  );
  const glass = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0b1018', metalness: 0.2, roughness: 0.05, envMapIntensity: 1.6 }),
    [],
  );
  const screenMat = useMemo(() => new THREE.MeshBasicMaterial({ map: screenTexture(), toneMapped: false }), []);

  const geos = useMemo(
    () =>
      LAYOUT.map((m) =>
        m.id === 'data' ? new THREE.BoxGeometry(...m.size) : new RoundedBoxGeometry(m.size[0], m.size[1], m.size[2], 4, 0.07),
      ),
    [],
  );

  // fluid path: in/out ports on the front faces, looping down between modules
  const { tube, ports } = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const ports: THREE.Vector3[] = [];
    LAYOUT.slice(0, 5).forEach((m, i) => {
      const zf = m.size[2] / 2 + 0.08;
      const yIn = Math.min(m.size[1] * 0.35, 0.55);
      const left = new THREE.Vector3(m.pos.x - m.size[0] / 2 + 0.16, yIn, zf);
      const right = new THREE.Vector3(m.pos.x + m.size[0] / 2 - 0.16, yIn, zf);
      if (i === 0) pts.push(new THREE.Vector3(left.x - 0.4, 1.6, zf - 0.2), left.clone().setY(1.1));
      else pts.push(left);
      ports.push(new THREE.Vector3((left.x + right.x) / 2, yIn, zf));
      pts.push(new THREE.Vector3(m.pos.x, yIn - 0.08, zf + 0.04));
      pts.push(right);
      if (i < 4) {
        const next = LAYOUT[i + 1];
        const mid = (m.pos.x + m.size[0] / 2 + next.pos.x - next.size[0] / 2) / 2;
        pts.push(new THREE.Vector3(mid, 0.18, zf + 0.22));
      }
    });
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const tube = new THREE.TubeGeometry(curve, 600, 0.028, 10, false);
    // arc-length fraction at each module port
    const samples = 800;
    const portU = ports.map((p) => {
      let best = 0;
      let bd = Infinity;
      for (let i = 0; i <= samples; i++) {
        const d = curve.getPointAt(i / samples).distanceToSquared(p);
        if (d < bd) {
          bd = d;
          best = i / samples;
        }
      }
      return best;
    });
    return { tube, ports: portU };
  }, []);

  useEffect(
    () => () => {
      geos.forEach((g) => g.dispose());
      tube.dispose();
      [tubeMat, body, bezel, metal, glass, screenMat].forEach((m) => m.dispose());
      screenMat.map?.dispose();
    },
    [geos, tube, tubeMat, body, bezel, metal, glass, screenMat],
  );

  const head = useRef(0);
  useFrame((state, dt) => {
    const a = instrumentState.active;
    const target = a < 0 ? 0 : a >= 5 ? 1 : ports[Math.min(a, ports.length - 1)] + 0.03;
    head.current += (target - head.current) * (1 - Math.exp(-dt * 2.2));
    tubeMat.uniforms.uHead.value = head.current;
    tubeMat.uniforms.uTime.value = state.clock.elapsedTime;
    strips.current.forEach((m, i) => {
      if (!m) return;
      const on = i === a ? 1 : 0;
      const cur = m.userData.v ?? 0;
      const v = cur + (on - cur) * (1 - Math.exp(-dt * 5));
      m.userData.v = v;
      m.color.setRGB(0.18 + 0.2 * v, 0.24 + 0.6 * v, 0.32 + 0.68 * v);
    });
  });

  return (
    <group>
      {/* plinth */}
      <mesh position={[0, -0.06, 0.1]} material={bezel}>
        <boxGeometry args={[11.6, 0.12, 2.6]} />
      </mesh>
      <mesh position={[0, -0.005, 1.39]}>
        <boxGeometry args={[11.6, 0.012, 0.012]} />
        <meshBasicMaterial color="#63d3ff" transparent opacity={0.35} />
      </mesh>

      {LAYOUT.map((m, i) => (
        <group key={m.id} position={m.pos}>
          {m.id === 'data' ? (
            <>
              <mesh geometry={geos[i]} material={bezel} />
              <mesh position={[0, 0, m.size[2] / 2 + 0.002]} material={screenMat}>
                <planeGeometry args={[m.size[0] - 0.08, m.size[1] - 0.08]} />
              </mesh>
              <mesh position={[0, -m.size[1] / 2 - 0.5, -0.05]} material={metal}>
                <cylinderGeometry args={[0.025, 0.025, 1.0, 12]} />
              </mesh>
            </>
          ) : (
            <>
              <mesh geometry={geos[i]} material={body} />
              {/* front bezel panel */}
              <mesh position={[0, 0.05, m.size[2] / 2 + 0.006]} material={bezel}>
                <boxGeometry args={[m.size[0] - 0.14, m.size[1] - 0.24, 0.01]} />
              </mesh>
              {/* status strip */}
              <mesh position={[0, m.size[1] / 2 - 0.1, m.size[2] / 2 + 0.014]}>
                <boxGeometry args={[m.size[0] - 0.34, 0.018, 0.006]} />
                <meshBasicMaterial ref={(el) => el && (strips.current[i] = el)} color="#2c3a4a" toneMapped={false} />
              </mesh>
              {/* module-specific details */}
              {m.id === 'pump' &&
                [-0.22, 0.22].map((x) => (
                  <mesh key={x} position={[x, -0.15, m.size[2] / 2 + 0.05]} rotation={[Math.PI / 2, 0, 0]} material={metal}>
                    <cylinderGeometry args={[0.12, 0.12, 0.09, 32]} />
                  </mesh>
                ))}
              {m.id === 'sampler' && (
                <mesh position={[0, 0.15, m.size[2] / 2 + 0.015]} material={glass}>
                  <boxGeometry args={[m.size[0] - 0.4, 0.7, 0.01]} />
                </mesh>
              )}
              {m.id === 'column' && (
                <mesh position={[0, 0.12, m.size[2] / 2 + 0.03]} rotation={[0, 0, Math.PI / 2]} material={metal}>
                  <cylinderGeometry args={[0.05, 0.05, m.size[0] - 0.6, 24]} />
                </mesh>
              )}
              {m.id === 'optical' && (
                <mesh position={[0, 0.2, m.size[2] / 2 + 0.015]} material={glass}>
                  <circleGeometry args={[0.2, 48]} />
                </mesh>
              )}
              {m.id === 'ms' && (
                <>
                  <mesh position={[-m.size[0] / 2 - 0.02, 0.35, 0]} rotation={[0, 0, Math.PI / 2]} material={metal}>
                    <cylinderGeometry args={[0.16, 0.24, 0.1, 40]} />
                  </mesh>
                  <mesh position={[0.25, 0.15, m.size[2] / 2 + 0.015]} material={glass}>
                    <boxGeometry args={[0.9, 0.5, 0.01]} />
                  </mesh>
                </>
              )}
            </>
          )}
        </group>
      ))}

      <mesh geometry={tube} material={tubeMat} renderOrder={3} />
    </group>
  );
}

function Rig({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera, size } = useThree();
  const pos = useMemo(() => new THREE.Vector3(0, 3, 11), []);
  const look = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const tPos = useMemo(() => new THREE.Vector3(), []);
  const tLook = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const portrait = size.width / size.height < 1;
    const a = instrumentState.active;
    const overview = a < 0 || a > 5 || reducedMotion;
    if (overview) {
      tPos.set(0, 2.9, portrait ? 21 : 11.5);
      tLook.set(0, 1.1, 0);
    } else {
      const m = LAYOUT[a];
      const span = Math.max(m.size[0], m.size[1]);
      const dist = (portrait ? 6.5 : 3.6) + span * (portrait ? 3.2 : 2.3);
      // module sits right of centre on desktop so the copy on the left stays clear
      tPos.set(m.pos.x - (portrait ? 0 : 0.3), m.pos.y + 1.1, m.pos.z + dist);
      tLook.set(m.pos.x - (portrait ? 0 : 1.5), m.pos.y - 0.1, m.pos.z);
    }
    tPos.x += heroState.pointerX * 0.4;
    tPos.y += heroState.pointerY * 0.25;
    const k = 1 - Math.exp(-dt * 2.4);
    pos.lerp(tPos, k);
    look.lerp(tLook, k);
    camera.position.copy(pos);
    camera.lookAt(look);
  });
  return null;
}

export default function InstrumentCanvas({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
  const q = getQuality();
  return (
    <Canvas
      className="instrument-canvas"
      frameloop={active ? 'always' : 'never'}
      dpr={q.dpr}
      camera={{ fov: 34, near: 0.1, far: 60, position: [0, 3, 11] }}
      gl={{ antialias: q.tier !== 'low', alpha: true }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
      }}
      aria-hidden="true"
    >
      <StudioEnvironment intensity={0.7} />
      <ambientLight intensity={0.1} />
      <directionalLight position={[5, 7, 6]} intensity={1.3} color="#e6eeff" />
      <directionalLight position={[-7, 3, -5]} intensity={0.8} color="#8fb0ff" />
      <directionalLight position={[2, -2, 6]} intensity={0.2} color="#ffcf9e" />
      <Rig reducedMotion={reducedMotion} />
      <Stack />
      <AdaptiveDpr min={q.dpr[0]} max={q.dpr[1]} />
    </Canvas>
  );
}

