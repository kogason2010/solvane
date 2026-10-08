# Solvane — From complexity, clarity.

A cinematic, single-page website for **Solvane**, a *fictional* analytical-science company
(HPLC/UHPLC, LC-MS, UV-Vis/PDA, fluorescence, ion chromatography, TOC). It was built as a
creative-development piece: a real-time WebGL hero that runs a chromatographic separation
as you scroll, followed by nine sections, each with its own layout and motion.

> Solvane, Meridian and all data on the site are fictional or illustrative. No regulatory,
> certification, patent or performance claims are made.

---

## 1. Installation

Requirements: **Node 18+** (tested with Node 20/24) and npm.

```bash
npm install
```

## 2. Development

```bash
npm run dev          # http://localhost:5173
npm run typecheck    # strict TypeScript check (tsc --noEmit)
```

## 3. Production build

```bash
npm run build        # outputs to dist/
npm run preview      # serves dist/ at http://localhost:4173
npm run build:strict # typecheck, then build
```

The build is split into chunks: `three`, `r3f` (React Three Fiber) and `motion` (GSAP + Lenis),
and every WebGL scene is a lazy-loaded chunk of its own.

## 4. Project structure

```
src/
  App.tsx                 page composition, smooth scroll, loader orchestration
  main.tsx
  components/             Loader, Nav (+ mobile menu), MagneticButton, SplitText, CountUp, Icons
  sections/               one file per section (Hero … Footer)
    workflow/             canvas renderer for "From sample to signal"
    separation/           chromatogram renderer shared by Separation + Case study
    detection/            five bespoke detector animations (canvas)
    data/                 SVG charts (chromatogram, UV, MS, calibration)
  three/
    HeroCanvas.tsx        hero scene root (lazy chunk)
    hero/                 Director, CameraRig, AnalyteParticles, Column, Detector, Chromatogram3D, Dust, timeline
    MolecularCanvas.tsx   procedural molecules (lazy chunk)
    molecular/            molecule builder + caffeine/paracetamol/benzoic acid geometry
    InstrumentCanvas.tsx  Meridian modular instrument (lazy chunk)
    shared/               StudioEnvironment (procedural PMREM reflections), AdaptiveDpr
  shaders/                GLSL: analyte particles, glass, beam, strip-chart trace, flow tube
  hooks/                  useSmoothScroll, useScrollProgress, useReveal, useCanvas2D, useInView, useReducedMotion
  utils/                  chroma.ts (chromatography model), math, quality tiers, gsap setup, scroll stores
  data/                   copy, analytical dataset, detectors, applications, instrument modules
  styles/                 global design system + one stylesheet per section
public/
  assets/images/          generated imagery (see inventory)
  assets/textures/        generated grain texture
  assets/models/, video/  reserved (everything 3D is procedural, so these are empty)
scripts/generate_assets.py  regenerates every raster asset from code
```

## 5. Major libraries

| Library | Use |
|---|---|
| React 18 + TypeScript + Vite 5 | app, typing, bundling |
| three r169 | rendering, custom `ShaderMaterial`s, instancing, PMREM |
| @react-three/fiber 8 | declarative scenes, render loop, DPR control |
| GSAP 3 + ScrollTrigger | scroll mapping, text reveals, chart entrances |
| Lenis | smooth scrolling (driven by GSAP's ticker so ScrollTrigger stays in sync) |

`@react-three/drei` and post-processing were deliberately left out: the scenes need neither,
and the bundle stays lighter.

## 6. How the 3D hero works

The hero is a *scrubbable simulation*, not a video. Everything is a pure function of scroll.

- **Model** (`utils/chroma.ts`): four analyte populations with retention factors
  *k* = 0.6, 1.4, 2.4, 3.8. Each band moves at the zone velocity *u/(1+k)* and broadens as
  σ = σ₀ + D·√distance. Separation comes from differential partitioning between mobile and
  stationary phase, never from mass.
- **Particles** (`shaders/heroParticles.ts`): 7k–26k points (by device tier). Every position
  is computed in the vertex shader from the sim clock, so scrolling backwards is as exact as
  forwards. Retained species drift toward the packed wall in proportion to k/(1+k), which is
  the fraction of time they spend in the stationary phase. Before injection all analytes
  share one neutral colour. Their colours appear only once separation makes them distinct.
- **Column**: Fresnel glass shader (no expensive transmission), metal fittings lit by a
  procedural `RoomEnvironment` PMREM, and a field of stationary-phase points.
- **Detector**: a UV flow cell. The lower beam is the lamp. The upper beam's intensity is
  *I = I₀·10^(−A)*, where A is the live detector signal, so the light visibly dims as each band
  passes. The live readout (t, A₂₅₄) shows the same numbers.
- **Chromatogram** (`Chromatogram3D.tsx`): a strip-chart trace written directly above the
  photodiode. Older signal scrolls left, so the trace is visibly *produced by* the detector.
  Peak labels are DOM elements positioned by projecting 3D apex points every frame.
- **Pointer**: camera parallax, a soft displacement field around the cursor ray, and a
  moving specular light on the glass.
- **Director** (`hero/Director.tsx`): damps raw scroll progress and publishes the derived
  timeline (sim clock, injection, colour reveal, signal) once per frame for all components.

## 7. How scroll animation works

- **Lenis** smooths the wheel. `lenis.on('scroll', ScrollTrigger.update)` plus the GSAP ticker
  keeps the two in lockstep.
- **Pinned stories use CSS `position: sticky`** inside tall sections (hero 640vh, workflow
  440vh, separation 300vh, molecular 280vh, instrument 380vh). `useScrollProgress` maps each
  section to a 0→1 value with a ScrollTrigger and writes it to a mutable store, so WebGL and
  canvas loops read it without React re-renders.
- **Hero timeline** (`three/hero/timeline.ts`):

  | progress | phase | what moves |
  |---|---|---|
  | 0.00–0.10 | Sample | headline, slowly turning mixed plug |
  | 0.09–0.20 | Injection | plug arcs into the column inlet |
  | 0.18–0.46 | Separation | sim 0→15 s, four bands pull apart, camera pulls wide |
  | 0.46–0.86 | Detection → Signal | sim 15 s→end, bands cross the flow cell, trace is written |
  | 0.86–1.00 | Insight | camera pulls back to frame the finished chromatogram + labels |

- **Applications** translate a horizontal track 1:1 with vertical scroll (section height =
  track overflow + viewport). On narrow screens it becomes a native swipe row.
- **Entrances** (`useReveal`): `[data-split]` words rise out of masks, `[data-reveal]` fades
  and lifts, and `[data-draw]` strokes draw on.

## 8. Asset inventory

Every visual is original and generated from code. There is no stock imagery and no
downloaded models or HDRs.

| Asset | Source | Where |
|---|---|---|
| Hero scene (particles, column, flow cell, beam, trace) | WebGL / GLSL, real time | Hero |
| Workflow diagrams (vial, column, flow cell, calibration) | Canvas 2D, real time | 02 |
| Column bands + live chromatogram + slider model | Canvas 2D, real time | 03 |
| UV/PDA, fluorescence, ESI-MS, conductivity, TOC/NDIR animations | Canvas 2D, real time | 04 |
| Caffeine assembly + molecular field | WebGL instancing, procedural geometry | 05 |
| Chromatogram, UV spectrum, mass spectrum, calibration | SVG, computed | 06 |
| `images/applications/pharmaceuticals.webp` | Python: granule circle-packing | 07 |
| `images/applications/biotechnology.webp` | Python: helical ribbons | 07 |
| `images/applications/environmental.webp` | Python: interference isolines | 07 |
| `images/applications/food-beverage.webp` | Python: emulsion droplets | 07 |
| `images/applications/semiconductors.webp` | Python: wafer die map | 07 |
| `images/applications/energy.webp` | Python: electrode lattice + ion paths | 07 |
| `images/applications/advanced-materials.webp` | Python: Voronoi grain structure | 07 |
| Meridian instrument + flow tube + screen texture | WebGL, RoundedBox + CanvasTexture | 08 |
| Before/after chromatograms | Canvas 2D, computed | 09 |
| Converging-particle peak | Canvas 2D, real time | 10 |
| `images/hero-fallback.png`, `images/molecular-field.png` | Python | no-WebGL fallbacks |
| `images/og-solvane.png` | Python | social card |
| `textures/grain.png` | Python: Gaussian noise | film grain overlay |
| `favicon.svg`, brand mark | hand-written SVG | nav, footer, tab |

**Scientific reference values** used on the site: caffeine C₈H₁₀N₄O₂, [M+H]⁺ m/z 195.0877,
[M+Na]⁺ m/z 217.0696, λmax ≈ 273 nm, CO₂ IR absorption near 4.26 µm, and fluorescence
emission at a longer wavelength than excitation. Calibration responses, noise, and the
case-study values are simulated and labelled as illustrative.

## 9. Performance strategy

- **Quality tiers** (`utils/quality.ts`) choose particle counts, molecule-field size and DPR
  caps from device class (coarse pointer + width, cores, device memory).
- **AdaptiveDpr** samples FPS each second and steps pixel ratio down below ~48 fps, and back
  up when there is headroom.
- **Scenes only render on screen**: each R3F canvas uses `frameloop="never"` when off
  screen. The molecular and instrument scenes are lazy-loaded and only mounted within
  ~600px of the viewport. 2D canvases pause their rAF loops via IntersectionObserver.
- **GPU-side animation**: hero particle positions are analytic in the vertex shader, with no
  per-frame CPU buffer uploads. The molecular field and instrument parts are instanced or
  static.
- **Cheap materials**: Fresnel glass instead of transmission, and additive point sprites
  instead of post-processing bloom.
- **Cleanup**: every geometry, material, texture and PMREM target is disposed on unmount.
- **Mobile**: reduced particle budgets, a pulled-back camera for portrait frustums, a
  simplified separation layout (no pin), and a swipe row for applications. The hero
  narrative and touch parallax are kept.

## 10. Replacing visual assets later

- **Application images**: drop new files into `public/assets/images/applications/` with the
  same names (`pharmaceuticals.webp`, …) or change `src/data/applications.ts`. The cards
  expect a 4:5 ratio, and alt text lives next to each entry.
- **Regenerate everything**: `python scripts/generate_assets.py` (needs `numpy` and `pillow`),
  or `npm run assets`.
- **Colours**: CSS tokens in `src/styles/global.css` (`--cyan`, `--violet`, …) and analyte
  colours in `ANALYTE_COLORS` (`src/utils/chroma.ts`), which are shared by WebGL and canvas.
- **Copy**: `src/data/*.ts`.
- **Hero choreography**: edit keyframes in `src/three/hero/timeline.ts` (`CAMERA_KEYS`,
  `simClock`). The particle physics constants live in `HERO_COLUMN`.
- **3D models**: the instrument is procedural. To use a real model, load a glTF into
  `public/assets/models/` with three's `GLTFLoader` inside `InstrumentCanvas.tsx`.

## Accessibility

Semantic landmarks and headings, a skip link, keyboard-operable nav, tabs (arrow keys,
Home/End), range sliders, visible focus rings, and `aria-label`s that describe the
*information* in every canvas or WebGL graphic. `prefers-reduced-motion` disables Lenis,
freezes the hero camera at a composed frame (scrolling still advances the separation, so
nothing is lost), and removes reveals and particle drift. Without WebGL, static generated
images replace the 3D scenes and all copy and data remain.
