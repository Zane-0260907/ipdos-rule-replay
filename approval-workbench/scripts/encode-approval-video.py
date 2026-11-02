from pathlib import Path
from fractions import Fraction
import json,wave,subprocess,hashlib
import numpy as np
import av,imageio_ffmpeg
root=Path(__file__).resolve().parents[1];work=root/'artifacts/approval-video';delivery=root/'deliverables/approval-video'
pointer=json.loads((work/'take-latest.json').read_text());run=Path(pointer['run']);record=json.loads((run/'recording.json').read_text());plan=json.loads((work/'PLAN.json').read_text());duration=plan['durationSeconds']
assert record['completed'] and record.get('uiErrors')==[] and not record['rehearsal'] and record['planSha256']==hashlib.sha256((work/'PLAN.json').read_bytes()).hexdigest()
raw=delivery/'ipdos-approval-workbench-corrected-v2-raw.mp4';target=delivery/'ipdos-approval-workbench-corrected-v2.mp4';assert not raw.exists() and not target.exists(),'Preserve prior takes'
with wave.open(str(work/'narration-full.wav')) as w:
    rate=w.getframerate();assert rate==24000 and w.getnchannels()==1;audio=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(np.float32)/32768
container=av.open(str(raw),'w',format='mp4',options={'movflags':'+faststart'})
video=container.add_stream('libx264',rate=30);video.width,video.height,video.pix_fmt=record['width'],record['height'],'yuv420p';video.time_base=Fraction(1,1000);video.codec_context.time_base=Fraction(1,1000);video.codec_context.max_b_frames=0;video.options={'crf':'20','preset':'fast','bf':'0'}
sound=container.add_stream('aac',rate=rate);sound.layout='mono';sound.bit_rate=96000;position=0;previous=-1
def push_audio(limit):
    global position
    while position<limit:
        stop=min(position+1024,limit);frame=av.AudioFrame.from_ndarray(audio[position:stop].reshape(1,-1),format='fltp',layout='mono');frame.sample_rate=rate;frame.pts=position;frame.time_base=Fraction(1,rate)
        for packet in sound.encode(frame):container.mux(packet)
        position=stop
def push_picture(filename,pts):
    with av.open(str(run/'frames'/filename)) as image:
        frame=next(image.decode(video=0));assert frame.width==record['width'] and frame.height==record['height'];frame.pts=pts;frame.time_base=Fraction(1,1000)
        for packet in video.encode(frame):container.mux(packet)
count=0
for source in record['frames']:
    at=source['timeSeconds']
    if at>=duration:break
    pts=max(previous+1,round(at*1000)) if count else 0;push_picture(source['file'],pts);previous=pts;count+=1;push_audio(min(len(audio),round(at*rate)))
    if count%100==0:print(json.dumps({'encodedSourceFrames':count,'sourceSeconds':round(at,3)}),flush=True)
push_picture(record['frames'][-1]['file'],round(duration*1000));push_audio(round(duration*rate))
for packet in video.encode():container.mux(packet)
for packet in sound.encode():container.mux(packet)
container.close()
binary=Path(json.loads((work/'codec-provenance.json').read_text())['binary']);assert binary.is_file()
cmd=[str(binary),'-hide_banner','-loglevel','error','-i',str(raw),'-i',str(delivery/'ipdos-approval-workbench.en.srt'),'-map','0:v:0','-map','0:a:0','-map','1:0','-c:v','copy','-c:a','copy','-c:s','mov_text','-metadata:s:s:0','language=eng','-disposition:s:0','default','-movflags','+faststart',str(target)]
result=subprocess.run(cmd,capture_output=True,text=True);assert result.returncode==0,result.stderr
def packets(file):
    hashes={}
    with av.open(str(file)) as c:
        for packet in c.demux():
            if packet.stream.type in ['video','audio'] and packet.size:hashes.setdefault(packet.stream.type,hashlib.sha256()).update(bytes(packet))
    return {k:v.hexdigest() for k,v in hashes.items()}
raw_payload=packets(raw);final_payload=packets(target);assert raw_payload==final_payload,'Subtitle mux must not alter audio/video packets'
metadata={'rawFile':str(raw),'file':str(target),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'sourceFrameCount':count,'endHoldFrames':1,'rawRecording':str(run/'recording.json'),'planSha256':record['planSha256'],'sameAudioVideoPayloadAfterSubtitleMux':True,'packetPayloadHashes':final_payload,'geometry':[record['width'],record['height']],'subtitles':'Embedded selectable English mov_text plus matching sidecar SRT; original application pixels receive no text overlay','editing':'Faithful JPEG-to-H264 transcoding at real compositor timestamps, no cut/splice/crop, padding, interpolation, old footage or time compression; static screen held until next actual update'}
(work/'encoding.json').write_text(json.dumps(metadata,indent=2),encoding='utf8');print(json.dumps(metadata,indent=2))
