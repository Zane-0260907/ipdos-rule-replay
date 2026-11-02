'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os');
const {FactStore}=require('../core/store.cjs'),{ApprovalService}=require('../core/service.cjs'),{seedProcurement}=require('../core/fixtures.cjs');
const {readWorld,procurementOracle,retained}=require('../tests/full-oracle.cjs');
const protocol=JSON.parse(fs.readFileSync(path.join(__dirname,'TIMING_PROTOCOL.json'),'utf8'));
const source=['study/TIMING_PROTOCOL.json','study/run-timing.cjs','tests/full-oracle.cjs',...fs.readdirSync(path.join(__dirname,'../core')).filter(f=>f.endsWith('.cjs')).map(f=>'core/'+f)];
const hashes=Object.fromEntries(source.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',f))).digest('hex')]));
const run=fs.mkdtempSync(path.join(__dirname,'results','timing-')),rows=[],captures=[],commits=[];
const measure=fn=>{const t=process.hrtime.bigint(),value=fn();return {value,microseconds:Number(process.hrtime.bigint()-t)/1000};};
const quantile=(v,p)=>{const x=[...v].sort((a,b)=>a-b);return x[Math.max(0,Math.ceil(p*x.length)-1)];};
function approve(s,c,mode){const p=s.preview(c.draftId,c.actorId,mode);return s.review(c.draftId,c.actorId,{previewId:p.preview.id,seal:p.preview.seal,clauseIds:p.validation.clauses.map(x=>x.id),mode});}
try{
 fs.writeFileSync(path.join(run,'environment.json'),JSON.stringify({node:process.version,versions:process.versions,platform:process.platform,cpu:os.cpus()[0]?.model,protocol,hashes},null,2));
 for(const scale of protocol.scales)for(const pattern of protocol.patterns)for(const mode of protocol.modes){
  const dir=path.join(run,scale+'-'+pattern+'-'+mode);fs.mkdirSync(dir);const store=new FactStore(path.join(dir,'synthetic.sqlite')),c=seedProcurement(store,{count:scale}),s=new ApprovalService(store);
  try{
   const capture=measure(()=>s.preview(c.draftId,c.actorId,mode)),p=capture.value,review=measure(()=>s.review(c.draftId,c.actorId,{previewId:p.preview.id,seal:p.preview.seal,clauseIds:p.validation.clauses.map(x=>x.id),mode})),original=procurementOracle(readWorld(store),c);
   const snapshot=JSON.parse(store.db.prepare('SELECT body FROM snapshots WHERE id=?').get(p.snapshotId).body),dependencyCatalog=snapshot.tokens;
   captures.push({scale,pattern,mode,captureMicroseconds:capture.microseconds,reviewMicroseconds:review.microseconds,snapshotBytes:Buffer.byteLength(JSON.stringify(snapshot)),deduplicatedWitnessBytes:Buffer.byteLength(JSON.stringify(dependencyCatalog)),approvalLedgerBytes:store.db.prepare('SELECT sum(length(body)) AS n FROM approvals').get().n,keyTokenCount:Object.values(dependencyCatalog).filter(x=>x.kind==='key').length,predicateTokenCount:Object.values(dependencyCatalog).filter(x=>x.kind==='scan').length});
   for(let i=-protocol.warmupsPerCell;i<protocol.measuredSamplesPerCell;i++){
    if(pattern==='unrelated_store')store.patch('inventory','OTHER-STORE:RICE',{onHandG:60000-i-100});
    if(pattern==='related_stock')store.patch('inventory',c.storeId+':RICE',{onHandG:(i%2===0?20000:25000)});
    if(pattern==='shared_budget_price')store.patch('prices','RICE',{centsPerKg:200+i+100});
    const measured=measure(()=>store.transact(()=>s.validate(c.draftId,mode))),v=measured.value,expected=retained(original,procurementOracle(readWorld(store),c));
    if(v.clauses.some(x=>x.retained&&!expected[x.id]))throw Error('TIMING_SAFETY_ERROR '+scale+' '+pattern+' '+mode);
    const row={scale,pattern,mode,sample:i,warmup:i<0,elapsedMicroseconds:measured.microseconds,requiredReviewCount:v.requiredReviewCount,unnecessaryReviewCount:v.clauses.filter(x=>!x.retained&&expected[x.id]).length,metrics:v.metrics};fs.appendFileSync(path.join(run,'raw.jsonl'),JSON.stringify(row)+'\n');if(i>=0)rows.push(row);
   }
   approve(s,c,mode);const final=measure(()=>s.confirm(c.actorId,'timing-confirm-'+scale+'-'+pattern+'-'+mode,s.commitRequest(c.draftId,mode)));commits.push({scale,pattern,mode,elapsedMicroseconds:final.microseconds,receiptId:final.value.receipt.id,receiptBytes:Buffer.byteLength(JSON.stringify(final.value.receipt))});
  }finally{store.close();}
  console.log(JSON.stringify({scale,pattern,mode,completedCells:captures.length}));
 }
 const grouped=protocol.scales.flatMap(scale=>protocol.patterns.flatMap(pattern=>protocol.modes.map(mode=>{const samples=rows.filter(r=>r.scale===scale&&r.pattern===pattern&&r.mode===mode),times=samples.map(x=>x.elapsedMicroseconds);return {scale,pattern,mode,n:times.length,medianMicroseconds:quantile(times,.5),p95Microseconds:quantile(times,.95),minMicroseconds:Math.min(...times),maxMicroseconds:Math.max(...times),requiredReviewCount:samples[0].requiredReviewCount,meanEvaluatedNodes:samples.reduce((n,x)=>n+(x.metrics.materialization?.evaluatedNodes||0),0)/samples.length};})));
 const comparison=protocol.scales.flatMap(scale=>protocol.patterns.map(pattern=>{const full=grouped.find(x=>x.scale===scale&&x.pattern===pattern&&x.mode==='full'),fine=grouped.find(x=>x.scale===scale&&x.pattern===pattern&&x.mode==='incremental');return {scale,pattern,fullMedianMicroseconds:full.medianMicroseconds,incrementalMedianMicroseconds:fine.medianMicroseconds,fullOverIncrementalRatio:full.medianMicroseconds/fine.medianMicroseconds,incrementalFaster:fine.medianMicroseconds<full.medianMicroseconds};}));
 const summary={run,passed:true,measuredSamples:rows.length,warmupSamples:captures.length*protocol.warmupsPerCell,cells:captures.length,grouped,comparison,interpretation:protocol.report};fs.writeFileSync(path.join(run,'summary.json'),JSON.stringify(summary,null,2));fs.writeFileSync(path.join(run,'capture-costs.json'),JSON.stringify(captures,null,2));fs.writeFileSync(path.join(run,'commit-costs.json'),JSON.stringify(commits,null,2));fs.writeFileSync(path.join(__dirname,'timing-latest.json'),JSON.stringify({run,passed:true,measuredSamples:rows.length,cells:captures.length},null,2));console.log(JSON.stringify({run,measuredSamples:rows.length,comparison},null,2));
}catch(e){fs.writeFileSync(path.join(run,'failure.json'),JSON.stringify({error:e.message,stack:e.stack},null,2));console.error(e);process.exitCode=1;}
