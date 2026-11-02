'use strict';
// Read-only audit. Imports no production core, candidate mapping or runner.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{DatabaseSync}=require('node:sqlite'),{isDeepStrictEqual:equal}=require('node:util');
const {documentOracle}=require('./tests/document-oracle.cjs');
const root=__dirname,read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const text=v=>Array.isArray(v)?'['+v.map(text).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+text(v[k])).join(',')+'}':JSON.stringify(v);
const sha=v=>crypto.createHash('sha256').update(text(v)).digest('hex');
const fileHash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const local=(base,relative)=>path.join(base,...relative.split(/[\\/]/));
const portable=relative=>relative.replace(/\\/g,'/');
const runArg=process.argv.indexOf('--run');
const latest=read(runArg<0?path.join(root,'results/latest.json'):local(root,process.argv[runArg+1]+'/summary.json')),run=local(root,latest.run);
const rows=fs.readFileSync(path.join(run,'raw.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const out=fs.mkdtempSync(path.join(root,'results','audit-')),itemFile=path.join(out,'items.jsonl');
let checks=0,failures=0,databases=0,sourceIdentityChecks=0;
const byMode={};
function check(kind,actual,expected,context){const ok=equal(actual,expected);checks++;if(!ok)failures++;fs.appendFileSync(itemFile,JSON.stringify({...context,kind,passed:ok,actual,expected})+'\n');}
const evidence=read(path.join(root,'data/tip-eligibility-evidence.json')),window=read(path.join(root,'data/window.json'));
check('observed tip identity',evidence.observed_tip.sha,window.observed_tip_sha,{});
check('observed tip is after cutoff',evidence.observed_tip.time_utc>window.cutoff_utc,true,{});
check('nearest first parent is frozen eligible endpoint',evidence.observed_tip.parents[0],window.commits_oldest_first.at(-1).sha,{});
check('eligible endpoint respects cutoff',window.commits_oldest_first.at(-1).time_utc<=window.cutoff_utc,true,{});
const env=read(path.join(run,'environment.json'));
const provenance=read(path.join(root,'provenance/original-execution.json'));
for(const [file,expected] of Object.entries(env.inputHashes)){
 // Original immutable traces retain their exact historical wrapper source.
 // New runs bind the currently distributed wrapper. There is no hash bypass.
 const archived=portable(latest.run)===provenance.original_run?provenance.archived_entrypoints[file]:null;
 const verifiedFile=archived?archived.path:file;
 check('execution input hash remains frozen',fileHash(local(root,verifiedFile)),expected,{file,verifiedFile});sourceIdentityChecks++;
}
for(const row of rows){
 const ctx={index:row.index,mode:row.mode};if(!byMode[row.mode])byMode[row.mode]={trials:0,falseRetainedApprovals:0,incorrectNewEffects:0,partialEffects:0,necessaryReviewClauses:0,requiredReviewClauses:0,extraReviewClauses:0};
 const totals=byMode[row.mode];totals.trials++;
 const db=new DatabaseSync(local(run,row.database),{readOnly:true});
 try{
  databases++;
  const meta=db.prepare('SELECT * FROM meta').get(),draft=db.prepare('SELECT * FROM drafts').get(),context=JSON.parse(draft.context);
  const history=db.prepare('SELECT * FROM changes ORDER BY seq').all().map(e=>({seq:e.seq,table:e.table_name,key:e.row_key,before:e.before_body?JSON.parse(e.before_body):null,after:e.after_body?JSON.parse(e.after_body):null}));
  check('complete authoritative journal',history.map(e=>e.seq),Array.from({length:meta.revision},(_,i)=>i+1),ctx);
  const worlds=new Map(),oracles=new Map();
  function worldAt(revision){
   if(worlds.has(revision))return worlds.get(revision);
   const facts=new Map(),h=history.filter(e=>e.seq<=revision);
   for(const e of h){const k=e.table+'\0'+e.key;if(e.after)facts.set(k,e.after);else facts.delete(k);}
   const sorted=[...facts.values()].sort((a,b)=>a.table<b.table?-1:a.table>b.table?1:a.key<b.key?-1:a.key>b.key?1:0);
   const world={revision,generation:meta.generation,journal_floor:0,facts:sorted,history:h,historyTrusted:h.length===revision&&h.every((e,i)=>e.seq===i+1)};
   worlds.set(revision,world);return world;
  }
  function oracleAt(revision){if(!oracles.has(revision))oracles.set(revision,documentOracle(worldAt(revision),context));return oracles.get(revision);}
  const snapshots=new Map();
  for(const saved of db.prepare('SELECT * FROM snapshots').all()){
   const snap=JSON.parse(saved.body),world=worldAt(saved.revision),oracle=oracleAt(saved.revision);snapshots.set(saved.id,snap);
   check('snapshot complete world reconstructed from journal',snap.world,{revision:world.revision,generation:world.generation,journal_floor:world.journal_floor,facts:world.facts},{...ctx,snapshotId:saved.id});
   for(const clause of snap.clauses){
    const expected=oracle.clauses.find(c=>c.id===clause.id),tokens=clause.tokenIds.map(id=>snap.tokens[id]).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
    check('snapshot complete value/witness/condition',{value:clause.value,tokensHash:clause.tokensHash,canCommit:clause.canCommit},{value:expected.value,tokensHash:expected.tokensHash,canCommit:expected.canCommit},{...ctx,snapshotId:saved.id,clauseId:clause.id});
    check('snapshot full token catalog hash',sha(tokens),expected.tokensHash,{...ctx,snapshotId:saved.id,clauseId:clause.id});
   }
  }
  const approvals=new Map();
  for(const saved of db.prepare('SELECT * FROM approvals').all()){
   const a=JSON.parse(saved.body);approvals.set(saved.id,a);const snap=snapshots.get(saved.snapshot_id),expected=oracleAt(snap.revision).clauses.find(c=>c.id===saved.clause_id);
   check('immutable approval tied to complete original evidence',{id:a.id,snapshotId:a.snapshotId,value:a.value,tokensHash:a.tokensHash},{id:saved.id,snapshotId:saved.snapshot_id,value:expected.value,tokensHash:expected.tokensHash},{...ctx,approvalId:saved.id});
  }
  const old=oracleAt(row.initial.revision),current=oracleAt(row.transitionRevision),expectedRetained={};
  for(const now of current.clauses){const before=old.clauses.find(c=>c.id===now.id);expectedRetained[now.id]=now.canCommit&&before.tokensHash===now.tokensHash&&equal(before.value,now.value);}
  check('independently recomputed retained scopes',row.oracleRetained,expectedRetained,ctx);
  const necessary=Object.values(expectedRetained).filter(x=>!x).length,unsafe=row.validation.clauses.filter(c=>c.retained&&!expectedRetained[c.id]).length,extra=row.validation.clauses.filter(c=>!c.retained&&expectedRetained[c.id]).length;
  const invalidEffect=row.initialConfirm.ok&&necessary>0?1:0;
  totals.necessaryReviewClauses+=necessary;totals.requiredReviewClauses+=row.validation.requiredReviewCount;totals.extraReviewClauses+=extra;totals.falseRetainedApprovals+=unsafe;totals.incorrectNewEffects+=invalidEffect;
  check('raw review count accounting',{necessary:row.necessaryReviewCount,extra:row.extraReviewCount,falseRetention:row.falseRetainedApprovals,incorrectEffect:row.incorrectNewEffects},{necessary,extra,falseRetention:unsafe,incorrectEffect:invalidEffect},ctx);
  const receipts=db.prepare('SELECT * FROM receipts').all(),outcomes=db.prepare('SELECT * FROM outcomes').all(),effects=db.prepare("SELECT * FROM facts WHERE table_name='localReleases'").all();
  const partial=receipts.length!==1||outcomes.length!==1||effects.length!==1||draft.status!=='committed'?1:0;totals.partialEffects+=partial;check('exactly one final atomic local effect',{receipts:receipts.length,outcomes:outcomes.length,effects:effects.length,status:draft.status},{receipts:1,outcomes:1,effects:1,status:'committed'},ctx);
  for(const saved of receipts){
   const receipt=JSON.parse(saved.body),oracle=oracleAt(receipt.validatedRevision);
   check('stored receipt equals reported confirmation and retry',receipt,row.finalConfirm.result.receipt,ctx);check('reported exact retry',row.retry.result,{receipt,repeated:true},ctx);
   check('saved request hash',outcomes[0].request_hash,sha(row.finalRequest),ctx);check('saved request outcome receipt',outcomes[0].receipt_id,saved.id,ctx);
   for(const chain of receipt.authorityChain){
    const a=approvals.get(chain.originalApprovalId),expected=oracle.clauses.find(c=>c.id===chain.clauseId),snap=snapshots.get(chain.originalSnapshotId),sc=snap.clauses.find(c=>c.id===chain.clauseId);
    check('receipt retains original approval/snapshot unchanged',{snapshot:a.snapshotId,approvalValue:a.value,approvalTokens:a.tokensHash,snapshotValue:sc.value,snapshotTokens:sc.tokensHash,effectValue:receipt.decisions.find(d=>d.clauseId===chain.clauseId).value},{snapshot:chain.originalSnapshotId,approvalValue:expected.value,approvalTokens:expected.tokensHash,snapshotValue:expected.value,snapshotTokens:expected.tokensHash,effectValue:expected.value},{...ctx,receiptId:saved.id,clauseId:chain.clauseId});
   }
  }
 }finally{db.close();}
}
for(const [mode,actual] of Object.entries(byMode)){
 const summary=latest.byMode[mode];check('recomputed aggregate matches runner',{trials:actual.trials,falseRetainedApprovals:actual.falseRetainedApprovals,incorrectNewEffects:actual.incorrectNewEffects,partialEffects:actual.partialEffects,necessaryReviewClauses:actual.necessaryReviewClauses,requiredReviewClauses:actual.requiredReviewClauses,extraReviewClauses:actual.extraReviewClauses},{trials:summary.trials,falseRetainedApprovals:summary.falseRetainedApprovals,incorrectNewEffects:summary.incorrectNewEffects,partialEffects:summary.partialEffects,necessaryReviewClauses:summary.necessaryReviewClauses,requiredReviewClauses:summary.requiredReviewClauses,extraReviewClauses:summary.extraReviewClauses},{mode});
}
const summary={passed:failures===0,checks,failures,databases,sourceIdentityChecks,byMode,run:portable(latest.run),audit:portable(path.relative(root,out)),scriptSha256:fileHash(__filename),oracleSha256:fileHash(path.join(root,'tests/document-oracle.cjs')),rawSha256:fileHash(path.join(run,'raw.jsonl')),limits:'Read-only standalone full journal reconstruction; no candidate mapper or production core imports. Real source contents were hash-verified at acquisition; synthetic policies/signoffs remain counterfactual.'};
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');fs.writeFileSync(path.join(root,'results/audit-latest.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));if(!summary.passed)process.exitCode=1;
