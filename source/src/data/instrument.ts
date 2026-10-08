/** The fictional Solvane Meridian modular system. Generic module types only. */
export const MODULES = [
  {
    id: 'pump',
    name: 'Solvent delivery',
    text: 'Two high-pressure pumps blend the mobile phase on the fly, pulse-free, so every run starts from the same composition.',
    size: [1.1, 2.3, 1.5] as [number, number, number],
  },
  {
    id: 'sampler',
    name: 'Autosampler',
    text: 'A temperature-controlled tray and a metering syringe draw microlitre volumes and inject them into the flow.',
    size: [1.3, 1.7, 1.5] as [number, number, number],
  },
  {
    id: 'column',
    name: 'Column compartment',
    text: 'Retention depends on temperature, so the column sits in a thermostatted chamber that holds it constant.',
    size: [1.9, 0.9, 1.3] as [number, number, number],
  },
  {
    id: 'optical',
    name: 'Optical detector',
    text: 'Diode-array and fluorescence flow cells read absorbance spectra and emission without touching the sample.',
    size: [1.1, 1.5, 1.4] as [number, number, number],
  },
  {
    id: 'ms',
    name: 'Mass spectrometer',
    text: 'Electrospray turns eluting compounds into ions; the analyser sorts them by mass-to-charge ratio.',
    size: [2.0, 2.0, 1.8] as [number, number, number],
  },
  {
    id: 'data',
    name: 'Data system',
    text: 'Integrates peaks, applies calibrations, checks system suitability and keeps a complete audit trail of every result.',
    size: [1.5, 1.0, 0.12] as [number, number, number],
  },
];
