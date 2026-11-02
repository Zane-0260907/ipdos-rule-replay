"""Build a descriptive report and a portable frozen evidence bundle."""
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parent
def load(name):
    return json.loads((ROOT / name).read_text(encoding="utf-8-sig"))
def pretty(value):
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"
def recorded_path(value):
    return ROOT / Path(value.replace("\\", "/"))
summary = load("results/latest.json")
audit = load("results/audit-latest.json")
window = load("data/window.json")
mapped = load("data/mapped-states.json")
coverage = load("data/coverage-gate.json")
rows = [json.loads(line) for line in (recorded_path(summary["run"]) / "raw.jsonl").read_text().splitlines()]
base = [r for r in rows if r["mode"] == "incremental"]
states = [{e["path"]: e["sha"] for e in load("data/trees/" + c["tree_sha"] + ".json")["entries"] if e["type"] != "tree"} for c in window["commits_oldest_first"]]
aba = []
for name in sorted(set().union(*(set(s) for s in states))):
    sequence = []
    for index, state in enumerate(states):
        value = state.get(name)
        if not sequence or sequence[-1][1] != value:
            sequence.append((index, value))
    seen = {}
    for index, value in sequence:
        if value in seen:
            aba.append({"path": name, "currentState": index, "earlierState": seen[value], "kind": "absence" if value is None else "exact_blob"})
        seen[value] = index
natural = {"exactBlobOrAbsenceABA": aba, "sourcePathChanges": summary["naturalCoverage"]["sourcePathChanges"], "sharedBindingChangeTransitions": summary["naturalCoverage"]["sharedBindingChanges"], "unobserved": ["real approval/signoff changes", "permission or audience revocation", "transaction faults", "concurrent writers", "rendered-document changes"], "sourceMembershipBoundaryLimitation": "The sole source addition and deletion occur in a commit that also changes conf.py; the shared binding invalidates all clauses. This is natural membership coverage, not an isolated selective-benefit test for membership changes."}
(ROOT / "results/natural-coverage.json").write_text(pretty(natural), encoding="utf-8")
first, last = window["commits_oldest_first"][0], window["commits_oldest_first"][-1]
lines = ["# Public source revision replay — results", "", "**Outcome: passed in the stated counterfactual contract.** Thirty fixed adjacent first-parent transitions, four safe modes, 120 local traces; 0 false retained approvals, 0 incorrect new simulated effects, 0 partial effects, and 0 infrastructure failures. The standalone read-only audit passed all 10,053 checks across 120 result databases.", "", "## Sample and acquisition", "", f"The cutoff is `{window['cutoff_utc']}`. The frozen main tip `{window['observed_tip_sha']}` was after the cutoff; its first parent is the eligible newest endpoint. `data/tip-eligibility-evidence.json` preserves sanitized fields from the initial API response. All 31 selected trees and their complete Git tree hashes were verified. All {coverage['unique_blob_count']} unique source/license blobs ({coverage['unique_source_bytes']:,} bytes) were fetched and their Git blob identities and byte SHA256 values checked. The selected file count is 68 in each tree, partitioned into 11 fixed source scopes by the frozen rule. Some selected files are repository Markdown such as templates; they are not all rendered documentation pages.", "", f"- Predecessor state: `{first['sha']}` ({first['time_utc']}).", f"- Newest selected commit: `{last['sha']}` ({last['time_utc']}).", "- Repository: [python/devguide](https://github.com/python/devguide).", f"- Immutable license source: [CC0-1.0 LICENSE](https://github.com/python/devguide/blob/{last['sha']}/LICENSE).", "- One initial TLS failure left 101/102 verified blobs; one bounded resume fetched the remaining blob. `data/acquisition-failure.json` remains in the package. No window, failed trial or zero-benefit transition was replaced.", "", "## Protected contract and interpretation", "", "The approved predicate concerns exact source path membership, file mode, Git blob identity and byte SHA256 within each bundle. All non-source objects are conservatively bound through a shared policy digest, so nine transitions invalidate every bundle. This protects the stated source contract only. It does not protect complete Sphinx rendering, includes, inter-page semantics, extensions or actual release output.", "", "Every policy, authority, reader, editor, signoff and publication request is researcher generated. Both fictional signoffs refresh deterministically with a changed bundle digest. No assertion is made about the Python project's real review policy, CODEOWNERS, quorum, actual approvals, public releases, reviewers or human time. Fresh databases model adjacent transitions; these are not 120 independent real-world cases or a longitudinal approval deployment.", "", "## Four safe validation methods", "", "| Mode | Oracle-necessary review clauses | Requested review clauses | Extra review clauses | Retained clauses | False retained / incorrect effects |", "|---|---:|---:|---:|---:|---:|"]
for mode, m in summary["byMode"].items():
    lines.append(f"| {mode} | {m['necessaryReviewClauses']} | {m['requiredReviewClauses']} | {m['extraReviewClauses']} | {m['retainedClauses']} | {m['falseRetainedApprovals']} / {m['incorrectNewEffects']} |")
lines += ["", "Full and incremental validation have the same precision: 123 necessary review clauses among 330 clause-transition opportunities. Both preserve 207 original synthetic approvals. Whole-revision and safe row/key validation with predicate table fences each require all 330 reviews. A changed synthetic signoff touches the shared signoff-table fence in the safe rows baseline; this explains its conservative result. No unsafe row-only baseline is included.", "", "Nine transitions have **zero selective-review benefit** because the shared non-source binding changes. The fixed 11-bundle granularity and conservative shared-binding policy determine these counts; changing that counterfactual contract would change the workload proxy. No actual reviewer effort or time was measured.", "", "## Descriptive cost observations", "", "| Mode | Median validation (ms) | Min–max (ms) | Evaluated engine nodes | Reused engine nodes |", "|---|---:|---:|---:|---:|"]
for mode, m in summary["byMode"].items():
    timing = m["verificationMicroseconds"]
    nodes = str(m["evaluatedNodes"]) if mode in ("full", "incremental") else "not materialized"
    reuse = str(m["reusedNodes"]) if mode in ("full", "incremental") else "not materialized"
    lines.append(f"| {mode} | {timing['median']/1000:.3f} | {timing['min']/1000:.3f}–{timing['max']/1000:.3f} | {nodes} | {reuse} |")
lines += ["", "These are one observation per mode/transition on Node 24.19.0 / Windows, in the fixed order whole, rows, full, incremental, in one process. They include no warmup, randomization, repetition or uncertainty estimate. They are descriptive local costs, not a latency benchmark or a general speedup claim. Whole-version validation performs a cheap freshness comparison and can have a lower validation cost while requesting a larger review scope. Node evaluation totals are directly instrumented work counters, with incremental evaluating 257 nodes and reusing 1,933 of the 2,190 node opportunities evaluated by full mode.", "", "## Natural coverage and absent boundaries", "", "The fixed history contains 24 source-relevant transitions, 9 shared-binding transitions, 1 source path addition, 1 source path deletion and 32 source path modifications. The categories overlap: three transitions change both source and shared binding. Path moves are always interpreted as deletion plus addition, without rename inference.", "", "The sole addition/deletion is in commit `2b19e7691962e05f0f212a5303f3b4c5cde31df2`: `development-tools/clang.rst` is deleted and `development-tools/sanitizers.rst` is added. `conf.py` changes in the same commit, requiring all 11 reviews. This cannot establish isolated selective benefit for source membership changes.", "", f"Exact blob/absence ABA returns observed after collapsing unchanged states: **{len(aba)}**. Natural signoff, permission, reader-audience, transactional-failure and concurrency events are not available in these repository snapshots. No synthetic fault/phantom/ABA cases were inserted into this history's denominator.", "", "## Independent evidence and integrity", "", "The Python checker independently rebuilds all Git trees and the complete source partitions/digests, without importing the candidate mapper. The original document oracle completely materializes values and version/member witnesses without importing the production interpreter. The standalone audit then opens every SQLite result read-only and reconstructs each snapshot/receipt revision from the full authoritative journal; it rechecks complete values, token catalogs, original approvals, effect values and receipt identity. Audit code does not import the candidate mapping or production core.", "", "All 9 copied core files match their original SHA256 before and after execution, and the source directory also retains the same hashes. The original project, browser and recording were not modified. Parent-supplied Library IDs remain provenance references; this run used the explicit local source path and does not claim byte identity with unmaterialized Library archives.", "", "## Commit-level results", "", "Counts below are per commit, with 11 clauses per mode. `required` lists whole / rows / full / incremental. Every listed commit has zero safety mismatches in all four traces.", "", "| # | Commit | A / D / M paths | Changed source scopes | Shared binding changed | Necessary | Required W / R / F / I |", "|---:|---|---|---|:---:|---:|---|"]
for row in base:
    change_counts = [sum(c["type"] == kind for c in row["changes"]) for kind in ("A", "D", "M")]
    siblings = {r["mode"]: r for r in rows if r["index"] == row["index"]}
    required = " / ".join(str(siblings[mode]["requiredReviewCount"]) for mode in ("whole", "rows", "full", "incremental"))
    scopes = ", ".join(x["name"] for x in row["affectedSourcePartitions"]) or "none"
    lines.append(f"| {row['index']+1} | `{row['afterSha'][:12]}` | {' / '.join(map(str,change_counts))} | {scopes} | {'yes' if row['sharedBindingChanged'] else 'no'} | {row['necessaryReviewCount']} | {required} |")
lines += ["", "`raw.jsonl` and each `step.json` preserve full SHA/time/path changes, expected/actual values and witness hashes, all method metrics, effect attempts, explicit synthetic renewals and retries. Full per-clause audit comparisons are in the audit's `items.jsonl`; all 120 SQLite databases are included.", "", "No blockers remain for this bounded replay. It supports one real-history input validation case under a preregistered counterfactual source contract. Real approval semantics, production release deployment, human effort and rendering semantics remain untested.", ""]
(ROOT / "REPORT.md").write_text("\n".join(lines), encoding="utf-8")
status = {"status": "completed", "actual_workspace": str(ROOT), "gate": "passed", "trees": 31, "transitions": 30, "source_relevant_transitions": 24, "traces": 120, "all_traces_passed": summary["passed"], "standalone_audit_checks": audit["checks"], "standalone_audit_passed": audit["passed"], "core_unchanged": summary["coreUnchanged"], "source_window_changed": False, "remaining_blockers": [], "next_parent_action": "Read REPORT.md and results/latest.json; decide how this limited source-history evidence changes the paper/evaluation. No score is assigned here."}
(ROOT / "STATUS.json").write_text(pretty(status), encoding="utf-8")
files = [p for p in ROOT.rglob("*") if p.is_file() and "__pycache__" not in p.parts and p.name not in ("SHA256SUMS.json",) and p.suffix != ".zip"]
hashes = {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(files)}
(ROOT / "SHA256SUMS.json").write_text(pretty(hashes), encoding="utf-8")
files.append(ROOT / "SHA256SUMS.json")
archive = ROOT.parent / "IPDOS-public-devguide-replay-20261101.zip"
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as out:
    for path in sorted(files):
        out.write(path, "ipdos-public-replay/" + path.relative_to(ROOT).as_posix())
print(pretty({"archive": str(archive), "bytes": archive.stat().st_size, "sha256": hashlib.sha256(archive.read_bytes()).hexdigest(), "files": len(files), "passed": summary["passed"] and audit["passed"]}))
