'use strict';
const {randomUUID}=require('node:crypto');
const {DependencyEngine}=require('./engine.cjs');
const {adapter}=require('./adapters.cjs');
const {digest,clone,equal}=require('./value.cjs');
class ContractError extends Error{constructor(code,message,status=409,details){super(message);this.code=code;this.status=status;this.details=details;}}
const failure=(code,message,status,details)=>{throw new ContractError(code,message,status,details);};
class ApprovalService{
 constructor(store){this.store=store;this.engines=new Map();}
 definition(draft){return adapter(draft.workflow).definition(draft.context);}
 engine(draftId){const draft=this.store.draft(draftId),definition=this.definition(draft),key=digest(definition);let e=this.engines.get(draftId);if(!e||e.definitionKey!==key){e=new DependencyEngine(this.store,definition);e.definitionKey=key;this.engines.set(draftId,e);}return e;}
 permission(draft,actor,action){const a=this.store.get('authority',draft.workflow+':'+actor)?.body;if(!a||a.view!==true)failure('VIEW_PERMISSION_REVOKED','Current viewing permission is missing.',403);if(action&&a[action]!==true)failure('PERMISSION_REVOKED','Current '+action+' permission is revoked.',403);if(action&&actor!==draft.context.actorId)failure('APPROVER_MISMATCH','This draft requires its designated approver.',403);return a;}
 heads(draftId){const draft=this.store.draft(draftId);return new Map(this.store.db.prepare('SELECT a.body FROM approval_heads h JOIN approvals a ON a.id=h.approval_id WHERE h.draft_id=? AND h.actor=?').all(draftId,draft.context.actorId).map(r=>{const a=JSON.parse(r.body);return [a.clauseId,a];}));}
 intent(draftId){const d=this.store.draft(draftId),a=adapter(d.workflow),lines=this.store.all(a.intentTable).filter(r=>r.body.draftId===draftId).sort((x,y)=>x.key<y.key?-1:x.key>y.key?1:0).map(r=>({key:r.key,body:r.body,birth:r.birth,intentFieldVersion:r.versions[a.intentVersionField]}));return digest({draftId,intentRevision:d.intent_revision,lines});}
 selection(draftId){return digest([...this.heads(draftId).values()].map(a=>[a.clauseId,a.id]).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0));}
 compareRows(approval,cache){for(const saved of approval.coarse){let actual;if(saved.kind==='tableFence'){const k='table:'+saved.table;if(!cache.has(k))cache.set(k,this.store.tableRevision(saved.table));actual={...saved,version:cache.get(k)};}else{const k='key:'+saved.table+':'+saved.key;if(!cache.has(k)){const row=this.store.get(saved.table,saved.key);cache.set(k,row?{exists:true,birth:row.birth,version:row.rowVersion}:{exists:false,version:this.store.keyEpoch(saved.table,saved.key)});}actual={...saved,...cache.get(k)};}if(!equal(saved,actual))return false;}return true;}
 validate(draftId,mode='incremental'){
  if(!['incremental','full','whole','rows'].includes(mode))failure('UNKNOWN_MODE','Unknown validation mode.',400);
  const began=process.hrtime.bigint(),draft=this.store.draft(draftId),engine=this.engine(draftId),meta=this.store.meta(),heads=this.heads(draftId),rowCache=new Map();
  const current=['incremental','full'].includes(mode)?engine.evaluate(mode==='full'?'full':'incremental'):null;
  const clauses=engine.definition.clauses.map(c=>{
   const head=heads.get(c.id),now=current?.clauses.find(x=>x.id===c.id);let retained=false,reason;
   if(!head)reason='No original approval exists.';
   else if(head.contractHash!==engine.contractHash||head.generation!==meta.generation||head.journalFloor!==meta.journal_floor)reason='Contract, engine or evidence-store/journal provenance changed.';
   else if(mode==='whole'){retained=head.revision===meta.revision;reason=retained?'Original whole-snapshot revision is current.':'Whole-snapshot revision changed; this mode requires all decisions to be reviewed.';}
   else if(mode==='rows'){retained=(!head.fallback||head.revision===meta.revision)&&this.compareRows(head,rowCache);reason=retained?'All recorded row/key versions and predicate table fences match.':'A row/key version or conservative predicate table fence changed.';}
   else{retained=now.canCommit&&head.viewHash===now.viewHash;reason=retained?'Original protected evidence is unchanged; original approval snapshot retained.':now.error?'Protected data/rule evaluation failed.':!now.canCommit?'A protected commit condition is false.':'Protected evidence, member identity, rule or authority version changed.';}
   return {id:c.id,label:c.label,status:retained?'retained':'needs_review',retained,reason,approvalId:head?.id??null,originalSnapshotId:head?.snapshotId??null,reviewedRevision:head?.revision??null,validatedRevision:meta.revision,canCommit:now?.canCommit??retained,
    current:now?{value:now.value,error:now.error,viewHash:now.viewHash,tokensHash:now.tokensHash}:null};
  });
  return {draftId,mode,revision:meta.revision,generation:meta.generation,contractHash:engine.contractHash,clauses,allApproved:clauses.every(c=>c.retained),
   requiredReviewCount:clauses.filter(c=>!c.retained).length,metrics:{verificationMicroseconds:Number(process.hrtime.bigint()-began)/1000,materialization:current?.metrics??null,coarseVersionLookups:rowCache.size}};
 }
 explain(draftId,validation){
  const engine=this.engine(draftId),view=engine.evaluate('incremental'),heads=this.heads(draftId),snapshotCache=new Map();
  return validation.clauses.map(c=>{const head=heads.get(c.id),now=view.clauses.find(x=>x.id===c.id),differences=[];
   if(head){if(!snapshotCache.has(head.snapshotId))snapshotCache.set(head.snapshotId,JSON.parse(this.store.db.prepare('SELECT body FROM snapshots WHERE id=?').get(head.snapshotId).body));
    const snap=snapshotCache.get(head.snapshotId),original=snap.clauses.find(x=>x.id===c.id),before=new Map(original.tokenIds.map(id=>[id,snap.tokens[id]]));
    const root=engine.definition.clauses.find(x=>x.id===c.id).node;
    for(const id of new Set([...before.keys(),...now.tokens.keys()]))if(!equal(before.get(id)??null,now.tokens.get(id)??null))differences.push({token:id,before:before.get(id)??null,after:now.tokens.get(id)??null,rulePaths:engine.pathsFromToken(id,root)});
   }
   return {...c,current:{value:now.value,error:now.error,viewHash:now.viewHash},differences};
  });
 }
 preview(draftId,actor,mode='incremental'){
  return this.store.transact(()=>{const draft=this.store.draft(draftId);this.permission(draft,actor);const engine=this.engine(draftId),view=engine.evaluate('full'),world=this.store.snapshot(),catalog={};
   const clauses=view.clauses.map(c=>{for(const [id,t] of c.tokens)catalog[id]=t;return {id:c.id,label:c.label,node:c.node,value:c.value,error:c.error,canCommit:c.canCommit,viewHash:c.viewHash,decisionHash:c.decisionHash,tokensHash:c.tokensHash,coarseHash:c.coarseHash,coarse:[...c.coarse.values()],tokenIds:[...c.tokens.keys()]};});
   const body={draftId,context:draft.context,contractHash:view.contractHash,engineBuild:view.engineBuild,revision:view.revision,generation:view.generation,fallback:view.fallback,world,tokens:catalog,clauses,displayOnly:engine.definition.displayOnly,createdAt:new Date().toISOString()};
   const snapshotId='SNAP-'+digest(body);this.store.db.prepare('INSERT INTO snapshots VALUES(?,?,?,?,?)').run(snapshotId,draftId,view.revision,view.contractHash,JSON.stringify(body));
   const id='PREVIEW-'+randomUUID(),record={id,snapshotId,draftId,actor,mode,contractHash:view.contractHash,revision:view.revision,intentHash:this.intent(draftId),clauses:clauses.map(c=>({id:c.id,viewHash:c.viewHash,canCommit:c.canCommit})),seal:digest({snapshotId,actor,mode})};
   this.store.db.prepare('INSERT INTO previews VALUES(?,?,?,?)').run(id,draftId,actor,JSON.stringify(record));
   const validation=this.validate(draftId,mode);return {preview:record,validation:{...validation,clauses:this.explain(draftId,validation)},displayOnly:body.displayOnly,snapshotId};
  });
 }
 review(draftId,actor,{previewId,seal,clauseIds,mode='incremental'}){
  return this.store.transact(()=>{const draft=this.store.draft(draftId);this.permission(draft,actor,'approve');if(draft.status!=='open')failure('DRAFT_CLOSED','This draft is already committed.');
   const row=this.store.db.prepare('SELECT body FROM previews WHERE id=? AND draft_id=? AND actor=?').get(previewId,draftId,actor);if(!row)failure('PREVIEW_REQUIRED','Open a review preview first.');const p=JSON.parse(row.body);
   if(p.seal!==seal||p.mode!==mode)failure('PREVIEW_MISMATCH','Preview seal or mode does not match.');if(!Array.isArray(clauseIds)||!clauseIds.length||new Set(clauseIds).size!==clauseIds.length)failure('INVALID_REVIEW_SCOPE','Select distinct decisions explicitly.',400);
   const snapshot=JSON.parse(this.store.db.prepare('SELECT body FROM snapshots WHERE id=?').get(p.snapshotId).body),view=this.engine(draftId).evaluate('incremental');
   if(view.contractHash!==p.contractHash||p.intentHash!==this.intent(draftId)||(mode==='whole'&&p.revision!==view.revision))failure('PREVIEW_STALE','The preview changed. Refresh and review the current protected evidence.');
   const saved=[];for(const id of clauseIds){const approved=snapshot.clauses.find(c=>c.id===id),now=view.clauses.find(c=>c.id===id);if(!approved||!now)failure('UNKNOWN_CLAUSE','Unknown decision in review scope.',400);
    if(!now.canCommit)failure('CONDITION_FAILED','A required condition is false; this decision cannot be approved.',409,{clause:id,value:now.value,error:now.error});
    if(now.viewHash!==approved.viewHash)failure('PREVIEW_STALE','Protected evidence changed after this preview.',409,{clause:id});
    const record={id:'APP-'+digest({snapshot:p.snapshotId,clause:id,actor}),draftId,clauseId:id,actor,snapshotId:p.snapshotId,contractHash:p.contractHash,generation:snapshot.generation,journalFloor:snapshot.world.journal_floor,revision:snapshot.revision,fallback:snapshot.fallback,
     viewHash:approved.viewHash,tokensHash:approved.tokensHash,decisionHash:approved.decisionHash,coarse:approved.coarse,value:approved.value,reviewedAt:new Date().toISOString()};
    this.store.db.prepare('INSERT OR IGNORE INTO approvals VALUES(?,?,?,?,?,?)').run(record.id,draftId,id,actor,p.snapshotId,JSON.stringify(record));
    this.store.db.prepare('INSERT INTO approval_heads VALUES(?,?,?,?) ON CONFLICT(draft_id,clause_id,actor) DO UPDATE SET approval_id=excluded.approval_id').run(draftId,id,actor,record.id);saved.push(record.id);
   }
   return {approvalIds:saved,validation:this.validate(draftId,mode)};
  });
 }
 editQuantity(draftId,actor,sku,quantityG){return this.store.transact(()=>{const d=this.store.draft(draftId);this.permission(d,actor);if(d.status!=='open')failure('DRAFT_CLOSED','Committed drafts cannot be edited.');if(!d.context.skus.includes(sku)||!Number.isSafeInteger(quantityG)||quantityG<0||quantityG>10000000)failure('INVALID_QUANTITY','Use a bounded nonnegative integer quantity in grams.',400);this.store.patch('proposalLines',draftId+':'+sku,{quantityG});this.store.db.prepare('UPDATE drafts SET intent_revision=intent_revision+1 WHERE id=?').run(draftId);return {intentHash:this.intent(draftId)};});}
 commitRequest(draftId,mode='incremental'){return {draftId,mode,intentHash:this.intent(draftId),approvalSelection:this.selection(draftId)};}
 confirm(actor,key,request){
  if(typeof key!=='string'||!/^[A-Za-z0-9_-]{8,120}$/.test(key))failure('REQUEST_KEY_REQUIRED','Use an 8–120 character request key.',400);
  return this.store.transact(()=>{const d=this.store.draft(request.draftId);this.permission(d,actor);const requestHash=digest(request),previous=this.store.db.prepare('SELECT request_hash,receipt_id FROM outcomes WHERE actor=? AND request_key=?').get(actor,key);
   if(previous){if(previous.request_hash!==requestHash)failure('IDEMPOTENCY_CONFLICT','The same key belongs to different request content.');return {receipt:JSON.parse(this.store.db.prepare('SELECT body FROM receipts WHERE id=?').get(previous.receipt_id).body),repeated:true};}
   this.permission(d,actor,'commit');if(d.status!=='open')failure('DRAFT_ALREADY_COMMITTED','This draft already has a saved receipt.');
   if(request.intentHash!==this.intent(d.id)||request.approvalSelection!==this.selection(d.id))failure('REQUEST_CHANGED','The draft or approval selection changed. Refresh the confirmation request.');
   const workflow=adapter(d.workflow);for(const [table,key] of workflow.liveRules)if(this.store.get(table,key)?.body.enabled!==true)failure('RULE_REVOKED','A governing rule is revoked.');
   const validation=this.validate(d.id,request.mode);if(!validation.allApproved)failure('NEEDS_REVIEW','Protected evidence changed; explicit re-review is required.',409,validation);
   const heads=this.heads(d.id),id='SIM-'+randomUUID(),receipt={id,receiptId:'RECEIPT-'+randomUUID(),draftId:d.id,workflow:d.workflow,synthetic:true,execution:workflow.effectLabel,confirmedAt:new Date().toISOString(),confirmedBy:actor,
    intentHash:request.intentHash,contractHash:validation.contractHash,validatedRevision:validation.revision,mode:request.mode,
    decisions:[...heads.values()].map(a=>({clauseId:a.clauseId,value:a.value})),
    authorityChain:validation.clauses.map(c=>({clauseId:c.id,originalApprovalId:c.approvalId,originalSnapshotId:c.originalSnapshotId,reviewedRevision:c.reviewedRevision,validatedRevision:c.validatedRevision,protectedWitnessUnchanged:true}))};
   this.store.db.prepare('INSERT INTO receipts VALUES(?,?,?)').run(id,d.id,JSON.stringify(receipt));
   workflow.effect(this.store,d,heads,receipt);
   this.store.db.prepare('INSERT INTO outcomes VALUES(?,?,?,?)').run(actor,key,requestHash,id);this.store.db.prepare('UPDATE drafts SET status=? WHERE id=?').run('committed',d.id);
   return {receipt,repeated:false};
  });
 }
 receipts(){return this.store.db.prepare('SELECT body FROM receipts ORDER BY rowid DESC').all().map(r=>JSON.parse(r.body));}
}
module.exports={ApprovalService,ContractError};
