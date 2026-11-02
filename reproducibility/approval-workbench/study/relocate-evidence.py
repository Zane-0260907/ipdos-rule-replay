"""Relocate public artifact pointer copies; immutable run records are never rewritten."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
prefix="${ARTIFACT_ROOT}"
def remap(value):
    if isinstance(value,list):return [remap(x) for x in value]
    if isinstance(value,dict):return {k:remap(v) for k,v in value.items()}
    if isinstance(value,str) and value.startswith(prefix):
        suffix=value[len(prefix):].lstrip("/"+chr(92)).replace(chr(92),"/")
        return str(root/suffix)
    return value
changed=[]
for p in sorted((root/"study").glob("*-latest.json")):
    old=json.loads(p.read_text());new=remap(old)
    if new!=old:
        backup=p.with_name(p.stem+".recorded.json")
        if not backup.exists():backup.write_bytes(p.read_bytes())
        p.write_text(json.dumps(new,indent=2),encoding="utf8");changed.append(p.name)
print(json.dumps({"root":str(root),"relocatedPointerCopies":changed,"rawRunFilesChanged":False},indent=2))
