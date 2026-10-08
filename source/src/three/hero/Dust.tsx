import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { dustFragment, dustVertex } from '../../shaders/heroParticles';
import { rng } from '../../utils/math';
import { heroFrame } from './heroFrame';

export function Dust({ count = 600 }: { count?: number }) {
  const { g, m } = useMemo(() => {
    const rand = rng(99);
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rand() - 0.5) * 34;
      pos[i * 3 + 1] = (rand() - 0.5) * 14;
      pos[i * 3 + 2] = -rand() * 18 + 3;
      seed[i] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: dustVertex,
      fragmentShader: dustFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
    });
    return { g, m };
  }, [count]);
  useEffect(
    () => () => {
      g.dispose();
      m.dispose();
    },
    [g, m],
  );
  useFrame(({ gl }) => {
    m.uniforms.uTime.value = heroFrame.time;
    m.uniforms.uPixelRatio.value = gl.getPixelRatio();
  });
  return <points geometry={g} material={m} frustumCulled={false} />;
}
