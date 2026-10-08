export const DETECTORS = [
  {
    id: 'uv',
    name: 'UV / PDA',
    full: 'Ultraviolet–visible photodiode array',
    principle:
      'Broadband light crosses the flow cell. A grating spreads what is transmitted across an array of photodiodes, so every wavelength is read at once and each peak carries its own absorbance spectrum.',
    measures: 'Absorbance, A = εbc',
    bestFor: 'Chromophores · purity checks · routine quantitation',
  },
  {
    id: 'fl',
    name: 'Fluorescence',
    full: 'Fluorescence detection',
    principle:
      'Molecules absorb at an excitation wavelength and re-emit at a longer one. Emission is collected at 90° to the excitation beam, so the detector sees almost no source light.',
    measures: 'Emitted intensity at λem',
    bestFor: 'Native fluorophores · derivatised amines · trace levels',
  },
  {
    id: 'ms',
    name: 'Mass Spectrometry',
    full: 'Electrospray ionisation mass spectrometry',
    principle:
      'Eluent is sprayed into charged droplets that release gas-phase ions. A quadrupole transmits only ions of a selected mass-to-charge ratio; sweeping it records a mass spectrum.',
    measures: 'Ion abundance vs m/z',
    bestFor: 'Identity confirmation · co-eluting compounds · unknowns',
  },
  {
    id: 'cd',
    name: 'Conductivity',
    full: 'Suppressed conductivity detection',
    principle:
      'An alternating field drives ions back and forth between two electrodes. More ions means more current: conductance rises as each ionic band passes through the cell.',
    measures: 'Conductance, µS/cm',
    bestFor: 'Inorganic anions & cations · organic acids · ion chromatography',
  },
  {
    id: 'toc',
    name: 'TOC / NDIR',
    full: 'Total organic carbon by non-dispersive infrared',
    principle:
      'Organic carbon is oxidised completely to carbon dioxide. CO₂ absorbs infrared light near 4.26 µm, so the drop in transmitted IR gives the amount of carbon that was present.',
    measures: 'CO₂ by IR absorbance → mg C/L',
    bestFor: 'Pure & process water · cleaning verification · environmental water',
  },
];
