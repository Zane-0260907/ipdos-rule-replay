from pathlib import Path
import hashlib,json,zipfile,tempfile,argparse
a=argparse.ArgumentParser();a.add_argument("--version",default="v1");args=a.parse_args()
root=Path(__file__).resolve().parents[1];target=root/f'deliverables/ipdos-approval-prototype-prebuilt-{args.version}.zip'
if target.exists():raise SystemExit('Prebuilt deliverable already exists; retain it and use a new version')
files=sorted((root/'core').glob('*.cjs'))+sorted((root/'server').glob('*.cjs'))+[root/'README.md',root/'LICENSE']+sorted(p for p in (root/'frontend/build').rglob('*') if p.is_file())
manifest={'runtime':'Node 24.x builtins only; prebuilt React assets; no node_modules or databases','files':[{'path':p.relative_to(root).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]}
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
    for p in files:z.write(p,p.relative_to(root).as_posix())
    z.writestr('package.json',json.dumps({'name':'ipdos-approval-prototype-prebuilt','version':'1.0.0','private':True,'scripts':{'start':'node server/run.cjs'},'engines':{'node':'24.x'}},indent=2))
    z.writestr('PACKAGE_MANIFEST.json',json.dumps(manifest,indent=2))
directory=Path(tempfile.mkdtemp(prefix='prebuilt-acceptance-',dir=root/'artifacts')).resolve()
with zipfile.ZipFile(target) as z:
    assert z.testzip() is None
    for name in z.namelist():
        assert (directory/name).resolve().is_relative_to(directory)
    z.extractall(directory)
for entry in manifest['files']:assert hashlib.sha256((directory/entry['path']).read_bytes()).hexdigest()==entry['sha256']
meta={'path':str(target),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'extractDirectory':str(directory),'runtimeFileCount':len(files),'manifestVerified':True,'containsNodeModules':any(p.name=='node_modules' for p in directory.rglob('*'))}
(root/'artifacts/prebuilt-package-metadata.json').write_text(json.dumps(meta,indent=2),encoding='utf8');print(json.dumps(meta,indent=2))
