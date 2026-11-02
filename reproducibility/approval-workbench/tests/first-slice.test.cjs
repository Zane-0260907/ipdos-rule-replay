'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {FactStore}=require('../core/store.cjs'),{seedProcurement}=require('../core/fixtures.cjs'),{ApprovalService}=require('../core/service.cjs');
const {readWorld,procurementOracle,retained}=require('./full-oracle.cjs');
const actor='synthetic-manager-01';
function setup(){const store=new FactStore(':memory:'),context=seedProcurement(store),service=new ApprovalService(store);return {store,context,service};}
function approve(s){const p=s.service.preview(s.context.draftId,actor);s.service.review(s.context.draftId,actor,{previewId:p.preview.id,seal:p.preview.seal,clauseIds:p.validation.clauses.map(c=>c.id)});return p;}
test('first end-to-end slice: original evidence retained through unrelated change; commit and durable receipt replay',()=>{
 const s=setup();try{
  approve(s);const original=procurementOracle(readWorld(s.store),s.context),heads=[...s.service.heads(s.context.draftId).values()];
  s.store.patch('inventory','OTHER-STORE:RICE',{onHandG:59000});
  const validation=s.service.validate(s.context.draftId),expected=retained(original,procurementOracle(readWorld(s.store),s.context));
  assert.deepEqual(Object.fromEntries(validation.clauses.map(c=>[c.id,c.retained])),expected);assert.equal(validation.requiredReviewCount,0);
  assert.deepEqual([...s.service.heads(s.context.draftId).values()].map(a=>a.id),heads.map(a=>a.id));
  const request=s.service.commitRequest(s.context.draftId),first=s.service.confirm(actor,'slice-confirm-0001',request);assert.equal(first.repeated,false);
  s.store.patch('inventory','STORE-001:RICE',{onHandG:20000});const again=s.service.confirm(actor,'slice-confirm-0001',request);assert.equal(again.repeated,true);assert.deepEqual(again.receipt,first.receipt);
  assert.equal(s.service.receipts().length,1);assert.equal(s.store.db.prepare('SELECT count(*) AS n FROM outcomes').get().n,1);
  const evidence={completed:true,originalSnapshotIds:heads.map(h=>h.snapshotId),retainedOriginalApprovalIds:heads.map(h=>h.id),validation,oracle:expected,receipt:first.receipt,repeatedSameReceipt:true};
  fs.mkdirSync(path.resolve('artifacts'),{recursive:true});const run=fs.mkdtempSync(path.resolve('artifacts/first-slice-'));fs.writeFileSync(path.join(run,'evidence.json'),JSON.stringify(evidence,null,2));fs.writeFileSync('artifacts/first-slice-latest.json',JSON.stringify({run,evidence:path.join(run,'evidence.json')},null,2));
 }finally{s.store.close();}
});
test('related stock changes require explicit refreshed review even when proposed grams stay 31500',()=>{
 const s=setup();try{
  approve(s);const old=procurementOracle(readWorld(s.store),s.context),oldHeads=s.service.heads(s.context.draftId),cachedRequest=s.service.commitRequest(s.context.draftId);
  s.store.patch('inventory','STORE-001:RICE',{onHandG:20000});
  const v=s.service.validate(s.context.draftId),expected=retained(old,procurementOracle(readWorld(s.store),s.context));assert.deepEqual(Object.fromEntries(v.clauses.map(c=>[c.id,c.retained])),expected);assert.equal(v.requiredReviewCount,1);
  assert.throws(()=>s.service.confirm(actor,'slice-stale-0001',cachedRequest),e=>e.code==='NEEDS_REVIEW');assert.equal(s.service.receipts().length,0);
  const preview=s.service.preview(s.context.draftId,actor),affected=preview.validation.clauses.filter(c=>!c.retained).map(c=>c.id);
  s.service.review(s.context.draftId,actor,{previewId:preview.preview.id,seal:preview.preview.seal,clauseIds:affected});
  const heads=s.service.heads(s.context.draftId);assert.notEqual(heads.get('quantity:RICE').id,oldHeads.get('quantity:RICE').id);
  for(const id of ['quantity:CHICKEN','quantity:GREENS'])assert.equal(heads.get(id).id,oldHeads.get(id).id);
  const receipt=s.service.confirm(actor,'slice-fresh-0002',s.service.commitRequest(s.context.draftId)).receipt;assert.equal(receipt.decisions.find(x=>x.clauseId==='quantity:RICE').value.proposedG,31500);
 }finally{s.store.close();}
});
test('sealed preview refuses a protected change after the user-visible preview',()=>{
 const s=setup();try{const p=s.service.preview(s.context.draftId,actor);s.store.patch('inventory','STORE-001:RICE',{onHandG:20000});assert.throws(()=>s.service.review(s.context.draftId,actor,{previewId:p.preview.id,seal:p.preview.seal,clauseIds:['quantity:RICE']}),e=>e.code==='PREVIEW_STALE');assert.equal(s.service.heads(s.context.draftId).size,0);}finally{s.store.close();}
});
