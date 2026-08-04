# Interactive EN homepage and hero artifact remediation

## Campaign

```text
CAMPAIGN_ID:
WEBGL-PORTFOLIO-INTERACTIVE-EN-AND-HERO-ARTIFACT-REMEDIATION-08
```

This report records the source implementation and release-candidate preparation for the localized interactive homepage and hero-scene remediation. Historical audit documents remain unchanged.

## Exact base

```text
repository: https://github.com/nonamezisntreal/webgl-portfolio
base branch: main
base commit: 62ac098afb43500614ccbc12ee255f099a59f8f1
base tree: d322002471fa47291959eab68255dd66d39a579d
remediation branch: codex/portfolio-interactive-en-hero-remediation-08
```

The branch was created in a new isolated worktree from the fetched `origin/main`. Existing dirty worktrees and historical PRs were not modified.

## Baseline findings

The base build and public deployment reproduced three separate root causes.

### English homepage architecture

The Vite build emitted the RU application shell at `dist/index.html`, after which `scripts/generate-static-site.ts` replaced `dist/en/index.html` with an independently generated static homepage document. The two locale URLs therefore did not share one application runtime or one WebGL scene.

### Active-locale navigation

The language switcher exposed both RU and EN options as anchors. Runtime code attempted to prevent the current-locale click, but the active locale remained link-shaped and the generated locale state could diverge from the physical route.

### Hero sphere artifact

`Particles.createComets()` created five `THREE.SphereGeometry(0.025, 8, 8)` meshes using a bright `MeshBasicMaterial`, multiplied the selected color by `2.2`, and updated each mesh on randomized near-core orbits. The bloom pass enlarged the perceived bright silhouette. When a comet crossed or approached the core silhouette it read as a solid attached sphere rather than an ambient particle.

Controlled source and scene-graph A/B inspection confirmed the spherical comet subsystem as the removable root cause. Rings, octahedral shards, the central icosahedral core, the shader particle field and the bloom composition were not required to reproduce that source-level defect and were preserved.

## Architecture decision

The accepted architecture uses two physical localized homepage artifacts with one application implementation:

```text
/webgl-portfolio/     -> RU interactive homepage
/webgl-portfolio/en/  -> EN interactive homepage
```

The Vite build produces one module graph and stylesheet. `scripts/generate-static-site.ts` post-processes the Vite-built homepage shell for RU and EN, writes physical `dist/index.html` and `dist/en/index.html`, and generates only service, case-study and insight pages as static documents.

Locale is declared before runtime boot through `html[data-locale]`. `src/main.ts` validates the declaration against the physical pathname and fails closed on mismatch. It does not use browser-language redirection, `localStorage`, `location.assign()` or `location.replace()`.

The language switcher is a semantic group. The active locale is an inert `span` with `aria-current="page"`; the counterpart locale is the only anchor and retains a minimum 44×44 CSS-pixel target.

Both localized homepages receive the same assembly, analytics and hardening contracts. Static content-page finalization derives the complete non-home route count from `routes-manifest.json` and maps both locale trees to the real interactive targets:

```text
services -> #services
cases -> #projects
insights -> #explore
```

Static service, case-study and insight routes continue to exclude the homepage module and Three.js runtime.

## Hero-scene decision

The spherical comet subsystem was removed at source level:

- comet mesh collection removed;
- comet orbit metadata removed;
- `createComets()` removed;
- five spherical geometries and overbright materials removed;
- comet update loop removed.

The following scene elements remain required and validated:

- central `IcosahedronGeometry` core;
- shader-based ambient `THREE.Points` field;
- torus rings;
- octahedral shards;
- `UnrealBloomPass` in the primary post-processing composition.

`validate-hero-scene.mjs` fails if the spherical comet contract returns or if the preserved composition is removed merely to hide the artifact.

## Changed files

```text
README.md
index.html
package.json
scripts/finalize-static-site.ts
scripts/generate-static-site.ts
scripts/harden-homepage.ts
scripts/test-adversarial.mjs
scripts/test-browser-smoke.mjs
scripts/validate-dist.mjs
scripts/validate-hero-scene.mjs
scripts/validate-localized-homepage-architecture.mjs
src/main.ts
src/vite-env.d.ts
src/webgl/Particles.ts
```

`.github/workflows/deploy.yml` remained byte-identical.

## Source commits before this report

```text
0ab6986  fix(i18n): make both localized homepages interactive
f3f49b5  fix(webgl): remove intrusive hero sphere artifact
1991f12  test(portfolio): bind interactive locale routes and hero regression
cf319a4  docs(portfolio): document interactive localized architecture
```

The exact pre-report PR head was:

```text
commit: cf319a474701ab99e57b27c5f472947f9cdbbc1f
tree: 8cb6905cbc903b36d3a361718c5a420e57edcce1
```

The exact implementation-and-test snapshot before documentation commits was:

```text
commit: 1991f12113d6c0ebddff181645dddf54b0b78729
tree: d097bb396a2d119b399867a2f38b8f3dca512937
```

## Validation

All release-candidate commands used the workflow-pinned Bun version:

```text
Bun: 1.3.14+0d9b296af
Node: v22.22.1
BASE_PATH: /webgl-portfolio/
SITE_ORIGIN: https://nonamezisntreal.github.io
```

Results:

| Gate | Result |
| --- | --- |
| `bun install --frozen-lockfile` | PASS; no lockfile drift |
| workflow policy | PASS |
| TypeScript | PASS |
| content registry | PASS |
| localized homepage source architecture | PASS |
| hero scene source contract | PASS |
| Vite production build | PASS |
| localized generation | PASS; 28 canonical routes |
| dual homepage hardening | PASS; 2/2 |
| static navigation finalization | PASS; 26/26 content pages |
| artifact normalization | PASS; 37 artifacts |
| dist validation | PASS |
| public-claim validation | PASS |
| adversarial mutation suite | PASS; 113/113 |
| Review-03 regression suite | PASS; 21/21 |
| browser smoke | PASS; 16/16 |
| lint | NOT_APPLICABLE; no repository script |
| format | NOT_APPLICABLE; no repository script |

Browser coverage includes direct RU and EN loads, EN hard reload, active-locale inertness, keyboard RU/EN navigation, Back/Forward, no-JS localized shells, mobile portrait and landscape, desktop, reduced motion, WebGL context loss, WebGL-disabled fallback, static deep routes, Console diagnostics and failed internal Network request diagnostics.

## Reproducibility

Two consecutive production-equivalent builds of one source snapshot produced identical records for all 37 `dist` files:

```text
build 1 manifest SHA-256: c1acc9a5388e21afdc1e254d4c644149af4414c716282cfe568eeaef7abeb150
build 2 manifest SHA-256: c1acc9a5388e21afdc1e254d4c644149af4414c716282cfe568eeaef7abeb150
difference count: 0
```

## Visual evidence

Evidence was captured outside tracked source to avoid committing transient screenshots. The local evidence set contains:

```text
desktop-1440x900.png
english-1440x900.png
hero-1728x864-1s.png
hero-1728x864-5s.png
hero-1728x864-10s.png
mobile-390x844.png
landscape-844x390.png
tablet-768x1024.png
reduced-motion.png
no-js-homepage.png
no-js-english-homepage.png
webgl-disabled-fallback.png
browser-smoke.json
```

Baseline production captures were also taken for RU desktop at approximately 1, 5 and 10 seconds, EN desktop, and RU mobile. Screenshot evidence supplements but does not replace the source-level proof: the spherical mesh creation and orbit-update path no longer exists, while the central composition is explicitly required by validation.

## Pull request

```text
PR: https://github.com/nonamezisntreal/webgl-portfolio/pull/4
number: 4
base: main
head branch: codex/portfolio-interactive-en-hero-remediation-08
status at report creation: OPEN; final CI artifact verification pending this report commit
```

The PR description records the base identity, root causes, implementation, local test counts, reproducibility hash and rollback procedure. The PR workflow must check out the exact PR head and upload the normalized `dist` review artifact. Merge is prohibited if its artifact manifest differs from the local accepted manifest.

## Deployment and production verification status at report creation

```text
merge: NOT_RUN_PRE_MERGE
deployment: NOT_RUN_PRE_MERGE
production smoke: NOT_RUN_PRE_MERGE
```

Those states are deliberately not predicted inside the pre-merge source snapshot. The immutable merge commit, workflow run, deployment commit and production smoke results are recorded in the PR timeline and the campaign's final execution report after they exist.

## Rollback

The rollback authority is limited to this campaign's ordinary merge. A confirmed critical production regression must be reverted without force-push or history rewriting:

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
git revert -m 1 <campaign-merge-commit>
git push origin main
```

After the revert push, the standard `main` GitHub Pages workflow must complete and the restored RU/EN production surfaces must be smoke-tested. Cosmetic findings that do not violate acceptance criteria are not automatic rollback triggers.
