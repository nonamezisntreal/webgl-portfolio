/**
 * ─────────────────────────────────────────────────────────────
 *  CONTENT CONFIG — edit everything about *you* in this file.
 *  No need to touch the WebGL or UI code to personalize the site.
 * ─────────────────────────────────────────────────────────────
 */

export interface Project {
  id: string;
  title: string;
  tagline: string;
  description: string;
  tech: string[];
  year: string;
  /** Accent hue used for the card glow (CSS color) */
  glow: string;
  /** Extended case study shown in the overlay */
  caseStudy: {
    challenge: string;
    solution: string;
    highlights: string[];
    link?: string;
  };
}

export const profile = {
  name: 'Hazard',
  role: 'Creative Developer · WebGL Engineer',
  email: 'hello@hazard.dev',
  github: 'https://github.com/nonamezisntreal',
  linkedin: 'https://linkedin.com/in/your-profile',
  telegram: 'https://t.me/your-handle',
};

export const stack = [
  'TypeScript', 'WebGL', 'GLSL', 'Three.js', 'React', 'C#', '.NET', 'Node.js', 'Vite', 'PostgreSQL',
];

export const projects: Project[] = [
  {
    id: 'aurora-engine',
    title: 'Aurora Engine',
    tagline: 'Real-time generative visuals platform',
    description:
      'A GPU-driven engine for live generative art: custom shader graph, audio-reactive pipelines and 60fps rendering of millions of particles.',
    tech: ['WebGL2', 'GLSL', 'TypeScript', 'Web Audio'],
    year: '2025',
    glow: '#67e8f9',
    caseStudy: {
      challenge:
        'Render dense particle fields with audio-reactive behaviour in the browser without dropping below 60fps — even on mid-range laptops.',
      solution:
        'Built a fully GPU-resident simulation using transform feedback and FBO ping-pong, with an adaptive quality system that scales particle counts to the device in real time.',
      highlights: [
        '2M+ particles simulated entirely on the GPU',
        'Custom shader-graph editor with live hot-reload',
        'Adaptive DPR + LOD keeps frame budget under 16ms',
      ],
    },
  },
  {
    id: 'prism-commerce',
    title: 'Prism Commerce',
    tagline: '3D product configurator for e-commerce',
    description:
      'An embeddable 3D configurator: physically-based materials, real-time lighting and a clean React API that any storefront can drop in.',
    tech: ['Three.js', 'React', 'TypeScript', 'PBR'],
    year: '2025',
    glow: '#a78bfa',
    caseStudy: {
      challenge:
        'Let shoppers customize products in photorealistic 3D while keeping initial load under 2 seconds on mobile networks.',
      solution:
        'Progressive asset streaming with DRACO + KTX2 compression, suspense-driven scene hydration and a headless state core decoupled from the render layer.',
      highlights: [
        '−78% asset size with mesh & texture compression',
        'Lighthouse performance score 97 on mobile',
        'Conversion uplift of 23% in A/B tests',
      ],
    },
  },
  {
    id: 'echo-visualizer',
    title: 'Echo',
    tagline: 'Audio-reactive WebGL music visualizer',
    description:
      'A cinematic visualizer that turns any track into flowing volumetric light — FFT analysis mapped to raymarched fields and bloom-heavy post.',
    tech: ['GLSL', 'Raymarching', 'Web Audio', 'Vite'],
    year: '2024',
    glow: '#22d3ee',
    caseStudy: {
      challenge:
        'Translate music into visuals that feel composed rather than random — beat structure, energy and timbre should all read on screen.',
      solution:
        'Multi-band FFT feature extraction (attack, energy, centroid) driving a raymarched SDF scene through a smoothed parameter rig, like a virtual lighting desk.',
      highlights: [
        'Sub-10ms audio→visual latency',
        'Single-pass raymarcher with soft shadows & glow',
        'Featured on a curated WebGL showcase',
      ],
    },
  },
  {
    id: 'nucleus-dash',
    title: 'Nucleus',
    tagline: 'Real-time ops dashboard with 3D telemetry',
    description:
      'Mission-control style dashboard streaming live telemetry into an interactive 3D scene — built for an industrial IoT platform.',
    tech: ['React', 'Three.js', 'WebSockets', 'C# / .NET'],
    year: '2024',
    glow: '#818cf8',
    caseStudy: {
      challenge:
        'Visualize thousands of live sensor streams spatially, so operators can spot anomalies in seconds instead of scanning tables.',
      solution:
        'Instanced 3D site model with heat-mapped sensor nodes, delta-compressed WebSocket streams and a .NET backend aggregating 40k events/sec.',
      highlights: [
        '40,000 events/sec aggregated server-side',
        'GPU instancing renders 5k nodes in one draw call',
        'Mean time-to-detection cut from minutes to seconds',
      ],
    },
  },
  {
    id: 'glasswork',
    title: 'Glasswork',
    tagline: 'Open-source glass & refraction shader kit',
    description:
      'A small open-source library of production-ready glass, frost and refraction materials for Three.js — used by creative devs worldwide.',
    tech: ['Three.js', 'GLSL', 'npm', 'Open Source'],
    year: '2023',
    glow: '#67e8f9',
    caseStudy: {
      challenge:
        'True refraction is expensive; most projects need something that *looks* right at a fraction of the cost.',
      solution:
        'Screen-space refraction with mip-blurred backbuffers, fresnel-driven dispersion and a tiny API surface: one material, twelve tweakable uniforms.',
      highlights: [
        'Single render-target trick ≈ 0.4ms overhead',
        'Zero dependencies beyond Three.js',
        'Adopted in dozens of community projects',
      ],
    },
  },
];

export const skills: { name: string; level: string; icon: string }[] = [
  { name: 'WebGL / WebGPU', level: 'Expert', icon: '◈' },
  { name: 'GLSL Shaders', level: 'Expert', icon: '✦' },
  { name: 'Three.js', level: 'Expert', icon: '▲' },
  { name: 'TypeScript', level: 'Advanced', icon: '⌬' },
  { name: 'React', level: 'Advanced', icon: '⟁' },
  { name: 'C# / .NET', level: 'Advanced', icon: '#' },
  { name: 'Node.js', level: 'Advanced', icon: '⬢' },
  { name: 'Creative Coding', level: 'Expert', icon: '∿' },
  { name: 'Performance', level: 'Expert', icon: '⚡' },
  { name: 'Motion Design', level: 'Advanced', icon: '◐' },
  { name: 'CI / DevOps', level: 'Comfortable', icon: '⛭' },
  { name: 'Unity', level: 'Comfortable', icon: '◇' },
];
