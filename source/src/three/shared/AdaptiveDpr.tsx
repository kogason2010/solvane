import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

/**
 * Runtime quality governor: samples frame time and steps device-pixel-ratio down when the GPU
 * can't hold ~50 fps, and back up (to the cap) when there is comfortable headroom.
 */
export function AdaptiveDpr({ min, max }: { min: number; max: number }) {
  const setDpr = useThree((s) => s.setDpr);
  const acc = useRef({ frames: 0, time: 0, dpr: Math.min(max, window.devicePixelRatio || 1), cooldown: 0 });

  useFrame((_, delta) => {
    const a = acc.current;
    a.frames++;
    a.time += delta;
    a.cooldown -= delta;
    if (a.time < 1.0) return;
    const fps = a.frames / a.time;
    a.frames = 0;
    a.time = 0;
    if (a.cooldown > 0) return;
    if (fps < 48 && a.dpr > min) {
      a.dpr = Math.max(min, a.dpr - 0.25);
      setDpr(a.dpr);
      a.cooldown = 1.5;
    } else if (fps > 58 && a.dpr < Math.min(max, window.devicePixelRatio || 1)) {
      a.dpr = Math.min(max, a.dpr + 0.125);
      setDpr(a.dpr);
      a.cooldown = 3;
    }
  });
  return null;
}
