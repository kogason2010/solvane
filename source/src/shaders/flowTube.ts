/** Capillary with a travelling sample pulse; `uHead` (0..1 along the tube) marks how far the sample has reached. */
export const flowTubeVertex = /* glsl */ `
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

export const flowTubeFragment = /* glsl */ `
  uniform float uTime;
  uniform float uHead;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
    float filled = smoothstep(uHead + 0.004, uHead - 0.004, vUv.x);
    // dashed flow texture moving downstream inside the filled part
    float dash = 0.5 + 0.5 * sin((vUv.x * 160.0 - uTime * 6.0));
    float head = exp(-pow((vUv.x - uHead) / 0.012, 2.0));
    vec3 glass = vec3(0.55, 0.65, 0.78) * (0.15 + fres * 0.6);
    vec3 flow = mix(vec3(0.39, 0.83, 1.0), vec3(0.76, 0.61, 1.0), vUv.x) * (0.35 + 0.35 * dash);
    vec3 col = glass + flow * filled + vec3(1.0) * head * 1.4;
    float a = 0.35 + fres * 0.4 + filled * 0.4 + head;
    gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
  }
`;
