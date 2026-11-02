from pathlib import Path
from datetime import datetime, timezone
import json, hashlib, zipfile
root=Path(__file__).resolve().parents[1]
target=root/'deliverables/ipdos-approval-semantic-review-v4.zip'
if target.exists(): raise SystemExit('Existing review package retained; create a new version')
names=['CONTRACT.md','CONTRACT_IMPLEMENTATION_NOTES.md','PILOT_MATRIX.json','DOCUMENT_CONTRACT.md','DOCUMENT_MATRIX.json','TIMING_PROTOCOL.json','DEVELOPMENT_NOTES.md','run-pilot.cjs','commit-worker.cjs','run-document-pilot.cjs','audit-results.cjs','run-timing.cjs']
files=[root/'study'/n for n in names]+sorted((root/'core').glob('*.cjs'))+sorted((root/'tests').glob('*.cjs'))
summaries={key:json.loads((root/'study'/name).read_text()) for key,name in {'procurement':'main-latest.json','procurementSanity':'sanity-latest.json','document':'document-main-latest.json','documentSanity':'document-sanity-latest.json','procurementSemantic':'procurement-semantic-latest.json','documentSemantic':'document-semantic-latest.json'}.items()}
directories={Path(summaries[k]['run']) for k in ['procurement','procurementSanity','document','documentSanity']}
directories.add(root/'study/results/sanity-0VBnnq')
for directory in sorted(directories):
    files += [p for p in directory.rglob('*') if p.is_file() and p.suffix in ['.json','.jsonl','.csv']]
files += [root/'artifacts'/name for name in ['final-core-checks.log','http-boundary-evidence.json','library-first-slice-code-result.json','library-sanity-packet-result.json']]
files=list(dict.fromkeys(files))
overview={'createdUTC':datetime.now(timezone.utc).isoformat(),'stage':'Final shared-core functional and per-item semantic review; timing and prebuilt browser validation pending','summaries':summaries,'limits':'Synthetic deterministic local fixtures; self-implemented safe comparators; no human or production rate; normal child-process restart and injected exceptions are distinct from power loss','earlierFailure':'sanity-0VBnnq preserved; four harness assertions read native error code instead of injected message. Actual effect records rolled back.','databases':'Per-trial SQLite files retained locally; excluded from this small review packet. A full archive can accompany final delivery.'}
manifest={'files':[{'path':p.relative_to(root).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]}
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
    for p in files:z.write(p,p.relative_to(root).as_posix())
    z.writestr('REVIEW_OVERVIEW.json',json.dumps(overview,indent=2))
    z.writestr('PACKET_MANIFEST.json',json.dumps(manifest,indent=2))
with zipfile.ZipFile(target) as z:
    assert z.testzip() is None
metadata={'path':str(target),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'fileCount':len(files),'procurementSourceDigest':summaries['procurement']['codeDigest'],'documentSourceDigest':summaries['document']['sourceDigest'],'auditScriptSha256':summaries['procurementSemantic']['auditScriptSha256']}
(root/'artifacts/semantic-packet-manifest.json').write_text(json.dumps(metadata,indent=2),encoding='utf8')
(root/'deliverables/ipdos-approval-semantic-summary-v4.json').write_text(json.dumps(overview,indent=2),encoding='utf8')
print(json.dumps(metadata,indent=2))
