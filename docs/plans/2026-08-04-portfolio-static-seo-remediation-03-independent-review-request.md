# Independent Review Request — WEBGL Portfolio Remediation-03

## Requested role

Act as an independent evidence reviewer. Do not modify the candidate repository, evidence package, branch, pull request or deployment state.

This review is not merge authority and is not deployment authority. Return one verdict for the exact snapshot: `PASS`, `FAIL` or `BLOCKED`.

## Subject

Campaign: `WEBGL-PORTFOLIO-REMEDIATION-03-AND-RELEASE-CANDIDATE`

Repository: `nonamezisntreal/webgl-portfolio`

Branch: `codex/portfolio-static-seo-remediation-03`

The exact commit, parent and tree must be taken from the sealed evidence `metadata.json` and must match the semantic contents of `subject.bundle`. Do not review a moving branch head by name alone.

Evidence package name:

`CPH-WEBGL-PORTFOLIO-STATIC-SEO-REMEDIATION-03-EVIDENCE`

## Mandatory preflight

1. Record the package path, total file inventory and package filesystem identity available to the reviewer.
2. Run the included verifier against the unmodified package and a repository containing the declared commit:

```text
node verify-remediation-03-evidence.mjs <EVIDENCE_ROOT> <REPOSITORY_ROOT>
```

3. Require verifier exit zero and `status: PASS`.
4. Independently run `git bundle verify`, import `subject.bundle` into a new empty bare repository and recompute commit, parent and tree.
5. Confirm that no package path uses backslashes, traversal, non-NFC spelling, duplicate raw names or case-insensitive collisions.
6. Confirm every declared byte length and SHA-256 without relying only on the included verifier.
7. Confirm `verification-result.json` has exact keys, exact verifier identity, `status: PASS` and the same repository/branch/commit/parent/tree binding as the final manifest. It must not contain a stale or self-referential manifest hash.
8. Confirm no package file was written after the final manifest was generated and successfully verified.
9. If any identity is unavailable or differs, return `BLOCKED` or `FAIL` before product acceptance.

## Required review domains

### Review-03 bypass closure

Re-run every mutation in the finding ledger, including:

- unexpected JSON-LD URL fields and nested structures;
- hidden-content support for JSON-LD;
- protocol-relative and encoded asset references;
- HTML/entity/JSON/JavaScript claim obfuscation;
- English and Russian semantic guarantees;
- Unicode-equivalent duplicates and duplicate JSON keys;
- `DOCTYPE`, entities, duplicate `<loc>` and partial XML;
- Windows case drift and invalid `srcset`;
- valid unrelated Git bundle substitution with updated manifest hashes.

A negative test passes only when the expected fail-closed policy diagnostic is present. Syntax or setup failures are not acceptance evidence.

### Product review

Independently inspect:

- RU/EN canonical route switching with and without JavaScript;
- deep routes, 404 recovery and back/forward behavior;
- keyboard skip navigation, focus indicators and modal focus trap;
- accessible names, landmarks, heading hierarchy, language attributes and hidden-content behavior;
- desktop, tablet, mobile, landscape and short-height layouts;
- reduced motion, WebGL-disabled fallback, context loss/restoration and background-tab lifecycle;
- content parity, public claims, contact/project/service/article links and GitHub Pages base path.

### Build and dependency evidence

- repeat `bun install --frozen-lockfile`;
- repeat the full build and validator suite;
- repeat `94/94` inherited adversarial tests and `21/21` Review-03 tests;
- inspect the dependency graph and `bun audit --json` result;
- require exactly 37 generated artifacts in each of the two Windows and two Ubuntu/WSL builds;
- compare all four dist manifests by normalized path, byte length and SHA-256, requiring a `37/37` exact match;
- investigate any difference rather than accepting count-only parity.

### Evidence corruption resistance

Repeat at least:

- one-byte corruption;
- wrong commit/parent/tree;
- valid unrelated bundle replacement with updated manifest hash;
- duplicate JSON key;
- backslash/path traversal/case collision;
- undeclared and missing payload files.

## Required output

Return:

```text
REVIEW_VERDICT:
REVIEWED_COMMIT:
REVIEWED_PARENT:
REVIEWED_TREE:
EVIDENCE_MANIFEST_SHA256:
BUNDLE_SEMANTIC_BINDING:
REVIEW_03_MUTATIONS:
ORIGINAL_ADVERSARIAL_SUITE:
CROSS_PLATFORM_BUILD_MATCH:
BROWSER_AND_ACCESSIBILITY:
DEPENDENCY_AUDIT:
SECRET_SCAN:
FINDINGS:
LIMITATIONS:
MERGE_RECOMMENDATION:
DEPLOYMENT_RECOMMENDATION:
```

A `PASS` may recommend moving the draft pull request to ready and authorizing merge/deployment in a separate owner-controlled action. The independent reviewer must not merge or deploy as part of this review.
