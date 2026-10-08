/** Per-frame derived values shared by every hero component (written once per frame by the Director). */
export const heroFrame = {
  p: 0,
  sim: 0,
  inject: 0,
  reveal: 0,
  fade: 1,
  signal: 0, // detector absorbance signal at the current sim time
  time: 0,
};
