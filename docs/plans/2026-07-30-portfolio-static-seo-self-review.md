# Portfolio Static SEO Plan — Self Review

Date: 2026-07-30
Reviewer: implementation author
Repository: `nonamezisntreal/webgl-portfolio`
Base branch: `main`
Base commit: `d369cf46ece4794300878888c4ec8dff31a6aec5`
Implementation branch: `codex/portfolio-static-seo-01`

## Verdict

`PASS_WITH_SCOPE_REDUCTION`

The architecture from the planning discussion remains valid, but implementing the full static-generation roadmap in one change would be too broad and difficult to verify without first hardening the existing GitHub Pages delivery path.

## Findings

### SR-001 — HIGH — The proposed first change was too broad

The original plan combined deployment migration, content schema refactoring, static page generation, localization, service pages, case pages, performance work, analytics and FreelanceBot integration.

Resolution: split delivery into gated increments. The first implementation increment is limited to GitHub Actions deployment, homepage SEO metadata, crawler files, a static 404 page and deterministic `dist` validation.

### SR-002 — HIGH — No isolated implementation branch existed

Resolution: created `codex/portfolio-static-seo-01` from exact commit `d369cf46ece4794300878888c4ec8dff31a6aec5`. `main` is not modified directly.

### SR-003 — MEDIUM — The repository uses Bun, not npm

The repository contains `bun.lock` and no `package-lock.json`.

Resolution: CI must use `bun install --frozen-lockfile` and `bun run build`. The plan must not introduce a second package-manager source of truth.

### SR-004 — MEDIUM — The existing deployment workflow is only an example

The repository documentation references `docs/github-pages-workflow.yml.example`; it is not an active workflow and uses an older upload action.

Resolution: add one canonical `.github/workflows/deploy.yml` using current GitHub Pages actions. Do not keep two active deployment mechanisms.

### SR-005 — MEDIUM — Project-site base-path regressions are a primary risk

The public URL is `https://nonamezisntreal.github.io/webgl-portfolio/`; root-relative public assets can resolve outside the repository path.

Resolution: preserve `BASE_PATH=/webgl-portfolio/`, use Vite's `%BASE_URL%` placeholder for public assets, and validate the built artifact.

### SR-006 — MEDIUM — RU/EN split cannot be added safely before route generation

The current language switch mutates one document at runtime. Adding `hreflang` before physical `/en/` pages exist would create invalid alternates.

Resolution: do not add `hreflang` in the foundation increment. Add it only together with generated localized pages.

### SR-007 — MEDIUM — AI crawler policy must not silently change model-training policy

Search visibility and model-training crawling are separate decisions.

Resolution: the foundation `robots.txt` explicitly allows normal crawling, `OAI-SearchBot` and `PerplexityBot`, but does not add a new `GPTBot` rule. A separate owner decision is required before changing training-crawler policy.

### SR-008 — LOW — Structured data requires owner-approved identity

The current public identity is `Hazard`; the plan must not invent a legal name or unsupported credentials.

Resolution: defer `Person`/`ProfilePage` structured data until identity and visible claims are owner-approved. Basic canonical and social metadata can be added now.

## First implementation gate

Included:

- active GitHub Actions build/deploy workflow;
- frozen Bun dependency installation;
- canonical and social metadata for the current homepage;
- base-path-safe favicon reference;
- `robots.txt`;
- `sitemap.xml` containing only the current canonical homepage;
- static `404.html`;
- deterministic validation of the `dist` artifact;
- documentation of the bounded change.

Excluded:

- service pages;
- case pages;
- `/en/` route generation;
- content registry refactor;
- analytics;
- Cal.com integration;
- custom domain;
- FreelanceBot runtime changes;
- deployment to production or merge to `main`.

## Verification required

- frozen install succeeds;
- TypeScript check succeeds;
- Vite production build succeeds with `BASE_PATH=/webgl-portfolio/`;
- artifact validation succeeds;
- workflow syntax is accepted by GitHub;
- pull-request checks complete successfully;
- generated homepage contains the canonical URL exactly once;
- `robots.txt`, `sitemap.xml` and `404.html` exist in `dist`;
- no source or secret files are exposed in `dist`.

## Authorization boundary

The owner's instruction to conduct self-review and proceed authorizes this isolated implementation branch. It does not authorize merge, production deployment, Pages settings mutation or deletion of the historical `gh-pages` branch.
