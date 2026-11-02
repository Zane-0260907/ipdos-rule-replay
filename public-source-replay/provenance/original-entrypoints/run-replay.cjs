'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{isDeepStrictEqual:equal}=require('node:util');
const {FactStore}=require('./core/store.cjs'),{ApprovalService}=require('./core/service.cjs');
const {readWorld,retained}=require('./tests/full-oracle.cjs'),{documentOracle}=require('./tests/document-oracle.cjs');
const mapping=require('./mapping.cjs');
const root=__dirname,read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,''));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const attempt=fn=>{try{return {ok:true,result:fn()};}catch(e){return {ok:false,code:e.code||e.message,message:e.message};}};
const sum=(rows,key)=>rows.reduce((n,r)=>n+(r[key]||0),0);
const source=mapping.load(),sourceOracle=read('data/source-oracle.json'),freeze=read('source-freeze.json');
assert(read('data/coverage-gate.json').status==='passed','Complete fixed-source acquisition gate required');
assert(sourceOracle.passed&&sourceOracle.states.length===31,'Independent source oracle required');
assert(hash(path.join(root,'PROTOCOL.md'))===read('data/protocol-freeze.json').protocol_sha256,'Frozen protocol changed');
for(const f of freeze.core_files)assert(hash(path.join(root,f.file))===f.source_sha256,'Copied core changed: '+f.file);
for(const state of source.states){
 const expected=sourceOracle.states[state.index];assert(expected.commitSha===state.commit.sha&&expected.sharedDigest===state.sharedDigest,'Independent source/global hash agreement');
 for(const d of state.documents)assert(expected.documents[d.docId]===d.contentDigest,'Independent exact source member/hash agreement');
}
const versions=['whole','rows','full','incremental'];
const inputs=['PROTOCOL.md','acquire.py','mapping.cjs','run-replay.cjs','tests/verify-source.py','tests/document-oracle.cjs','tests/full-oracle.cjs','data/window.json','data/blob-catalog.json','data/source-oracle.json',...freeze.core_files.map(f=>f.file)];
const inputHashes=Object.fromEntries(inputs.map(p=>[p,hash(path.join(root,p))]));
const run=fs.mkdtempSync(path.join(root,'results','replay-'));
fs.writeFileSync(path.join(run,'environment.json'),JSON.stringify({node:process.version,versions:process.versions,platform:process.platform,arch:process.arch,inputHashes,protocolSha256:inputHashes['PROTOCOL.md'],modes:versions,syntheticApprovals:true,publicSourceHistory:true},null,2)+'\n');
function counts(store,c){return {receipts:store.db.prepare('SELECT count(*) n FROM receipts').get().n,outcomes:store.db.prepare('SELECT count(*) n FROM outcomes').get().n,releases:store.db.prepare("SELECT count(*) n FROM facts WHERE table_name='localReleases'").get().n,draftStatus:store.draft(c.draftId).status};}
function verifyCurrent(view,oracle,label,record){
 for(const clause of view.clauses){const expected=oracle.clauses.find(c=>c.id===clause.id);
  const comparisons={value:equal(clause.value,expected.value),tokensHash:clause.tokensHash===expected.tokensHash,canCommit:clause.canCommit===expected.canCommit,error:Boolean(clause.error)===Boolean(expected.error)};
  record.push({phase:label,id:clause.id,comparisons,actual:{value:clause.value,tokensHash:clause.tokensHash,canCommit:clause.canCommit},expected:{value:expected.value,tokensHash:expected.tokensHash,canCommit:expected.canCommit}});
  assert(Object.values(comparisons).every(Boolean),'Complete independent oracle mismatch: '+label+' '+clause.id);
 }
}
function trial(index,mode){
 const before=source.states[index],after=source.states[index+1],transition=mapping.transition(before,after);
 const dir=path.join(run,String(index).padStart(2,'0')+'-'+mode);fs.mkdirSync(dir);
 const filename=path.join(dir,'counterfactual.sqlite'),store=new FactStore(filename),service=new ApprovalService(store);
 const r={index,mode,...transition,database:path.relative(run,filename),syntheticApprovalContract:true,scopeCount:source.scopes.length,falseRetainedApprovals:0,incorrectNewEffects:0,partialEffects:0,oracleComparisons:[],infrastructureError:null};
 try{
  const c=mapping.seed(store,before,source.scopes),actor=c.actorId;
  const oldWorld=readWorld(store),original=documentOracle(oldWorld,c);
  assert(original.clauses.every(x=>x.canCommit),'Counterfactual initial state must permit approval');
  const p=service.preview(c.draftId,actor,mode);
  service.review(c.draftId,actor,{previewId:p.preview.id,seal:p.preview.seal,clauseIds:p.validation.clauses.map(x=>x.id),mode});
  const oldHeads=service.heads(c.draftId);
  verifyCurrent(service.engine(c.draftId).evaluate('incremental'),original,'initial',r.oracleComparisons);
  for(const h of oldHeads.values()){const o=original.clauses.find(x=>x.id===h.clauseId);assert(equal(h.value,o.value)&&h.tokensHash===o.tokensHash,'Initial approval tied to independent original evidence');}
  r.initial={revision:oldWorld.revision,generation:oldWorld.generation,contractHash:p.preview.contractHash,approvalIds:Object.fromEntries([...oldHeads].map(([id,h])=>[id,h.id])),sourceState:before.commit.sha};
  const began=process.hrtime.bigint();r.factChanges=mapping.apply(store,before,after);r.mutationMicroseconds=Number(process.hrtime.bigint()-began)/1000;
  const world=readWorld(store),oracleBegan=process.hrtime.bigint(),current=documentOracle(world,c);r.independentOracleMicroseconds=Number(process.hrtime.bigint()-oracleBegan)/1000;
  const expected=retained(original,current),expectedIds=Object.keys(expected).filter(id=>!expected[id]).sort();
  const sourceExpectedIds=source.scopes.filter(s=>transition.sharedBindingChanged||transition.affectedSourcePartitions.some(a=>a.docId===s.docId)).map(s=>'publish:'+s.docId).sort();
  assert(equal(expectedIds,sourceExpectedIds),'Independent source-derived affected scope and full evidence oracle disagree');
  r.transitionRevision=world.revision;r.necessaryReviewIds=expectedIds;r.necessaryReviewCount=expectedIds.length;r.oracleRetained=expected;
  const v=service.validate(c.draftId,mode);r.validation=v;r.cost=v.metrics;
  r.falseRetainedApprovals=v.clauses.filter(x=>x.retained&&!expected[x.id]).length;
  r.requiredReviewCount=v.requiredReviewCount;r.extraReviewIds=v.clauses.filter(x=>!x.retained&&expected[x.id]).map(x=>x.id);r.extraReviewCount=r.extraReviewIds.length;r.retainedCount=v.clauses.filter(x=>x.retained).length;
  // The measurement above is complete before this independent semantic check.
  verifyCurrent(service.engine(c.draftId).evaluate('incremental'),current,'current',r.oracleComparisons);
  for(const h of service.heads(c.draftId).values())assert(h.id===oldHeads.get(h.clauseId).id,'Validation must not retarget any original approval');
  const request=service.commitRequest(c.draftId,mode),key='public-replay-'+String(index).padStart(3,'0')+'-'+mode;
  r.initialConfirm=attempt(()=>service.confirm(actor,key,request));
  if(r.initialConfirm.ok&&expectedIds.length)r.incorrectNewEffects++;
  if(!r.initialConfirm.ok){
   assert(r.initialConfirm.code==='NEEDS_REVIEW','Unexpected pre-renewal confirmation failure');
   assert(equal(counts(store,c),{receipts:0,outcomes:0,releases:0,draftStatus:'open'}),'Rejected new effect must leave no partial state');
   const fresh=service.preview(c.draftId,actor,mode),ids=fresh.validation.clauses.filter(x=>!x.retained).map(x=>x.id);
   assert(equal([...ids].sort(),v.clauses.filter(x=>!x.retained).map(x=>x.id).sort()),'Stable requested renewal scope');
   service.review(c.draftId,actor,{previewId:fresh.preview.id,seal:fresh.preview.seal,clauseIds:ids,mode});r.explicitSyntheticRenewal=ids;
   const nowHeads=service.heads(c.draftId);for(const [id,old] of oldHeads)if(!ids.includes(id))assert(nowHeads.get(id).id===old.id,'Unselected original head changed');
   r.finalRequest=service.commitRequest(c.draftId,mode);r.finalRequestKey=key+'-renewed';r.finalConfirm=attempt(()=>service.confirm(actor,r.finalRequestKey,r.finalRequest));assert(r.finalConfirm.ok,'Explicit synthetic re-review should permit bounded local effect');
  }else{r.finalConfirm=r.initialConfirm;r.finalRequest=request;r.finalRequestKey=key;}
  const receipt=r.finalConfirm.result.receipt,heads=service.heads(c.draftId);
  for(const chain of receipt.authorityChain){
   const h=heads.get(chain.clauseId),o=current.clauses.find(x=>x.id===chain.clauseId),snap=JSON.parse(store.db.prepare('SELECT body FROM snapshots WHERE id=?').get(chain.originalSnapshotId).body),sc=snap.clauses.find(x=>x.id===chain.clauseId);
   assert(h.id===chain.originalApprovalId&&h.snapshotId===chain.originalSnapshotId&&h.tokensHash===o.tokensHash&&sc.tokensHash===o.tokensHash&&equal(h.value,o.value)&&equal(sc.value,o.value),'Receipt approval/snapshot/complete oracle chain mismatch');
   assert(equal(receipt.decisions.find(d=>d.clauseId===chain.clauseId).value,o.value),'Receipt effect value mismatch');
  }
  r.retry=attempt(()=>service.confirm(actor,r.finalRequestKey,r.finalRequest));assert(r.retry.ok&&r.retry.result.repeated&&equal(r.retry.result.receipt,receipt),'Exact retry must return one original receipt');
  r.finalState=counts(store,c);if(!equal(r.finalState,{receipts:1,outcomes:1,releases:1,draftStatus:'committed'}))r.partialEffects++;
  r.passed=r.falseRetainedApprovals===0&&r.incorrectNewEffects===0&&r.partialEffects===0;
 }catch(e){r.infrastructureError={message:e.message,stack:e.stack};r.passed=false;}finally{store.close();}
 fs.writeFileSync(path.join(dir,'step.json'),JSON.stringify(r,null,2)+'\n');return r;
}
const rows=[];
for(let index=0;index<30;index++)for(const mode of versions){const row=trial(index,mode);rows.push(row);fs.appendFileSync(path.join(run,'raw.jsonl'),JSON.stringify(row)+'\n');if(!row.passed)console.log(JSON.stringify({index,mode,passed:row.passed,error:row.infrastructureError}));}
const byMode=Object.fromEntries(versions.map(mode=>{const group=rows.filter(r=>r.mode===mode);const times=group.map(r=>r.cost?.verificationMicroseconds).filter(Number.isFinite).sort((a,b)=>a-b);return [mode,{trials:group.length,passed:group.every(r=>r.passed),falseRetainedApprovals:sum(group,'falseRetainedApprovals'),incorrectNewEffects:sum(group,'incorrectNewEffects'),partialEffects:sum(group,'partialEffects'),necessaryReviewClauses:sum(group,'necessaryReviewCount'),requiredReviewClauses:sum(group,'requiredReviewCount'),extraReviewClauses:sum(group,'extraReviewCount'),retainedClauses:sum(group,'retainedCount'),evaluatedNodes:group.reduce((n,r)=>n+(r.cost?.materialization?.evaluatedNodes||0),0),reusedNodes:group.reduce((n,r)=>n+(r.cost?.materialization?.reusedNodes||0),0),verificationMicroseconds:{median:times.length?(times[14]+times[15])/2:null,min:times[0],max:times.at(-1)},infrastructureErrors:group.filter(r=>r.infrastructureError).length}];}));
const integrity=freeze.core_files.map(f=>({...f,copyAfter:hash(path.join(root,f.file)),sourceAfter:hash(path.join(freeze.source_root,f.file))}));
const changes=rows.filter(r=>r.mode==='incremental').flatMap(r=>r.changes);
const summary={run:path.relative(root,run),trials:rows.length,transitions:30,trees:31,scopeCount:source.scopes.length,passed:rows.every(r=>r.passed),byMode,
 naturalCoverage:{sourceRelevantTransitions:rows.filter(r=>r.mode==='incremental'&&r.affectedSourcePartitions.length).length,sharedBindingChanges:rows.filter(r=>r.mode==='incremental'&&r.sharedBindingChanged).length,sourcePathChanges:Object.fromEntries(['A','D','M'].map(type=>[type,changes.filter(c=>c.source&&c.type===type).length])),allPathChanges:Object.fromEntries(['A','D','M'].map(type=>[type,changes.filter(c=>c.type===type).length])),pathMoves:'Treated as deletion+addition; rename identity not inferred.',abaOrFaultInjection:'Not generated or counted as natural-history safety cases.'},
 coreUnchanged:integrity.every(f=>f.copyAfter===f.source_sha256&&f.sourceAfter===f.source_sha256),integrity,
 limits:['Counterfactual researcher-generated contract/signoffs, not real Python approvals or human time.','Protects exact selected source-file sets, hashes and shared non-source binding only; no Sphinx/build/rendering semantics.','Fresh adjacent transitions, one run per mode/transition; costs descriptive and not a speed benchmark.','No synthetic phantom/ABA/fault-injection events in observed-history counts.']};
fs.writeFileSync(path.join(run,'summary.json'),JSON.stringify(summary,null,2)+'\n');fs.writeFileSync(path.join(root,'results/latest.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));if(!summary.passed||!summary.coreUnchanged)process.exitCode=1;
