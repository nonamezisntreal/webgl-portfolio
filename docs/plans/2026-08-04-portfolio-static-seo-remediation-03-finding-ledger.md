# WEBGL Portfolio Remediation-03 Finding Ledger

Campaign: `WEBGL-PORTFOLIO-REMEDIATION-03-AND-RELEASE-CANDIDATE`

Candidate under review: `f4093c5443bfb5e21f2be225f54e23c422dcf415` / tree `cf04caab266f015a14066ec95e3415995789e8e9`.

The ledger consolidates the independent Review-03 artifacts without modifying their worktree. A `RESOLVED` disposition means the root cause has a fail-closed implementation and a permanent targeted regression in Remediation-03. `CONFIRMED-PASS` means the independent mutation already produced the expected rejection and remains covered by the inherited suite.

## Confirmed bypass findings

| Finding ID | Source evidence | Affected validator | Mutation | Expected result | Actual Review-03 result | Severity | Root cause | Required fix | Regression test | Disposition |
|---|---|---|---|---|---|---|---|---|---|---|
| R03-JSONLD-EXTRA-URL | `review-artifacts/independent-mutations.json` | `validate-dist.mjs` JSON-LD | Add attacker `Service.sameAs` | Reject unexpected URL-bearing field | Accepted | High | Type validation checked required fields but not an exact field contract | Exact allowed keys per Schema.org type and nested entity | `R03-JSONLD-EXTRA-URL` | RESOLVED |
| R03-JSONLD-HIDDEN-FAQ | same | visible-content/FAQ consistency | Put altered FAQ proof only in `aria-hidden=true` content | Reject as not visibly supported | Accepted | High | Text extraction stripped tags but retained hidden text | Perceived-text parser excluding hidden, inert, metadata and CSS-hidden subtrees | `R03-JSONLD-HIDDEN-FAQ` | RESOLVED |
| R03-ASSET-PROTOCOL-RELATIVE | same | internal asset validation | `//attacker.example/site.css` | Reject external protocol-relative reference | Accepted | High | URL resolution treated external assets as out-of-scope | Explicit protocol-relative rejection plus HTTPS/origin/allowlist policy | `R03-ASSET-PROTOCOL-RELATIVE` | RESOLVED |
| R03-CLAIM-SPLIT-MARKUP | same | public claims | Split forbidden guarantee across HTML nodes | Reject normalized visible claim | Accepted | High | Raw-source regex did not parse visible text | Parse HTML, decode entities and normalize node boundaries | `R03-CLAIM-SPLIT-MARKUP` | RESOLVED |
| R03-CLAIM-ALWAYS-SMOOTH | same | public claims | `Always smooth on every device` without FPS token | Reject absolute all-device guarantee | Accepted | Medium | Rules recognized FPS forms but not equivalent semantic guarantees | Bounded semantic English patterns with positive adaptive controls | `R03-CLAIM-ALWAYS-SMOOTH`, `R03-POSITIVE-ADAPTIVE-EN` | RESOLVED |
| R03-CLAIM-RU-ALWAYS-SMOOTH | same | public claims | Russian all-device smoothness guarantee | Reject absolute guarantee | Accepted | Medium | Russian rules lacked semantic variants and Unicode inflection | Unicode-aware Russian semantic rules with positive adaptive control | `R03-CLAIM-RU-ALWAYS-SMOOTH`, `R03-POSITIVE-ADAPTIVE-RU` | RESOLVED |
| R03-SITEMAP-DOCTYPE | same | sitemap XML | Add `DOCTYPE` and external entity | Reject before parsing | Accepted | Critical | Parser validation did not prohibit DTD/entity authority | Lexical XML preflight, entity processing disabled, exact root contract | `R03-SITEMAP-DOCTYPE` | RESOLVED |
| EXT-J-UNICODE-DUP-FAQ | `review-artifacts/extended-independent.json` | JSON-LD FAQ | Duplicate questions using composed/decomposed Unicode | Reject duplicate semantic question | Accepted | Medium | Duplicate key used case/space normalization only | NFC/NFKC normalization before duplicate comparison | `EXT-J-UNICODE-DUP-FAQ` | RESOLVED |
| EXT-J-NESTED-ARRAY | same | JSON-LD cardinality | Hide a supported entity in a nested top-level array | Reject nested array | Accepted | High | Recursive flattening converted unsupported nesting into valid peers | Only object or one flat nonempty object array accepted | `EXT-J-NESTED-ARRAY` | RESOLVED |
| EXT-J-DUPLICATE-KEY | remediation extension of Review-03 duplicate-key concern | JSON parser | Contradictory duplicate JSON key | Reject before object validation | Native `JSON.parse` would retain last value | High | Runtime parser discarded duplicate-key evidence | Strict lexical JSON scanner with NFC/case-equivalent key collision rejection | `EXT-J-DUPLICATE-KEY` | RESOLVED |
| EXT-S-DUP-LOC-NODE | `extended-independent.json` | sitemap | Two `<loc>` nodes in one URL entry | Reject with duplicate-loc diagnostic | Rejected for unrelated downstream type | Medium | Parser converted duplicates to an array and failed incidentally | Require one nonempty scalar `<loc>` | `EXT-S-DUP-LOC-NODE` | RESOLVED |
| EXT-S-PARTIAL-XML | same | sitemap | Append a second root after `</urlset>` | Reject partial/ambiguous XML | Accepted | High | Parser result was consumed without exact document-root authority | Exact whole-document envelope and exact document keys | `EXT-S-PARTIAL-XML` | RESOLVED |
| EXT-A-CASE-DRIFT-WINDOWS | same | asset paths | Change generated path casing | Reject cross-platform mismatch | Accepted on Windows | High | Windows filesystem lookup is case-insensitive | Segment-by-segment exact-case filesystem resolution | `EXT-A-CASE-DRIFT-WINDOWS` | RESOLVED |
| EXT-A-BAD-SRCSET-DESCRIPTOR | same | HTML assets | Invalid `1q` descriptor | Reject malformed `srcset` | Accepted | Medium | Parser extracted only the URL token | Strict `w`/positive `x` descriptor grammar and duplicate descriptor check | `EXT-A-BAD-SRCSET-DESCRIPTOR` | RESOLVED |
| EXT-C-PUNCT-NEWLINE | same | public claims | Split frame-rate wording with punctuation/newline | Reject normalized claim | Accepted | Medium | Regex expected contiguous raw whitespace | NFKC normalization and punctuation-aware semantic pattern | `EXT-C-PUNCT-NEWLINE` | RESOLVED |
| EXT-C-HTML-ENTITY | same | public claims | Hide separator with HTML entity | Reject decoded claim | Accepted | Medium | Entity-decoded surface was missing | Decode numeric/named HTML entities before matching | `EXT-C-HTML-ENTITY` | RESOLVED |
| EXT-C-JSON-ESCAPE | same | generated public JSON | Encode forbidden claim with `\u` escapes | Reject decoded string value | Accepted | High | JSON file scanned as raw bytes | Strict parse and recursive string extraction | `EXT-C-JSON-ESCAPE` | RESOLVED |
| EXT-C-JS-CONCAT | same | generated JavaScript | Concatenate string fragments into forbidden claim | Reject reconstructed public string | Accepted | High | Scanner did not decode or join literals | Decode JavaScript literals and adjacent `+` concatenations | `EXT-C-JS-CONCAT` | RESOLVED |
| EXT-C-RU-INFLECTION | same | public claims | Russian inflected guarantee form | Reject | Accepted | Medium | `\w` was ASCII-only under JavaScript regex semantics | Unicode letter/mark suffix matching | `EXT-C-RU-INFLECTION` | RESOLVED |
| EV-INDEPENDENT-UNBOUND-BUNDLE | `review-artifacts/independent-evidence-mutations.json` | evidence verifier | Replace `subject.bundle`, update byte/hash manifest, retain claimed Git identities | Reject semantic mismatch | Accepted with exit 0 | Critical | Evidence verifier bound bytes only, not Git object semantics | Verify bundle, import into isolated bare repository, recompute commit/parent/tree | evidence mutation `EV-R03-VALID-OTHER-BUNDLE` | RESOLVED IN NEW EVIDENCE VERIFIER |
| EV-INDEPENDENT-BACKSLASH | same | evidence path verifier | Add `dir\\file.txt` | Reject explicitly as forbidden separator | Rejected only as undeclared normalized entry | Low | Normalization occurred before lexical path policy | Reject backslashes before normalization | evidence mutation `EV-R03-BACKSLASH-PATH` | RESOLVED IN NEW EVIDENCE VERIFIER |

## Product review findings

| Finding ID | Source evidence | Affected component | Mutation / scenario | Expected | Actual before fix | Severity | Root cause | Required fix | Regression | Disposition |
|---|---|---|---|---|---|---|---|---|---|---|
| PROD-LANG-01 | source review + browser | homepage language control | Activate RU/EN control or disable JS | Navigate to canonical localized page | Button had no handler; no-JS switch impossible | High | In-place control survived after localization moved to static routes | Direct normal link to `/webgl-portfolio/en/` | browser desktop + no-JS | RESOLVED |
| PROD-A11Y-01 | source review + keyboard browser | navigation | Keyboard entry | First focus offers skip navigation | No skip link | Medium | Missing bypass block | Visible-on-focus skip link to focusable main | `BROWSER-KEYBOARD-DIALOG` | RESOLVED |
| PROD-A11Y-02 | source review + keyboard browser | global controls | Keyboard focus | Consistent visible outline | Only project/input-specific styling | High | No global `:focus-visible` token | 3px accent outline and offset | browser computed-style assertion | RESOLVED |
| PROD-A11Y-03 | source review + browser | case dialog | Open, Tab, Escape | Named modal, trapped focus, inert background, restored focus | Escape/restore only | High | Partial dialog lifecycle | `aria-labelledby`, inert roots, Tab trap, localized close label | `BROWSER-KEYBOARD-DIALOG` | RESOLVED |
| PROD-A11Y-04 | source review | contact form | Submit status | Screen reader announcement | Hidden paragraph lacked live semantics | Medium | Missing status role | `role=status`, `aria-live=polite`, atomic update | browser contract | RESOLVED |
| PROD-NAV-01 | browser keyboard | smooth hash navigation | Activate skip/hash link | Hash/history and focus semantics retained | Handler prevented default without updating URL/focus | Medium | Smooth scroll replaced native navigation incompletely | Push hash state and focus skip target | browser keyboard/history | RESOLVED |
| PROD-WEBGL-01 | source review | `Experience` | pagehide/context loss | Stop, recover or dispose resources deterministically | Anonymous listeners and no disposal/recovery | High | Scene lacked lifecycle owner | Bound listeners, context handlers, scene/material/composer/renderer disposal | browser context + source contract | RESOLVED |
| PROD-WEBGL-02 | source review + viewport browser | adaptive quality | low-power/coarse/save-data/low FPS | Reduce cost without absolute performance claim | Width-only low-power decision and fixed DPR | Medium | Static quality heuristic | capability hints, bounded DPR scale and hysteresis | mobile/landscape/browser + build | RESOLVED |
| PROD-UX-01 | viewport browser | header language target | touch activation | At least 44 CSS px | Approximately 28 px | Medium | Desktop-sized pill reused on touch | minimum 44px option sizing | tablet/mobile/landscape assertion | RESOLVED |
| PROD-UX-02 | viewport browser | small-height hero | 844×390 landscape | Content remains readable without horizontal overflow | Oversized vertical composition | Low | Width-only responsive rules | bounded small-height media rule | `BROWSER-LANDSCAPE` | RESOLVED |

## Confirmed-pass independent tests

The following Review-03 tests produced the required fail-closed result on the prior candidate and remain covered by the inherited `94/94` adversarial suite or structural workflow/evidence policy. Their root cause is `none observed`; required fix is `none beyond regression preservation`; disposition is `CONFIRMED-PASS`.

### JSON-LD, routes, sitemap, assets and claims

`EXT-J-REORDERED-DUP`, `EXT-J-INVALID-DATE`, `EXT-J-EXTRA-ARRAY-OBJECT`, `EXT-J-EMPTY-SAMEAS`, `EXT-J-GRAPH`, `EXT-J-USERINFO`, `EXT-S-NAMESPACE`, `EXT-A-ENCODED-TRAVERSAL`, `EXT-A-BASE-PREFIX`, `EXT-R-DUP-CASE`, `EXT-R-MULTI-SITEMAP`, `EXT-C-LOCKED-FRAME-RATE`.

Expected result for each: nonzero validator exit with the targeted policy diagnostic. Actual Review-03 result: pass. Severity if regressed: Medium to High according to the affected authority. Regression: inherited adversarial cases plus Remediation-03 exact path/field contracts.

### Original bypass regressions

`ORIG-JSON-EMPTY`, `ORIG-JSON-ATTACKER-URL`, `ORIG-JSON-UNRELATED-IDENTITY`, `ORIG-JSON-INVALID-AMONG-VALID`, `ORIG-SITEMAP-DUP`, `ORIG-SITEMAP-EXTRA`, `ORIG-ROBOTS-DISALLOW`, `ORIG-ASSET-CSS`, `ORIG-ASSET-JS`, `ORIG-CLAIM-README`, `ORIG-CLAIM-EN-WORD`, `ORIG-CLAIM-RU-WORD`, `ORIG-CLAIM-ALL-DEVICE`.

Expected result: targeted rejection; actual result: pass for all 13; disposition: `CONFIRMED-PASS` and retained in `test:adversarial`.

### Workflow tests

Baseline and mutation inventory: `WF-BASE`, `WF-EXTRA-CONTENTS`, `WF-EXTRA-PAGES`, `WF-UNGUARDED-DEPLOY`, `WF-UNSAFE-PR`, `WF-MERGE-PERMS`, `WF-MULTILINE-PUSH`, `WF-SHELL-INDIRECTION`, `WF-EXTRA-EXTENSION`, `WF-ARTIFACT-SUBSTITUTION`, `WF-RENAMED-VALIDATION`, `WF-UNEXPECTED-ACTION`, `WF-BASELINE`, `WF-EXTRA-CONTENTS-WRITE`, `WF-EXTRA-PAGES-OIDC`, `WF-MULTILINE-GIT-PUSH`, `WF-DUPLICATE-PERMISSIONS`, `WF-BROAD-DEPLOY-CONDITION`, `WF-RENAMED-VALIDATION-COMMAND`, `WF-EXTRA-MIXED-CASE-FILE`.

Expected result: exact baseline passes; every policy mutation fails for its intended reason. Actual Review-03 result: pass. Affected validator: `validate-workflow-policy.mjs`. Disposition: `CONFIRMED-PASS`; all workflow policy checks run in every build.

### Prior evidence tests

`EV-INDEPENDENT-WRONG-COMMIT`, `EV-INDEPENDENT-WRONG-PARENT`, `EV-INDEPENDENT-WRONG-TREE`, `EV-INDEPENDENT-DUPLICATE-RAW`, and `EV-INDEPENDENT-CASE-COLLISION` rejected as expected. They are retained and strengthened in the Remediation-03 evidence mutation suite. `EV-INDEPENDENT-UNBOUND-BUNDLE` and `EV-INDEPENDENT-BACKSLASH` are separately resolved above.

## Release disposition

All confirmed validator and product findings are closed in code and permanent regression coverage. The release candidate remains in `READY_FOR_INDEPENDENT_REVIEW`; no merge or deployment is authorized until an independent reviewer accepts the exact final commit/tree and immutable evidence package.
