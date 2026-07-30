# ◆ WebGL Portfolio — Interactive Developer Experience

A premium, dark, interactive WebGL portfolio landing page.
Not just a page — an **experience**: a living energy core that reacts to your mouse and scroll, wrapped in a cyber-minimal UI.

**Stack:** Three.js · TypeScript · Vite · Lenis · custom GLSL

**Public site:** https://nonamezisntreal.github.io/webgl-portfolio/

## ✦ Features

- **Living WebGL scene** — noise-displaced energy orb with fresnel glow, orbital rings, crystal shards, 1.6k ambient particles and comet light-trails
- **Custom GLSL** — simplex-noise vertex displacement, fresnel shading, additive halo, point sprites
- **Cinematic post-processing** — Unreal bloom → subtle chromatic aberration → vignette → animated film grain
- **Scroll-driven** — Lenis smooth scroll; page progress morphs the orb, shifts its hue cyan→violet and dollies the camera; each section re-frames the scene
- **Micro-interactions everywhere** — magnetic glow cards, 3D tilt, custom cursor with lagging ring, shimmer sweeps, staggered reveals
- **Expandable case studies** — click any project card for a cinematic overlay panel
- **Performance-first** — lazy-loaded Three.js chunk, DPR caps, mobile particle budget, render loop pauses on hidden tabs, `prefers-reduced-motion` fallback renders a static frame
- **Decoupled architecture** — the UI layer talks to WebGL only via `setScroll()` / `setSection()`

## ▲ Run locally

```bash
bun install --frozen-lockfile
bun run dev
bun run build
```

`bun run build` runs TypeScript validation, creates the Vite production artifact and verifies the GitHub Pages SEO/deployment invariants in `dist/`.

## ⌬ Personalize

All copy lives in **`src/content.ts`** — name, role, email, social links, stack, projects (with case studies) and skills. Edit that one file and the site is yours. Page title/description and canonical social metadata are in `index.html`.

## ▣ Architecture

```
src/
├── main.ts              # bootstrap: content → UI → lazy WebGL
├── content.ts           # ← all editable content
├── styles/main.css      # design system (CSS custom properties)
├── webgl/               # render layer (no DOM knowledge)
│   ├── Experience.ts    # renderer, camera, loop, inputs
│   ├── Core.ts          # energy orb + halo (custom shaders)
│   ├── Particles.ts     # ambient particles + comet trails
│   ├── Rings.ts         # orbital rings + floating shards
│   ├── PostFX.ts        # bloom + grade pass
│   └── shaders.ts       # GLSL sources
└── ui/                  # DOM layer (no Three.js knowledge)
    ├── scroll.ts        # Lenis + progress + section tracking
    ├── reveal.ts        # IntersectionObserver reveals
    ├── tilt.ts          # 3D tilt + cursor glow
    ├── cursor.ts        # custom cursor
    ├── projects.ts      # case-study overlay
    ├── contact.ts       # mailto contact form
    └── render.ts        # injects content.ts into the DOM
```

## ⚡ Deploy

The canonical deployment pipeline is `.github/workflows/deploy.yml`.

- Pull requests run a frozen Bun install and the full production build/validation pipeline.
- Pushes to `main` build and publish the `dist/` artifact through GitHub Pages Actions.
- `BASE_PATH` is set to `/${repository-name}/`, preserving the project-site URL.
- The historical `gh-pages` branch is not a second source of truth and should not be updated in parallel.

Repository setting required after owner approval:

```text
Settings → Pages → Build and deployment → Source: GitHub Actions
```

Manual verification build:

```bash
BASE_PATH=/webgl-portfolio/ bun run build
```

The workflow does not change GitHub Pages settings automatically.
