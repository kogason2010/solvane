/**
 * Analyte particle shader.
 *
 * Every particle's position is evaluated analytically from the simulation clock `uSim`, so the
 * whole separation is deterministic and perfectly scrubbable with scroll (forward or backward).
 *
 * Band centre:    x_c = inlet + v_i · t,   v_i = u / (1 + k_i)    (zone velocity of analyte i)
 * Band width:     σ_x = σ0 + D · √(distance travelled)            (band broadening)
 * Radial motion:  particles spend a fraction k/(1+k) of their time interacting with the
 *                 stationary phase, which we show as a drift toward the packed wall.
 */
export const heroParticlesVertex = /* glsl */ `
  uniform float uTime;
  uniform float uSim;
  uniform float uInject;
  uniform float uReveal;
  uniform float uFade;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uInlet;
  uniform float uOutlet;
  uniform float uDetector;
  uniform float uRadius;
  uniform float uSigma0;
  uniform float uDisp;
  uniform float uMotion;
  uniform vec3 uCloud;
  uniform vec3 uPointer;
  uniform float uPointerStrength;
  uniform float uK[4];
  uniform vec3 uColors[4];

  attribute float aPop;
  attribute vec4 aSeed;   // x: N(0,1) axial, y: angle, z: radial (0..1), w: stagger (0..1)
  attribute vec3 aCloud;  // gaussian offset inside the injected sample plug

  varying vec3 vColor;
  varying float vAlpha;
  varying float vFlash;

  float kOf(float p) {
    if (p < 0.5) return uK[0];
    if (p < 1.5) return uK[1];
    if (p < 2.5) return uK[2];
    return uK[3];
  }
  vec3 colorOf(float p) {
    if (p < 0.5) return uColors[0];
    if (p < 1.5) return uColors[1];
    if (p < 2.5) return uColors[2];
    return uColors[3];
  }
  mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

  void main() {
    float k = kOf(aPop);
    float retained = k / (1.0 + k);

    // --- 1. The mixed sample: a slowly turning plug of all analytes together.
    vec3 c = aCloud;
    c.xz = rot(uTime * 0.12 * uMotion + aSeed.w * 0.4) * c.xz;
    c.xy = rot(sin(uTime * 0.07 + aSeed.x) * 0.25 * uMotion) * c.xy;
    vec3 cloudPos = uCloud + c * 0.95;

    // --- 2. Inside the column.
    float tLocal = max(uSim, 0.0);
    float v = 1.0 / (1.0 + k);
    float dist = v * tLocal;
    float sigma = uSigma0 + uDisp * sqrt(dist);
    float x = uInlet + dist + aSeed.x * sigma;

    // radial position; retained analytes linger near the packed wall
    float wobble = 0.5 + 0.5 * sin(uTime * (0.9 + aSeed.w) + aSeed.y * 13.0);
    float r = aSeed.z * uRadius * 0.86;
    r = mix(r, uRadius * 0.9, retained * wobble * 0.55);
    // narrow connecting capillary between column outlet and flow cell
    r *= mix(1.0, 0.28, smoothstep(uOutlet - 0.05, uOutlet + 0.25, x));
    float ang = aSeed.y + uTime * 0.25 * uMotion * (1.0 - retained);
    vec3 colPos = vec3(x, cos(ang) * r, sin(ang) * r);
    // Brownian shimmer
    colPos += 0.012 * vec3(sin(uTime * 3.1 + aSeed.y * 9.0), sin(uTime * 2.7 + aSeed.x * 7.0), cos(uTime * 2.3 + aSeed.w * 11.0)) * uMotion;


    // --- 3. Injection: plug → column, staggered per particle along an arc.
    float fi = smoothstep(0.0, 1.0, clamp(uInject * 1.7 - aSeed.w * 0.7, 0.0, 1.0));
    vec3 pos = mix(cloudPos, colPos, fi);
    pos.y += sin(fi * 3.14159) * 0.35 * (1.0 - aSeed.z * 0.5);

    // --- 4. Pointer: a gentle displacement field around the cursor ray.
    vec3 dp = pos - uPointer;
    float d2 = dot(dp, dp);
    pos += normalize(dp + 1e-4) * exp(-d2 * 2.2) * 0.22 * uPointerStrength;

    // --- Appearance
    vec3 mixed = vec3(0.78, 0.86, 0.95);
    vColor = mix(mixed, colorOf(aPop), uReveal);

    float passed = smoothstep(uDetector + 0.25, uDetector + 1.9, pos.x);
    vFlash = exp(-pow((pos.x - uDetector) / 0.16, 2.0)) * fi;
    vAlpha = (1.0 - passed) * uFade * (0.55 + 0.45 * aSeed.z);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = uSize * (0.6 + 0.8 * fract(aSeed.w * 17.0)) * (1.0 + vFlash * 1.4);
    gl_PointSize = size * uPixelRatio * (1.0 / -mv.z);
    // soft depth attenuation
    vAlpha *= smoothstep(26.0, 6.0, -mv.z) * 0.85 + 0.15;
  }
`;

export const heroParticlesFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vFlash;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    core = pow(core, 1.8);
    vec3 col = vColor * (0.9 + vFlash * 2.2) + vec3(1.0) * vFlash * 0.35;
    gl_FragColor = vec4(col, core * vAlpha);
  }
`;

/** Faint packed-bed points: the stationary phase. */
export const bedVertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uOpacity;
  attribute float aSeed;
  varying float vA;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (9.0 + aSeed * 10.0) * uPixelRatio / -mv.z;
    vA = (0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 0.6 + aSeed * 40.0))) * uOpacity;
  }
`;

export const bedFragment = /* glsl */ `
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.15, d);
    gl_FragColor = vec4(vec3(0.55, 0.63, 0.74), a * vA * 0.32);
  }
`;

/** Ambient dust for parallax depth. */
export const dustVertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aSeed;
  varying float vA;
  void main() {
    vec3 p = position;
    p.y += sin(uTime * 0.1 + aSeed * 30.0) * 0.25;
    p.x += cos(uTime * 0.08 + aSeed * 20.0) * 0.25;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (14.0 + aSeed * 22.0) * uPixelRatio / -mv.z;
    vA = 0.12 + aSeed * 0.18;
  }
`;

export const dustFragment = /* glsl */ `
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    gl_FragColor = vec4(0.62, 0.72, 0.86, smoothstep(0.5, 0.0, d) * vA);
  }
`;
