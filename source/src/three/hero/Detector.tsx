import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { beamFragment, beamVertex, glassFragment, glassVertex } from '../../shaders/glass';
import { HERO_COLUMN } from '../../utils/chroma';
import { heroFrame } from './heroFrame';

const X = HERO_COLUMN.detector;
const LAMP_Y = -1.35;
const PD_Y = 1.0;

/**
 * UV absorbance flow cell.
 * Light from the lamp (below) crosses the flow path; the photodiode (above) sees I = I0 · 10^(−A).
 * A is the live detector signal, so the upper beam visibly dims as each band passes.
 */
export function Detector() {
  const beamLow = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: beamVertex,
        fragmentShader: beamFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: new THREE.Color('#8fb0ff') }, uIntensity: { value: 1.0 }, uTime: { value: 0 } },
      }),
    [],
  );
  const beamHigh = useMemo(() => {
    const m = beamLow.clone();
    m.uniforms = THREE.UniformsUtils.clone(beamLow.uniforms);
    return m;
  }, [beamLow]);
  const cellGlass = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: glassVertex,
        fragmentShader: glassFragment,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          uTint: { value: new THREE.Color('#a9c8ee') },
          uLightPos: { value: new THREE.Vector3(X, 3, 5) },
          uOpacity: { value: 0.8 },
          uTime: { value: 0 },
        },
      }),
    [],
  );
  const housing = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#1d232b', metalness: 0.85, roughness: 0.32, envMapIntensity: 1 }),
    [],
  );
  const trim = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#a8b2bf', metalness: 1, roughness: 0.22, envMapIntensity: 1.2 }),
    [],
  );
  const pdFace = useRef<THREE.MeshBasicMaterial>(null);
  const lampFace = useRef<THREE.MeshBasicMaterial>(null);
  const halo = useRef<THREE.PointLight>(null);

  const cellGeo = useMemo(() => new THREE.BoxGeometry(0.62, 0.62, 0.62), []);
  const edges = useMemo(() => new THREE.EdgesGeometry(cellGeo), [cellGeo]);
  const beamLowGeo = useMemo(() => new THREE.CylinderGeometry(0.075, 0.075, Math.abs(LAMP_Y) - 0.2, 24, 1, true), []);
  const beamHighGeo = useMemo(() => new THREE.CylinderGeometry(0.075, 0.075, PD_Y - 0.17, 24, 1, true), []);

  useEffect(
    () => () => {
      [beamLow, beamHigh, cellGlass, housing, trim].forEach((m) => m.dispose());
      [cellGeo, edges, beamLowGeo, beamHighGeo].forEach((g) => g.dispose());
    },
    [beamLow, beamHigh, cellGlass, housing, trim, cellGeo, edges, beamLowGeo, beamHighGeo],
  );

  useFrame(() => {
    const A = heroFrame.signal * 0.95; // absorbance units
    const T = Math.pow(10, -A); // transmittance
    const t = heroFrame.time;
    const on = THREE.MathUtils.smoothstep(heroFrame.p, 0.16, 0.24); // lamp warms up as the run starts
    beamLow.uniforms.uIntensity.value = 1.25 * on;
    beamHigh.uniforms.uIntensity.value = 1.25 * T * on;
    beamLow.uniforms.uTime.value = t;
    beamHigh.uniforms.uTime.value = t;
    if (pdFace.current) pdFace.current.color.setRGB(0.25 + 0.6 * T * on, 0.35 + 0.6 * T * on, 0.55 + 0.45 * T * on);
    if (lampFace.current) lampFace.current.color.setRGB(0.35 + 0.5 * on, 0.45 + 0.5 * on, 0.7 + 0.3 * on);
    if (halo.current) halo.current.intensity = 2.2 * on * (0.4 + 0.6 * T);
  });

  return (
    <group position={[X, 0, 0]}>
      {/* flow cell: glass block with a fine metal frame */}
      <mesh geometry={cellGeo} material={cellGlass} renderOrder={4} />
      <lineSegments geometry={edges} renderOrder={4}>
        <lineBasicMaterial color="#b9c8da" transparent opacity={0.55} />
      </lineSegments>

      {/* lamp */}
      <group position={[0, LAMP_Y, 0]}>
        <mesh material={housing}>
          <boxGeometry args={[0.7, 0.42, 0.7]} />
        </mesh>
        <mesh position={[0, 0.215, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.1, 32]} />
          <meshBasicMaterial ref={lampFace} color="#b5c8ff" toneMapped={false} />
        </mesh>
        <mesh material={trim} position={[0, -0.25, 0]}>
          <boxGeometry args={[0.78, 0.06, 0.78]} />
        </mesh>
      </group>
      <mesh geometry={beamLowGeo} material={beamLow} position={[0, (LAMP_Y + 0.2) / 2, 0]} renderOrder={5} />

      {/* photodiode */}
      <group position={[0, PD_Y, 0]}>
        <mesh material={housing}>
          <boxGeometry args={[0.56, 0.34, 0.56]} />
        </mesh>
        <mesh position={[0, -0.175, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.2, 0.2]} />
          <meshBasicMaterial ref={pdFace} color="#6f8fd0" toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh material={trim} position={[0, 0.2, 0]}>
          <boxGeometry args={[0.62, 0.05, 0.62]} />
        </mesh>
      </group>
      <mesh geometry={beamHighGeo} material={beamHigh} position={[0, (PD_Y - 0.17) / 2, 0]} renderOrder={5} />
      <pointLight ref={halo} color="#9db8ff" distance={4} decay={2} position={[0, -0.4, 0.4]} />
    </group>
  );
}
