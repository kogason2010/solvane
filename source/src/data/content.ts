export const BRAND = {
  name: 'Solvane',
  tagline: 'Analytical Sciences',
};

export const NAV = [
  { label: 'Science', href: '#science' },
  { label: 'Technology', href: '#technology' },
  { label: 'Applications', href: '#applications' },
  { label: 'Data', href: '#data' },
];

export const HERO_COPY = {
  eyebrow: 'Separation · Detection · Quantitation',
  headline: ['From complexity,', 'clarity.'],
  lede: 'Solvane builds the separation, detection and data systems that turn a complex sample into a number you can stand behind.',
};

/** Captions shown while the hero scene plays; indices align with PHASES in three/hero/timeline. */
export const HERO_PHASES = [
  {
    num: '01',
    title: 'Sample',
    text: 'A mixture of compounds, indistinguishable to the eye. Everything you need to know is in here — together.',
  },
  {
    num: '02',
    title: 'Separation',
    text: 'Each compound partitions differently between the flowing liquid and the packed stationary phase, so each travels at its own speed.',
  },
  {
    num: '03',
    title: 'Detection',
    text: 'As each band crosses the flow cell it absorbs ultraviolet light. The photodiode measures exactly how much is lost.',
  },
  {
    num: '04',
    title: 'Signal',
    text: 'Absorbance over time becomes a chromatogram — one peak for every resolved compound.',
  },
  {
    num: '05',
    title: 'Insight',
    text: 'Where a peak appears identifies it. How large it is tells you how much is there.',
  },
];
