'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{isDeepStrictEqual}=require('node:util');
const {FactStore}=require('../core/store.cjs'),{ApprovalService}=require('../core/service.cjs'),{seedDocuments}=require('../core/fixtures.cjs');
const {readWorld,retained}=require('../tests/full-oracle.cjs'),{documentOracle}=require('../tests/document-oracle.cjs');
const matrix=JSON.parse(fs.readFileSync(path.join(__dirname,'DOCUMENT_MATRIX.json'),'utf8')),phase=process.argv.includes('--main')?'main':'sanity',actor='synthetic-manager-01';
const sourceFiles=['study/DOCUMENT_CONTRACT.md','study/DOCUMENT_MATRIX.json','study/run-document-pilot.cjs','tests/document-oracle.cjs','tests/full-oracle.cjs',...fs.readdirSync(path.join(__dirname,'../core')).filter(f=>f.endsWith('.cjs')).map(f=>'core/'+f)];
const hashes=Object.fromEntries(sourceFiles.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',f))).digest('hex')])),sourceDigest=crypto.createHash('sha256').update(JSON.stringify(hashes)).digest('hex');
fs.mkdirSync(path.join(__dirname,'results'),{recursive:true});const run=fs.mkdtempSync(path.join(__dirname,'results','document-'+phase+'-'));
const assert=(x,m)=>{if(!x)throw Error(m);},attempt=fn=>{try{return {ok:true,result:fn()};}catch(e){return {ok:false,code:e.code||e.message,message:e.message};}};
function mutation(store,c,id){
 const key='GUIDE-A',digest=crypto.createHash('sha256').update('changed synthetic content').digest('hex'),auth='document:'+actor;
 switch(id){
 case 'unrelated_document':store.put('documents','OUTSIDE',{contentDigest:digest,classification:'internal',ready:true,version:'new'});break;
 case 'display_title':store.patch('documents',key,{title:'Updated display title'});break;
 case 'content_changed':case 'content_and_signatures_refreshed':store.patch('documents',key,{contentDigest:digest,version:'content-2'});if(id.endsWith('refreshed'))for(const editorId of ['EDITOR-A','EDITOR-B'])store.patch('signoffs',key+':'+editorId,{contentDigest:digest,version:2});break;
 case 'classification_blocked':store.patch('documents',key,{classification:'restricted'});break;
 case 'readiness_revoked':store.patch('documents',key,{ready:false});break;
 case 'signoff_insert':store.put('signoffs','EXTRA-SIGNOFF',{docId:key,state:'approved',editorId:'EDITOR-A',decision:'approve',contentDigest:store.get('documents',key).body.contentDigest,version:1});break;
 case 'signoff_delete':store.delete('signoffs',key+':EDITOR-B');break;
 case 'signoff_predicate_aba':store.patch('signoffs',key+':EDITOR-A',{state:'pending'});store.patch('signoffs',key+':EDITOR-A',{state:'approved'});break;
 case 'duplicate_signer_not_quorum':store.delete('signoffs',key+':EDITOR-B');store.put('signoffs','DUPLICATED-EDITOR-A',{...store.get('signoffs',key+':EDITOR-A').body});break;
 case 'editor_revoke':case 'editor_restore':store.patch('editors','EDITOR-A',{canSign:false,grantVersion:2});if(id.endsWith('restore'))store.patch('editors','EDITOR-A',{canSign:true,grantVersion:3});break;
 case 'missing_editor_aba':store.put('editors','ABSENT-EDITOR',{active:true,canSign:true,grantVersion:1});store.delete('editors','ABSENT-EDITOR');break;
 case 'audience_insert':case 'audience_aba':store.put('audienceMembers','AUDIENCE-B',{channelId:c.channelId,enabled:true,principalId:'READER-B',role:'reader'});if(id==='audience_aba')store.delete('audienceMembers','AUDIENCE-B');break;
 case 'principal_revoke':store.patch('principals','READER-A',{active:false,grantVersion:2});break;
 case 'channel_revoke':store.patch('releaseChannels',c.channelId,{enabled:false,version:'channel-2'});break;
 case 'rule_revoke':store.patch('rules','publishing',{enabled:false,version:'publishing-revoked'});break;
 case 'permission_restore':store.patch('authority',auth,{approve:false,grantVersion:2});store.patch('authority',auth,{approve:true,grantVersion:3});break;
 case 'stale_preview':store.patch('documents',key,{classification:'public'});break;
 }
}
function counts(store,c){return {receipts:store.db.prepare('SELECT count(*) AS n FROM receipts').get().n,outcomes:store.db.prepare('SELECT count(*) AS n FROM outcomes').get().n,releases:store.db.prepare("SELECT count(*) AS n FROM facts WHERE table_name='localReleases' AND json_extract(body,'$.draftId')=?").get(c.draftId).n,status:store.draft(c.draftId).status};}
function trial(scenario,mode,repeat,index){
 const dir=path.join(run,String(index).padStart(4,'0')+'-'+scenario+'-'+mode+'-'+repeat);fs.mkdirSync(dir);const file=path.join(dir,'synthetic.sqlite'),store=new FactStore(file),c=seedDocuments(store),service=new ApprovalService(store),r={index,scenario,mode,repeat,database:path.relative(run,file),unsafeRetainedApprovals:0,incorrectNewCommits:0,partialEffectStates:0,infrastructureError:null};
 try{
  if(scenario==='missing_editor_aba')store.put('signoffs','ABSENT-SIGNER',{docId:'GUIDE-A',state:'approved',editorId:'ABSENT-EDITOR',decision:'approve',contentDigest:store.get('documents','GUIDE-A').body.contentDigest,version:1});
  const p=service.preview(c.draftId,actor,mode);service.review(c.draftId,actor,{previewId:p.preview.id,seal:p.preview.seal,clauseIds:p.validation.clauses.map(x=>x.id),mode});const original=documentOracle(readWorld(store),c);assert(original.clauses.every(x=>x.canCommit),'document unchanged oracle control');
  const oldHeads=[...service.heads(c.draftId).values()];for(const h of oldHeads){const oracle=original.clauses.find(x=>x.id===h.clauseId);assert(isDeepStrictEqual(oracle.value,h.value)&&oracle.tokensHash===h.tokensHash,'independent initial document approved view');}
  const sealed=scenario==='stale_preview'?service.preview(c.draftId,actor,mode):null;mutation(store,c,scenario);
  const current=documentOracle(readWorld(store),c),expected=retained(original,current),v=service.validate(c.draftId,mode);r.validation=v;r.expectedRetained=expected;
  const materialized=service.engine(c.draftId).evaluate(mode==='full'?'full':'incremental');
  for(const x of materialized.clauses){const oracle=current.clauses.find(o=>o.id===x.id);assert(x.canCommit===oracle.canCommit&&Boolean(x.error)===Boolean(oracle.error),'independent current document validity');if(!x.error)assert(isDeepStrictEqual(x.value,oracle.value)&&x.tokensHash===oracle.tokensHash,'independent current document projection/witness');}
  r.oracle=current.clauses.map(x=>({id:x.id,value:x.value,tokensHash:x.tokensHash,canCommit:x.canCommit}));r.unnecessaryReviewCount=v.clauses.filter(x=>!x.retained&&expected[x.id]).length;r.unsafeRetainedApprovals=v.clauses.filter(x=>x.retained&&!expected[x.id]).length;
  if(sealed){r.staleReview=attempt(()=>service.review(c.draftId,actor,{previewId:sealed.preview.id,seal:sealed.preview.seal,clauseIds:['publish:GUIDE-A'],mode}));assert(!r.staleReview.ok&&r.staleReview.code==='PREVIEW_STALE','document stale preview refused');}
  const request=service.commitRequest(c.draftId,mode),key='document-request-'+String(index).padStart(6,'0');
  if(scenario==='atomic_exception'){
   store.db.exec("CREATE TEMP TRIGGER document_abort BEFORE INSERT ON outcomes BEGIN SELECT RAISE(ABORT,'DOCUMENT_INJECTED_FAILURE'); END;");r.injected=attempt(()=>service.confirm(actor,key,request));r.afterInjected=counts(store,c);assert(!r.injected.ok&&r.injected.message.includes('DOCUMENT_INJECTED_FAILURE'),'document exception injected');assert(r.afterInjected.receipts===0&&r.afterInjected.outcomes===0&&r.afterInjected.releases===0&&r.afterInjected.status==='open','document atomic rollback');store.db.exec('DROP TRIGGER document_abort');
  }
  r.initialConfirm=attempt(()=>service.confirm(actor,key,request));if(r.initialConfirm.ok&&!Object.values(expected).every(Boolean))r.incorrectNewCommits++;
  if(scenario==='same_receipt_retry'){assert(r.initialConfirm.ok,'document initial commit');store.patch('documents','GUIDE-A',{ready:false});r.retry=attempt(()=>service.confirm(actor,key,request));assert(r.retry.ok&&r.retry.result.repeated&&isDeepStrictEqual(r.initialConfirm.result.receipt,r.retry.result.receipt),'document retry original receipt after content condition change');}
  if(!r.initialConfirm.ok&&current.clauses.every(x=>x.canCommit)){
   const fresh=service.preview(c.draftId,actor,mode),ids=fresh.validation.clauses.filter(x=>!x.retained).map(x=>x.id);service.review(c.draftId,actor,{previewId:fresh.preview.id,seal:fresh.preview.seal,clauseIds:ids,mode});for(const old of oldHeads)if(!ids.includes(old.clauseId))assert(service.heads(c.draftId).get(old.clauseId).id===old.id,'document unaffected approval identity');r.explicitReReview=ids;r.repairedConfirm=attempt(()=>service.confirm(actor,key+'-reviewed',service.commitRequest(c.draftId,mode)));assert(r.repairedConfirm.ok,'document safe re-review commits');
  }
  r.finalState=counts(store,c);if(r.finalState.receipts!==r.finalState.outcomes||r.finalState.receipts!==r.finalState.releases||r.finalState.receipts>1||(r.finalState.receipts===1)!==(r.finalState.status==='committed'))r.partialEffectStates++;
  r.passed=r.unsafeRetainedApprovals===0&&r.incorrectNewCommits===0&&r.partialEffectStates===0;
 }catch(e){r.infrastructureError={message:e.message,stack:e.stack};r.passed=false;}finally{store.close();}return r;
}
if(phase==='main'){const gate=JSON.parse(fs.readFileSync(path.join(__dirname,'document-sanity-latest.json'),'utf8'));assert(gate.passed&&gate.sourceDigest===sourceDigest,'same-source document sanity gate');}
fs.writeFileSync(path.join(run,'environment.json'),JSON.stringify({phase,node:process.version,versions:process.versions,sourceDigest,hashes,matrix},null,2));const rows=[];let index=0;const repeats=phase==='main'?matrix.mainRepeats:matrix.sanityRepeats;
for(const scenario of matrix.scenarios)for(const mode of matrix.modes)for(let repeat=0;repeat<repeats;repeat++){const row=trial(scenario,mode,repeat,index++);rows.push(row);fs.appendFileSync(path.join(run,'raw.jsonl'),JSON.stringify(row)+'\n');if(!row.passed)console.log(JSON.stringify({failed:scenario,mode,error:row.infrastructureError}));}
const summary={run,phase,trials:rows.length,scenarios:matrix.scenarios.length,sourceDigest,passed:rows.every(r=>r.passed),byMode:Object.fromEntries(matrix.modes.map(mode=>{const group=rows.filter(r=>r.mode===mode);return [mode,{trials:group.length,unsafeRetainedApprovals:group.reduce((n,r)=>n+r.unsafeRetainedApprovals,0),incorrectNewCommits:group.reduce((n,r)=>n+r.incorrectNewCommits,0),partialEffectStates:group.reduce((n,r)=>n+r.partialEffectStates,0),unnecessaryReviewDecisions:group.reduce((n,r)=>n+(r.unnecessaryReviewCount||0),0),infrastructureErrors:group.filter(r=>r.infrastructureError).length}];})),limits:matrix.limits};
fs.writeFileSync(path.join(run,'summary.json'),JSON.stringify(summary,null,2));fs.writeFileSync(path.join(__dirname,'document-'+phase+'-latest.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));if(!summary.passed)process.exitCode=1;
