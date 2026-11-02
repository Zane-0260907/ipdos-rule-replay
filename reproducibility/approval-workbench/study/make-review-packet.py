from pathlib import Path
import hashlib, json, platform, sys, zipfile
from datetime import datetime, timezone

root = Path(__file__).resolve().parents[1]
pointer = json.loads((root/'artifacts/first-slice-latest.json').read_text())
paths = [root/'study/CONTRACT.md', root/'package.json', root/'artifacts/dev-checks-v2.log']
paths += sorted((root/'core').glob('*.cjs')) + sorted((root/'tests').glob('*.cjs'))
paths += [Path(pointer['evidence'])]
manifest = {'createdUTC':datetime.now(timezone.utc).isoformat(), 'stage':'Implemented core and 8 development checks, not formal pilot or complete UI', 'testResult':{'passed':8,'failed':0}, 'scope':'Synthetic local, single-process SQLite; close/reopen test is not power-loss recovery', 'files':[]}
for p in paths:
    manifest['files'].append({'path':str(p.relative_to(root)).replace('\\','/'),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
manifest_path=root/'artifacts/first-slice-code-manifest.json'
manifest_path.write_text(json.dumps(manifest,indent=2),encoding='utf8')
target=root/'deliverables/ipdos-approval-first-slice-code-v2.zip'
target.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
    for p in paths+[manifest_path]: z.write(p,str(p.relative_to(root)).replace('\\','/'))
progress={'stage':'Core implemented; first end-to-end and boundary checks passed; formal pilot and UI pending','updatedUTC':manifest['createdUTC'],'root':str(root),'contract':'study/CONTRACT.md','checks':{'passed':8,'failed':0,'log':'artifacts/dev-checks-v2.log'},'firstTrace':pointer,'reviewPacket':str(target),'packetSha256':hashlib.sha256(target.read_bytes()).hexdigest(),'implemented':['Finite key/predicate/join/integer contract interpreter','Durable predicate-scoped membership epochs and key absence epochs','Immutable evidence snapshots and explicit clause re-review','BEGIN IMMEDIATE commit, live permission/rule checks, receipt/key mapping atomicity','Per-draft unique receipt','Independent full-materialization oracle'],'notYetCompleted':['Four-mode frozen pilot matrix execution','English impact/re-review UI','Second workflow','Bounded cost comparison and external assessment'],'oldDeliverablesModified':False,'score':'No score asserted; independent assessment required'}
(root/'PROGRESS.json').write_text(json.dumps(progress,indent=2),encoding='utf8')
print(json.dumps({'packet':str(target),'bytes':target.stat().st_size,'sha256':progress['packetSha256'],'tests':progress['checks']},indent=2))
