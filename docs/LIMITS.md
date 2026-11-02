# Scope, limits and evidence boundaries

[Documentation index](README.md) · [Architecture](ARCHITECTURE.md) · [Evaluation](EVALUATION.md)

## Local workflow capability

The application demonstrates immutable reviewed evidence, inspectable impact chains, explicitly selected renewal, and an atomic local simulated effect with receipt recovery across two adapters. Purchases, publication decisions, actors and signoffs are synthetic. No supplier, payment system or publication service is connected. The local role selector is not production authentication.

## Finite contract and trust boundary

The grammar supports declared projected key reads, predicate membership history, many-to-one joins, bounded exact-integer aggregates and finite conditions. Unsupported opaque logic must use its explicit conservative treatment or fail closed. The contract cannot infer every business fact an application should have declared.

Protected-evidence equality relies on trusted contract definitions, mediated writes and a complete durable journal. Raw database/schema tampering, arbitrary SQL/plugins, nondeterministic or time-dependent functions and untracked external semantics are outside this slice. Review and commit use the designated actor model declared by the contract; this is not arbitrary delegated authority.

The original snapshot is retained when a decision is reused. Equal final quantities alone cannot authorize new protected evidence. Shared budgets and audiences legitimately couple several clauses; selective review is not guaranteed for every update.

## Commit, uniqueness and recovery

One local SQLite authority revalidates evidence, current rules, permissions and request identity within its write transaction. A saved identical request may recover its original receipt after source state changes. Per-draft uniqueness prevents an additional effect under another key.

This does not establish cross-draft business deduplication, distributed exactly-once execution, sustained multi-writer throughput or power-loss recovery. Actual process restart, child-process contention and injected SQLite exceptions are different checks and must not be reported as interchangeable.

## What the evaluations measure

- The procurement and document matrices are bounded synthetic scenarios with deterministic repetitions and selected scales. They are not production failure rates or independent deployments.
- Re-review-clause counts are workload proxies, not participant time savings. The independent oracles check declared decisions and evidence, not the completeness of every possible business requirement.
- The public-source replay maps exact selected file membership/content hashes and one conservative shared non-source binding. Its synthetic approvals and signoffs are not the Python project's real reviews, policy or editor identities. It does not model Sphinx rendering or transitive build semantics.
- The four measured modes are self-implemented under the same contract. Established approval binding, dependency validation, optimistic concurrency and selective invalidation are acknowledged; this is not a claim to invent those techniques or run their authors' systems.
- Incremental validation was faster than full recomputation in the frozen local timing cases, but slower than whole-revision checking. Shared-scope fanout, duplicated witness metadata and substantial storage costs remain. The result is not a general scalability or complexity proof.

## Version boundaries

The current prototype uses a 13% integer-gram buffer, reserves and shared costs. R2 used a 10% rounded-kg calculation and human quantity edits. Their 31.5/36.5 kg endpoints have different derivations. Read [LEGACY_DIFFERENCES.md](../approval-workbench/study/LEGACY_DIFFERENCES.md) before comparing them.

The [R2 guide](../README-business-r2.md), [initial replay guide](../README-rule-replay.md), recordings, figures and tests remain available for their own versions. They must not be relabeled as demonstrations or validation of the current contract.

## Source documents

[Exact approval contract](../approval-workbench/study/CONTRACT.md) · [DocumentRelease contract](../approval-workbench/study/DOCUMENT_CONTRACT.md) · [Implementation semantics](../approval-workbench/study/CONTRACT_IMPLEMENTATION_NOTES.md) · [Related-work notes](../approval-workbench/study/RELATED_WORK_AND_SCOPE.md) · [Public-source protocol](../public-source-replay/PROTOCOL.md)
