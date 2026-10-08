import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getQuality } from '../utils/quality';
import { moleculeState, heroState } from '../utils/scrollStore';
import { normal, rng, smoothstep } from '../utils/math';
import { AdaptiveDpr } from './shared/AdaptiveDpr';
import { StudioEnvironment } from './shared/StudioEnvironment';
import { benzoicAcid, caffeine, ELEMENT_STYLE, paracetamol } from './molecular/molecules';
import { atomGeometry, bondGeometry, bondInstanceCount, buildField, writeBond } from './molecular/MoleculeBuilder';

const smooth = { p: 0 };

/** The focal molecule assembles from scattered atoms as the section scrolls. */
function HeroMolecule({ reducedMotion }: { reducedMotion: boolean }) {
  const mol = useMemo(() => caffeine(), []);
  const group = useRef<THREE.Group>(null);
  const { atoms, bonds, starts, finals } = useMemo(() => {
    const ag = atomGeometry();
    const bg = bondGeometry();
    const am = new THREE.MeshStandardMaterial({ roughness: 0.32, metalness: 0.15, envMapIntensity: 1.1 });
    const bm = new THREE.MeshStandardMaterial({ color: '#8a96a8', roughness: 0.4, metalness: 0.5, transparent: true });
    const atoms = new THREE.InstancedMesh(ag, am, mol.atoms.length);
    const bonds = new THREE.InstancedMesh(bg, bm, bondInstanceCount(mol));
    const c = new THREE.Color();
    mol.atoms.forEach((a, i) => atoms.setColorAt(i, c.set(ELEMENT_STYLE[a.el].color)));
    const rand = rng(5);
    const starts = mol.atoms.map(
      () => new THREE.Vector3(normal(rand) * 5, normal(rand) * 3.5, normal(rand) * 4 - 2),
    );
    const finals = mol.atoms.map((a) => new THREE.Vector3(...a.p));
    atoms.frustumCulled = false;
    bonds.frustumCulled = false;
    return { atoms, bonds, starts, finals };
  }, [mol]);

  useEffect(
    () => () => {
      atoms.geometry.dispose();
      (atoms.material as THREE.Material).dispose();
      bonds.geometry.dispose();
      (bonds.material as THREE.Material).dispose();
    },
    [atoms, bonds],
  );

  const pos = useMemo(() => mol.atoms.map(() => new THREE.Vector3()), [mol]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const s = useMemo(() => new THREE.Vector3(), []);
  const view = useMemo(() => new THREE.Vector3(0, 0, 1), []);

  useFrame((state) => {
    const p = smooth.p;
    const t = state.clock.elapsedTime;
    const assemble = reducedMotion ? 1 : smoothstep(0.1, 0.55, p);
    mol.atoms.forEach((a, i) => {
      // stagger: heavier atoms settle first, hydrogens last
      const lag = a.el === 'H' ? 0.18 : 0;
      const k = smoothstep(lag, 1, assemble);
      const e = 1 - Math.pow(1 - k, 3);
      pos[i].lerpVectors(starts[i], finals[i], e);
      // residual thermal motion while unassembled
      const jitter = (1 - e) * 0.25;
      pos[i].x += Math.sin(t * 1.3 + i) * jitter;
      pos[i].y += Math.cos(t * 1.1 + i * 1.7) * jitter;
      s.setScalar(ELEMENT_STYLE[a.el].r);
      m.compose(pos[i], q, s);
      atoms.setMatrixAt(i, m);
    });
    atoms.instanceMatrix.needsUpdate = true;
    let bi = 0;
    for (const b of mol.bonds) bi = writeBond(bonds, bi, pos[b.a], pos[b.b], b.order, 0.075, null, view);
    bonds.instanceMatrix.needsUpdate = true;
    (bonds.material as THREE.MeshStandardMaterial).opacity = smoothstep(0.75, 1, assemble);

    if (group.current) {
      const spin = reducedMotion ? 0.4 : t * 0.12 + p * 1.6;
      group.current.rotation.y = spin + heroState.pointerX * 0.25;
      group.current.rotation.x = -0.25 + heroState.pointerY * 0.15 + Math.sin(t * 0.3) * 0.05;
    }
  });

  return (
    <group ref={group} position={[1.6, 0, 0]}>
      <primitive object={atoms} />
      <primitive object={bonds} />
    </group>
  );
}

/** Dim background population of other small molecules: the sample matrix. */
function Field({ count }: { count: number }) {
  const group = useRef<THREE.Group>(null);
  const meshes = useMemo(() => {
    const ag = atomGeometry();
    const bg = bondGeometry();
    const am = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.1 });
    const bm = new THREE.MeshStandardMaterial({ color: '#566273', roughness: 0.6 });
    const rand = rng(31);
    const kinds = [paracetamol(), benzoicAcid(), caffeine()];
    const per: THREE.Matrix4[][] = [[], [], []];
    for (let i = 0; i < count; i++) {
      const p = new THREE.Vector3((rand() - 0.5) * 40, (rand() - 0.5) * 22, -4 - rand() * 26);
      // keep the area around the focal molecule clear
      if (Math.abs(p.x - 1.6) < 5 && Math.abs(p.y) < 4 && p.z > -10) p.z -= 10;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * 6.28, rand() * 6.28, rand() * 6.28));
      const s = new THREE.Vector3().setScalar(0.45 + rand() * 0.35);
      per[i % 3].push(new THREE.Matrix4().compose(p, q, s));
    }
    const out = kinds.map((k, i) => buildField(k, per[i], ag, bg, am, bm));
    return { out, ag, bg, am, bm };
  }, [count]);

  useEffect(
    () => () => {
      meshes.ag.dispose();
      meshes.bg.dispose();
      meshes.am.dispose();
      meshes.bm.dispose();
      meshes.out.forEach((o) => {
        o.atoms.dispose();
        o.bonds.dispose();
      });
    },
    [meshes],
  );

  useFrame((state) => {
    if (group.current) group.current.rotation.y = state.clock.elapsedTime * 0.01 + smooth.p * 0.3;
  });

  return (
    <group ref={group}>
      {meshes.out.map((o, i) => (
        <group key={i}>
          <primitive object={o.atoms} />
          <primitive object={o.bonds} />
        </group>
      ))}
    </group>
  );
}

function Rig({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera, size } = useThree();
  const look = useMemo(() => new THREE.Vector3(1.6, 0, 0), []);
  const spot = useRef<THREE.SpotLight>(null);
  useFrame((_, dt) => {
    smooth.p += (moleculeState.progress - smooth.p) * (1 - Math.exp(-dt * 5));
    const p = reducedMotion ? 0.7 : smooth.p;
    const portrait = size.width / size.height < 1;
    const z = THREE.MathUtils.lerp(26, portrait ? 13 : 8.5, smoothstep(0, 0.75, p));
    const x = THREE.MathUtils.lerp(-3, portrait ? 1.6 : -1.2, smoothstep(0, 0.8, p));
    camera.position.set(x + heroState.pointerX * 0.4, 0.6 + heroState.pointerY * 0.3, z);
    camera.lookAt(look);
    if (spot.current) spot.current.intensity = 260 * smoothstep(0.15, 0.6, p) + 30;
  });
  return (
    <spotLight ref={spot} position={[4, 6, 8]} angle={0.45} penumbra={0.8} color="#eaf2ff" />
  );
}

export default function MolecularCanvas({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
  const q = getQuality();
  return (
    <Canvas
      className="molecular-canvas"
      frameloop={active ? 'always' : 'never'}
      dpr={q.dpr}
      camera={{ fov: 35, near: 0.1, far: 80, position: [-3, 0.6, 26] }}
      gl={{ antialias: q.tier !== 'low', alpha: true }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
      }}
      aria-hidden="true"
    >
      <fog attach="fog" args={['#06080c', 9, 34]} />
      <StudioEnvironment intensity={0.35} />
      <ambientLight intensity={0.12} />
      <directionalLight position={[-6, 2, -4]} intensity={1.2} color="#8fb0ff" />
      <directionalLight position={[6, -3, 2]} intensity={0.35} color="#ffc59a" />
      <Rig reducedMotion={reducedMotion} />
      <HeroMolecule reducedMotion={reducedMotion} />
      <Field count={q.moleculeField} />
      <AdaptiveDpr min={q.dpr[0]} max={q.dpr[1]} />
    </Canvas>
  );
}
