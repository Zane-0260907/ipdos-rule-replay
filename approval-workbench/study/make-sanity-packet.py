from pathlib import Path
import json, hashlib, zipfile
from datetime import datetime, timezone
root=Path(__file__).resolve().parents[1]
target=root/'deliverables/ipdos-approval-sanity-review-v3.zip'
if target.exists(): raise SystemExit('Existing deliverable retained; use a new version name')
files=[root/'study/CONTRACT.md',root/'study/PILOT_MATRIX.json',root/'study/DEVELOPMENT_NOTES.md',root/'study/run-pilot.cjs',root/'study/commit-worker.cjs',root/'package.json']
files+=sorted((root/'core').glob('*.cjs'))+sorted((root/'tests').glob('*.cjs'))
for dirname in ['sanity-0VBnnq','sanity-peFsfb']:
    directory=root/'study/results'/dirname
    files += [p for p in directory.rglob('*') if p.is_file() and p.suffix in ['.json','.jsonl','.csv']]
manifest={'createdUTC':datetime.now(timezone.utc).isoformat(),'stage':'176-trace passing safety sanity plus preserved first failed sanity, before full main completion','sourceDigest':json.loads((root/'study/sanity-latest.json').read_text())['codeDigest'],'excludes':'SQLite database files retained locally; no node_modules, external APIs or production data','files':[]}
for p in files:manifest['files'].append({'path':p.relative_to(root).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
    for p in files:z.write(p,p.relative_to(root).as_posix())
    z.writestr('PACKET_MANIFEST.json',json.dumps(manifest,indent=2))
out={'path':str(target),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'sourceDigest':manifest['sourceDigest']}
(root/'artifacts/sanity-packet-manifest.json').write_text(json.dumps(out,indent=2),encoding='utf8')
print(json.dumps(out,indent=2))
