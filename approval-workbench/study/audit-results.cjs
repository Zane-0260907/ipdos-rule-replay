'use strict';
// Post-run semantic audit: reconstruct every reviewed/committed revision from
// the complete authoritative change journal, independently of stored snapshots,
// candidate node caches, dirty indexes and the runtime selection of clauses.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{DatabaseSync}=require('node:sqlite');
const {procurementOracle,readWorld}=require('../tests/full-oracle.cjs');
const {documentOracle}=require('../tests/document-oracle.cjs');
const summary=JSON.parse(fs.readFileSync(path.join(__dirname,(process.argv.includes('--document')?'document-':'')+(process.argv.includes('--sanity')?'sanity-latest.json':'main-latest.json')),'utf8'));
const run=summary.run,rows=fs.readFileSync(path.join(run,'raw.jsonl'),'utf8').trim().split('\n').map(JSON.parse),results=[];
const auditDirectory=fs.mkdtempSync(path.join(run,'semantic-audit-')),itemsPath=path.join(auditDirectory,'items.jsonl'),itemsFD=fs.openSync(itemsPath,'wx');
const item=record=>fs.writeSync(itemsFD,JSON.stringify(record)+'\n');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
for(const trial of rows){
 const db=new DatabaseSync(path.join(run,trial.database),{readOnly:true}),world=readWorld({db}),d=db.prepare('SELECT context,workflow FROM drafts LIMIT 1').get(),context=JSON.parse(d.context),cached=new Map(),issues=[];
 function atRevision(revision){
  if(cached.has(revision))return cached.get(revision);
  const history=world.history.filter(e=>e.seq<=revision),facts=new Map();for(const e of history){const key=JSON.stringify([e.table,e.key]);if(e.after)facts.set(key,e.after);else facts.delete(key);}
  const full={...world,revision,history,facts:[...facts.values()],historyTrusted:history.length===revision&&history.every((e,i)=>e.seq===i+1)&&world.journal_floor===0};
  const oracle=(d.workflow==='document'?documentOracle:procurementOracle)(full,context);cached.set(revision,oracle);return oracle;
 }
 const approvals=new Map(db.prepare('SELECT id,body FROM approvals').all().map(r=>[r.id,JSON.parse(r.body)]));let clausesChecked=0,receiptDecisionsChecked=0;
 for(const approval of approvals.values()){
  const expected=atRevision(approval.revision).clauses.find(c=>c.id===approval.clauseId);clausesChecked++;
  const passed=Boolean(expected&&expected.canCommit&&equal(approval.value,expected.value)&&approval.tokensHash===expected.tokensHash);
  item({trial:trial.index,scenario:trial.scenario,mode:trial.mode,kind:'approval',approvalId:approval.id,clauseId:approval.clauseId,snapshotId:approval.snapshotId,revision:approval.revision,expectedValue:expected?.value??null,actualValue:approval.value,expectedTokensHash:expected?.tokensHash??null,actualTokensHash:approval.tokensHash,passed});
  if(!passed)issues.push({type:'APPROVED_VIEW_MISMATCH',approval:approval.id,clause:approval.clauseId,revision:approval.revision,expected,actual:{value:approval.value,tokensHash:approval.tokensHash}});
 }
 const receipts=db.prepare('SELECT body FROM receipts').all().map(r=>JSON.parse(r.body));
 for(const receipt of receipts){
  const commitOracle=atRevision(receipt.validatedRevision);
  for(const link of receipt.authorityChain){
   const approved=approvals.get(link.originalApprovalId),current=commitOracle.clauses.find(c=>c.id===link.clauseId),saved=receipt.decisions.find(c=>c.clauseId===link.clauseId);receiptDecisionsChecked++;
   const passed=Boolean(approved&&current?.canCommit&&equal(current.value,approved.value)&&current.tokensHash===approved.tokensHash&&equal(saved?.value,approved.value)&&receipt.contractHash===approved.contractHash&&approved.snapshotId===link.originalSnapshotId);
   item({trial:trial.index,scenario:trial.scenario,mode:trial.mode,kind:'receipt-decision',receiptId:receipt.id,clauseId:link.clauseId,approvalId:approved?.id??null,originalSnapshotId:link.originalSnapshotId,commitRevision:receipt.validatedRevision,expectedValue:current?.value??null,approvedValue:approved?.value??null,actualValue:saved?.value??null,expectedTokensHash:current?.tokensHash??null,actualTokensHash:approved?.tokensHash??null,passed});
   if(!passed)issues.push({type:'COMMITTED_VIEW_MISMATCH',receipt:receipt.id,clause:link.clauseId,commitRevision:receipt.validatedRevision,approval:approved,expected:current});
  }
 }
 const counts={receipts:receipts.length,outcomes:db.prepare('SELECT count(*) AS n FROM outcomes').get().n,ownEffectRecords:db.prepare("SELECT count(*) AS n FROM facts WHERE table_name=? AND json_extract(body,'$.draftId')=?").get(d.workflow==='document'?'localReleases':'budgetUses',context.draftId).n,draftStatus:db.prepare('SELECT status FROM drafts WHERE id=?').get(context.draftId).status};
 if(counts.receipts!==counts.outcomes||counts.receipts!==counts.ownEffectRecords||counts.receipts>1||(counts.receipts===1)!==(counts.draftStatus==='committed'))issues.push({type:'PARTIAL_OR_DUPLICATE_EFFECT',counts});
 const result={index:trial.index,scenario:trial.scenario,mode:trial.mode,scale:trial.scale,repeat:trial.repeat,clausesChecked,receiptDecisionsChecked,counts,issues,passed:issues.length===0};results.push(result);db.close();
}
const result={scope:'Independent post-run semantic audit of every immutable approval and receipt against complete journal replay and manual oracle; no candidate cache/selection imports',run,codeDigest:summary.codeDigest||summary.sourceDigest,auditScriptSha256:crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),oracleSources:Object.fromEntries(['full-oracle.cjs','document-oracle.cjs'].map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../tests',f))).digest('hex')])),trials:results.length,approvalClausesChecked:results.reduce((n,r)=>n+r.clausesChecked,0),receiptDecisionsChecked:results.reduce((n,r)=>n+r.receiptDecisionsChecked,0),failures:results.filter(r=>!r.passed),passed:results.every(r=>r.passed)};
fs.closeSync(itemsFD);result.auditDirectory=auditDirectory;result.itemRaw=itemsPath;
fs.writeFileSync(path.join(auditDirectory,'trials.jsonl'),results.map(r=>JSON.stringify(r)).join('\n')+'\n');fs.writeFileSync(path.join(auditDirectory,'summary.json'),JSON.stringify(result,null,2));fs.writeFileSync(path.join(__dirname,(process.argv.includes('--document')?'document':'procurement')+'-semantic-latest.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({...result,failures:result.failures.map(r=>({scenario:r.scenario,mode:r.mode,issues:r.issues.slice(0,1)}))},null,2));if(!result.passed)process.exitCode=1;
