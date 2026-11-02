'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const {FactStore}=require('../core/store.cjs'),{seedProcurement}=require('../core/fixtures.cjs'),{ApprovalService}=require('../core/service.cjs');
const {readWorld,procurementOracle,retained}=require('../tests/full-oracle.cjs');
const root=path.resolve(__dirname,'..'),matrix=JSON.parse(fs.readFileSync(path.join(__dirname,'PILOT_MATRIX.json'),'utf8'));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const phase=process.argv.includes('--main')?'main':'sanity',actor='synthetic-manager-01';
const codeFiles=['study/PILOT_MATRIX.json','study/CONTRACT.md','study/run-pilot.cjs','study/commit-worker.cjs','tests/full-oracle.cjs',...fs.readdirSync(path.join(root,'core')).filter(f=>f.endsWith('.cjs')).map(f=>'core/'+f)];
const hashes=Object.fromEntries(codeFiles.map(f=>[f,hash(path.join(root,f))])),codeDigest=crypto.createHash('sha256').update(JSON.stringify(hashes)).digest('hex');
const runDir=fs.mkdtempSync(path.join((fs.mkdirSync(path.join(__dirname,'results'),{recursive:true}),path.join(__dirname,'results')),phase+'-'));
function check(ok,message){if(!ok)throw Error('STUDY_ASSERTION: '+message);}
const micros=fn=>{const t=process.hrtime.bigint(),value=fn();return {value,microseconds:Number(process.hrtime.bigint()-t)/1000};};
function state(store,draftId){return {receipts:store.db.prepare('SELECT count(*) AS n FROM receipts').get().n,outcomes:store.db.prepare('SELECT count(*) AS n FROM outcomes').get().n,budgetUses:store.db.prepare("SELECT count(*) AS n FROM facts WHERE table_name='budgetUses' AND json_extract(body,'$.draftId')=?").get(draftId).n,draftStatus:store.draft(draftId).status};}
function noPartial(s){return s.receipts===s.outcomes&&s.receipts===s.budgetUses&&(s.receipts===0?s.draftStatus==='open':s.receipts===1&&s.draftStatus==='committed');}
function attempt(fn){try{return {ok:true,result:fn()};}catch(e){return {ok:false,code:e.code||e.message,message:e.message,status:e.status};}}
function startWorker(dir,file,input,label){const inputFile=path.join(dir,label+'-input.json'),outputFile=path.join(dir,label+'-output.json');fs.writeFileSync(inputFile,JSON.stringify(input));const child=spawn(process.execPath,[path.join(__dirname,'commit-worker.cjs'),file,inputFile,outputFile],{stdio:['ignore','ignore','pipe'],windowsHide:true});let stderr='';child.stderr.on('data',b=>stderr+=b);const done=new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',code=>{if(code!==0||!fs.existsSync(outputFile))reject(Error('Study worker exit '+code+' '+stderr));else resolve(JSON.parse(fs.readFileSync(outputFile,'utf8')));});});return {done,outputFile,pid:child.pid};}
async function waitReady(files){const start=Date.now();while(!files.every(f=>fs.existsSync(f))){if(Date.now()-start>12000)throw Error('Study worker readiness timeout');await new Promise(r=>setTimeout(r,10));}}
function prepare(store,c,scenario){
 if(scenario.setup==='two_reserves')for(const id of ['RES-A','RES-B'])store.put('reserves',id,{storeId:c.storeId,sku:'RICE',status:'active',quantityG:500,reasonId:'SAFETY'});
 if(scenario.setup==='inactive_reserve')store.put('reserves','RES-OFF',{storeId:c.storeId,sku:'RICE',status:'inactive',quantityG:1000,reasonId:'SAFETY'});
 if(scenario.setup==='missing_reason')store.put('reserves','RES-MISSING',{storeId:c.storeId,sku:'RICE',status:'active',quantityG:1000,reasonId:'ABSENT'});
}
function mutate(store,c,scenario,service){
 const stock=c.storeId+':RICE',auth='procurement:'+actor,reserve={storeId:c.storeId,sku:'RICE',status:'active',quantityG:1000,reasonId:'SAFETY'};
 switch(scenario.id){
 case 'unrelated_store':case 'opaque_fallback':store.patch('inventory','OTHER-STORE:RICE',{onHandG:59000});break;
 case 'unselected_sku':store.put('inventory',c.storeId+':UNSELECTED',{storeId:c.storeId,sku:'UNSELECTED',onHandG:0,demandG:2000});break;
 case 'display_only':store.patch('inventory',stock,{name:'Updated display rice',note:'Changed display note'});break;
 case 'related_stock':case 'stale_preview':case 'before_commit_change':store.patch('inventory',stock,{onHandG:20000});break;
 case 'zero_quantity_stock':store.patch('inventory',c.storeId+':GREENS',{onHandG:25000});break;
 case 'field_aba':store.patch('inventory',stock,{onHandG:20000});store.patch('inventory',stock,{onHandG:25000});break;
 case 'same_output_evidence':store.patch('reserveReasons','SAFETY',{version:'reason-2'});break;
 case 'matching_insert':case 'matching_insert_delete':store.put('reserves','RES-NEW',reserve);if(scenario.id.endsWith('delete'))store.delete('reserves','RES-NEW');break;
 case 'nonmatching_insert':store.put('reserves','RES-OTHER',{...reserve,storeId:'OTHER-STORE'});break;
 case 'matching_delete':store.delete('reserves','RES-A');break;
 case 'member_replacement_same_total':{const before=store.get('reserves','RES-A').body;store.delete('reserves','RES-A');store.put('reserves','RES-C',before);break;}
 case 'predicate_boundary':case 'predicate_aba':store.patch('reserves','RES-OFF',{status:'active'});if(scenario.id==='predicate_aba')store.patch('reserves','RES-OFF',{status:'inactive'});break;
 case 'null_numeric':store.patch('inventory',stock,{onHandG:null});break;
 case 'missing_numeric':{const body={...store.get('inventory',stock).body};delete body.onHandG;store.put('inventory',stock,body);break;}
 case 'negative_numeric':store.patch('reserves','RES-A',{quantityG:-1});break;
 case 'overflow_numeric':store.patch('inventory',stock,{demandG:Number.MAX_SAFE_INTEGER});break;
 case 'duplicate_key':{const result=attempt(()=>store.put('inventory',stock,store.get('inventory',stock).body,{insertOnly:true}));check(!result.ok&&result.code==='DUPLICATE_KEY','duplicate key rejected');return {duplicateRejected:result};}
 case 'distinct_equal_members':store.put('reserves','RES-C',{...reserve,quantityG:500});break;
 case 'join_fanout':store.patch('reserveReasons','SAFETY',{active:false,version:'reason-2'});break;
 case 'missing_right_insert':case 'absent_key_aba_restart':store.put('reserveReasons','ABSENT',{active:true,version:'reason-created'});if(scenario.id==='absent_key_aba_restart')store.delete('reserveReasons','ABSENT');break;
 case 'stock_delete_reinsert':{const body=store.get('inventory',stock).body;store.delete('inventory',stock);store.put('inventory',stock,body);break;}
 case 'shared_budget_price':store.patch('prices','RICE',{centsPerKg:201});break;
 case 'shared_budget_quantity':service.editQuantity(c.draftId,actor,'RICE',32000);break;
 case 'shared_budget_member':case 'shared_budget_member_aba':case 'shared_budget_exceeded':store.put('budgetUses','USE-OTHER',{storeId:c.storeId,draftId:'OTHER-DRAFT',status:'committed',amountCents:scenario.id==='shared_budget_exceeded'?300000000:500});if(scenario.id==='shared_budget_member_aba')store.delete('budgetUses','USE-OTHER');break;
 case 'rule_version':store.patch('rules','inventory',{version:'inventory-2'});break;
 case 'rule_revoke':store.patch('rules','inventory',{enabled:false,version:'inventory-revoked'});break;
 case 'permission_revoke':store.patch('authority',auth,{commit:false,grantVersion:2});break;
 case 'permission_restore':store.patch('authority',auth,{approve:false,grantVersion:2});store.patch('authority',auth,{approve:true,grantVersion:3});break;
 case 'contract_mismatch':{const original=service.definition.bind(service);service.definition=d=>({...original(d),version:'contract-mismatch-study'});break;}
 case 'journal_floor':store.db.prepare('UPDATE meta SET journal_floor=1 WHERE id=1').run();break;
 }
 return {};
}
async function trial(scenario,mode,scale,repeat,index){
 const dir=path.join(runDir,String(index).padStart(4,'0')+'-'+scenario.id+'-'+mode+'-'+scale+'-'+repeat);fs.mkdirSync(dir);const file=path.join(dir,'synthetic.sqlite');
 let store=new FactStore(file),c=seedProcurement(store,{count:scale,opaque:scenario.opaque===true}),service=new ApprovalService(store);
 const result={index,scenario:scenario.id,mode,scale,repeat,database:path.relative(runDir,file),unsafeRetainedApprovals:0,incorrectNewCommits:0,partialEffectStates:0,infrastructureError:null};
 try{
  prepare(store,c,scenario);const capture=micros(()=>service.preview(c.draftId,actor,mode));result.initialCaptureMicroseconds=capture.microseconds;
  const p=capture.value,initialReview=service.review(c.draftId,actor,{previewId:p.preview.id,seal:p.preview.seal,clauseIds:p.validation.clauses.map(x=>x.id),mode});
  check(initialReview.validation.allApproved,'initial approval control');const original=procurementOracle(readWorld(store),c),originalHeads=[...service.heads(c.draftId).values()].map(h=>({clauseId:h.clauseId,id:h.id,snapshotId:h.snapshotId}));
  result.originalHeads=originalHeads;result.originalOracle={revision:original.revision,clauses:original.clauses.map(x=>({id:x.id,value:x.value,tokensHash:x.tokensHash,canCommit:x.canCommit}))};
  const oldRequest=service.commitRequest(c.draftId,mode),stalePreview=scenario.id==='stale_preview'?service.preview(c.draftId,actor,mode):null;
  result.mutation=mutate(store,c,scenario,service);
  if(scenario.id==='absent_key_aba_restart'){
   store.close();const child=await startWorker(dir,file,{operation:'validate',draftId:c.draftId,mode},'fresh-process-validation').done;check(child.ok,'fresh process validation');result.processValidation=child;
   store=new FactStore(file);service=new ApprovalService(store);
  }
  const current=procurementOracle(readWorld(store),c),expected=retained(original,current);if(scenario.id==='contract_mismatch')for(const id of Object.keys(expected))expected[id]=false;
  const measured=micros(()=>service.validate(c.draftId,mode)),v=measured.value;result.validationMicroseconds=measured.microseconds;result.validation=v;
  result.oracle={revision:current.revision,rowsMaterialized:current.rowsMaterialized,historyEntries:current.historyEntries,expectedRetained:expected,clauses:current.clauses.map(x=>({id:x.id,value:x.value,tokensHash:x.tokensHash,canCommit:x.canCommit}))};
  for(const actual of v.clauses)if(actual.retained&&!expected[actual.id])result.unsafeRetainedApprovals++;
  result.unnecessaryReviewCount=v.clauses.filter(x=>!x.retained&&expected[x.id]).length;result.requiredReviewCount=v.requiredReviewCount;
  result.reviewFieldOccurrences=current.clauses.filter(x=>!v.clauses.find(a=>a.id===x.id).retained).reduce((n,x)=>n+[...x.tokens.values()].reduce((m,t)=>m+(t.kind==='scan'?1+t.members.reduce((a,r)=>a+Object.keys(r.fields).length,0):t.exists?Object.keys(t.fields).length:1),0),0);
  if(scenario.id==='stale_preview'){
   const oldIDs=[...service.heads(c.draftId).values()].map(h=>h.id);result.staleReview=attempt(()=>service.review(c.draftId,actor,{previewId:stalePreview.preview.id,seal:stalePreview.preview.seal,clauseIds:['quantity:RICE'],mode}));
   check(!result.staleReview.ok&&result.staleReview.code==='PREVIEW_STALE','stale preview refused');check(JSON.stringify([...service.heads(c.draftId).values()].map(h=>h.id))===JSON.stringify(oldIDs),'stale review wrote no heads');
  }
  const request=scenario.id==='before_commit_change'?oldRequest:service.commitRequest(c.draftId,mode),key='pilot-request-'+String(index).padStart(5,'0');
  if(scenario.id==='committed_response_lost_restart'){
   store.close();const first=await startWorker(dir,file,{actor,key,request},'commit-response-discarded').done;check(first.ok,'child first commit');
   store=new FactStore(file);store.patch('inventory',c.storeId+':RICE',{onHandG:20000});store.close();const retry=await startWorker(dir,file,{actor,key,request},'new-process-retry').done;
   store=new FactStore(file);service=new ApprovalService(store);result.initialConfirm=first;result.restartRetry=retry;
   result.sameReceiptRecovery=retry.ok&&retry.result.repeated&&JSON.stringify(first.result.receipt)===JSON.stringify(retry.result.receipt);check(result.sameReceiptRecovery,'normal process restart same receipt despite source change');
  }else if(scenario.id==='concurrent_different_keys'){
   store.close();const go=path.join(dir,'workers-go'),ready=[path.join(dir,'worker-a-ready'),path.join(dir,'worker-b-ready')];
   const workers=ready.map((r,i)=>startWorker(dir,file,{actor,key:key+'-'+i,request,barrier:{ready:r,go}},'concurrent-'+i));await waitReady(ready);fs.writeFileSync(go,'go');const responses=await Promise.all(workers.map(w=>w.done));
   store=new FactStore(file);service=new ApprovalService(store);result.processRace={readyBarrier:true,responses};result.initialConfirm=responses.find(r=>r.ok)||responses[0];check(responses.filter(r=>r.ok).length===1&&responses.find(r=>!r.ok).code==='DRAFT_ALREADY_COMMITTED','different-key processes create one receipt');
  }else if(scenario.id==='atomic_exception'){
   store.db.exec("CREATE TEMP TRIGGER study_abort_outcome BEFORE INSERT ON outcomes BEGIN SELECT RAISE(ABORT,'STUDY_INJECTED_OUTCOME_FAILURE'); END;");
   const first=attempt(()=>service.confirm(actor,key,request));result.injectedException={outcome:first,state:state(store,c.draftId)};
   check(!first.ok&&first.message.includes('STUDY_INJECTED_OUTCOME_FAILURE'),'injected trigger reached');check(result.injectedException.state.receipts===0&&noPartial(result.injectedException.state),'receipt/budget/outcome rolled back');
   store.db.exec('DROP TRIGGER study_abort_outcome');result.initialConfirm=attempt(()=>service.confirm(actor,key,request));check(result.initialConfirm.ok,'clean retry after injected exception');
  }else{
   const confirm=micros(()=>attempt(()=>service.confirm(actor,key,request)));result.initialConfirm=confirm.value;result.initialConfirmMicroseconds=confirm.microseconds;
  }
  const originalAllowed=Object.values(expected).every(Boolean);
  if(result.initialConfirm.ok&&!originalAllowed)result.incorrectNewCommits++;
  result.validOriginalRequestRejected=originalAllowed&&!result.initialConfirm.ok;
  if(result.initialConfirm.ok&&scenario.id==='changed_body_key'){result.changedBody=attempt(()=>service.confirm(actor,key,{...request,intentHash:'CHANGED'}));check(!result.changedBody.ok&&result.changedBody.code==='IDEMPOTENCY_CONFLICT','changed body key rejected');}
  if(result.initialConfirm.ok&&scenario.id==='different_key_same_draft'){result.newKey=attempt(()=>service.confirm(actor,key+'-different',request));check(!result.newKey.ok&&result.newKey.code==='DRAFT_ALREADY_COMMITTED','new key same draft rejected');}
  if(!result.initialConfirm.ok&&current.clauses.every(x=>x.canCommit)&&scenario.id!=='permission_revoke'){
   const fresh=service.preview(c.draftId,actor,mode),reviewIds=fresh.validation.clauses.filter(x=>!x.retained).map(x=>x.id);
   if(reviewIds.length){const reviewWorld=procurementOracle(readWorld(store),c);service.review(c.draftId,actor,{previewId:fresh.preview.id,seal:fresh.preview.seal,clauseIds:reviewIds,mode});
    const newHeads=service.heads(c.draftId);for(const h of originalHeads)if(!reviewIds.includes(h.clauseId))check(newHeads.get(h.clauseId).id===h.id,'unaffected original head kept');
    result.reReview={explicitClauseIds:reviewIds,unchangedHeadIDs:originalHeads.filter(h=>!reviewIds.includes(h.clauseId)).map(h=>h.id),oracleCurrentTokens:reviewWorld.clauses.filter(x=>reviewIds.includes(x.id)).map(x=>({id:x.id,tokensHash:x.tokensHash}))};
    const repaired=micros(()=>attempt(()=>service.confirm(actor,key+'-repaired',service.commitRequest(c.draftId,mode))));result.repairedConfirm=repaired.value;result.repairedConfirmMicroseconds=repaired.microseconds;check(result.repairedConfirm.ok,'explicit safe re-review permits commit');
   }
  }
  result.finalState=state(store,c.draftId);if(!noPartial(result.finalState))result.partialEffectStates++;
  result.finalHeads=[...service.heads(c.draftId).values()].map(h=>({clauseId:h.clauseId,id:h.id,snapshotId:h.snapshotId}));
  result.oraclePass=result.unsafeRetainedApprovals===0&&result.incorrectNewCommits===0&&result.partialEffectStates===0;
 }catch(e){result.infrastructureError={message:e.message,stack:e.stack};result.oraclePass=false;}
 finally{try{store.close();}catch{}}
 return result;
}
function csv(rows){const columns=['index','scenario','mode','scale','repeat','unsafeRetainedApprovals','incorrectNewCommits','partialEffectStates','unnecessaryReviewCount','requiredReviewCount','reviewFieldOccurrences','validationMicroseconds','initialCaptureMicroseconds','initialConfirmMicroseconds','validOriginalRequestRejected','sameReceiptRecovery','oraclePass','infrastructureError'];const cell=v=>{const s=v===undefined?'':typeof v==='object'?JSON.stringify(v):String(v);return /[",\n\r]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;};return columns.join(',')+'\n'+rows.map(r=>columns.map(c=>cell(r[c])).join(',')).join('\n')+'\n';}
async function main(){
 if(phase==='main'){const gate=JSON.parse(fs.readFileSync(path.join(__dirname,'sanity-latest.json'),'utf8'));check(gate.passed&&gate.codeDigest===codeDigest,'unchanged code/protocol and passing safety sanity required');}
 const env={phase,startedUTC:new Date().toISOString(),node:process.version,versions:process.versions,platform:process.platform,arch:process.arch,processor:os.cpus()[0]?.model,codeDigest,hashes,matrix};fs.writeFileSync(path.join(runDir,'environment.json'),JSON.stringify(env,null,2));
 const rows=[];let index=0;const plans=[{scale:3,repeats:phase==='sanity'?1:matrix.functionalPlan.mainRepeats,scenarios:matrix.scenarios}];if(phase==='main')for(const scale of matrix.functionalPlan.extraScalePoints)plans.push({scale,repeats:matrix.functionalPlan.extraScaleRepeats,scenarios:matrix.scenarios.filter(s=>s.scale)});
 for(const plan of plans)for(const scenario of plan.scenarios)for(const mode of matrix.modes)for(let repeat=0;repeat<plan.repeats;repeat++){
  const row=await trial(scenario,mode,plan.scale,repeat,index++);rows.push(row);fs.appendFileSync(path.join(runDir,'raw.jsonl'),JSON.stringify(row)+'\n');if(!row.oraclePass)console.log(JSON.stringify({failed:row.scenario,mode,scale:plan.scale,error:row.infrastructureError,unsafe:row.unsafeRetainedApprovals,commit:row.incorrectNewCommits}));
  if(index%16===0)console.log(JSON.stringify({phase,completed:index,run:runDir}));
 }
 const byMode=Object.fromEntries(matrix.modes.map(mode=>{const r=rows.filter(x=>x.mode===mode);return [mode,{trials:r.length,unsafeRetainedApprovals:r.reduce((n,x)=>n+x.unsafeRetainedApprovals,0),incorrectNewCommits:r.reduce((n,x)=>n+x.incorrectNewCommits,0),partialEffectStates:r.reduce((n,x)=>n+x.partialEffectStates,0),unnecessaryReviewDecisions:r.reduce((n,x)=>n+(x.unnecessaryReviewCount||0),0),requiredReviewDecisions:r.reduce((n,x)=>n+(x.requiredReviewCount||0),0),validOriginalRequestRejections:r.filter(x=>x.validOriginalRequestRejected).length,receiptRecoveries:r.filter(x=>x.sameReceiptRecovery).length,infrastructureErrors:r.filter(x=>x.infrastructureError).length}];}));
 const summary={phase,run:runDir,finishedUTC:new Date().toISOString(),codeDigest,trials:rows.length,scenarioCount:matrix.scenarios.length,byMode,passed:rows.every(x=>x.oraclePass),interpretation:matrix.interpretation,denominator:'Deterministic pre-specified synthetic scenario-mode-scale repetitions; not production probabilities',files:['raw.jsonl','trials.csv','environment.json','summary.json','per-trial synthetic SQLite and process inputs/outputs']};
 fs.writeFileSync(path.join(runDir,'trials.csv'),csv(rows));fs.writeFileSync(path.join(runDir,'summary.json'),JSON.stringify(summary,null,2));fs.writeFileSync(path.join(__dirname,phase+'-latest.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));if(!summary.passed)process.exitCode=1;
}
main().catch(e=>{fs.writeFileSync(path.join(runDir,'runner-error.json'),JSON.stringify({error:e.message,stack:e.stack},null,2));console.error(e);process.exitCode=1;});
