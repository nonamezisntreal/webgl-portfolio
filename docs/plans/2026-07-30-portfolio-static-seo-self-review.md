# Portfolio Static SEO Implementation — Self Review

Date: 2026-07-30  
Reviewer: implementation author  
Repository: `nonamezisntreal/webgl-portfolio`  
Base branch: `main`  
Base commit: `d369cf46ece4794300878888c4ec8dff31a6aec5`  
Implementation branch: `codex/portfolio-static-seo-01`  
Reviewed implementation commit: `47001512fb99aa72a2c188c0dce2c7228ed47221`  
Reviewed documentation commit: `b8cdf34a9250646fc5f5d39fddf4e350f6ba90a7`

## Verdict

`PASS_WITH_RESIDUAL_GATES`

The implementation candidate satisfies the bounded product and technical objective: keep the portfolio on GitHub Pages while adding indexable RU/EN service, case-study and technical insight pages, deterministic SEO metadata, crawler output, verified deep links and fail-closed build validation.

This is an implementer self-review. It is not an independent review, owner acceptance, merge authorization or production deployment authorization.

## Exact completed scope

- preserved the existing Vite, TypeScript and Three.js homepage;
- preserved the exact canonical homepage URL;
- added a canonical GitHub Actions build/deploy workflow;
- retained Bun as the only package-manager source of truth;
- added build-time static generation without a server runtime;
- generated a physical English homepage;
- generated five service pages in RU and EN;
- generated four case-study pages in RU and EN;
- generated four technical insight pages in RU and EN;
- generated 28 localized canonical routes and one static 404 document;
- added canonical links, reciprocal `hreflang`, metadata and JSON-LD;
- generated `sitemap.xml`, `robots.txt`, `routes-manifest.json` and `portfolio-links.json`;
- added deterministic internal-link and fragment validation;
- kept Three.js and module scripts out of static content pages;
- made the homepage loader non-blocking and hid the FPS diagnostic in production;
- replaced in-place locale mutation with a physical `/en/` route;
- added public event hooks without introducing an analytics vendor;
- added verified portfolio deep-link output for later FreelanceBot consumption;
- normalized generated metadata and file mtimes for a reproducible `dist` file tree;
- added a pull-request artifact for independent inspection;
- completed repeated self-review and self-repair cycles.

## Source-of-truth review

### Content ownership

`src/content.ts` remains canonical for:

- profile contacts;
- homepage copy;
- project summaries;
- project case-study data.

`src/static-pages.ts` adds only:

- static route descriptors;
- extended service and insight content;
- capability tags;
- relationships between services, cases and insights.

`src/public-claims.ts` contains the verified public performance, localization and deployment wording referenced directly by the canonical content source. It does not duplicate the project registry.

### Deployment ownership

`.github/workflows/deploy.yml` is the only proposed active GitHub Pages pipeline. The historical `gh-pages` branch is not updated by this change and is not treated as a parallel source of truth.

## Findings and repairs

### SR-001 — HIGH — Initial implementation scope was too broad for one unverifiable mutation

The complete roadmap combined deployment, routing, localization, content generation, metadata, accessibility, performance and integration concerns.

Repair: the work was implemented as a sequence of bounded increments in one branch, with a successful build and artifact inspection after each material change. Merge and deployment remained outside the implementation session.

### SR-002 — HIGH — No isolated implementation branch existed

Repair: created `codex/portfolio-static-seo-01` from exact base commit `d369cf46ece4794300878888c4ec8dff31a6aec5`. `main` was not modified directly.

### SR-003 — MEDIUM — A second package-manager authority could have been introduced

The repository uses `bun.lock`.

Repair: CI and local instructions use `bun install --frozen-lockfile` and `bun run build`. No npm lockfile was introduced.

### SR-004 — HIGH — GitHub Pages project-path regressions were likely

The canonical site is hosted below `/webgl-portfolio/` rather than at the domain root.

Repair: the build uses explicit `SITE_ORIGIN` and `BASE_PATH`, generated links stay inside the project path, and the artifact validator rejects links that escape it.

### SR-005 — HIGH — One client-mutated document could not represent two indexable languages

The previous locale switch changed one document through JavaScript and `localStorage`.

Repair: the root URL is always Russian, English has a physical `/en/` document, and every localized pair has reciprocal `hreflang`. The language switch is a normal link.

### SR-006 — HIGH — Static content pages could accidentally inherit the WebGL runtime

Repair: service, case and insight pages are standalone HTML documents without module scripts or Three.js assets. CI fails if either appears.

### SR-007 — MEDIUM — A second project registry could diverge from homepage projects

Repair: case routes bind to project IDs from `src/content.ts`. `scripts/validate-content.ts` fails on missing projects, duplicate IDs or broken relationships.

### SR-008 — MEDIUM — AI-search crawler policy could silently alter training-crawler policy

Repair: `robots.txt` explicitly supports normal crawling, `OAI-SearchBot` and `PerplexityBot`. No new `GPTBot` policy was invented; that remains an owner decision.

### SR-009 — MEDIUM — Public identity could be fabricated in structured data

Repair: generated structured data uses only the current public identity `Hazard` and already published contact URLs. No legal name, employer, credential or unsupported metric was added.

### SR-010 — HIGH — Russian content navigation referenced missing homepage fragments

Independent artifact inspection found `#cases` and `#insights` links that did not exist on the interactive Russian homepage.

Repair: Russian content navigation is finalized to existing `#projects` and generated `#explore` targets. The artifact validator now checks every internal URL and fragment.

### SR-011 — MEDIUM — A newly added validator contained an invalid title regex

CI correctly failed on the validator itself.

Repair: corrected the regex and preserved the failed run as self-repair evidence. Later builds passed the same check.

### SR-012 — HIGH — Stored English preference could contradict the Russian canonical URL

The previous runtime could render English copy at the Russian canonical path.

Repair: removed runtime locale selection from storage. The root runtime is fixed to Russian; navigation to English uses the physical `/en/` route.

### SR-013 — MEDIUM — Homepage loader could obscure primary content

Repair: the loader is reduced to a non-blocking status element, primary HTML remains visible, WebGL stays lazy-loaded, and WebGL failure leaves the core journey usable.

### SR-014 — HIGH — Absolute `60fps` claims were not supported by cross-device evidence

Independent artifact inspection found six HTML files and eight occurrences of absolute or stable frame-rate wording.

Repair:

- introduced `src/public-claims.ts`;
- corrected `src/content.ts`, the canonical public-content source;
- runtime rendering uses verified performance wording;
- the build finalizer repairs only two legacy static homepage fallbacks;
- `scripts/validate-public-claims.mjs` independently rejects remaining absolute frame-rate claims;
- independent artifact inspection includes the JavaScript bundle, not only HTML.

### SR-015 — HIGH — The WebGL case described obsolete localization and deployment architecture

The canonical case data still claimed in-place RU/EN switching and deployment through a `gh-pages` branch.

Repair: `src/content.ts` now references the verified physical-URL and GitHub Actions wording directly. Generated pages and homepage overlays share the same corrected source. Independent validation rejects the obsolete wording in HTML and JavaScript assets.

### SR-016 — MEDIUM — Crawler and sitemap files existed in competing static/generated forms

Repair: generation is the single source for `robots.txt` and `sitemap.xml`; duplicate source artifacts were removed.

### SR-017 — MEDIUM — Public deep links could be invented or modified by an LLM

Repair: generated `portfolio-links.json` contains exact public canonical URLs, locale, type, capabilities, confidentiality and enabled state. Validation rejects duplicate URLs, disabled/private records, shorteners and tracking parameters.

### SR-018 — MEDIUM — Documentation no longer matched the implemented architecture

README and the initial self-review described only a foundation increment.

Repair: README now documents the 28-route static system, full build pipeline, source boundaries, artifact review and current validation guarantees. This self-review supersedes the reduced-scope document.

### SR-019 — HIGH — Wall-clock metadata prevented reproducible `dist` content

`generatedAt` previously used the current CI time, so documentation-only commits changed generated JSON bytes.

Repair: `scripts/normalize-artifact.mjs` derives `generatedAt` from the maximum versioned route `updatedAt` and normalizes all `dist` mtimes to that value.

### SR-020 — MEDIUM — GitHub wrapper ZIP bytes are not reproducible

Two successful CI runs over identical site inputs produced different GitHub artifact ZIP hashes even after file timestamps were normalized.

Repair and boundary:

- downloaded both artifacts;
- compared all 38 extracted files by relative path and SHA-256;
- all 38 file hashes were identical;
- the GitHub-created ZIP wrapper hashes remained different.

Conclusion: the reproducibility contract applies to the extracted `dist` tree. It does not claim control over GitHub's artifact ZIP wrapper metadata.

## Verification evidence

### GitHub Actions

Implementation run:

- commit: `47001512fb99aa72a2c188c0dce2c7228ed47221`;
- workflow run: `30532911802`;
- result: `success`;
- deploy job: `skipped` as required for a pull request.

Documentation-only reproducibility probe:

- commit: `b8cdf34a9250646fc5f5d39fddf4e350f6ba90a7`;
- workflow run: `30533011644`;
- result: `success`;
- deploy job: `skipped`.

The workflow performs:

- checkout;
- Bun setup;
- frozen dependency installation;
- TypeScript validation;
- content registry validation;
- Vite production build;
- static route generation;
- homepage hardening;
- bounded navigation/fallback finalization;
- deterministic metadata and mtime normalization;
- complete artifact validation;
- independent public-claim validation;
- PR artifact upload.

### Reproducibility evidence

Implementation artifact:

- artifact ID: `8755423772`;
- GitHub ZIP digest: `sha256:fea1727b337dd21b99354b971f2b3f55db12349ba8e304b514441e598a03524e`.

Documentation-only probe artifact:

- artifact ID: `8755454747`;
- GitHub ZIP digest: `sha256:2829f4d7f43f2b990b648136c54f5a54cab2f602ebd2b5584247791c8ce877c8`.

Extracted tree comparison:

- files in artifact A: `38`;
- files in artifact B: `38`;
- missing or additional paths: `0`;
- differing file SHA-256 values: `0`.

### Independent normalized-artifact inspection

- HTML documents: `29`;
- canonical localized routes: `28`;
- sitemap locations: `28`;
- route manifest records: `28`;
- public portfolio link records: `28`;
- structural errors: `0`;
- stale public claims in HTML: `0`;
- stale public claims in JavaScript: `0`.

The independent inspection checked:

- unique titles and descriptions;
- one H1 per canonical route;
- canonical URL correctness;
- JSON-LD parseability;
- reciprocal locale links;
- sitemap/manifest/registry parity;
- all internal links and fragments;
- project-base-path confinement;
- no module/Three.js runtime on static content pages;
- no stale absolute performance claims;
- no obsolete localization/deployment claims;
- deterministic `generatedAt` values;
- common high-risk secret patterns.

## Residual gates and unverified claims

These items are intentionally not claimed as complete:

- the draft PR has not received independent review;
- `main` has not been changed;
- GitHub Pages source settings have not been changed to GitHub Actions;
- the candidate has not been deployed to the live site;
- live redirects, HTTPS and crawler retrieval have not been verified after deployment;
- Google Search Console, Bing Webmaster Tools and Yandex Webmaster are not configured by repository code;
- Lighthouse and field Core Web Vitals measurements were not produced in this session;
- no analytics provider was selected; only provider-neutral event hooks exist;
- Cal.com was not added because no verified owner scheduling URL was available and no URL was invented;
- no custom domain was selected or configured;
- the public alias `Hazard` remains the owner-provided identity; legal-name publication remains an owner decision;
- FreelanceBot runtime has not yet consumed `portfolio-links.json`;
- GitHub artifact ZIP wrapper bytes are not claimed to be reproducible.

These are deployment, product-input or independent-review gates rather than failures of the static GitHub Pages candidate.

## Authorization boundary

The owner's instruction authorized implementation, self-review and self-repair on the isolated branch.

Not authorized by this session:

- merging the pull request;
- changing GitHub Pages repository settings;
- deleting or mutating the historical `gh-pages` branch;
- production deployment;
- changing the canonical portfolio URL;
- publishing a custom domain;
- claiming independent acceptance.

## Final self-review conclusion

The candidate is ready for owner review and independent technical review as a draft pull request.

`IMPLEMENTATION_CANDIDATE_READY_FOR_INDEPENDENT_REVIEW`
