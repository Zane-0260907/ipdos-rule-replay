"""Bounded anonymous read-only acquisition. No repository code is executed."""
import argparse
import concurrent.futures
import datetime as dt
import hashlib
import json
from pathlib import Path
import sys
import threading
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
REPO = "https://api.github.com/repos/python/devguide"
CUTOFF = "2026-11-01T00:00:00Z"
MAX_BYTES = 25 * 1024 * 1024
LOCK = threading.Lock()

def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()

def dump(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "ipdos-bounded-public-replay", "Accept": "application/vnd.github+json"})
    with urllib.request.urlopen(req, timeout=35) as response:
        body = response.read(MAX_BYTES + 1)
        if len(body) > MAX_BYTES:
            raise RuntimeError("one response exceeds byte cap")
        meta = {"url": url, "status": response.status, "retrieved_utc": now(), "bytes": len(body)}
        for name in ["ETag", "X-RateLimit-Remaining", "X-GitHub-Request-Id"]:
            if response.headers.get(name):
                meta[name.lower()] = response.headers[name]
        return body, meta

def api(url):
    raw, meta = get(url)
    return json.loads(raw), meta

def commit(item):
    # Do not persist people, email addresses, logins, messages or user objects.
    return {"sha": item["sha"], "tree_sha": item["commit"]["tree"]["sha"],
            "time_utc": item["commit"]["committer"]["date"],
            "parents": [p["sha"] for p in item["parents"]]}

def git_tree_sha(entries):
    children = {}
    for row in entries:
        parent, _, name = row["path"].rpartition("/")
        children.setdefault(parent, []).append((name, row))
    computed = {}
    for directory in sorted(children, key=lambda x: x.count("/") + bool(x), reverse=True):
        rows = children[directory]
        rows.sort(key=lambda pair: pair[0].encode("utf-8") + (b"/" if pair[1]["type"] == "tree" else b""))
        content = bytearray()
        for name, row in rows:
            if row["type"] == "tree":
                assert computed[row["path"]] == row["sha"], "subtree object mismatch: " + row["path"]
            mode = row["mode"].lstrip("0")
            content.extend(mode.encode("ascii") + b" " + name.encode("utf-8") + b"\0" + bytes.fromhex(row["sha"]))
        computed[directory] = hashlib.sha1(b"tree " + str(len(content)).encode("ascii") + b"\0" + content).hexdigest()
    return computed[""]

def is_source(row):
    return row.get("type") == "blob" and row.get("mode") in {"100644", "100755"} and Path(row["path"]).suffix.lower() in {".rst", ".md", ".txt"}

def partition(path):
    return path.split("/", 1)[0] if "/" in path else "@root"

def acquire_trees():
    frozen = DATA / "window.json"
    if frozen.exists():
        window = json.loads(frozen.read_text(encoding="utf-8"))
    else:
        indexed, sources, tip = {}, [], None
        for page in range(1, 3):
            url = REPO + "/commits?sha=" + (tip or "main") + "&per_page=100&page=" + str(page)
            items, request_meta = api(url)
            sources.append(request_meta)
            if not items:
                break
            if tip is None:
                tip = items[0]["sha"]
            indexed.update((item["sha"], commit(item)) for item in items)
            cursor, seen = tip, set()
            while cursor in indexed and cursor not in seen:
                seen.add(cursor)
                item = indexed[cursor]
                if item["time_utc"] <= CUTOFF:
                    selected = []
                    while cursor in indexed and len(selected) < 31:
                        selected.append(indexed[cursor])
                        cursor = indexed[cursor]["parents"][0] if indexed[cursor]["parents"] else ""
                    if len(selected) == 31:
                        window = {"repo": "python/devguide", "branch": "main", "cutoff_utc": CUTOFF,
                                  "observed_tip_sha": tip, "sample_rule": "latest eligible first-parent commit and preceding 30 first-parent ancestors",
                                  "commits_oldest_first": list(reversed(selected)), "metadata_requests": sources,
                                  "privacy": "Only commit/tree/parent hashes and committer timestamps retained; no author identities, emails or messages."}
                        dump(frozen, window)
                        break
                    break
                cursor = item["parents"][0] if item["parents"] else ""
            if frozen.exists():
                break
        else:
            raise RuntimeError("cannot resolve fixed 31-state first-parent window in two metadata pages")
        if not frozen.exists():
            raise RuntimeError("incomplete first-parent window")
    for index, item in enumerate(window["commits_oldest_first"]):
        target = DATA / "trees" / (item["tree_sha"] + ".json")
        if not target.exists():
            obj, request_meta = api(REPO + "/git/trees/" + item["tree_sha"] + "?recursive=1")
            assert not obj.get("truncated"), "truncated recursive tree"
            rows = [{k: row[k] for k in ["path", "mode", "type", "sha", "size"] if k in row} for row in obj["tree"]]
            assert git_tree_sha(rows) == item["tree_sha"], "root tree object mismatch"
            dump(target, {"sha": item["tree_sha"], "entries": rows, "source": request_meta, "complete": True, "git_tree_sha_verified": True})
        print(json.dumps({"phase": "tree", "index": index, "sha": item["sha"], "tree": item["tree_sha"]}), flush=True)
    states = []
    for item in window["commits_oldest_first"]:
        obj = json.loads((DATA / "trees" / (item["tree_sha"] + ".json")).read_text(encoding="utf-8"))
        assert git_tree_sha(obj["entries"]) == item["tree_sha"]
        states.append({r["path"]: r for r in obj["entries"] if r["type"] != "tree"})
    transitions = []
    for i, (old, new) in enumerate(zip(states, states[1:])):
        changed = [p for p in sorted(old.keys() | new.keys()) if old.get(p) != new.get(p)]
        source = [p for p in changed if is_source(old.get(p, {})) or is_source(new.get(p, {}))]
        transitions.append({"index": i, "sha": window["commits_oldest_first"][i + 1]["sha"], "changed_paths": changed, "source_changed_paths": source})
    gate = {"status": "trees_complete_bytes_pending", "trees": len(states), "transitions": len(transitions),
            "source_relevant_transitions": sum(bool(t["source_changed_paths"]) for t in transitions),
            "transition_coverage": transitions,
            "limits": "Coverage uses fixed source/path rule only; no outcome or benefit results exist at this gate."}
    dump(DATA / "coverage-gate.json", gate)
    return window, states

def acquire_bytes(window, states):
    catalog = {}
    for state_index, state in enumerate(states):
        for path, row in state.items():
            if is_source(row) or path == "LICENSE":
                info = catalog.setdefault(row["sha"], {"git_blob_sha": row["sha"], "size": row.get("size"), "occurrences": []})
                info["occurrences"].append({"state_index": state_index, "commit_sha": window["commits_oldest_first"][state_index]["sha"], "path": path})
    assert len(catalog) <= 1000, "source blob count cap exceeded"
    assert sum(item["size"] for item in catalog.values()) <= MAX_BYTES, "source byte cap exceeded"
    def fetch(info):
        target = DATA / "blobs" / (info["git_blob_sha"] + ".json")
        if target.exists():
            return json.loads(target.read_text(encoding="utf-8"))
        example = info["occurrences"][0]
        url = "https://raw.githubusercontent.com/python/devguide/" + example["commit_sha"] + "/" + urllib.parse.quote(example["path"], safe="/")
        raw, meta = get(url)
        actual = hashlib.sha1(b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw).hexdigest()
        assert actual == info["git_blob_sha"], "Git blob byte mismatch"
        assert len(raw) == info["size"], "tree/blob size mismatch"
        record = {**info, "content_sha256": hashlib.sha256(raw).hexdigest(), "verified_git_blob_sha": actual, "source": meta, "raw_bytes_persisted": False}
        if any(o["path"] == "LICENSE" for o in info["occurrences"]):
            assert raw.startswith(b"CC0 1.0 Universal"), "license is not expected CC0 text"
            (DATA / ("LICENSE-" + info["git_blob_sha"] + ".txt")).write_bytes(raw)
            record["raw_bytes_persisted"] = True
            record["license"] = "CC0-1.0"
        dump(target, record)
        return record
    records = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for i, record in enumerate(pool.map(fetch, catalog.values())):
            records.append(record)
            if i % 25 == 0:
                print(json.dumps({"phase": "source_blobs", "complete": i + 1, "total": len(catalog)}), flush=True)
    dump(DATA / "blob-catalog.json", {"blobs": records, "unique_blob_count": len(records), "unique_source_bytes": sum(r["size"] for r in records)})
    gate = json.loads((DATA / "coverage-gate.json").read_text(encoding="utf-8"))
    gate.update({"status": "passed" if gate["source_relevant_transitions"] else "failed_no_relevant_source_changes", "unique_blob_count": len(records), "unique_source_bytes": sum(r["size"] for r in records), "all_source_git_blob_hashes_verified": True, "license": "CC0-1.0"})
    dump(DATA / "coverage-gate.json", gate)
    assert gate["status"] == "passed", "fixed sample has no relevant source changes"
    return gate

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--trees-only", action="store_true")
    args = parser.parse_args()
    DATA.mkdir(exist_ok=True)
    for part in ["trees", "blobs"]:
        (DATA / part).mkdir(exist_ok=True)
    protocol_hash = hashlib.sha256((ROOT / "PROTOCOL.md").read_bytes()).hexdigest()
    pin = DATA / "protocol-freeze.json"
    if pin.exists():
        assert json.loads(pin.read_text())["protocol_sha256"] == protocol_hash, "protocol changed after freeze"
    else:
        dump(pin, {"frozen_utc": now(), "protocol_sha256": protocol_hash, "outcomes_exist_at_freeze": False})
    try:
        window, states = acquire_trees()
        if args.trees_only:
            print(json.dumps(json.loads((DATA / "coverage-gate.json").read_text()), ensure_ascii=False))
        else:
            print(json.dumps(acquire_bytes(window, states), ensure_ascii=False))
    except Exception as error:
        dump(DATA / "acquisition-failure.json", {"time_utc": now(), "action": "bounded public read", "target": "python/devguide", "error_type": type(error).__name__, "error": str(error), "status": "failed_not_silently_excluded"})
        raise

if __name__ == "__main__":
    main()
