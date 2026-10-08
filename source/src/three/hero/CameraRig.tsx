import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { heroState } from '../../utils/scrollStore';
import { heroFrame } from './heroFrame';
import { STATIC_CAMERA, cameraAt } from './timeline';

/**
 * Scroll-choreographed camera with restrained pointer parallax.
 * Portrait screens pull the camera back so the same composition fits a narrow frustum.
 */
export function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera, size } = useThree();
  const tmp = useMemo(() => ({ pos: [0, 0, 0], target: [0, 0, 0] }), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(-9, 0.3, 0), []);
  const par = useMemo(() => new THREE.Vector2(), []);

  useFrame((_, delta) => {
    const aspect = size.width / size.height;
    if (reducedMotion) {
      pos.fromArray(STATIC_CAMERA.pos);
      target.fromArray(STATIC_CAMERA.target);
    } else {
      cameraAt(heroFrame.p, tmp);
      pos.fromArray(tmp.pos);
      target.fromArray(tmp.target);
    }

    // portrait / narrow: dolly back along the view direction and recentre slightly
    if (aspect < 1.25) {
      const dir = pos.clone().sub(target);
      const f = THREE.MathUtils.clamp(1.25 / aspect, 1, 2.3);
      pos.copy(target).add(dir.multiplyScalar(f));
      if (heroFrame.p < 0.2 && !reducedMotion) {
        // keep the sample plug centred rather than off to the right on phones
        target.x += 1.3;
        pos.x += 1.3;
      }
    }

    // pointer parallax (smoothed)
    const amt = reducedMotion ? 0 : 1;
    par.x += (heroState.pointerX * amt - par.x) * (1 - Math.exp(-delta * 3));
    par.y += (heroState.pointerY * amt - par.y) * (1 - Math.exp(-delta * 3));
    pos.x += par.x * 0.45;
    pos.y += par.y * 0.3;

    camera.position.lerp(pos, 1 - Math.exp(-delta * 5));
    look.lerp(target, 1 - Math.exp(-delta * 5));
    camera.lookAt(look);
  });
  return null;
}
