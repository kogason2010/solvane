/**
 * Inexpensive glass: Fresnel rim + a soft travelling specular band that follows the pointer light.
 * Far cheaper than transmission and reads clearly against a dark background.
 */
export const glassVertex = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec3 vPosW;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const glassFragment = /* glsl */ `
  uniform vec3 uTint;
  uniform vec3 uLightPos;
  uniform float uOpacity;
  uniform float uTime;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec3 vPosW;
  varying vec2 vUv;
  void main() {
    vec3 n = normalize(vNormalW);
    if (!gl_FrontFacing) n = -n;
    float fres = pow(1.0 - abs(dot(n, vViewDir)), 2.6);
    vec3 l = normalize(uLightPos - vPosW);
    vec3 h = normalize(l + vViewDir);
    float spec = pow(max(dot(n, h), 0.0), 60.0);
    // fine axial machining lines on the glass
    float lines = 0.5 + 0.5 * sin(vPosW.x * 60.0);
    vec3 col = uTint * (0.25 + fres * 1.4) + vec3(1.0) * spec * 0.45;
    float a = (0.035 + fres * 0.55 + spec * 0.22 + lines * 0.01) * uOpacity;
    gl_FragColor = vec4(col, a);
  }
`;

/** Chromatogram trace that scrolls out of the detector like a strip-chart recorder. */
export const traceVertex = /* glsl */ `
  uniform float uT;
  uniform float uHeadX;
  uniform float uScale;
  uniform float uBase;
  uniform float uHeight;
  attribute float aT;
  attribute float aS;      // signal value at aT
  attribute float aFill;   // 1 = curve vertex, 0 = baseline vertex (fill only)
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vFillV;
  void main() {
    float x = uHeadX - (uT - aT) * uScale;
    float y = uBase + aS * uHeight * aFill;
    vColor = aColor;
    vFillV = aFill;
    // invisible until the detector has produced this sample
    vAlpha = step(aT, uT) * smoothstep(0.0, 1.2, uT - aT + 1.2);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, 0.0, 1.0);
  }
`;

export const traceLineFragment = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(mix(vec3(0.9, 0.95, 1.0), vColor, 0.65), vAlpha * uOpacity);
  }
`;

export const traceFillFragment = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vFillV;
  void main() {
    gl_FragColor = vec4(vColor, vAlpha * uOpacity * 0.28 * vFillV);
  }
`;

/** Light beam: soft-edged additive cylinder whose intensity encodes transmitted light. */
export const beamVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vV = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const beamFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float facing = abs(dot(normalize(vN), normalize(vV)));
    float core = pow(facing, 2.5);
    float flicker = 0.94 + 0.06 * sin(uTime * 40.0 + vUv.y * 30.0);
    float ends = smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.92, vUv.y);
    gl_FragColor = vec4(uColor * core * uIntensity * flicker * ends, 1.0);
  }
`;
