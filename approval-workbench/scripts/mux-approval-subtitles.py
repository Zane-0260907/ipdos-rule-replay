from pathlib import Path
import json,subprocess,hashlib
import av
root=Path(__file__).resolve().parents[1];work=root/'artifacts/approval-video';delivery=root/'deliverables/approval-video';run=Path(json.loads((work/'take-latest.json').read_text())['run']);record=json.loads((run/'recording.json').read_text());raw=delivery/'ipdos-approval-workbench-raw.mp4';target=delivery/'ipdos-approval-workbench.mp4';require=lambda x,m:None if x else (_ for _ in ()).throw(AssertionError(m));require(raw.is_file() and not target.exists(),'Keep original and existing outputs')
provenance=json.loads((work/'codec-provenance.json').read_text());binary=Path(provenance['binary']);require(hashlib.sha256(binary.read_bytes()).hexdigest()==provenance['binarySha256'],'Verified local codec binary')
result=subprocess.run([str(binary),'-hide_banner','-loglevel','error','-i',str(raw),'-i',str(delivery/'ipdos-approval-workbench.en.srt'),'-map','0:v:0','-map','0:a:0','-map','1:0','-c:v','copy','-c:a','copy','-c:s','mov_text','-metadata:s:s:0','language=eng','-disposition:s:0','default','-movflags','+faststart',str(target)],capture_output=True,text=True,creationflags=0x08000000);require(result.returncode==0,result.stderr)
def payloads(file):
    hashes={}
    with av.open(str(file)) as c:
        for packet in c.demux():
            if packet.stream.type in ['video','audio'] and packet.size:hashes.setdefault(packet.stream.type,hashlib.sha256()).update(bytes(packet))
    return {k:v.hexdigest() for k,v in hashes.items()}
a,b=payloads(raw),payloads(target);require(a==b,'Audio and video packet content unchanged by subtitle mux')
metadata={'rawFile':str(raw),'file':str(target),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'sourceFrameCount':len(record['frames']),'endHoldFrames':1,'rawRecording':str(run/'recording.json'),'planSha256':record['planSha256'],'sameAudioVideoPayloadAfterSubtitleMux':True,'packetPayloadHashes':b,'geometry':[record['width'],record['height']],'subtitles':'Embedded default selectable English mov_text plus sidecar SRT; no application-pixel caption overlay','editing':'Actual browser compositor at real timestamps; no cut, crop, padding, interpolation, old footage or time compression. Static frame holds preserve elapsed time.','codecProvenance':str(work/'codec-provenance.json')}
(work/'encoding.json').write_text(json.dumps(metadata,indent=2),encoding='utf8');print(json.dumps(metadata,indent=2))
