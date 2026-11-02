from pathlib import Path
import json,hashlib,re,subprocess
import numpy as np
import av,imageio_ffmpeg
root=Path(__file__).resolve().parents[1];work=root/'artifacts/approval-video';delivery=root/'deliverables/approval-video';encoding=json.loads((work/'encoding.json').read_text());record=json.loads(Path(encoding['rawRecording']).read_text());timing=json.loads((work/'narration-timing.json').read_text());file=Path(encoding['file']);qa=work/'corrected-v2-qa';qa.mkdir(exist_ok=True)
def require(x,message):
    if not x:raise AssertionError(message)
require(record['completed'] and not record['rehearsal'] and not record['exceptions'] and not record['blockedExternal'] and record.get('uiErrors')==[],'complete real take with no handled UI banners')
require(len(record['actions'])==26,'all frozen actions executed')
require(max(a['startSeconds']-a['targetSeconds'] for a in record['actions'])<2,'no delayed hidden/retimed stage')
run=Path(record['run'])
for frame in record['frames']:require(hashlib.sha256((run/'frames'/frame['file']).read_bytes()).hexdigest()==frame['sha256'],'raw compositor frame hash')
with av.open(str(file)) as c:
    streams=[{'type':s.type,'codec':s.codec_context.name,'durationSeconds':float(s.duration*s.time_base) if s.duration is not None else None,'language':s.metadata.get('language'),'disposition':s.disposition.value} for s in c.streams]
    duration=c.duration/av.time_base
require(240<=duration<=300,'length is 4–5 minutes');require(any(s['type']=='audio' for s in streams),'audio stream');require(any(s['type']=='subtitle' and s['codec']=='mov_text' and s['language']=='eng' and s['disposition']&1 for s in streams),'default English embedded subtitles')
require(abs(next(s['durationSeconds'] for s in streams if s['type']=='video')-duration)<.25,'video-track duration agrees with actual final PTS/container')
sample_times=[0,2,5,8,25,48,66,86,96,116,135,136,138,162,178,190,191,192,193,196,215,241,260];pending=list(sample_times);samples=[];last=None;decoded=0;last_time=-1
def save(frame,at):
    target=qa/f'frame-at-{at:03}.png';image=frame.to_image();array=np.asarray(image);require(array.mean()>25 and array.std()>10,'sampled picture is not blank');image.save(target);samples.append({'timeSeconds':at,'file':str(target),'sourceDisplayFrameTime':frame.time,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
with av.open(str(file)) as c:
    for frame in c.decode(video=0):
        require(frame.width==1600 and frame.height==1150,'original viewport geometry');require(frame.time>=last_time,'presentation time order');require(decoded>0 or frame.time<.05,'video begins at zero');last_time=frame.time;decoded+=1
        while pending and frame.time>pending[0]:save(last if last is not None else frame,pending.pop(0))
        last=frame
    while pending:save(last,pending.pop(0))
require(abs(last_time-duration)<.25,'actual decoded video reaches end of narration')
out=qa/'embedded-roundtrip.en.srt';binary=Path(json.loads((work/'codec-provenance.json').read_text())['binary']);result=subprocess.run([str(binary),'-hide_banner','-loglevel','error','-i',str(file),'-map','0:s:0',str(out)],capture_output=True,text=True,creationflags=0x08000000);require(result.returncode==0,result.stderr)
def parse_srt(path):
    entries=[]
    for block in re.split(r'\r?\n\s*\r?\n',path.read_text(encoding='utf-8-sig').strip()):
        lines=block.splitlines();match=re.match(r'(\d+):(\d+):(\d+)[,.](\d+) --> (\d+):(\d+):(\d+)[,.](\d+)',lines[1]);require(match is not None,'subtitle timestamp parse');v=list(map(int,match.groups()));entries.append({'start':v[0]*3600+v[1]*60+v[2]+v[3]/1000,'end':v[4]*3600+v[5]*60+v[6]+v[7]/1000,'text':' '.join(lines[2:])})
    return entries
original=parse_srt(delivery/'ipdos-approval-workbench.en.srt');roundtrip=parse_srt(out);require(len(original)==len(roundtrip)==len(timing['cues']),'caption count preserved');require([c['text'] for c in original]==[c['text'] for c in roundtrip],'embedded text exactly matches sidecar');max_caption_error=max(max(abs(a['start']-b['start']),abs(a['end']-b['end'])) for a,b in zip(original,roundtrip));require(max_caption_error<=.002,'caption mux preserves timing')
for c in original:require(0<=c['start']<c['end']<=duration,'caption in video range')
checkpoints=record['checkpoints'];require(checkpoints['sameOutput']['validation']['clauses'][0]['current']['value']==checkpoints['preABA']['validation']['clauses'][0]['current']['value'],'same entire output case');require(checkpoints['retry']['receipts'][0]['id']==checkpoints['procurement']['receipts'][0]['id'] and len(checkpoints['retry']['receipts'])==1,'same receipt retry');require(checkpoints['documentReceipt']['receipts'][0]['workflow']=='document','second adapter receipt')
report={'handledUiErrors':record['uiErrors'],'passed':True,'file':str(file),'sha256':encoding['sha256'],'bytes':file.stat().st_size,'durationSeconds':duration,'streams':streams,'decodedVideoFrames':decoded,'actualSourceCompositorFrames':len(record['frames']),'rawFrameHashesVerified':True,'sampledOriginalVideoFrames':samples,'captionCount':len(original),'maxSubtitleRoundtripErrorSeconds':max_caption_error,'allNarrationSegmentsFit':timing['allSegmentsFit'],'offlineSpeechClockCalibration':timing['calibration'],'maximumActionStartLatenessSeconds':max(a['startSeconds']-a['targetSeconds'] for a in record['actions']),'sameAudioVideoPayloadAfterSubtitleMux':encoding['sameAudioVideoPayloadAfterSubtitleMux'],'oldFootageReused':False,'pixelOverlaysOrCrop':False,'scope':'Decode/structure/packet/source-frame/phase assertions, subtitle roundtrip, offline speech-clock fit and manual inspection of sampled full frames. No independent full human listening or participant study claimed.'}
(work/'VIDEO_QA.json').write_text(json.dumps(report,indent=2),encoding='utf8');print(json.dumps({k:v for k,v in report.items() if k not in ['sampledOriginalVideoFrames','offlineSpeechClockCalibration']},indent=2))
