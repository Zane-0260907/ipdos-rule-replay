# IPDOS: Reproducible Regression Checks for Decision Rules

## Mechanism and provenance

The newly implemented workbench applies the existing production `RulesRegistryService` to a small frozen synthetic scenario catalog. The regular sales, traffic and menu API methods and the replay service execute the same private arrays of `RuleDefinition.evaluate` functions through `traceRules`. There is no duplicate evaluator or table of precomputed actual results. Explicit expected warning IDs are a separate authored oracle.

The public starting point is `Juggle-ops/dietsystem` commit `a52137f904f78eaebd546d9808503b26e3b10549`. `test-support/baseline-rules-registry.ts.txt` is its exact registry source, with SHA-256 `f3b8bc988ed6687f9a9e95d29080dead73e2eceb01082b4dc12489a60205656a`. `scripts/baseline-compatibility.ts` verifies that checksum, transpiles that actual baseline source and compares the three normal API rule outputs against the changed implementation on all ten scenarios. It works without a Git checkout. Source-byte hashes in the generated evidence and delivery manifest identify the changed files; the literal `engineVersion` is a declared format/implementation version, not an automatic binary fingerprint or security signature.

All inputs use invented `SYNTHETIC-001`, fixed evaluation time `2026-10-21T12:00:00.000Z`, fixed generated-at timestamps and fixed values. Neither replay construction nor evaluation consults the wall clock, random values, a forecast model, or a database. The original backend's illustrative MAPE/RMSE fields are unrelated to these results and are labelled synthetic constants.

## Scenarios and expected values

The exact inputs and explicit ID-set oracles live in `src/replay/replay-fixtures.ts`. Their source is the existing registry's comparisons, not observations from stores or generated predictions. A missing or unexpected warning makes the assertion fail.

| Scenario ID      | Frozen input relevant to its contract                             | Expected warning IDs under `registry-v1` and source comparison                                                                       |
| ---------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `traffic-eight`  | 8 points, all 100 customers; age 4 h                              | Empty: point count >=8; no variation; age <=12                                                                                       |
| `traffic-three`  | 3 points, all 100; age 4 h                                        | `predictions.traffic.low-resolution`: count <8                                                                                       |
| `traffic-age-12` | 8 flat points; generated 00:00Z                                   | Empty: age exactly 12 h is accepted by `<=12`                                                                                        |
| `traffic-age-13` | 8 flat points; generated previous day 23:00Z                      | `predictions.traffic.snapshot-staleness`: age >12 h                                                                                  |
| `sales-clean`    | demand 100; gap 0; 0/5 critical; age 4 h                          | Empty: no shortage, density or stale warning                                                                                         |
| `sales-gap-15`   | demand 100; gap 15; 1/5 critical; age 4 h                         | `predictions.sales.critical-density`: ratio 0.2 satisfies >=0.2; gap equals max(10,100\*0.15), so no escalation                      |
| `sales-gap-16`   | demand 100; gap 16; 1/5 critical; age 4 h                         | `predictions.sales.shortage-escalation` and `predictions.sales.critical-density`: gap >15 and ratio >=0.2                            |
| `sales-age-25`   | gap 0; 0/5 critical; generated previous day 11:00Z                | `predictions.sales.snapshot-staleness`: age >24 h                                                                                    |
| `menu-clean`     | 5 scored items; promotion restock 0; suppress empty               | Empty: no restock, conflict or narrow-coverage warning                                                                               |
| `menu-conflict`  | 5 scored items; synthetic-tofu promoted and suppressed; restock 5 | `predictions.menu.restock-alert` and `predictions.menu.conflicting-signals`: positive restock and exact ingredient-name intersection |

Each scenario evaluates all three rules in its selected group. That is 30 checks per policy and nine distinct rule definitions. Seven definitions trigger somewhere in this suite; variance-spike and narrow-coverage remain clear. These ten scenarios are not exhaustive boundary coverage, field data or a benchmark of fault-detection rates.

## Policies and the injected change

Both profiles are deeply frozen and checked in. `policyDigest` hashes the complete profile object, including its ID, description and parameters, using recursively sorted object keys and preserved array order.

| Parameter            | `registry-v1` | `sparse-v2-seeded-regression` |
| -------------------- | ------------- | ----------------------------- |
| `salesMaxAgeHours`   | 24            | 24                            |
| `trafficMaxAgeHours` | 12            | 12                            |
| `minTrafficPoints`   | 8             | 3                             |
| `shortageRatio`      | 0.15          | 0.15                          |
| `shortageFloor`      | 10            | 10                            |

The exact affected rule is `predictions.traffic.low-resolution`. It returns clear when `points.length >= minTrafficPoints`. For three points, changing 8 to 3 removes the baseline warning. The unchanged explicit oracle catches that missing warning. This is a deliberately injected executable policy regression, not an observed incident. Normal business API calls continue to use `DEFAULT_FORECAST_RULE_POLICY`.

## Trace, comparison and export schema

Each trace is an ordered array of `{ ruleId, outcome: "triggered"|"clear", hit: RuleHit|null }`. A `RuleHit` carries `id`, `domain`, `severity`, `summary`, `detail`, `tags`, `evaluatedAt`, `storeId` and optional `recommendations`; the trace therefore includes all evaluated rules, including non-hits.

`compare` returns `{ baseline: ReplayBundle, candidate: ReplayBundle, delta }`. `delta` contains full parameter changes, warning-ID `added` and `removed` sets, and `changed` IDs whose hits exist in both runs but whose **entire RuleHit objects** differ canonically (including details, severity, text and timestamps). `changedOutcome` means any of those three output differences occurred. Input/policy identities can differ even where the warning output remains unchanged. Assertions separately check only exact warning-ID sets, not every hit field or a downstream business decision.

A replay bundle has `schemaVersion="ipdos-rule-replay/v1"`, `engineVersion="registry-replay/1"`, `dataOrigin="synthetic"`, the complete `scenario` and `policy`, `snapshotDigest`, `policyDigest`, `trace`, `actualRuleIds`, `assertion={expectedRuleIds,missing,unexpected,passed}`, and `contentDigest`. The content digest covers the whole result except the digest itself. The JSON is generated during actual execution; no persisted audit service is claimed.

`npm run replay:verify -- export.json` is **same-implementation re-execution in another process**, not an independent oracle. It resolves the bundled scenario/profile against the checked-in catalog, invokes `ReplayService.run` and the same production registry, then compares the entire recomputed bundle canonically. It accepts only this version's built-in synthetic catalog. Tests deliberately replace the registry evaluator and alter the clock, policy parameter, policy ID and hit severity to confirm verification fails. Hashes identify content and are not signatures or tamper-proof audit guarantees.

## Actual results and interpretation

The authoritative generated files are `artifacts/test-evidence.json`, `replay-evidence.json`, `baseline-compatibility.json` and `ui-evidence.json`. They supersede numbers in earlier progress reports if the final test count changes after audit tests. The fixed scenario suite remains: 10/10 reference contracts, 9/10 candidate contracts, exactly one changed scenario, and 30 rule evaluations per policy. One hundred repeated complete suite executions are canonical-byte-identical in the tested environment. A separate-process export replay succeeds while faithfully preserving the candidate contract failure.

`artifacts/replay-desktop.png` is the actual Chrome-rendered original PNG of the new local interface; `replay-mobile.png` is the 390px layout. They are not reconstructed paper mockups. UI evidence records the actual browser version and interaction checks. Database evidence is setup validation on an isolated synthetic PostgreSQL database, not decision-quality evidence.

These observations support a bounded demonstration of reproducible rule regression checks. They do not establish novelty over existing testing tools, forecasting accuracy, optimization performance, causal effects, store benefits, historical-fault detection or production deployment readiness. The original Apache-2.0 LICENSE and attributions are retained; package metadata follows the maintainer-confirmed license.
