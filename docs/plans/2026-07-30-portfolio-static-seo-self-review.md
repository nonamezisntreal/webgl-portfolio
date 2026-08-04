# Portfolio Static SEO Implementation — Self Review

Date: 2026-07-30  
Reviewer: implementation author  
Repository: `nonamezisntreal/webgl-portfolio`  
Base branch: `main`  
Base commit: `d369cf46ece4794300878888c4ec8dff31a6aec5`  
Implementation branch: `codex/portfolio-static-seo-01`  
Reviewed implementation commit: `dd943204e883acfae4b16c12f679689154597a89`  
Self-review document parent: `6a136d715ce239f98715618e83d940f15e494d41`

The final commit containing this document is bound externally by the implementation checkpoint. The document does not claim to verify its own bytes.

## Verdict

`PASS_WITH_RESIDUAL_GATES`

The candidate satisfies the implementation objective: keep the existing portfolio on GitHub Pages while adding indexable RU/EN service, case-study and technical insight pages, deterministic SEO metadata, crawler output, verified deep links and fail-closed build validation.

This is an implementer self-review. It is not an independent review, owner acceptance, merge authorization or production deployment authorization.

## Exact completed scope

- preserved the existing Vite, TypeScript and Three.js homepage;
- preserved the canonical homepage URL;
- added one GitHub Actions build/deploy workflow;
- retained Bun and `bun.lock` as the package-manager source of truth;
- pinned the Bun runtime and GitHub Actions dependencies used by CI;
- bound pull-request CI to the exact branch-head commit rather than the synthetic merge commit;
- restricted Pages artifact creation and deployment to `main` only;
- added build-time static generation without a server runtime or client-side router;
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
- added provider-neutral public event hooks;
- added verified portfolio deep-link output for later FreelanceBot consumption;
- normalized generated metadata and file mtimes for a reproducible extracted `dist` tree;
- uploaded pull-request artifacts for independent inspection;
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

`src/public-claims.ts` contains verified public performance, localization and deployment wording referenced directly by the canonical content source. It does not duplicate the project registry.

### Deployment ownership

`.github/workflows/deploy.yml` is the only proposed active GitHub Pages pipeline. The historical `gh-pages` branch is not updated by this change and is not treated as a parallel source of truth.

The workflow grants only `contents: read` to the build job. Pages and OIDC write permissions exist only in the deployment job, which is restricted to `refs/heads/main` and non-pull-request events.

## Findings and repairs

### SR-001 — HIGH — Initial implementation scope was too broad for one unverifiable mutation

Repair: implemented the scope as bounded increments in one isolated branch, with a successful build and artifact inspection after every material change. Merge and deployment remained outside the session.

### SR-002 — HIGH — No isolated implementation branch existed

Repair: created `codex/portfolio-static-seo-01` from exact base commit `d369cf46ece4794300878888c4ec8dff31a6aec5`. `main` was not modified directly.

### SR-003 — MEDIUM — A second package-manager authority could have been introduced

Repair: CI and documentation use `bun install --frozen-lockfile` and `bun run build`. No npm lockfile was introduced.

### SR-004 — HIGH — GitHub Pages project-path regressions were likely

Repair: builds use explicit `SITE_ORIGIN` and `BASE_PATH`; generated links remain inside `/webgl-portfolio/`; the artifact validator rejects paths that escape the project prefix.

### SR-005 — HIGH — One client-mutated document could not represent two indexable languages

Repair: the root URL is always Russian, English has a physical `/en/` document, localized pairs have reciprocal `hreflang`, and the language switch is a normal link.

### SR-006 — HIGH — Static content pages could accidentally inherit the WebGL runtime

Repair: service, case and insight pages are standalone HTML documents without module scripts or Three.js assets. CI fails if either appears.

### SR-007 — MEDIUM — A second project registry could diverge from homepage projects

Repair: case routes bind to project IDs from `src/content.ts`. `scripts/validate-content.ts` fails on missing projects, duplicate IDs and broken relationships.

### SR-008 — MEDIUM — AI-search crawler policy could silently alter training-crawler policy

Repair: `robots.txt` supports normal crawling, `OAI-SearchBot` and `PerplexityBot`. No `GPTBot` policy was invented; that remains an owner decision.

### SR-009 — MEDIUM — Public identity could be fabricated in structured data

Repair: structured data uses only the currently published identity `Hazard` and already public contact URLs. No legal name, credential, employer or unsupported metric was added.

### SR-010 — HIGH — Russian content navigation referenced missing homepage fragments

Independent artifact inspection found `#cases` and `#insights` links that did not exist on the interactive Russian homepage.

Repair: Russian content navigation now uses existing `#projects` and generated `#explore` targets. The validator checks every internal URL and fragment.

### SR-011 — MEDIUM — A newly added validator contained an invalid title regex

CI correctly failed on the validator itself.

Repair: corrected the regex and preserved the failed run as self-repair evidence. Later builds passed the same check.

### SR-012 — HIGH — Stored English preference could contradict the Russian canonical URL

Repair: removed runtime locale selection from storage. The root runtime is fixed to Russian; English navigation uses the physical `/en/` route.

### SR-013 — MEDIUM — Homepage loader could obscure primary content

Repair: reduced the loader to a non-blocking status element. Primary HTML remains visible, WebGL stays lazy-loaded, and WebGL failure leaves the core journey usable.

### SR-014 — HIGH — Absolute `60fps` claims were unsupported by cross-device evidence

Independent artifact inspection found absolute or stable frame-rate wording in HTML and runtime content.

Repair:

- introduced `src/public-claims.ts`;
- corrected `src/content.ts`, the canonical public-content source;
- runtime rendering uses verified performance wording;
- the build finalizer repairs only two legacy static homepage fallbacks;
- `scripts/validate-public-claims.mjs` rejects remaining absolute frame-rate claims;
- independent artifact inspection includes JavaScript assets as well as HTML.

### SR-015 — HIGH — The WebGL case described obsolete localization and deployment architecture

Repair: `src/content.ts` now references physical indexable locale URLs and GitHub Actions deployment wording. Generated pages and homepage overlays share the corrected source. Validation rejects obsolete wording in HTML and JavaScript.

### SR-016 — MEDIUM — Crawler and sitemap files existed in competing static/generated forms

Repair: generation is the only source for `robots.txt` and `sitemap.xml`; duplicate source artifacts were removed.

### SR-017 — MEDIUM — Public deep links could be invented or modified by an LLM

Repair: generated `portfolio-links.json` contains exact canonical URLs, locale, type, capabilities, confidentiality and enabled state. Validation rejects duplicate URLs, disabled/private records, shorteners and tracking parameters.

### SR-018 — MEDIUM — Documentation no longer matched the implemented architecture

Repair: README now documents the 28-route static system, complete build pipeline, source boundaries, artifact review and current validation guarantees.

### SR-019 — HIGH — Wall-clock metadata prevented reproducible `dist` content

Repair: `scripts/normalize-artifact.mjs` derives `generatedAt` from the maximum versioned route `updatedAt` and normalizes all `dist` mtimes to that value.

### SR-020 — MEDIUM — GitHub wrapper ZIP bytes are not reproducible

Two successful CI runs over identical site inputs produced different GitHub artifact ZIP hashes even after file timestamps were normalized.

Repair and boundary:

- downloaded both artifacts;
- compared all 38 extracted files by relative path and SHA-256;
- all 38 file hashes were identical;
- the GitHub-created ZIP wrapper hashes remained different.

Conclusion: the reproducibility contract applies to the extracted `dist` tree. It does not claim control over GitHub's artifact ZIP wrapper metadata.

### SR-021 — HIGH — Pull-request CI evaluated a synthetic merge commit while naming the artifact after the branch head

This could make artifact identity ambiguous when `main` changes or merge conflict resolution alters the evaluated tree.

Repair:

- checkout is explicitly bound to `github.event.pull_request.head.sha` for pull-request runs;
- `persist-credentials` is disabled;
- CI log for run `30533850107` confirms checkout of exact commit `dd943204e883acfae4b16c12f679689154597a89`;
- the uploaded artifact name and workflow `head_sha` bind to the same commit.

### SR-022 — HIGH — Manual workflow dispatch from a feature branch could reach the Pages deployment path

The previous condition excluded pull requests but did not require `main`.

Repair: Pages configuration, Pages artifact upload and deployment now require `github.ref == 'refs/heads/main'` and a non-pull-request event. The deployment job remained skipped for the reviewed feature-branch run.

### SR-023 — HIGH — Mutable CI toolchain and Action tags contradicted the reproducibility claim

The previous workflow used `bun-version: latest` and mutable major Action tags.

Repair:

- Bun is pinned to `1.3.14`, the version used by the prior successful evidence run;
- every GitHub Action is referenced by a full immutable commit SHA;
- the runner label is pinned to `ubuntu-24.04` rather than `ubuntu-latest`;
- build and deploy jobs have explicit timeouts;
- production concurrency is not auto-cancelled, while pull-request validation remains cancellable.

## Verification evidence

### Final pinned CI run

- reviewed implementation commit: `dd943204e883acfae4b16c12f679689154597a89`;
- workflow run: `30533850107`;
- result: `success`;
- exact checkout subject: `dd943204e883acfae4b16c12f679689154597a89`;
- Bun: `1.3.14`;
- frozen dependency installation: `PASS`;
- build and validators: `PASS`;
- review artifact upload: `PASS`;
- Pages configuration: `skipped`;
- Pages artifact upload: `skipped`;
- deployment job: `skipped`.

The workflow performs:

- exact subject checkout;
- pinned Bun setup;
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
- pull-request artifact upload.

### Final pinned artifact

- artifact ID: `8755795572`;
- artifact name: `portfolio-dist-dd943204e883acfae4b16c12f679689154597a89`;
- GitHub wrapper ZIP digest: `sha256:28521cd79d2e0415d98f410ee665343f49268ce9ba366b842ac986906244444f`.

### Extracted-tree reproducibility

The final pinned artifact was compared with both previous reproducibility artifacts:

- files per tree: `38`;
- missing or additional paths: `0`;
- differing file SHA-256 values against artifact A: `0`;
- differing file SHA-256 values against artifact B: `0`.

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
- GitHub artifact ZIP wrapper bytes are not claimed to be reproducible;
- the hosted GitHub runner image is externally managed even though its major image label is pinned.

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
