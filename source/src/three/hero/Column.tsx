import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { bedFragment, bedVertex } from '../../shaders/heroParticles';
import { glassFragment, glassVertex } from '../../shaders/glass';
import { HERO_COLUMN } from '../../utils/chroma';
import { rng } from '../../utils/math';
import { heroState } from '../../utils/scrollStore';
import { heroFrame } from './heroFrame';
import { SAMPLE_CENTER } from './AnalyteParticles';

const { inlet, outlet, detector, radius } = HERO_COLUMN;
const LENGTH = outlet - inlet;
const MID = (inlet + outlet) / 2;

function makeGlass(tint: string, opacity: number, side: THREE.Side) {
  return new THREE.ShaderMaterial({
    vertexShader: glassVertex,
    fragmentShader: glassFragment,
    transparent: true,
    depthWrite: false,
    side,
    uniforms: {
      uTint: { value: new THREE.Color(tint) },
      uLightPos: { value: new THREE.Vector3(0, 4, 6) },
      uOpacity: { value: opacity },
      uTime: { value: 0 },
    },
  });
}

export function Column({ bedCount }: { bedCount: number }) {
  const glassBack = useMemo(() => makeGlass('#6f8db3', 0.6, THREE.BackSide), []);
  const glassFront = useMemo(() => makeGlass('#9fc3ea', 1.0, THREE.FrontSide), []);
  const capGlass = useMemo(() => makeGlass('#8fb2d8', 0.9, THREE.DoubleSide), []);

  const metal = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#9aa4b1', metalness: 1, roughness: 0.26, envMapIntensity: 1.1 }),
    [],
  );
  const darkMetal = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2a3038', metalness: 0.9, roughness: 0.38, envMapIntensity: 0.9 }),
    [],
  );

  // packed stationary phase: points distributed uniformly inside the bed volume
  const bed = useMemo(() => {
    const rand = rng(21);
    const pos = new Float32Array(bedCount * 3);
    const seed = new Float32Array(bedCount);
    for (let i = 0; i < bedCount; i++) {
      const r = Math.sqrt(rand()) * radius * 0.95;
      const a = rand() * Math.PI * 2;
      pos[i * 3] = inlet + rand() * LENGTH;
      pos[i * 3 + 1] = Math.cos(a) * r;
      pos[i * 3 + 2] = Math.sin(a) * r;
      seed[i] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: bedVertex,
      fragmentShader: bedFragment,
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uOpacity: { value: 1 } },
    });
    return { g, m };
  }, [bedCount]);

  // transfer capillary: sample loop → column inlet
  const inletCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(SAMPLE_CENTER.x + 0.9, SAMPLE_CENTER.y - 0.05, 0),
        new THREE.Vector3(inlet - 1.15, 0.22, 0),
        new THREE.Vector3(inlet - 0.6, 0, 0),
      ]),
    [],
  );
  const inletTube = useMemo(() => new THREE.TubeGeometry(inletCurve, 48, 0.07, 16, false), [inletCurve]);
  const outletTube = useMemo(
    () => new THREE.CylinderGeometry(0.1, 0.1, detector - outlet + 0.3, 20, 1, true).rotateZ(Math.PI / 2),
    [],
  );
  const columnGeo = useMemo(
    () => new THREE.CylinderGeometry(radius + 0.04, radius + 0.04, LENGTH, 64, 1, true).rotateZ(Math.PI / 2),
    [],
  );
  const fittingGeo = useMemo(() => new THREE.CylinderGeometry(0.44, 0.44, 0.36, 48).rotateZ(Math.PI / 2), []);
  const nutGeo = useMemo(() => new THREE.CylinderGeometry(0.26, 0.26, 0.26, 6).rotateZ(Math.PI / 2), []);
  const ringGeo = useMemo(() => new THREE.TorusGeometry(radius + 0.045, 0.004, 6, 64).rotateY(Math.PI / 2), []);
  const ticks = useMemo(() => Array.from({ length: 21 }, (_, i) => inlet + (i / 20) * LENGTH), []);

  useEffect(
    () => () => {
      [glassBack, glassFront, capGlass, metal, darkMetal, bed.m].forEach((m) => m.dispose());
      [bed.g, inletTube, outletTube, columnGeo, fittingGeo, nutGeo, ringGeo].forEach((g) => g.dispose());
    },
    [glassBack, glassFront, capGlass, metal, darkMetal, bed, inletTube, outletTube, columnGeo, fittingGeo, nutGeo, ringGeo],
  );

  useFrame(({ gl }) => {
    const lx = heroState.pointerX * 6;
    const ly = 3 + heroState.pointerY * 2;
    for (const m of [glassBack, glassFront, capGlass]) {
      m.uniforms.uLightPos.value.set(lx, ly, 6);
      m.uniforms.uTime.value = heroFrame.time;
    }
    bed.m.uniforms.uTime.value = heroFrame.time;
    bed.m.uniforms.uPixelRatio.value = gl.getPixelRatio();
  });

  return (
    <group>
      {/* stationary phase */}
      <points geometry={bed.g} material={bed.m} frustumCulled={false} />

      {/* glass column body (back faces first, then front for correct layering) */}
      <mesh geometry={columnGeo} material={glassBack} position={[MID, 0, 0]} renderOrder={1} />
      <mesh geometry={columnGeo} material={glassFront} position={[MID, 0, 0]} renderOrder={3} />
      {ticks.map((x, i) => (
        <mesh key={i} geometry={ringGeo} position={[x, 0, 0]} renderOrder={3}>
          <meshBasicMaterial color="#9fb7d4" transparent opacity={i % 5 === 0 ? 0.55 : 0.18} depthWrite={false} />
        </mesh>
      ))}

      {/* end fittings */}
      {[inlet - 0.18, outlet + 0.18].map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh geometry={fittingGeo} material={metal} />
          <mesh geometry={nutGeo} material={darkMetal} position={[i === 0 ? -0.3 : 0.3, 0, 0]} />
        </group>
      ))}

      {/* capillaries */}
      <mesh geometry={inletTube} material={capGlass} renderOrder={2} />
      <mesh geometry={outletTube} material={capGlass} position={[(outlet + detector) / 2 + 0.15, 0, 0]} renderOrder={2} />
    </group>
  );
}
