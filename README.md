# ◆ WebGL Portfolio — Interactive Developer Experience

A dark interactive WebGL homepage plus statically generated service, case-study and technical insight pages.

**Stack:** Three.js · TypeScript · Vite · Bun · custom GLSL · GitHub Pages

**Public site:** https://nonamezisntreal.github.io/webgl-portfolio/

## ✦ What the build produces

- interactive Russian homepage at `/webgl-portfolio/`;
- static English homepage at `/webgl-portfolio/en/`;
- five service pages in RU and EN;
- four case-study pages in RU and EN;
- four technical insight pages in RU and EN;
- reciprocal `hreflang`, canonical URLs and JSON-LD;
- generated `sitemap.xml` and `robots.txt`;
- public `portfolio-links.json` for verified deep-link selection by FreelanceBot;
- static `404.html`;
- fail-closed source, public-claim and artifact validation.

The current route count is **28 localized canonical pages** plus the 404 document.

## ✦ Homepage features

- living WebGL scene with custom shaders, particles and post-processing;
- lazy-loaded Three.js render layer;
- scroll-driven scene changes and micro-interactions;
- mobile DPR and particle budgets;
- render loop pause on hidden tabs;
- `prefers-reduced-motion` fallback;
- non-blocking loader that does not cover primary content;
- DOM content remains usable when WebGL fails.

## ▲ Run locally

```bash
bun install --frozen-lockfile
bun run dev
```

Production verification:

```bash
BASE_PATH=/webgl-portfolio/ \
SITE_ORIGIN=https://nonamezisntreal.github.io \
bun run build
```

`bun run build` performs:

```text
TypeScript check
→ content registry validation
→ Vite asset build
→ localized static page generation
→ homepage performance hardening
→ localized navigation and public-copy finalization
→ complete dist and public-claim validation
```

## ⌬ Content sources

There is no second project registry.

- `src/content.ts` remains canonical for profile data, homepage copy, project summaries and project case-study data.
- `src/static-pages.ts` contains only static routes, extended service/insight content, capability tags and relationships.
- `src/public-claims.ts` contains the verified public performance wording used to override legacy absolute claims.
- `scripts/validate-content.ts` binds the content sources and fails on duplicate IDs, broken relationships, missing localization or public-profile drift.
- `scripts/finalize-static-site.ts` repairs known legacy copy in the generated artifact and fails when the expected bounded repair set changes.
- `scripts/validate-public-claims.mjs` independently rejects obsolete deployment/localization wording and absolute frame-rate promises.

Changing the exact canonical portfolio URL requires an explicit migration because FreelanceBot uses:

```text
https://nonamezisntreal.github.io/webgl-portfolio/
```

## ▣ Architecture

```text
src/content.ts
src/static-pages.ts
src/public-claims.ts
        │
        ├── homepage runtime (Vite + Three.js)
        └── scripts/generate-static-site.ts
                     │
                     ├── /en/
                     ├── /services/*
                     ├── /cases/*
                     ├── /insights/*
                     ├── sitemap.xml
                     ├── robots.txt
                     ├── portfolio-links.json
                     └── routes-manifest.json
```

The content pages do not load Three.js or client-side routing. Every public URL has a physical `index.html`, so direct navigation and reload work on GitHub Pages.

## ⚡ Deploy

The canonical deployment pipeline is `.github/workflows/deploy.yml`.

- Pull requests run a frozen Bun install and the full production build/validation pipeline.
- Pull requests upload the exact `dist/` candidate for manual artifact review.
- Pushes to `main` build and publish the `dist/` artifact through GitHub Pages Actions.
- `BASE_PATH` is set to `/${repository-name}/`, preserving the project-site URL.
- The historical `gh-pages` branch is not a second source of truth and must not be updated in parallel.

Repository setting required before the first production deployment through Actions:

```text
Settings → Pages → Build and deployment → Source: GitHub Actions
```

The workflow does not mutate Pages settings automatically.

## Verification guarantees

The build fails when any of the following occurs:

- duplicate route or content IDs;
- broken service/case relationships;
- missing RU/EN content;
- canonical portfolio URL drift;
- profile contact drift between runtime and static output;
- missing generated route;
- incorrect canonical or `hreflang`;
- missing title, description, H1 or structured data;
- Three.js/module loading on static content pages;
- broken internal URLs or fragments;
- URL shorteners or tracking parameters in `portfolio-links.json`;
- absolute `60fps`/stable-frame-rate promises;
- obsolete in-place localization or `gh-pages branch` claims;
- stale crawler or sitemap output.
