# Bounded capability evaluation

The final shared core passed both frozen synthetic workflow matrices and independent per-item historical replay checks. This is a local system-capability result, not a user study, production failure rate or new concurrency-control algorithm. No numeric target score is asserted.

## Functional comparison

| Workflow | Mode | Traces | Unsafe retained clauses | Incorrect new commits | Partial states | Extra review decisions | Infrastructure errors |
|---|---|---:|---:|---:|---:|---:|---:|
| procurement | whole | 148 | 0 | 0 | 0 | 908 | 0 |
| procurement | rows | 148 | 0 | 0 | 0 | 360 | 0 |
| procurement | full | 148 | 0 | 0 | 0 | 0 | 0 |
| procurement | incremental | 148 | 0 | 0 | 0 | 0 | 0 |
| document | whole | 69 | 0 | 0 | 0 | 42 | 0 |
| document | rows | 69 | 0 | 0 | 0 | 18 | 0 |
| document | full | 69 | 0 | 0 | 0 | 0 | 0 |
| document | incremental | 69 | 0 | 0 | 0 | 0 | 0 |

Procurement: 44 scenarios 脳 4 modes 脳 3 repeats at 3 lines, plus 8 cases 脳 4 modes at 30 and 120 lines = 592 traces (148 per mode). Document release: 23 scenarios 脳 4 modes 脳 3 repeats = 276 traces (69 per mode). All mode comparisons use their workflow鈥檚 same protected-evidence contract. Repetitions and scale points are not independent real-world scenarios. Safe row mode includes predicate table fences and key absence/generation checks; no weak commit mode is in the default app.

Full and incremental modes required the same review scope. Whole revision binding and row/fence binding rejected some still-valid requests conservatively. Changed protected fields, membership or authority require review even if final numeric decisions are equal. Explicit repair preserves every head left unselected; selected retained clauses may be explicitly renewed as a new approval, as detailed in CONTRACT_IMPLEMENTATION_NOTES.md.

## Independent semantic replay

Procurement replay checked every one of 9,366 saved approval clauses and 6,132 saved receipt decisions across 592 final-source databases. Document replay checked 747 approvals and 336 receipt decisions across 276 databases. All compared values, protected-token digests, original snapshot links and per-draft effect-table counts matched. Each check鈥檚 actual and expected data is preserved in items.jsonl and CSV, not just a pass total.

The manual oracles independently materialize full facts and history without importing the interpreter, predicate filter or dirty-index selector. Replay at each reviewed/committed revision reconstructs facts from the authoritative journal rather than trusting candidate snapshots. This still tests a declared finite contract; it does not prove that an arbitrary application declared every decision-relevant fact.

## Validation cost

Separate cost experiment: 48 cells, 1,440 measured samples and 240 warmups. Scales 3/30/120, four mutation patterns, four modes, five warmups and thirty observations per cell. Each cell uses a fresh SQLite file. Measured validation includes BEGIN IMMEDIATE, direct service validation and transaction end, but excludes HTTP, browser rendering and the oracle. Capture/review/complete commit costs are separately retained.

| Lines | Pattern | Full median ms | Incremental median ms | Full / incremental |
|---:|---|---:|---:|---:|
| 3 | unchanged | 1.896 | 0.680 | 2.79 |
| 3 | unrelated_store | 1.885 | 0.736 | 2.56 |
| 3 | related_stock | 2.107 | 0.975 | 2.16 |
| 3 | shared_budget_price | 2.010 | 1.201 | 1.67 |
| 30 | unchanged | 17.900 | 4.593 | 3.90 |
| 30 | unrelated_store | 18.039 | 4.603 | 3.92 |
| 30 | related_stock | 17.281 | 4.901 | 3.53 |
| 30 | shared_budget_price | 17.631 | 12.566 | 1.40 |
| 120 | unchanged | 151.546 | 38.034 | 3.98 |
| 120 | unrelated_store | 249.752 | 61.206 | 4.08 |
| 120 | related_stock | 156.538 | 39.426 | 3.97 |
| 120 | shared_budget_price | 251.078 | 188.376 | 1.33 |

Incremental medians were lower than full recomputation in these twelve pattern/scale comparisons. Whole-revision checks were faster than incremental checks in all twelve, at the cost of broader invalidation. Mode order was fixed and the machine/environment is shared; these local sequential observations are descriptive, without randomized-order control, cross-machine replication or production latency claims.

At 120 lines, a related-stock change evaluated three graph nodes rather than all 970; a shared-price change evaluated 124 and required all 120 decisions to be reviewed. The latter had incremental p95 235.8 ms and median 188.4 ms, versus full median 251.1 ms. Dense/shared authority changes legitimately reduce the opportunity for selective review and computation savings.

## Dependency and capture costs

| Lines | Deduplicated witness bytes | Full snapshot bytes | Approval ledger bytes | Initial capture ms | Explicit review ms |
|---:|---:|---:|---:|---:|---:|
| 3 | 8,482 | 23,825 | 9,173 | 12.9 | 9.1 |
| 30 | 63,482 | 420,001 | 239,675 | 42.2 | 21.9 |
| 120 | 248,238 | 4,629,757 | 2,946,661 | 316.1 | 134.9 |

These are serialized byte sizes, not heap measurements. Shared metadata is duplicated in snapshots and per-clause coarse proof records; current growth and parsing cost are material limitations. An asymptotic advantage over full recomputation is not established. Complete commit observations include current permission/rules, intent/approval identity, evidence validation and atomic receipt/effect/outcome writes. There is one such observation per pattern/cell; commit-costs.csv is not a percentile estimate.

## Executed UI and failure boundary

Both English workflows passed the real browser flow against the built static frontend and native runtime. Procurement covers original approval retention, whole-mode comparison, related-stock reason chains, explicit 36.5 kg proposal save, shared-budget re-review, commit and same-receipt retry. Document release covers display-title retention, old-content signature rejection, explicit current-content signatures, shared audience impact and a local release receipt. Eight original 1600脳1150 viewport screenshots were captured without cropping, compositing or image text replacement. Runtime exception and blocked-external-request lists were empty in the successful runs.

Core boundary checks: 10 passed. Loopback HTTP checks: 17 passed, including viewer proposal-save permission and denial of review/confirm/source changes, exact-key conflict, workflow identity, export and retry. Default runtime has no unsafe baselines or experiment fault hooks.

Procurement includes actual child-process contention on one draft, a committed response discarded and retried from a new process after source change, and separately an injected SQLite outcome-write exception with complete rollback. These establish only the recorded local behaviors. Process restart, injected exception and untested power loss are distinct.

The first 176-trace sanity run is retained as failed: four atomic-exception harness assertions looked for the injected text in ERR_SQLITE_ERROR instead of its message. Independent counts showed zero partial effects. Corrected complete sanity runs passed before main execution. A first browser QA polling expression also failed on a temporarily absent status node; the null-safe rerun and final static-runtime flow passed. Raw failure records remain.

## Version and contribution boundaries

See LEGACY_DIFFERENCES.md: this new contract uses 11300 basis points and integer-gram ceilings; the old demo uses a 1.10 multiplier and two-decimal kg rounding. Matching 31.5/36.5 endpoints have different derivations. Old 420-trial results, screenshots and model claims are not reused as validation of this interpreter. No source/build/evidence hash is claimed unchanged between versions.

Read RELATED_WORK_AND_SCOPE.md for primary source links. Guarded approvals, selective invalidation, OCC and repair are existing work. The evaluated capability is the reusable bounded contract plus inspectable impact and safe review operation across the two local adapters. The system makes no claim about arbitrary SQL/plugins, out-of-band database mutation, external exactly-once effects, multi-writer throughput, real users or procurement savings.

## Independent assessment handoff

| Review dimension | Concrete evidence | Remaining limit |
|---|---|---|
| Integrated system value | Shared interpreter, immutable evidence, current authority transaction, field-level reason chain and explicit review | Existing mechanisms composed; no new concurrency algorithm |
| Representative end-to-end cases | Procurement and content/signature/audience release adapters, phantom/ABA/shared-condition/revoke/retry/failure cases | Authored synthetic fixtures |
| Honest comparative evidence | Same-contract four safe modes, separate full-history oracle, per-item values and source digests, cost/byte records | Self-implemented baselines, deterministic repetitions |
| Operability | Real workflow/mode selectors, source mutation controls, English protected/display distinction and sealed selected review | No participant comprehension/time study |
| Reproducibility and English | Node-only prebuilt runtime, source/locked frontend build, raw JSON/CSV, original viewport PNGs | Node 24 required; source frontend rebuild needs locked npm dependencies |
| Boundaries and related work | Explicit prior-art comparison, finite grammar/journal/actor/effect limits and legacy formula differences | No arbitrary-workflow or deployment guarantee |

The implementation task does not assign itself 8.5 or any other score. An independent evaluator can assess the complete artifacts against these fixed dimensions.


## UI correction after independent recording audit

The first prebuilt and recording displayed a caught missing-context-setter error during reset and quantity save. Their earlier UI/video pass did not detect handled error banners and is superseded. Only the workbench provider/reset handling and workflow-neutral explanatory copy changed. Freshly extracted prebuilt v2 passed both full browser flows, now observing handled banners as well as uncaught exceptions. All nine core hashes match the frozen study environment; the original research records and timing remain unchanged. See study/UI_CORRECTION.md and artifacts/prebuilt-acceptance-v2.json. A new continuous recording and its separate corrected VIDEO_QA are delivered; old footage remains as invalidated history.
