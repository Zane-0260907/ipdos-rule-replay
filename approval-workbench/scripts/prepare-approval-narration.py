from pathlib import Path
import json,re,textwrap,wave,hashlib
import numpy as np
root=Path(__file__).resolve().parents[1];work=root/'artifacts/approval-video';delivery=root/'deliverables/approval-video';delivery.mkdir(exist_ok=True)
plan=json.loads((work/'PLAN.json').read_text());rate=24000;audio=np.zeros(rate*plan['durationSeconds'],dtype=np.int16)
def samples(p):
    with wave.open(str(p)) as w:
        assert w.getframerate()==rate and w.getnchannels()==1 and w.getsampwidth()==2
        return np.frombuffer(w.readframes(w.getnframes()),dtype='<i2')
cal=samples(work/'clock-calibration.wav').astype(float);width=240;rms=np.sqrt(np.mean(cal[:len(cal)//width*width].reshape(-1,width)**2,axis=1));active=np.where(rms>rms.max()*.03)[0];groups=[]
for i in active:
    if not groups or i-groups[-1][-1]>.5*rate/width:groups.append([i])
    else:groups[-1].append(i)
assert len(groups)==3,('Three calibration words expected',len(groups))
onsets=np.array([g[0]*width/rate for g in groups]);events=json.loads((work/'clock-calibration-events.json').read_text(encoding='utf-8-sig'));seconds=np.array([e['seconds'] for e in events]);slope,offset=np.polyfit(seconds,onsets,1);assert abs(slope-2/3)<.03,(slope,onsets.tolist(),seconds.tolist());clock_scale=2/3
cues=[];fits=[]
for i,part in enumerate(plan['narration']):
    data=samples(work/('speech-%02d.wav'%i));duration=len(data)/rate;assert duration<part['end']-part['start']-.1,(i,duration);start=round(part['start']*rate);audio[start:start+len(data)]=data
    words=json.loads((work/('speech-%02d-words.json'%i)).read_text(encoding='utf-8-sig'));words=words if isinstance(words,list) else [words];text=part['text'];chunks=[]
    for sentence in re.finditer(r'[^.!?]+[.!?]?(?:\s+|$)',text):
        cursor=sentence.start()
        for chunk in textwrap.wrap(sentence.group().strip(),180,break_long_words=False,break_on_hyphens=False):
            begin=text.find(chunk,cursor);chunks.append((begin,begin+len(chunk),chunk));cursor=begin+len(chunk)
    for begin,end,caption in chunks:
        selected=[w for w in words if begin<=w['position']<end];later=[w['seconds']*clock_scale for w in words if w['position']>=end];assert selected
        a=part['start']+selected[0]['seconds']*clock_scale;b=part['start']+(later[0] if later else duration);assert part['start']<=a<b<=part['start']+duration+.05,(i,a,b,duration);cues.append({'start':a,'end':b,'text':caption,'part':i})
    fits.append({'part':i,'start':part['start'],'slotEnd':part['end'],'actualAudioSeconds':duration,'wordEvents':len(words),'wavSha256':hashlib.sha256((work/('speech-%02d.wav'%i)).read_bytes()).hexdigest()})
with wave.open(str(work/'narration-full.wav'),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(audio.astype('<i2').tobytes())
def stamp(t):
    n=round(t*1000);return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
for i,c in enumerate(cues):
    if i:assert c['start']>=cues[i-1]['end']-.01
(delivery/'ipdos-approval-workbench.en.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(c["start"])} --> {stamp(c["end"])}\n'+'\n'.join(textwrap.wrap(c['text'],100)) for i,c in enumerate(cues))+'\n',encoding='utf8')
(delivery/'ipdos-approval-workbench-script.en.txt').write_text('New native English dual-workflow demonstration. Offline Microsoft Zira Desktop narration.\n\n'+'\n\n'.join(f'{p["start"]}–{p["end"]} seconds | {p["label"]}\n{p["text"]}' for p in plan['narration'])+'\n',encoding='utf8')
report={'planSha256':hashlib.sha256((work/'PLAN.json').read_bytes()).hexdigest(),'durationSeconds':plan['durationSeconds'],'allSegmentsFit':True,'calibration':{'wordEventSeconds':seconds.tolist(),'waveformOnsets':onsets.tolist(),'measuredSlope':float(slope),'measuredOffset':float(offset),'appliedClockScale':clock_scale},'parts':fits,'cues':cues,'timingScope':'Offline same-voice waveform and event-clock calibration; subtitle boundaries from measured speech events; no audio speed-up or claimed human forced alignment'}
(work/'narration-timing.json').write_text(json.dumps(report,indent=2),encoding='utf8');print(json.dumps({'prepared':True,'parts':len(fits),'cues':len(cues),'clockScale':clock_scale,'calibrationSlope':float(slope),'allFit':True},indent=2))
