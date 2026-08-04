# WEBGL Portfolio Remediation-03 Self-Review

Campaign: `WEBGL-PORTFOLIO-REMEDIATION-03-AND-RELEASE-CANDIDATE`

## Scope and authority

This campaign started from exact candidate `f4093c5443bfb5e21f2be225f54e23c422dcf415` / tree `cf04caab266f015a14066ec95e3415995789e8e9` in a new clean worktree. The independent Review-03 worktree was treated as immutable input: its untracked review scripts and evidence were read but never edited, cleaned or committed.

No ASTRA, CodexPro Bridge, credential, Scheduled Task, runtime, Phase F or production deployment state was changed.

## Review conclusion

The remediation addresses every confirmed Review-03 validator bypass at the root-cause level:

- exact Schema.org field and cardinality contracts;
- strict duplicate-key JSON parsing;
- perceived-visible text rather than tag-stripped source;
- fail-closed URL, path, asset, `srcset`, case and source-map handling;
- normalized public-claim analysis for HTML, entities, JSON and JavaScript strings;
- Unicode-aware English/Russian semantic claim rules;
- lexical and structural XML authority with DTD/entity prohibition;
- semantic Git bundle verification in the evidence verifier.

The inherited adversarial suite remains green and every newly confirmed bypass has a targeted permanent regression. Positive adaptive-performance descriptions are tested separately to prevent overblocking.

## Product defects resolved

The product review confirmed and corrected bounded defects without redesigning the visual identity:

- the homepage RU/EN control now performs a canonical no-JS-safe route change;
- keyboard users receive a skip link and consistent focus indicator;
- the project case dialog has a programmatic name, focus trap, inert background and focus restoration;
- hash navigation preserves URL and focus semantics;
- contact feedback is announced as a live status;
- touch targets and small-height/hoverless layouts are bounded;
- WebGL lifecycle owns context loss/restoration, background pauses, adaptive DPR and resource disposal;
- WebGL-disabled and no-JS states retain the complete primary content path.

## Dependency decision

The Vite 5 line could not move above all applicable advisory ranges. The toolchain therefore moved to exact Vite `7.3.6`, with exact TypeScript and pinned transitive PostCSS/esbuild overrides. Three.js remains `0.165.0`; no Three.js API migration or visual redesign was required. The exact frozen lock currently produces an empty `bun audit --json` result.

## Validation status before evidence sealing

The following suites have passed during remediation and must be repeated against the exact final commit during evidence generation:

- frozen Bun install;
- TypeScript no-emit check;
- workflow/content/dist/public-claim validators;
- production Vite build;
- inherited adversarial mutations: `94/94`;
- Review-03 regressions: `21/21`;
- Chrome browser matrix: `12/12`;
- dependency audit;
- tracked-file secret scan;
- two clean Windows builds and two clean Ubuntu/WSL builds;
- exact path/byte/SHA-256 dist manifest comparison.

## Self-review risks and controls

1. **Hand-written HTML perception parser.** It is intentionally bounded to generated repository HTML and fail-closed exact contracts. Hidden-state and entity cases are permanent regressions. A general browser DOM parser is not claimed.
2. **Public-claim semantics are policy patterns, not unrestricted natural-language inference.** Positive adaptive statements and known English/Russian absolute guarantees are regression-bound. Independent review should attempt additional paraphrases.
3. **Browser smoke is Chrome/CDP-based.** It covers viewport, keyboard, reduced motion, WebGL and no-JS contracts but is not a substitute for manual assistive-technology testing across every browser.
4. **Evidence package is external to the Git tree.** Its verifier binds every byte and semantically imports `subject.bundle`; the package itself is not a merge authorization.
5. **Production remains the prior deployed snapshot.** No deployment or production claim is made for Remediation-03 before independent acceptance of the exact final commit/tree.

## Residual limitations

- No independent acceptance of the final Remediation-03 snapshot exists yet.
- No screen-reader session with NVDA, JAWS or VoiceOver is claimed; semantic and keyboard checks are automated Chrome evidence.
- External link availability may change after evidence capture; canonical link structure and current response behavior are reviewed, not permanently guaranteed.
- Cross-platform reproducibility is limited to the recorded Windows and Ubuntu/WSL environments and exact toolchain versions.

## Disposition

Self-review verdict: `PASS_WITH_INDEPENDENT_REVIEW_REQUIRED`.

Release state after exact final evidence passes: `READY_FOR_INDEPENDENT_REVIEW`.

Merge and deployment remain prohibited until an independent reviewer accepts the exact final commit, parent, tree, build identities and immutable evidence package.
