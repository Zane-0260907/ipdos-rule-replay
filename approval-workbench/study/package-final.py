from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,zipfile,argparse
a=argparse.ArgumentParser();a.add_argument("--version",default="v1");a.add_argument("--reuse-sqlite",action="store_true");args=a.parse_args()
root=Path(__file__).resolve().parents[1];out=root/'deliverables'
def metadata(path):return {'path':str(path),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
def archive(target,files,level=6,extra=None):
    if target.exists():raise RuntimeError('Preserve existing artifact: '+str(target))
    files=list(dict.fromkeys(files));manifest={'createdUTC':datetime.now(timezone.utc).isoformat(),'files':[{'path':p.relative_to(root).as_posix(),**{k:v for k,v in metadata(p).items() if k!='path'}} for p in files]}
    with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=level) as z:
        for p in files:z.write(p,p.relative_to(root).as_posix())
        z.writestr('PACKAGE_MANIFEST.json',json.dumps(manifest,indent=2))
        if extra:z.writestr('PACKAGE_SCOPE.json',json.dumps(extra,indent=2))
    with zipfile.ZipFile(target) as z:assert z.testzip() is None
    return metadata(target)
source=[root/n for n in ['README.md','LICENSE','package.json']]
for directory in ['core','server','scripts']:source+=sorted(p for p in (root/directory).rglob('*') if p.is_file())
source+=sorted(p for p in (root/'study').glob('*') if p.is_file())+sorted(p for p in (root/'tests').glob('*') if p.is_file())
for directory in ['src','public','build']:source+=sorted(p for p in (root/'frontend'/directory).rglob('*') if p.is_file())
source += [root/'frontend'/n for n in ['package.json','package-lock.json','vite.config.ts','index.html']]
sourceMeta=archive(out/f'ipdos-approval-prototype-source-{args.version}.zip',source,extra={'scope':'Stable complete functional source, native runtime, locked English frontend, study/audit/QA scripts and frozen protocols. Excludes node_modules, raw results/SQLite/browser profiles and previous delivered packages. New video recording tooling is delivered separately.','oldDeliverablesModified':False})
latest={name:json.loads((root/'study'/name).read_text()) for name in ['main-latest.json','sanity-latest.json','document-main-latest.json','document-sanity-latest.json','timing-latest.json','procurement-semantic-latest.json','document-semantic-latest.json']}
dirs={Path(latest[n]['run']) for n in ['main-latest.json','sanity-latest.json','document-main-latest.json','document-sanity-latest.json','timing-latest.json']};dirs.add(root/'study/results/sanity-0VBnnq')
records=[];databases=[]
for directory in sorted(dirs):
    records += [p for p in directory.rglob('*') if p.is_file() and p.suffix in ['.json','.jsonl','.csv']]
    databases += [p for p in directory.rglob('*') if p.is_file() and p.suffix=='.sqlite']
records += sorted(p for p in (root/'study/report').rglob('*') if p.is_file())
if args.version != 'v1':
    records += [root/'artifacts'/n for n in ['prebuilt-acceptance-v2.json','ui-fix-core-hashes.json','UI_FIX.diff','ui-banner-negative-control.log','ui-fix-v2-frontend-build.log']]
for directory in ['core','tests']:records+=sorted((root/directory).glob('*.cjs'))
records += [p for p in (root/'study').glob('*') if p.is_file()]
records += [root/'artifacts'/n for n in ['prebuilt-acceptance.json','prebuilt-package-metadata.json','final-core-checks.log','http-boundary-evidence.json','release-frontend-build.log','browser-approval-failure.json'] if (root/'artifacts'/n).exists()]
acceptance=json.loads((root/f'artifacts/prebuilt-acceptance-{args.version}.json' if args.version!='v1' else root/'artifacts/prebuilt-acceptance.json').read_text())
for workflow in acceptance['workflows'].values():records += [Path(workflow['evidence'])]+[Path(p) for p in workflow['screenshots']]
paper=json.loads((root/'artifacts/paper-case-latest.json').read_text());records += [root/paper['evidence'],Path(paper['screenshot'])]
evidenceMeta=archive(out/f'ipdos-approval-prototype-evidence-{args.version}.zip',records,extra={'scope':'Final current-code procurement/document/timing raw records, per-item semantic results/CSV, protocols/scripts, preserved first failed sanity and raw English screenshots; SQLite files supplied separately.','sourceBundle':sourceMeta,'prebuilt':acceptance['prebuilt']})
dbMeta=metadata(out/'ipdos-approval-prototype-sqlite-audit-v1.zip') if args.reuse_sqlite else archive(out/'ipdos-approval-prototype-sqlite-audit-v1.zip',databases,level=3,extra={'scope':'Complete synthetic per-trial SQLite files for final main/sanity/timing runs and first failed sanity. No private or production databases. Extract together with source/evidence and run study/relocate-evidence.py before auditing saved records.','databaseCount':len(databases),'uncompressedDatabaseBytes':sum(p.stat().st_size for p in databases)})
manifest={'source':sourceMeta,'evidence':evidenceMeta,'sqlite':dbMeta,'prebuilt':metadata(out/f'ipdos-approval-prototype-prebuilt-{args.version}.zip'),'runtimeFilesUnchangedSinceAcceptance':True,'video':'New real dual-workflow recording is a subsequent private artifact; old video is not reused'}
(out/f'FINAL_PACKAGE_HASHES_{args.version}.json').write_text(json.dumps(manifest,indent=2),encoding='utf8');print(json.dumps(manifest,indent=2))
