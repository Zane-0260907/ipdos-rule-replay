# Bounded public revision replay protocol — frozen before outcomes

This is a local, counterfactual source-contract replay of `python/devguide`.
It is not a study of the Python project's real approvals, editors, review time,
publication safety, CODEOWNERS, or rendered documentation. No remote write,
repository build, hook, setup script, submodule, browser, or publication is run.

## Fixed sample and acquisition gate

The cutoff is **2026-11-01 00:00:00 UTC**. Resolve public `main` once, walk its
first-parent chain, choose its newest commit at or before the cutoff, and take
that commit and its preceding 30 first-parent ancestors: 31 trees, 30 adjacent
transitions, reported oldest to newest. First-parent order, not sorted timestamp
order, defines adjacency. Never change this window based on observed results.
Save SHA, parent SHA(s), committer timestamp, complete recursive tree entries,
tree SHA, blob SHA, content SHA256, exact source URL, and acquisition status.
Discard author identities, committer names/emails, commit messages and API user
objects in memory; do not persist them. Source bytes are hashed in memory and
not saved, except the license. Do not infer any real author/approval identity.

Use at most two 100-entry commit-metadata pages, 31 recursive tree requests,
and 1,000 unique source blobs with a total byte cap of 25 MiB. Any unresolved
parent, truncated tree, object-hash mismatch, authorization denial, unsupported
tree mode for a selected source, or exceeded cap stops the gate and is reported.
No replacement repository or window is allowed. Reconstruct every Git tree
hash from its complete entries; check Git blob hashes on all downloaded source
bytes. Preserve all transitions, failures and zero-benefit controls.

## Source contract, fixed before source-effect counts

Select **all regular tracked `.rst`, `.md`, and `.txt` files**, case-insensitive,
including root documents. Partition by first path directory; root files form
`@root`. Use the union of partitions across the 31 trees as the fixed document
list for every method and transition. A missing partition has an explicit empty
member list. A path move is always deletion plus addition; no rename heuristic.
The only source-protection claim is each partition's **exact path membership,
file mode, Git blob identity, and byte SHA256**. A bundle's `contentDigest` and
`version` are the SHA256 of its sorted member vector. This is a conservative
hash adapter, not a renderer or a claim that independently rendered pages exist.

All other non-tree entries (including configuration, code, assets, extension
files, license and special-mode entries) form one **shared conservative binding**.
Its sorted path/mode/type/Git-object vector is hashed into `rules.publishing.version`.
Any such change invalidates every partition, even if its rendering effect is
irrelevant. Cross-file includes, Sphinx semantics, transitive dependencies and
actual build output are outside the contract; the artifact must not claim them.

`authority`, `rules`, channel, principals, audience, editors, publication intent,
and two signoff rows per partition are **researcher-generated synthetic facts**.
They do not assert Python project's real policy, approvals, reviewers or quorum.
Both synthetic signoffs always describe the current bundle digest and refresh
deterministically only when that digest changes. They are preconditions for this
counterfactual contract, not evidence that people reviewed the new text. Empty
bundles are valid explicit empty source sets. No CODEOWNERS claim is made.

## Replay and safety checks

Use the copied, hash-frozen `core` without modification and the existing
`document` adapter. Run `whole`, safe `rows` (row/key and predicate table fence),
`full`, and `incremental`. Each adjacent transition gets a fresh local database
per method, seeded identically from its old tree. This is 30 adjacent revision
experiments, not a longitudinal real approval history. Seal and explicitly
approve all clauses at the old state, apply all source-derived fact changes in
one transaction, then validate once in the selected mode. Preserve raw metrics.

Use a separate source-manifest checker and the existing independent complete
document oracle (which imports no production interpreter). Verify the complete
initial and current values, protected witness hashes, and required retention.
Compare independently reconstructed source contract changes to oracle changes.
Count a false retained approval if a method retains a clause whose complete
oracle witness/value changed. Test a new simulated effect before renewal: it is
incorrect if any oracle-required review remains. When necessary, explicitly
renew exactly the method's requested clauses, assert every unselected original
approval identity remains intact, then simulate one local effect and retry its
same request. Check exactly one receipt, outcome and local release plus the
receipt's approval/snapshot/value chain. These are local simulated effects only.

Report each commit's full path changes (A/D/M including mode/object changes),
affected source partitions/shared binding, necessary and extra review-clause
proxies, false retention/effects, infrastructure failures, engine counters and
single-run elapsed costs. Do not silently exclude any trial. Latency is local,
descriptive, cold/fresh-transition evidence; no benchmark speedup or human-time
claim. Natural absent insertion/deletion/ABA/config cases are marked absent,
never filled with synthetic failures in the observed-history denominator.

## Stop and integrity rules

If the 31-tree/complete-byte gate fails, source changes are absent, the existing
adapter cannot represent the bounded mapping, or a large core change is needed,
stop and report the exact reason. A genuine core safety bug is reported with
its reproduction and never repaired in the frozen parent project. Keep source
and copied-core hashes before and after. The outcome may be zero benefit.

Parent-supplied Library IDs are provenance references only until materialized;
this run uses the explicit local source path and makes no archive-byte identity
claim for unmaterialized Library files.
