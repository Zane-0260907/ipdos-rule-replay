# Portable verification entrypoint repair

The initial package's replay wrapper read `source-freeze.json.source_root` after
all 120 traces to recalculate original desktop source hashes. Consumers on a
different machine could therefore complete every trace and then fail before a
summary was written. This was a packaging/reproducibility defect.

The repaired wrapper verifies the **distributed frozen core** before and after
re-execution. It never reads the original desktop source directory. Original
desktop before/after hashes remain recorded provenance in
`provenance/original-execution.json`; `source-freeze.json` retains its historical
path without making it an active dependency.

Recorded Windows relative paths are normalized by the audit and report readers;
new replay paths use forward slashes. Auditing the immutable initial run checks
its original wrapper hash against the exact archived wrapper under
`provenance/original-entrypoints/`. Auditing a new run checks the current wrapper.
No code hash check is omitted.

The 9 core files, both existing independent manual oracles, finite contract,
sampling protocol/window, downloaded source manifests and original result files
remain unchanged. The original result summary and report continue to describe
the original run, including its original timing observations. Fresh verification
outputs are separate evidence and do not replace those observations.

`tests/forbid-origin-read.cjs` is a validation-only preload which throws on any
synchronous read, existence, access, stat, open, link or directory request against
the original project. Clean-extraction verification uses it with both Node
entrypoints while the original project is inaccessible to them. It changes no
core or domain decision. The validation record identifies the host platform;
cross-platform execution is not claimed solely from this guard.

Clean-extraction verification passed: original 120-database audit (10053 checks), a fresh 120-trace replay, and its complete read-only audit (10054 checks). Original source-directory access was blocked throughout, with zero attempted reads. All deterministic functional counts and 1440 per-step fields match the immutable original run. See `portability-validation/summary.json` and its logs for the exact platform and commands.
