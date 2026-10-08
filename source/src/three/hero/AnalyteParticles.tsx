import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { heroParticlesFragment, heroParticlesVertex } from '../../shaders/heroParticles';
import { HERO_ANALYTES, HERO_COLUMN } from '../../utils/chroma';
import { normal, rng } from '../../utils/math';
import { heroState } from '../../utils/scrollStore';
import { heroFrame } from './heroFrame';

export const SAMPLE_CENTER = new THREE.Vector3(-7.6, 0.35, 0);

interface Props {
  count: number;
  reducedMotion: boolean;
}

export function AnalyteParticles({ count, reducedMotion }: Props) {
  const { gl, camera, size } = useThree();
  const pointsRef = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const rand = rng(7);
    const pop = new Float32Array(count);
    const seed = new Float32Array(count * 4);
    const cloud = new Float32Array(count * 3);
    const pos = new Float32Array(count * 3); // required by three; real positions come from the shader
    for (let i = 0; i < count; i++) {
      pop[i] = i % 4;
      seed[i * 4] = Math.max(-3, Math.min(3, normal(rand)));
      seed[i * 4 + 1] = rand() * Math.PI * 2;
      seed[i * 4 + 2] = Math.sqrt(rand());
      seed[i * 4 + 3] = rand();
      // the sample plug: a slightly flattened gaussian blob
      cloud[i * 3] = normal(rand) * 0.55;
      cloud[i * 3 + 1] = normal(rand) * 0.42;
      cloud[i * 3 + 2] = normal(rand) * 0.55;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aPop', new THREE.BufferAttribute(pop, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    g.setAttribute('aCloud', new THREE.BufferAttribute(cloud, 3));
    // positions are computed in the shader, so give the bounds generously
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 30);
    return g;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: heroParticlesVertex,
        fragmentShader: heroParticlesFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uSim: { value: 0 },
          uInject: { value: 0 },
          uReveal: { value: 0 },
          uFade: { value: 1 },
          uPixelRatio: { value: 1 },
          uSize: { value: 26 },
          uInlet: { value: HERO_COLUMN.inlet },
          uOutlet: { value: HERO_COLUMN.outlet },
          uDetector: { value: HERO_COLUMN.detector },
          uRadius: { value: HERO_COLUMN.radius },
          uSigma0: { value: HERO_COLUMN.sigma0 },
          uDisp: { value: HERO_COLUMN.dispersion },
          uMotion: { value: 1 },
          uCloud: { value: SAMPLE_CENTER.clone() },
          uPointer: { value: new THREE.Vector3(99, 99, 99) },
          uPointerStrength: { value: 0 },
          uK: { value: HERO_ANALYTES.map((a) => a.k) },
          uColors: { value: HERO_ANALYTES.map((a) => new THREE.Color(a.color)) },
        },
      }),
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry],
  );
  useEffect(() => () => material.dispose(), [material]);

  const ray = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);

  useFrame((_, delta) => {
    const u = material.uniforms;
    u.uTime.value = heroFrame.time;
    u.uSim.value = heroFrame.sim;
    u.uInject.value = heroFrame.inject;
    u.uReveal.value = heroFrame.reveal;
    u.uFade.value = heroFrame.fade;
    u.uPixelRatio.value = gl.getPixelRatio();
    u.uMotion.value = reducedMotion ? 0.15 : 1;
    // keep perceived particle size stable on small screens
    u.uSize.value = size.width < 700 ? 34 : 26;

    // pointer → world point on the z=0 plane
    ndc.set(heroState.pointerX, heroState.pointerY);
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(plane, hit)) u.uPointer.value.lerp(hit, 1 - Math.exp(-delta * 8));
    const targetStrength = reducedMotion ? 0 : 1;
    u.uPointerStrength.value += (targetStrength - u.uPointerStrength.value) * (1 - Math.exp(-delta * 3));
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />;
}
