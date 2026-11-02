# Reproduce and audit

[Documentation index](README.md) · [Results](EVALUATION.md) · [Release checksums](../verification/v0.3.0/SHA256SUMS.txt)

The following commands use Node 24.x and its built-in SQLite support. Run application commands from **approval-workbench/** in a Git checkout, or from the extracted application-source root. They are independent of the legacy root backend scripts.

## Application checks

```sh
cd approval-workbench
node --test tests/first-slice.test.cjs tests/boundary.test.cjs tests/explanation-and-identity.test.cjs
```

The published source review recorded ten passing core checks. Running them again creates disposable synthetic fixture evidence; it is not an additional user or deployment study.

## Regenerate controlled-fixture evidence

From the application root:

```sh
node study/run-pilot.cjs
node study/run-pilot.cjs --main
node study/run-document-pilot.cjs
node study/run-document-pilot.cjs --main
node study/audit-results.cjs
node study/audit-results.cjs --document
```

Main runs require a passing same-code sanity gate. The frozen procurement plan contains **592 traces**: 44 scenarios across four modes with three deterministic repetitions at three lines, plus eight scale cases across four modes at 30 and 120 lines. The document plan contains **276 traces**: 23 scenarios across four modes with three repetitions.

Each runner creates fresh result directories and SQLite databases. Existing recorded runs are retained. The independent audit reconstructs reviewed and committed revisions from the complete journal and compares values, protected witness hashes and authority links without importing the candidate interpreter or invalidation selector.

For the optional separately bounded timing protocol, inspect [TIMING_PROTOCOL.json](../approval-workbench/study/TIMING_PROTOCOL.json) before running `node study/run-timing.cjs`. Timing samples are not functional-scenario coverage.

## Inspect published records

- [Readable results](EVALUATION.md), [machine summary](../reproducibility/approval-workbench/study/report/EVALUATION.json) and [raw run records](../reproducibility/approval-workbench/study/results/).
- [Public evidence derivation](../reproducibility/approval-workbench/PUBLIC_EVIDENCE_DERIVATION.json) distinguishes original and public file hashes. Nonessential machine-local path metadata was normalized for publication.
- The [regression ZIP](https://github.com/Zane-0260907/ipdos-rule-replay/releases/download/v0.3.0/ipdos-v0.3.0-regression-public.zip) contains recorded observations and per-item audit results, but omits the controlled-fixture per-case SQLite files. Regenerate those databases with the source runners for a fresh full audit; do not assume an archived database is included when it is absent.
- `python study/relocate-evidence.py` relocates extracted public pointer copies only. It does not reconstruct missing databases or rewrite immutable run records.

## Replay the bounded public-source example

Download and extract the [public devguide replay ZIP](https://github.com/Zane-0260907/ipdos-rule-replay/releases/download/v0.3.0/ipdos-v0.3.0-public-devguide-replay.zip). From its **ipdos-public-replay/** directory:

```sh
node mapping.cjs
python tests/verify-source.py
node run-replay.cjs
node audit-replay.cjs
```

This is an offline replay of **30 fixed first-parent transitions** across four modes, producing **120 traces**. The data is public source metadata; approval policies, roles and signoffs are constructed for the counterfactual contract. This is not the Python project's real approval history.

The ZIP also contains the original 120 case databases and a separate 120-case portability verification. To audit those existing runs explicitly:

```sh
node audit-replay.cjs --run results/replay-O69wir
node audit-replay.cjs --run results/replay-V9fN7A
```

The publication check recorded **10,053** assertions for the original run and **10,054** for the separate validation run, with no failures. Those assertions and repeated transitions are not independent real-world observations. A Git checkout omits the binary case files; use the replay ZIP for archived-database audits, or generate fresh cases first.

See the [source contract](../public-source-replay/PROTOCOL.md), [report](../public-source-replay/REPORT.md), [portable entrypoints](../public-source-replay/PORTABILITY.md) and [public derivation notes](../public-source-replay/PUBLICATION.md). Acquisition from public URLs is optional; replay uses the frozen cached metadata without an original desktop directory or account.

## Run the actual interface

Use the [quick start](QUICKSTART.md), then the [walkthrough](DEMO.md). The source also includes HTTP and isolated-browser QA scripts described in the [application README](../approval-workbench/README.md). Their browser prerequisites and capture scope should be inspected before execution.

[Publication review](../verification/v0.3.0/PUBLICATION_REVIEW.json) · [Scope and limits](LIMITS.md)
