# IPDOS approval-contract capability prototype

This is a separate local synthetic prototype. It preserves immutable original review evidence, explains which protected dependencies changed, and supports explicit re-review before a guarded simulated commit. Procurement and document release use the same contract interpreter, review ledger and commit service. Existing English demo packages, the earlier 420-trial study, recordings and submitted papers are separate artifacts.

## Run the prebuilt application

Install or use Node.js 24.x (validated with Node 24.19.0). No npm package installation is needed by the prebuilt runtime. From the extracted package:

```powershell
node server/run.cjs
```

Open `http://127.0.0.1:3338/`. The API binds only `127.0.0.1:3337`. Both ports must be free. Choose a local demo manager or viewer. The role selector is not production authentication. Synthetic SQLite databases and immutable evidence are created under `artifacts/`; starting a fresh fixture preserves the previous database in its own directory. Restarting the server keeps the selected fixture files; sign in again after a server restart.

The prebuilt package includes the built English frontend, native Node/SQLite runtime source and synthetic fixtures. It includes no `node_modules`, credentials, private database, unsafe baseline, fault-injection seam or external publication path.

## Inspect the two workflows

For procurement, approve the three decisions from a sealed preview. Apply an other-store stock change, then switch between whole-revision and dependency-incremental modes to inspect the different review scopes. Return to incremental mode and reduce rice stock by 5 kg. Only its stock decision needs review even if the proposed 31.5 kg quantity stays unchanged. Open its reason chain: the reviewed 25 kg and current 20 kg stock values and versions are visible. Changing the proposed rice quantity to 36.5 kg affects every clause through the shared budget; save it, open a new preview, explicitly review the affected decisions and confirm once. Retry the saved request or export the receipt with its original approval/snapshot chain.

Use the workflow selector for document release. Approve both documents. A display-title update preserves their protected approvals. Changing GUIDE-A content makes old signatures ineligible for the new digest. Re-sign its current synthetic content, explicitly review that decision, then change the shared reader audience: both document clauses now need review. Confirming creates only a local simulated release record, with no publication or transmission.

Viewer can inspect and save procurement proposal quantities, but cannot approve, confirm or change source fixtures. Exact same-key/body retry requires current view permission and returns the original saved receipt before applying new-write freshness checks. A new request key cannot create a second effect for the same draft.

## Reproduce the evidence from the source package

The source package includes the study runners, independent manual full oracles, frozen protocols and test scripts. Each runner creates fresh result directories and synthetic databases. Core/study execution uses Node builtins; frontend rebuilding additionally requires its locked npm dependencies.

```powershell
node --test tests/first-slice.test.cjs tests/boundary.test.cjs tests/explanation-and-identity.test.cjs
node study/run-pilot.cjs
node study/run-pilot.cjs --main
node study/run-document-pilot.cjs
node study/run-document-pilot.cjs --main
node study/audit-results.cjs
node study/audit-results.cjs --document
node study/run-timing.cjs
```

Main runners require a passing same-source sanity gate. The procurement main plan is 44 scenarios × 4 modes × 3 deterministic repeats at three lines, plus 8 scale scenarios × 4 modes at 30 and 120 lines: 592 traces. Document main is 23 scenarios × 4 modes × 3 deterministic repeats: 276 traces. These are designed local fixture executions, not independent real-world cases or failure probabilities. Timing has a separate frozen protocol and is not counted as functional coverage.

`study/audit-results.cjs` opens result databases read-only, reconstructs every reviewed/committed revision from the complete authoritative journal, and writes each actual/expected decision and witness comparison into `semantic-audit-*/items.jsonl`. It imports no production interpreter, predicate selector or invalidation index. Its summaries bind the audit script and both oracle source hashes.

With the app running, `node scripts/http-boundary-qa.cjs` checks the loopback adapter roles, request identity, export and retries. `node scripts/browser-approval-qa.mjs` and `node scripts/browser-document-qa.mjs` launch separate headless Chromium profiles restricted to loopback, exercise real UI controls and save original full-viewport PNGs. They do not control an existing browser session, crop screenshots or add image text.

## Boundaries and documents

Read `study/CONTRACT.md`, `study/DOCUMENT_CONTRACT.md` and `study/CONTRACT_IMPLEMENTATION_NOTES.md` for protected/display-only fields, finite grammar, history/provenance rules, explicit renewal semantics and atomic authority. `study/LEGACY_DIFFERENCES.md` fixes the 13% integer-gram prototype formula and its difference from the old 10%/round-to-two-decimal kg demo. Old and new numerical endpoints must not be treated as interchangeable evidence.

The interpreter supports declared key reads, predicate scans, many-to-one key joins, bounded integer aggregates/distinct counts and finite conditions. Unknown code is refused; declared opaque logic uses whole-contract invalidation. The application trusts its encapsulated fact writer and complete transactional journal. Raw database/schema tampering, arbitrary SQL/plugins, time/nondeterministic functions, cross-draft business deduplication and different review/commit actors are outside this slice.

SQLite authority is local. Actual child-process contention checks uniqueness; it does not establish multi-writer throughput or distributed correctness. Normal child-process restart is distinct from an injected SQLite exception and from untested power loss. No real participant, procurement benefit, human time saving or production failure rate is measured. Dependency validation and selective invalidation are established techniques; this artifact's evidence concerns its bounded executable contract, explanations and safe operational integration.
