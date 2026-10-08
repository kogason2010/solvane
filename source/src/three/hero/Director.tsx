import { useFrame } from '@react-three/fiber';
import { heroState } from '../../utils/scrollStore';
import { heroSignal } from '../../utils/chroma';
import { heroFrame } from './heroFrame';
import { injectAmount, particleFade, revealAmount, simClock } from './timeline';

/**
 * Reads raw scroll progress, applies critically-damped smoothing so the scene never snaps,
 * and publishes the derived timeline for this frame.
 */
export function Director() {
  useFrame((state, delta) => {
    const target = heroState.progress;
    const k = 1 - Math.exp(-delta * 6);
    heroFrame.p += (target - heroFrame.p) * k;
    if (Math.abs(target - heroFrame.p) < 1e-5) heroFrame.p = target;
    const p = heroFrame.p;
    heroFrame.sim = simClock(p);
    heroFrame.inject = injectAmount(p);
    heroFrame.reveal = revealAmount(p);
    heroFrame.fade = particleFade(p);
    heroFrame.signal = heroSignal(heroFrame.sim);
    heroFrame.time = state.clock.elapsedTime;
  }, -10);
  return null;
}
