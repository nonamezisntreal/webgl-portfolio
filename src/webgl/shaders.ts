/**
 * Shared GLSL chunks + shader sources for the scene.
 * Kept as template literals so the build needs no extra plugins.
 */

/** Ashima / IQ simplex noise (3D) — public domain */
export const simplex3d = /* glsl */ `
vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

/* ───────────────────────── Energy core ───────────────────────── */

export const coreVertex = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform vec2 uMouse;

varying vec3 vNormal;
varying vec3 vViewDir;
varying float vNoise;

${simplex3d}

void main() {
  float t = uTime * 0.35;

  // layered noise displacement along the normal
  float n = snoise(normal * 1.6 + vec3(t, t * 0.7, -t * 0.5));
  n += 0.5 * snoise(normal * 3.4 - vec3(t * 0.6, -t, t * 0.4));

  // mouse adds local turbulence
  float mouseInfluence = length(uMouse) * 0.35;
  float disp = n * (0.16 + uAmp * 0.30 + mouseInfluence * 0.12);

  vec3 displaced = position + normal * disp;
  vNoise = n;

  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(-mvPosition.xyz);

  gl_Position = projectionMatrix * mvPosition;
}
`;

export const coreFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uHueShift;

varying vec3 vNormal;
varying vec3 vViewDir;
varying float vNoise;

void main() {
  float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), 2.4);

  // blend between the two accent colors using noise + scroll-driven shift
  float mixT = clamp(vNoise * 0.5 + 0.5 + uHueShift * 0.4 - 0.2, 0.0, 1.0);
  vec3 base = mix(uColorA, uColorB, mixT);

  // dark glassy body, glowing rim (bloom picks up the rim)
  vec3 body = base * 0.08;
  vec3 rim  = base * (0.9 + 0.6 * sin(uTime * 0.8 + vNoise * 4.0) * 0.15);
  vec3 color = body + rim * fresnel * 1.8;

  // subtle inner energy veins
  color += base * smoothstep(0.55, 0.95, vNoise) * 0.35;

  float alpha = clamp(0.18 + fresnel * 0.95, 0.0, 1.0);
  gl_FragColor = vec4(color, alpha);
}
`;

/* ───────────────────────── Halo billboard ───────────────────────── */

export const haloVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const haloFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vUv;

void main() {
  float d = distance(vUv, vec2(0.5));
  float glow = smoothstep(0.5, 0.0, d);
  glow = pow(glow, 2.6);
  gl_FragColor = vec4(uColor, glow * uIntensity);
}
`;

/* ───────────────────────── Particles ───────────────────────── */

export const particlesVertex = /* glsl */ `
uniform float uTime;
uniform float uSize;
uniform float uSpread;

attribute float aScale;
attribute float aSpeed;
attribute float aOffset;
attribute vec3 aColor;

varying vec3 vColor;
varying float vTwinkle;

void main() {
  vec3 p = position;

  // slow orbital drift around Y + gentle breathing
  float angle = uTime * 0.03 * aSpeed + aOffset;
  float c = cos(angle), s = sin(angle);
  p.xz = mat2(c, -s, s, c) * p.xz;
  p *= 1.0 + uSpread * 0.35;
  p.y += sin(uTime * 0.2 * aSpeed + aOffset * 6.28) * 0.18;

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * aScale * (1.0 / -mvPosition.z) * 320.0;
  gl_Position = projectionMatrix * mvPosition;

  vColor = aColor;
  vTwinkle = 0.55 + 0.45 * sin(uTime * (1.2 + aSpeed) + aOffset * 12.0);
}
`;

export const particlesFragment = /* glsl */ `
varying vec3 vColor;
varying float vTwinkle;

void main() {
  float d = distance(gl_PointCoord, vec2(0.5));
  float alpha = smoothstep(0.5, 0.05, d);
  gl_FragColor = vec4(vColor, alpha * vTwinkle * 0.85);
}
`;

/* ───────────────────────── Final grade pass (CA + vignette + grain) ───────────────────────── */

export const gradeFragment = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uAberration;
uniform float uVignette;

varying vec2 vUv;

float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 uv = vUv;
  vec2 center = uv - 0.5;
  float dist = length(center);

  // very subtle radial chromatic aberration
  vec2 dir = center * dist * uAberration;
  float r = texture2D(tDiffuse, uv + dir).r;
  float g = texture2D(tDiffuse, uv).g;
  float b = texture2D(tDiffuse, uv - dir).b;
  vec3 color = vec3(r, g, b);

  // soft vignette
  float vig = smoothstep(0.95, 0.25, dist * uVignette);
  color *= mix(0.78, 1.0, vig);

  // faint animated grain
  float grain = (rand(uv * vec2(1920.0, 1080.0) + fract(uTime) * 60.0) - 0.5) * 0.035;
  color += grain;

  gl_FragColor = vec4(color, 1.0);
}
`;

export const gradeVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
