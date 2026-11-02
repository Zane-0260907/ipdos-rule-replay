# Public source revision replay — results

**Outcome: passed in the stated counterfactual contract.** Thirty fixed adjacent first-parent transitions, four safe modes, 120 local traces; 0 false retained approvals, 0 incorrect new simulated effects, 0 partial effects, and 0 infrastructure failures. The standalone read-only audit passed all 10,053 checks across 120 result databases.

## Sample and acquisition

The cutoff is `2026-11-01T00:00:00Z`. The frozen main tip `47542999540c8f14323ea5ea147030a95bca87f2` was after the cutoff; its first parent is the eligible newest endpoint. `data/tip-eligibility-evidence.json` preserves sanitized fields from the initial API response. All 31 selected trees and their complete Git tree hashes were verified. All 102 unique source/license blobs (1,359,995 bytes) were fetched and their Git blob identities and byte SHA256 values checked. The selected file count is 68 in each tree, partitioned into 11 fixed source scopes by the frozen rule. Some selected files are repository Markdown such as templates; they are not all rendered documentation pages.

- Predecessor state: `3d6c5395324b0f7a8254bf8419921199c3e6d94e` (2026-09-01T18:15:29Z).
- Newest selected commit: `a4da55860a469b4e4453f7c3cb2553ce4e38d03f` (2026-10-31T01:34:34Z).
- Repository: [python/devguide](https://github.com/python/devguide).
- Immutable license source: [CC0-1.0 LICENSE](https://github.com/python/devguide/blob/a4da55860a469b4e4453f7c3cb2553ce4e38d03f/LICENSE).
- One initial TLS failure left 101/102 verified blobs; one bounded resume fetched the remaining blob. `data/acquisition-failure.json` remains in the package. No window, failed trial or zero-benefit transition was replaced.

## Protected contract and interpretation

The approved predicate concerns exact source path membership, file mode, Git blob identity and byte SHA256 within each bundle. All non-source objects are conservatively bound through a shared policy digest, so nine transitions invalidate every bundle. This protects the stated source contract only. It does not protect complete Sphinx rendering, includes, inter-page semantics, extensions or actual release output.

Every policy, authority, reader, editor, signoff and publication request is researcher generated. Both fictional signoffs refresh deterministically with a changed bundle digest. No assertion is made about the Python project's real review policy, CODEOWNERS, quorum, actual approvals, public releases, reviewers or human time. Fresh databases model adjacent transitions; these are not 120 independent real-world cases or a longitudinal approval deployment.

## Four safe validation methods

| Mode | Oracle-necessary review clauses | Requested review clauses | Extra review clauses | Retained clauses | False retained / incorrect effects |
|---|---:|---:|---:|---:|---:|
| whole | 123 | 330 | 207 | 0 | 0 / 0 |
| rows | 123 | 330 | 207 | 0 | 0 / 0 |
| full | 123 | 123 | 0 | 207 | 0 / 0 |
| incremental | 123 | 123 | 0 | 207 | 0 / 0 |

Full and incremental validation have the same precision: 123 necessary review clauses among 330 clause-transition opportunities. Both preserve 207 original synthetic approvals. Whole-revision and safe row/key validation with predicate table fences each require all 330 reviews. A changed synthetic signoff touches the shared signoff-table fence in the safe rows baseline; this explains its conservative result. No unsafe row-only baseline is included.

Nine transitions have **zero selective-review benefit** because the shared non-source binding changes. The fixed 11-bundle granularity and conservative shared-binding policy determine these counts; changing that counterfactual contract would change the workload proxy. No actual reviewer effort or time was measured.

## Descriptive cost observations

| Mode | Median validation (ms) | Min–max (ms) | Evaluated engine nodes | Reused engine nodes |
|---|---:|---:|---:|---:|
| whole | 1.670 | 1.483–3.699 | not materialized | not materialized |
| rows | 5.182 | 4.565–15.202 | not materialized | not materialized |
| full | 19.634 | 17.933–28.990 | 2190 | 0 |
| incremental | 3.812 | 3.174–11.466 | 257 | 1933 |

These are one observation per mode/transition on Node 24.19.0 / Windows, in the fixed order whole, rows, full, incremental, in one process. They include no warmup, randomization, repetition or uncertainty estimate. They are descriptive local costs, not a latency benchmark or a general speedup claim. Whole-version validation performs a cheap freshness comparison and can have a lower validation cost while requesting a larger review scope. Node evaluation totals are directly instrumented work counters, with incremental evaluating 257 nodes and reusing 1,933 of the 2,190 node opportunities evaluated by full mode.

## Natural coverage and absent boundaries

The fixed history contains 24 source-relevant transitions, 9 shared-binding transitions, 1 source path addition, 1 source path deletion and 32 source path modifications. The categories overlap: three transitions change both source and shared binding. Path moves are always interpreted as deletion plus addition, without rename inference.

The sole addition/deletion is in commit `2b19e7691962e05f0f212a5303f3b4c5cde31df2`: `development-tools/clang.rst` is deleted and `development-tools/sanitizers.rst` is added. `conf.py` changes in the same commit, requiring all 11 reviews. This cannot establish isolated selective benefit for source membership changes.

Exact blob/absence ABA returns observed after collapsing unchanged states: **0**. Natural signoff, permission, reader-audience, transactional-failure and concurrency events are not available in these repository snapshots. No synthetic fault/phantom/ABA cases were inserted into this history's denominator.

## Independent evidence and integrity

The Python checker independently rebuilds all Git trees and the complete source partitions/digests, without importing the candidate mapper. The original document oracle completely materializes values and version/member witnesses without importing the production interpreter. The standalone audit then opens every SQLite result read-only and reconstructs each snapshot/receipt revision from the full authoritative journal; it rechecks complete values, token catalogs, original approvals, effect values and receipt identity. Audit code does not import the candidate mapping or production core.

All 9 copied core files match their original SHA256 before and after execution, and the source directory also retains the same hashes. The original project, browser and recording were not modified. Parent-supplied Library IDs remain provenance references; this run used the explicit local source path and does not claim byte identity with unmaterialized Library archives.

## Commit-level results

Counts below are per commit, with 11 clauses per mode. `required` lists whole / rows / full / incremental. Every listed commit has zero safety mismatches in all four traces.

| # | Commit | A / D / M paths | Changed source scopes | Shared binding changed | Necessary | Required W / R / F / I |
|---:|---|---|---|:---:|---:|---|
| 1 | `9d481ef402e0` | 0 / 0 / 1 | none | yes | 11 | 11 / 11 / 11 / 11 |
| 2 | `d253c4727876` | 0 / 0 / 2 | none | yes | 11 | 11 / 11 / 11 / 11 |
| 3 | `8b8b1f2db753` | 0 / 0 / 1 | development-tools | no | 1 | 11 / 11 / 1 / 1 |
| 4 | `c05d21dd73f1` | 0 / 0 / 1 | documentation | no | 1 | 11 / 11 / 1 / 1 |
| 5 | `f4a4d46c6416` | 0 / 0 / 2 | getting-started, security | no | 2 | 11 / 11 / 2 / 2 |
| 6 | `781e8d888593` | 0 / 0 / 1 | core-team | no | 1 | 11 / 11 / 1 / 1 |
| 7 | `74429f85b397` | 0 / 0 / 1 | developer-workflow | no | 1 | 11 / 11 / 1 / 1 |
| 8 | `859d7b434737` | 0 / 0 / 2 | security | yes | 11 | 11 / 11 / 11 / 11 |
| 9 | `61ea5f9f9e70` | 0 / 0 / 1 | documentation | no | 1 | 11 / 11 / 1 / 1 |
| 10 | `f437be5c12b0` | 0 / 0 / 1 | none | yes | 11 | 11 / 11 / 11 / 11 |
| 11 | `d9adc4f23cfa` | 0 / 0 / 1 | development-tools | no | 1 | 11 / 11 / 1 / 1 |
| 12 | `2439c5ff4529` | 0 / 0 / 4 | developer-workflow, getting-started | yes | 11 | 11 / 11 / 11 / 11 |
| 13 | `734d75078e39` | 0 / 0 / 1 | none | yes | 11 | 11 / 11 / 11 / 11 |
| 14 | `b89ba85ad4d3` | 0 / 0 / 1 | development-tools | no | 1 | 11 / 11 / 1 / 1 |
| 15 | `d773e39505bf` | 0 / 0 / 1 | none | yes | 11 | 11 / 11 / 11 / 11 |
| 16 | `8faf50fa3ab4` | 0 / 0 / 1 | developer-workflow | no | 1 | 11 / 11 / 1 / 1 |
| 17 | `2b19e7691962` | 1 / 1 / 3 | @root, development-tools | yes | 11 | 11 / 11 / 11 / 11 |
| 18 | `60dd0a104e6a` | 0 / 0 / 1 | getting-started | no | 1 | 11 / 11 / 1 / 1 |
| 19 | `ff9af798f7c2` | 0 / 0 / 1 | documentation | no | 1 | 11 / 11 / 1 / 1 |
| 20 | `6c4ebec4c9a8` | 0 / 0 / 1 | documentation | no | 1 | 11 / 11 / 1 / 1 |
| 21 | `03909b3ef7ec` | 0 / 0 / 2 | documentation | no | 1 | 11 / 11 / 1 / 1 |
| 22 | `dce8cdf564da` | 0 / 0 / 1 | getting-started | no | 1 | 11 / 11 / 1 / 1 |
| 23 | `da26e03ae075` | 0 / 0 / 1 | testing | no | 1 | 11 / 11 / 1 / 1 |
| 24 | `ef8926425324` | 0 / 0 / 1 | triage | no | 1 | 11 / 11 / 1 / 1 |
| 25 | `1d71f45bf7e1` | 0 / 0 / 4 | getting-started, triage | no | 2 | 11 / 11 / 2 / 2 |
| 26 | `90ceaa34acac` | 0 / 0 / 1 | triage | no | 1 | 11 / 11 / 1 / 1 |
| 27 | `dabfefbda859` | 0 / 0 / 1 | development-tools | no | 1 | 11 / 11 / 1 / 1 |
| 28 | `859e50e20c31` | 0 / 0 / 2 | core-team, triage | no | 2 | 11 / 11 / 2 / 2 |
| 29 | `d0046d2d3f26` | 0 / 0 / 1 | getting-started | no | 1 | 11 / 11 / 1 / 1 |
| 30 | `a4da55860a46` | 0 / 0 / 1 | none | yes | 11 | 11 / 11 / 11 / 11 |

`raw.jsonl` and each `step.json` preserve full SHA/time/path changes, expected/actual values and witness hashes, all method metrics, effect attempts, explicit synthetic renewals and retries. Full per-clause audit comparisons are in the audit's `items.jsonl`; all 120 SQLite databases are included.

No blockers remain for this bounded replay. It supports one real-history input validation case under a preregistered counterfactual source contract. Real approval semantics, production release deployment, human effort and rendering semantics remain untested.
