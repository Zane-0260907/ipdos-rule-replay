"""Independent full source-manifest verification; imports no candidate mapper."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
def load(name):
    return json.loads((ROOT / name).read_text(encoding="utf-8-sig"))
def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")).hexdigest()
def tree_hash(rows):
    # Independent bottom-up reconstruction from a nested name map.
    root = {}
    for item in rows:
        at = root
        names = item["path"].split("/")
        for name in names[:-1]:
            at = at.setdefault(name, {"children": {}})["children"]
        slot = at.setdefault(names[-1], {"children": {}})
        slot["entry"] = item
    def materialize(entries):
        chunks = []
        for name in sorted(entries, key=lambda n: n.encode() + (b"/" if entries[n]["entry"]["type"] == "tree" else b"")):
            item = entries[name]["entry"]
            if item["type"] == "tree":
                assert materialize(entries[name]["children"]) == item["sha"]
            chunks.append(item["mode"].lstrip("0").encode() + b" " + name.encode() + b"\0" + bytes.fromhex(item["sha"]))
        body = b"".join(chunks)
        return hashlib.sha1(b"tree " + str(len(body)).encode() + b"\0" + body).hexdigest()
    return materialize(root)
def source(item):
    return item["type"] == "blob" and item["mode"] in ("100644", "100755") and Path(item["path"]).suffix.lower() in (".rst", ".md", ".txt")

window = load("data/window.json")
commits = window["commits_oldest_first"]
assert len(commits) == 31
assert commits[-1]["time_utc"] <= window["cutoff_utc"]
for old, new in zip(commits, commits[1:]):
    assert new["parents"][0] == old["sha"]
catalog = {b["git_blob_sha"]: b for b in load("data/blob-catalog.json")["blobs"]}
candidate = load("data/mapped-states.json")
expected_states = []
trees = []
for commit in commits:
    obj = load("data/trees/" + commit["tree_sha"] + ".json")
    assert obj["complete"] and obj["sha"] == commit["tree_sha"]
    assert tree_hash(obj["entries"]) == commit["tree_sha"]
    trees.append(sorted((r for r in obj["entries"] if r["type"] != "tree"), key=lambda r: r["path"]))
names = sorted({r["path"].split("/")[0] if "/" in r["path"] else "@root" for tree in trees for r in tree if source(r)})
scopes = [{"name": name, "docId": "SRC-" + digest(name)[:16]} for name in names]
assert scopes == candidate["scopes"]
for index, tree in enumerate(trees):
    documents = []
    for scope in scopes:
        members = []
        for item in tree:
            name = item["path"].split("/")[0] if "/" in item["path"] else "@root"
            if source(item) and name == scope["name"]:
                blob = catalog[item["sha"]]
                assert blob["verified_git_blob_sha"] == item["sha"]
                assert blob["size"] == item["size"] and len(blob["content_sha256"]) == 64
                assert blob["source"]["status"] == 200
                members.append([item["path"], item["mode"], item["sha"], blob["content_sha256"]])
        documents.append({**scope, "contentDigest": digest(members), "memberCount": len(members), "members": members})
    shared = [[r["path"], r["mode"], r["type"], r["sha"]] for r in tree if not source(r)]
    actual = candidate["states"][index]
    assert actual["documents"] == documents and actual["sharedMembers"] == shared and actual["sharedDigest"] == digest(shared)
    expected_states.append({"commitSha": commits[index]["sha"], "sharedDigest": digest(shared), "documents": {d["docId"]: d["contentDigest"] for d in documents}})
summary = {"passed": True, "statesVerified": 31, "transitionsVerified": 30, "sourceScopes": scopes, "states": expected_states,
           "source": "Independent Python traversal and hashing; imports no production interpreter or mapping.cjs.",
           "limits": "Byte/Git-blob verification is performed during acquisition; this offline check independently rebuilds Git trees, source partition membership and all protected hashes from frozen metadata."}
(ROOT / "data/source-oracle.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
print(json.dumps({k: v for k, v in summary.items() if k != "states"}, indent=2))
