/**
 * Tiny mutable stores read inside render loops (WebGL / canvas) without causing React renders.
 * ScrollTrigger writes; useFrame / rAF loops read.
 */
export const heroState = {
  progress: 0, // 0..1 over the pinned hero
  pointerX: 0, // -1..1
  pointerY: 0, // -1..1
  visible: true,
};

export const moleculeState = { progress: 0, visible: false };
export const instrumentState = { progress: 0, visible: false, active: 0 };
