# ◆ WebGL Portfolio — Interactive Developer Experience

A premium, dark, interactive WebGL portfolio landing page.
Not just a page — an **experience**: a living energy core that reacts to your mouse and scroll, wrapped in a cyber-minimal UI.

**Stack:** Three.js · TypeScript · Vite · Lenis · custom GLSL

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
bun install        # or: npm install
bun run dev        # or: npm run dev
bun run build      # type-check + production build
```

## ⌬ Personalize

All copy lives in **`src/content.ts`** — name, role, email, social links, stack, projects (with case studies) and skills. Edit that one file and the site is yours. Page title/description are in `index.html`.

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

The site is served from the **`gh-pages` branch** via GitHub Pages. To redeploy:

```bash
BASE_PATH=/webgl-portfolio/ bun run build
# then push the dist/ folder to the gh-pages branch
```

Prefer CI? A ready-made GitHub Actions workflow is included at
`docs/github-pages-workflow.yml.example` — move it to `.github/workflows/deploy.yml`
and set repo Settings → Pages → Source to *GitHub Actions*.
(It couldn't be pushed automatically because the GitHub App integration lacks the `workflows` permission.)
