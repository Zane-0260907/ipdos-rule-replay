# IPDOS: Inspectable evidence-scoped approvals

IPDOS is a bounded local workbench for inspecting changes to reviewed evidence, preserving unaffected approvals, explicitly reviewing affected decisions, and atomically saving a simulated effect with its authority receipt. **Procurement and document release share the same executable approval contract, dependency interpreter, review ledger, and commit service.**

Latest source: [`approval-workbench/`](approval-workbench/). Stable artifact entry: [release v0.3.0](https://github.com/Zane-0260907/ipdos-rule-replay/releases/tag/v0.3.0). Earlier versions, tags, restaurant demo files and evidence remain available; the previous landing page is preserved in [README-business-r2.md](README-business-r2.md).

## Run the English application

Download `ipdos-v0.3.0-prebuilt.zip` from the versioned release and extract it into a writable directory. Use an existing **Node.js 24.x** installation, then run:

```sh
node server/run.cjs
```

Open **http://127.0.0.1:3338/**. The API listens only on **127.0.0.1:3337**. No npm installation, compiler, Docker, external database or supplier account is required by the prebuilt runtime. The local role selector is a demonstration convenience, not production authentication. Synthetic SQLite state is created under `artifacts/`; preserve that directory to retain receipts. Neither Node.js nor a browser is bundled.

## What to inspect

1. **Approval contract.** Inspect the supported-contract panel and sealed review preview. Protected evidence and display-only fields are declared separately. Original snapshots and approvals remain immutable.
2. **Unrelated change.** Approve the procurement decisions, update another store's stock, and compare whole-revision binding with dependency-incremental validation. Unaffected approval identities remain unchanged in the precise mode.
3. **Same decision value, changed evidence.** Insert and delete the previously missing join key. Rice's complete decision projection stays unchanged, but the persisted absence epoch changes and requires an explicit rice-only review. Equal final quantities alone never justify reusing changed protected evidence.
4. **Shared scope.** Reduce rice stock from 25 to 20 kg, then save a 36.5 kg proposal. Its shared-budget evidence affects all dependent clauses; open a new preview and explicitly review the affected decisions.
5. **Second adapter.** Switch to document release. A title is display-only; a changed content digest cannot reuse old signatures. Current-content signatures, distinct eligible editors and the shared reader audience determine the visible review scope.
6. **Atomic receipt and retry.** Confirm a local simulated effect, inspect its original approval/snapshot chain, change source state and retry the identical saved request. It returns the original receipt. A new request key cannot create a second effect for the same draft.

All procurement records and document releases are **local simulations**. No supplier, payment system, publication service or participant is contacted.

## Reproduce and audit

The source and raw regression artifacts are separately downloadable from the same versioned release. From the extracted source, or from `approval-workbench/` in this repository:

```sh
node --test tests/first-slice.test.cjs tests/boundary.test.cjs tests/explanation-and-identity.test.cjs
node study/run-pilot.cjs
node study/run-pilot.cjs --main
node study/run-document-pilot.cjs
node study/run-document-pilot.cjs --main
node study/audit-results.cjs
node study/audit-results.cjs --document
```

Each runner creates fresh synthetic fixtures. The main plans require a passing same-code sanity gate. The frozen procurement plan contains **592 controlled traces**; the separate document plan contains **276**. The independent semantic audits compare each recorded approval and receipt with complete journal replay and a separately implemented full oracle. These are bounded designed scenarios, not independent deployments or production failure rates.

Archived public evidence is in [`reproducibility/approval-workbench/`](reproducibility/approval-workbench/). Its derivation manifest distinguishes original file hashes from public hashes. Only machine-local path metadata is normalized; numerical observations, decision values, witnesses, scenarios and source digests are unchanged. Original private archives are retained. Procurement/document controlled-fixture case databases are omitted from that regression download; the source runners regenerate them. The separate public-source replay ZIP includes its own explicitly synthetic SQLite traces. The corrected source retains the nine frozen core modules; the UI context-setter fix and strict handled-error regression are documented in [`UI_CORRECTION.md`](approval-workbench/study/UI_CORRECTION.md).

The optional frontend rebuild uses its locked dependencies:

```sh
cd frontend
npm ci
npm run build
```

## Public-source counterfactual replay

The companion replay uses a fixed **30-transition counterfactual fixture** governed by an explicit, bounded public-source contract. Its inputs come from public developer documentation; the approval states and changes are constructed scenarios. They are **not observed human approvals, a participant study, real purchasing, or evidence of user time savings**. The companion source is in [`public-source-replay/`](public-source-replay/); download its release ZIP for all 240 synthetic databases from the original and separate validation runs. Its [protocol](public-source-replay/PROTOCOL.md), [report](public-source-replay/REPORT.md), [public derivation](public-source-replay/PUBLICATION.md) and [CC0 source attribution](public-source-replay/README.md) state the exact boundaries. It protects selected source-file membership and byte identities plus a conservative shared non-source binding; it does not model Sphinx rendering or the Python project's real review policy.

## Scope and limits

- The supported grammar is finite: projected unique-key reads including missing keys, predicate membership history, many-to-one joins, and bounded exact-integer aggregates. Unsupported rules fail closed or require conservative invalidation.
- The contract assumes its encapsulated fact writer and complete transactional journal. It does not cover arbitrary database tampering, arbitrary SQL/plugins, nondeterministic or time-dependent functions, or distributed approval authority.
- Final confirmation checks current rules, authority, draft identity and approvals within the local SQLite write transaction. Same-request retry recovery and per-draft uniqueness are bounded guarantees, not unrestricted exactly-once business execution or cross-draft semantic deduplication.
- Selective invalidation, read sets, optimistic validation and approval binding have prior work. This artifact demonstrates their bounded executable integration, inspectable reasons and explicit operational re-review; it does not claim to invent those techniques.
- Timing compares self-implemented modes under the same contract. Incremental validation beat full recomputation in the frozen local cases but was slower than whole-revision checking; shared-scope fanout and substantial witness storage are retained costs. Re-review counts are workload proxies, not measured human time savings.
- The new prototype uses a 13% integer-gram buffer. The earlier restaurant demo used a 10% formula and human quantity edits. Their 31.5/36.5 kg endpoints must not be treated as the same calculation. See [legacy differences](approval-workbench/study/LEGACY_DIFFERENCES.md).

## History and licenses

[Business Flow R2](https://github.com/Zane-0260907/ipdos-rule-replay/releases/tag/v0.2.0-business-r2), [`business-demo/`](business-demo/), the original root rule-replay source, and [README-rule-replay.md](README-rule-replay.md) remain intact. Backend lineage includes [Juggle-ops/dietsystem](https://github.com/Juggle-ops/dietsystem); the repository retains its original history and Apache-2.0 license.

Project code follows [Apache-2.0](LICENSE). Frontend dependencies retain their own terms; supplied and official upstream legal texts are preserved in [`THIRD_PARTY_LICENSES`](approval-workbench/THIRD_PARTY_LICENSES/INVENTORY.json). Public-source companion inputs retain their source-specific attribution and license terms; they are not relicensed as project code. SHA-256 checksums and a publication review accompany the versioned release. Papers, private Library identities, credentials and real business databases are excluded.
