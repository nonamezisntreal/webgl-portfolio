# CPH-WEBGL-PORTFOLIO-STATIC-SEO-REMEDIATION-02 — implementation self-review

Date: 2026-07-31

Status: `IMPLEMENTATION_SELF_REVIEW_COMPLETE_PENDING_SINGLE_CANDIDATE_COMMIT`

This document is an implementation self-review. It is not an independent review and does not claim acceptance.

## 1. Review subject and authorization boundary

Repository: `nonamezisntreal/webgl-portfolio`

Isolated implementation worktree:

```text
C:\Users\nikit\source\operations\CPH-WEBGL-PORTFOLIO-STATIC-SEO-REMEDIATION-02
```

Branch:

```text
codex/portfolio-static-seo-remediation-02
```

Exact starting commit:

```text
ababe5564e1936af9c99bc31fda62c2b921c0637
```

Starting parent:

```text
673d56908a61880493c599e1d3e0989acbe298bb
```

Starting tree:

```text
195c8d35517a9de1f55f825cb49c3cb534f76765
```

Authorized findings only:

```text
WEBGL-SEO-R02-001
WEBGL-SEO-R02-002
WEBGL-SEO-R02-003
WEBGL-SEO-R02-004
WEBGL-SEO-R02-005
```

`WEBGL-SEO-R02-006` remains outside this remediation scope. Existing Vite/esbuild/PostCSS advisories were observed and recorded but were not remediated.

## 2. Implemented remediation by finding

### WEBGL-SEO-R02-001 — workflow policy

`scripts/validate-workflow-policy.mjs` now parses workflow YAML structurally with exact-pinned `yaml@2.8.3`.

The validator now enforces:

- `deploy.yml` is the only workflow authority;
- duplicate keys, parser warnings/errors and unsupported YAML syntax fail closed;
- `pull_request_target` is prohibited explicitly;
- the exact workflow trigger, concurrency and workflow-level `permissions: {}` contracts;
- the exact job allowlist `build`, `deploy`;
- exact job and step key sets, step counts and capability boundaries;
- exact full-SHA Action identities;
- Bun `1.3.14`;
- exact pull-request head checkout;
- `persist-credentials: false`;
- frozen dependency installation;
- exact build and deploy permissions;
- the exact positive Pages allowlist on configure, upload and deploy boundaries;
- rejection of extra privileged jobs, repository mutation commands, deployment commands and `continue-on-error` bypasses.

Valid quoted scalars, reordered mappings, folded multiline conditions and YAML aliases that resolve to the exact permitted value are accepted. Four positive syntax variants were executed successfully.

### WEBGL-SEO-R02-002 — semantic JSON-LD

`scripts/validate-dist.mjs` now validates every JSON-LD block and every object in an array explicitly.

Common validation includes:

- exact Schema.org context;
- route-type-specific type allowlists and exact primary-object cardinality;
- nonempty required fields;
- clean absolute HTTPS URLs;
- canonical-origin and project-base containment where required;
- duplicate-object and contradictory-object rejection;
- visible-page consistency.

Route-specific validation includes:

- `ProfilePage`: canonical `Person` identity, localized description, canonical profile URL and exact `sameAs` relationships;
- `Service`: visible name, localized description, exact page canonical URL and canonical provider identity;
- `TechArticle`: visible headline, localized description, valid dates and ordering, versioned `dateModified`, canonical author and `mainEntityOfPage`;
- `FAQPage`: nonempty questions and answers, exact `Question`/`Answer` types, visible Q/A content and duplicate-question rejection.

One invalid block among valid blocks fails the entire artifact.

### WEBGL-SEO-R02-003 — sitemap, robots and assets

`fast-xml-parser@5.7.0` is used for structural sitemap XML validation.

The validator now enforces:

- valid XML and exact sitemap/XHTML namespaces;
- exact route count and route-manifest parity;
- unique `<loc>` values;
- no missing or undeclared URLs;
- canonical HTTPS origin and project-base containment;
- exact deterministic `lastmod` values;
- exact reciprocal alternate URL set;
- no query parameters or fragments.

The effective robots policy is parsed by crawler group and enforces:

- exactly one canonical sitemap declaration;
- the exact public crawler groups currently generated;
- no nonempty `Disallow` directive;
- exactly `Allow: /` per group;
- no conflicting duplicate crawler groups or unsupported directives.

Internal generated references are validated for:

- `script[src]`;
- relevant `link[href]` relations;
- `img[src]`;
- `source[src]`;
- `source[srcset]` and `img[srcset]` candidates.

Every internal asset must remain within `BASE_PATH`, decode safely, contain no traversal or encoded separators, and resolve to a readable generated file. Static-page runtime isolation remains enforced.

### WEBGL-SEO-R02-004 — public claim boundary

`scripts/validate-public-claims.mjs` now defines an explicit public-surface boundary:

```text
README.md
index.html
src/**
public/**
docs/**
dist/**/*.html
dist/**/*.js
dist/**/*.json
```

The narrow audit-only exclusion is:

```text
docs/plans/**
```

The current baseline contains 22 source/document surfaces and 34 generated HTML/JavaScript/JSON artifacts.

The validator rejects unsupported fixed or guaranteed performance language in English and Russian, including numeric FPS, word-form frame rates, stable/constant/locked/guaranteed wording, all-device promises, and the existing obsolete deployment/localization claims.

`README.md` wording was updated only to describe the broader policy accurately. No public product-performance guarantee was added.

### WEBGL-SEO-R02-005 — superseding self-review

This document supersedes remediation-01 closure claims where review-02 proved that the old validators accepted bypasses. Historical remediation-01 evidence was not rewritten.

The remediation-01 assertion that no implementation blocker remained is not relied upon for this candidate. Closure is limited to the independently reproducible boundaries described here and still requires a separate read-only independent review.

## 3. Exact adversarial coverage

Final automated negative count before the candidate commit:

```text
94 / 94 PASS
```

A case is counted only when:

- the validator exits nonzero;
- the expected policy diagnostic is present;
- the failure is not caused by an unrelated setup or syntax error.

Coverage includes all 85 mandatory classes plus additional cases for duplicate descriptions, provider/profile identity drift, article date ordering, malformed URL encoding, workflow-level permission inheritance, `continue-on-error`, and both generated JSON serialization contracts.

Positive workflow syntax variants:

```text
4 / 4 PASS
```

They cover quoted scalars, reordered mapping fields, folded multiline exact conditions and YAML aliases resolving to the exact allowed condition.

## 4. Build and artifact verification performed before commit

### Windows

Environment:

```text
Windows host
Bun 1.3.14
Node v22.22.1-compatible runtime
SITE_ORIGIN=https://nonamezisntreal.github.io
BASE_PATH=/webgl-portfolio/
```

Observed results:

- frozen install: PASS;
- TypeScript typecheck: PASS;
- content validation: PASS;
- workflow validation: PASS;
- production build and all artifact validators: PASS;
- adversarial suite: 94/94 PASS;
- repeated build: byte-identical extracted `dist` manifest.

### Ubuntu

Environment:

```text
Ubuntu 24.04 under WSL2
Bun 1.3.14
Node v22.22.1
SITE_ORIGIN=https://nonamezisntreal.github.io
BASE_PATH=/webgl-portfolio/
```

Observed results:

- frozen install: PASS;
- TypeScript typecheck through the full build command: PASS;
- content/workflow/artifact validation: PASS;
- production build: PASS;
- adversarial suite: 94/94 PASS;
- repeated build: byte-identical extracted `dist` manifest.

### Reproducibility boundary

Observed generated contract:

```text
28 localized routes
29 HTML files
38 extracted dist artifacts
38/38 Windows/Linux byte matches
0 mismatches
```

Windows build 1, Windows repeated build and Ubuntu build produced the same normalized path/length/SHA-256 manifest:

```text
fbf2f63ccacb4245337c32465bbe2f71584458369bbe839d84955b4aa36cd860
```

These pre-commit reproductions are supporting self-review evidence. Final immutable-commit reproduction is required after the single candidate commit and is recorded externally in the remediation evidence package.

## 5. Browser smoke performed

A local project-subpath server and headless Google Chrome were used against the generated artifact.

Observed:

- homepage JavaScript executed;
- four project cards and four service cards rendered;
- deterministic year rendered as `2026`;
- the English language link used the project subpath;
- a localized static service page loaded without a canvas or external runtime script;
- `404.html` retained `noindex,follow` and linked back to the project homepage.

This was a bounded smoke test, not a complete visual, GPU, accessibility or device matrix.

## 6. Supply-chain and secret checks

All six pinned Action commits were fetched successfully from their intended upstream repositories and matched the workflow SHA exactly.

A bounded tracked-file secret scan found:

```text
secret-pattern matches: 0
suspicious tracked credential filenames: 0
```

The two dependencies introduced by this remediation are exact-pinned:

```text
yaml@2.8.3
fast-xml-parser@5.7.0
```

Initial lower parser pins were rejected during self-review because `bun audit` reported current advisories against them. The pins were raised only within the authorized parser dependency boundary. A subsequent audit reported no advisory for either new parser.

The remaining audit output contains five existing advisories under esbuild, PostCSS and Vite. They are recorded as residual `WEBGL-SEO-R02-006` toolchain risk and were not modified.

## 7. Material self-review findings and fixes

### SR-02-001 — Cyrillic word boundaries

Finding: JavaScript `\b` uses ASCII-style word-boundary semantics and allowed a Russian word-form frame-rate claim to bypass the initial implementation.

Fix: Russian semantic expressions now use Unicode property-aware boundaries.

Regression protection: `ADV-007` rejects Russian word-form FPS wording.

### SR-02-002 — JSON serialization-order validation

Finding: comparing input text to `JSON.stringify(parsed)` does not prove canonical key order because parsed object insertion order follows the input.

Fix: exact top-level key-order contracts were added before canonical formatting comparison.

Regression protection: `ADV-092` and `ADV-094` reject reordered route and portfolio manifests.

### SR-02-003 — homepage year contract

Finding: the static artifact contains a runtime year placeholder, while content pages contain the visible year directly. A uniform visible-text assertion incorrectly treated those contracts as identical.

Fix: generated static pages validate the visible versioned year; the homepage validates its target and `validate-content.ts` verifies that rendering derives from `siteConfig.contentUpdatedAt` and not the wall clock.

Regression protection: `ADV-090` replaces the versioned source with `new Date()` and must fail.

### SR-02-004 — parser advisory introduction

Finding: the initial exact parser versions selected during implementation had newly published advisories, including critical/high XML parser advisories.

Fix: only the two newly introduced parser pins were raised to `yaml@2.8.3` and `fast-xml-parser@5.7.0`, then frozen install, build, adversarial and cross-platform checks were repeated.

Residual toolchain advisories were not changed.

### SR-02-005 — linked-worktree portability

Finding: WSL cannot use a Windows absolute linked-worktree `.git` pointer directly.

Fix: disposable Linux reproduction uses a Git bundle rather than the Windows worktree metadata.

This was an operational isolation issue; repository bytes were not changed by the failed attempt.

## 8. Regression analysis

Observed unchanged public contracts:

- canonical homepage and project origin;
- `/webgl-portfolio/` base path;
- 28 localized routes;
- 29 HTML files;
- 38 generated artifacts;
- route IDs and slugs;
- RU/EN relationships and `x-default`;
- sitemap and robots URLs;
- contact links;
- homepage WebGL runtime assets and behavior in bounded browser smoke;
- static-page runtime isolation;
- physical index pages and `404.html`;
- `portfolio-links.json` schema;
- deterministic content date/year;
- pinned Action identities and existing workflow capabilities.

No generated `dist` file is committed manually.

## 9. Scope analysis

Necessary paths:

```text
README.md
bun.lock
package.json
scripts/test-adversarial.mjs
scripts/validate-content.ts
scripts/validate-dist.mjs
scripts/validate-public-claims.mjs
scripts/validate-workflow-policy.mjs
docs/plans/2026-07-31-portfolio-static-seo-remediation-02-self-review.md
```

Questionable paths: none identified.

Unrelated paths: none identified.

The lockfile change is limited to the two structural parser dependencies and their transitive records. No Vite, Three.js, Lenis or unrelated dependency upgrade was performed.

## 10. Known unverified behavior and residual risks

Not verified by this implementation session:

- hosted GitHub Actions execution;
- actual GitHub Pages deployment or production serving behavior;
- GitHub Pages settings;
- production cache/CDN behavior;
- broad GPU and WebGL driver compatibility;
- mobile device/browser matrix;
- complete keyboard and screen-reader accessibility audit;
- full visual-regression matrix;
- external search-engine crawling or rich-result eligibility;
- remediation of existing `WEBGL-SEO-R02-006` Vite/esbuild/PostCSS advisories.

The public-claim policy is intentionally lexical/semantic and bounded by an explicit public-surface allowlist. New public file types or public roots require an explicit policy update.

## 11. Self-review conclusion

Within the authorized implementation boundary, no unresolved correctness, security, regression, reproducibility or scope blocker was found after the fixes above.

This conclusion is not independent acceptance. The candidate must be committed once over the exact rejected parent and then reproduced and reviewed in a separate read-only session.
