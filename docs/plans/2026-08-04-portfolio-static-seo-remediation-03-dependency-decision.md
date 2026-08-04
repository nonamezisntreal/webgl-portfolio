# Remediation-03 Dependency Decision

Scope: bounded toolchain remediation for `WEBGL-SEO-R02-006`.

## Before

The exact candidate lock resolved vulnerable advisory families in the build toolchain:

| Package family | Candidate version / range | Advisory | Severity | Affected range | Disposition before |
|---|---:|---|---|---|---|
| esbuild | transitive below patched line | `GHSA-67mh-4wv8-2f99` | Moderate | `<=0.24.2` | OPEN |
| postcss | transitive vulnerable line | `GHSA-r28c-9q8g-f849` | High | `<=8.5.17` | OPEN |
| postcss | transitive vulnerable line | `GHSA-fxqj-rqcc-2cmp` | Moderate | `<=8.5.22` | OPEN |
| vite | `5.4.21` | `GHSA-4w7w-66w2-5vf9` | Moderate | Vite 7 `<=7.3.1`, Vite 6 `<=6.4.1` and prior affected ranges | OPEN for the maintained upgrade path |
| vite | `5.4.21` | `GHSA-v6wh-96g9-6wx3` | Moderate | Vite 7 `<=7.3.4`, Vite 6 `<=6.4.2` and prior affected ranges | OPEN for the maintained upgrade path |
| vite | `5.4.21` | `GHSA-fx2h-pf6j-xcff` | High | Vite 7 `<=7.3.4`, Vite 6 `<=6.4.2` and prior affected ranges | OPEN |

The Vite 5 line no longer provides a compatible release above every 2026 affected range. A major toolchain migration was therefore necessary.

## Decision

Use exact direct versions and lock the complete graph:

- `vite = 7.3.6`;
- `typescript = 5.9.3`;
- `fast-xml-parser = 5.7.0`;
- `yaml = 2.8.3`;
- override `esbuild = 0.28.1`;
- override `postcss = 8.5.25`.

Runtime dependencies remain bounded and exact:

- `three = 0.165.0`;
- `lenis = 1.3.23`;
- `@types/three = 0.165.0`.

No Three.js API migration or visual redesign was introduced. The Vite migration is limited to the build toolchain; `vite.config.ts` retains the existing chunk policy and now defaults to the canonical GitHub Pages base path. The final reproducibility correction uses a normal static `Experience` import and the standard Vite/esbuild pipeline, producing exactly 37 artifacts; Rollup WASM aliases, Terser, `@rollup/plugin-typescript` and `tslib` are not part of the final graph.

## Compatibility evidence

- `bun install --frozen-lockfile`: PASS.
- TypeScript no-emit check: PASS.
- Vite production build: PASS.
- workflow/content/dist/public-claim validation: PASS.
- inherited adversarial suite: `94/94` PASS.
- Review-03 suite: `21/21` PASS.
- browser matrix: `12/12` PASS.
- `bun audit --json`: empty object, exit zero.

## Final dispositions

| Advisory family | Exact resolved version | Result |
|---|---:|---|
| esbuild `GHSA-67mh-4wv8-2f99` | `0.28.1` | CLOSED; above patched `0.25.0` |
| postcss `GHSA-r28c-9q8g-f849` | `8.5.25` | CLOSED; above patched `8.5.18` |
| postcss `GHSA-fxqj-rqcc-2cmp` | `8.5.25` | CLOSED; above patched `8.5.23` |
| Vite optimized-deps map traversal | `7.3.6` | CLOSED; above patched `7.3.2` |
| Vite/launch-editor UNC handling | `7.3.6` | CLOSED; above patched `7.3.5` |
| Vite Windows alternate-path deny bypass | `7.3.6` | CLOSED; above patched `7.3.5` |

No high advisory remains without a closed disposition.
