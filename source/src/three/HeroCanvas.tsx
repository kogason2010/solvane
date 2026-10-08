import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { getQuality } from '../utils/quality';
import { AdaptiveDpr } from './shared/AdaptiveDpr';
import { StudioEnvironment } from './shared/StudioEnvironment';
import { Director } from './hero/Director';
import { CameraRig } from './hero/CameraRig';
import { AnalyteParticles } from './hero/AnalyteParticles';
import { Column } from './hero/Column';
import { Detector } from './hero/Detector';
import { Chromatogram3D } from './hero/Chromatogram3D';
import { Dust } from './hero/Dust';

interface Props {
  active: boolean;
  reducedMotion: boolean;
  onReady?: () => void;
}

/** The hero's real-time scene: sample → column → flow cell → chromatogram. */
export default function HeroCanvas({ active, reducedMotion, onReady }: Props) {
  const q = getQuality();
  return (
    <Canvas
      className="hero-canvas"
      frameloop={active ? 'always' : 'never'}
      dpr={q.dpr}
      camera={{ fov: 38, near: 0.1, far: 80, position: [-9.6, 0.9, 6.6] }}
      gl={{ antialias: q.tier !== 'low', alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        requestAnimationFrame(() => onReady?.());
      }}
      aria-hidden="true"
    >
      <Director />
      <CameraRig reducedMotion={reducedMotion} />
      <StudioEnvironment intensity={0.55} />
      <ambientLight intensity={0.15} />
      <directionalLight position={[4, 6, 5]} intensity={0.9} color="#dfe9ff" />
      <directionalLight position={[-6, -2, -4]} intensity={0.5} color="#ffcf9e" />

      <Column bedCount={q.bedParticles} />
      <Detector />
      <AnalyteParticles count={q.heroParticles} reducedMotion={reducedMotion} />
      <Chromatogram3D />
      <Dust count={q.tier === 'low' ? 250 : 600} />
      <AdaptiveDpr min={q.dpr[0]} max={q.dpr[1]} />
    </Canvas>
  );
}
