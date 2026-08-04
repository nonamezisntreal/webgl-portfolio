# Portfolio static SEO remediation self-review

## Subject

- Repository: `nonamezisntreal/webgl-portfolio`
- Remediation branch: `codex/portfolio-static-seo-remediation-01`
- Rejected candidate: `673d56908a61880493c599e1d3e0989acbe298bb`
- Authorized findings: `WEBGL-SEO-R01-001` through `WEBGL-SEO-R01-004`
- Canonical homepage contract: `https://nonamezisntreal.github.io/webgl-portfolio/`

This document is an implementation self-review. It is not an independent review verdict and does not authorize merge, push, deployment or gate transition.

## Root causes and bounded changes

### WEBGL-SEO-R01-001

**Root cause:** unsupported fixed frame-rate copy remained in `index.html`; the build repaired it only after Vite emitted `dist`, while the public-claim validator inspected generated HTML only.

**Change:** unsupported copy was removed from canonical homepage source. `scripts/validate-public-claims.mjs` now scans canonical source, every generated HTML file and every generated JavaScript bundle. Numeric and guaranteed frame-rate wording is rejected in English and Russian.

### WEBGL-SEO-R01-002

**Root cause:** canonical validation counted the expected canonical string rather than all canonical tags; JSON-LD presence was checked without parsing; static-page runtime exclusion relied on weak substring checks.

**Change:** `scripts/validate-dist.mjs` now requires exactly one canonical tag with the expected URL, parses every JSON-LD block, and enforces a bounded static runtime contract. Static pages may contain only the exact inline portfolio event hook; canvas, module/import-map scripts, external scripts and script preloads fail closed.

### WEBGL-SEO-R01-003

**Root cause:** generator output depended on wall-clock `Date` values and the repository did not declare cross-platform line-ending policy.

**Change:** `siteConfig.contentUpdatedAt` is the versioned source for generated timestamps and copyright year. `.gitattributes` pins repository text to LF except Windows command scripts, while `scripts/normalize-artifact.mjs` canonicalizes every text artifact to LF even when checkout conversion is inconsistent. `scripts/hash-dist-tree.mjs` emits sorted SHA-256 evidence for all 38 extracted files.

### WEBGL-SEO-R01-004

**Root cause:** the workflow contained pinned values but no executable policy validator; deployment guards used a negative pull-request check instead of a positive event allowlist; workflow-level permission inheritance was not explicitly denied.

**Change:** `.github/workflows/deploy.yml` now has `permissions: {}` and positive `main` deployment guards. `scripts/validate-workflow-policy.mjs`, executed by `bun run build`, validates full-SHA Actions, Bun `1.3.14`, exact PR-head checkout, frozen install, least-privilege job permissions and deployment conditions.

## Regression protection

`scripts/test-adversarial.mjs` creates temporary mutants and requires fail-closed rejection for:

- source, HTML and JavaScript frame-rate claims;
- duplicate canonical tags;
- invalid JSON-LD;
- external runtime scripts and module preloads on static pages;
- non-versioned generated timestamps and CRLF artifact bytes;
- mutable Action tags or Bun versions;
- synthetic merge checkout instead of exact PR head;
- build write permission, inherited workflow permission and broad deployment guards.

The script does not mutate tracked repository files.

## Local verification completed before immutable commit

- Bun `1.3.14` portable runtime confirmed.
- `bun install --frozen-lockfile` — pass.
- production `bun run build` with canonical `SITE_ORIGIN` and `BASE_PATH` — pass.
- 28 localized routes and 29 HTML files validated.
- public claims validated across canonical source, 29 HTML files and 3 JavaScript bundles.
- adversarial suite — 18 checks passed.
- current extracted tree — 38 files.

Cross-platform clean-checkout SHA-256 comparison is intentionally produced after the immutable remediation commit so both builds can be bound to the final subject. Independent review remains mandatory.
