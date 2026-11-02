'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {FactStore}=require('../core/store.cjs'),{seedProcurement}=require('../core/fixtures.cjs'),{ApprovalService}=require('../core/service.cjs');
const {readWorld,procurementOracle,retained}=require('./full-oracle.cjs');
const actor='synthetic-manager-01';
function approve(s,c,a){const p=s.preview(c.draftId,actor);s.review(c.draftId,actor,{previewId:p.preview.id,seal:p.preview.seal,clauseIds:p.validation.clauses.map(x=>x.id)});return p;}
test('missing join-right key insertion/deletion ABA remains invalid after cold reopen',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ipdos-aba-')),file=path.join(dir,'synthetic.sqlite');let store=new FactStore(file);const c=seedProcurement(store);
 store.put('reserves','H-MISSING',{storeId:c.storeId,sku:'RICE',status:'active',quantityG:1000,reasonId:'NOT-YET-EXISTS'});
 let service=new ApprovalService(store);approve(service,c);const before=procurementOracle(readWorld(store),c);
 store.put('reserveReasons','NOT-YET-EXISTS',{active:true,version:'temporary'});store.delete('reserveReasons','NOT-YET-EXISTS');store.close();
 store=new FactStore(file);service=new ApprovalService(store);try{const now=service.validate(c.draftId),expected=retained(before,procurementOracle(readWorld(store),c));assert.deepEqual(Object.fromEntries(now.clauses.map(x=>[x.id,x.retained])),expected);assert.equal(now.clauses.find(x=>x.id==='quantity:RICE').retained,false);assert.equal(now.requiredReviewCount,1);}finally{store.close();}
});
test('predicate exclude/include/exclude and same-valued delete/reinsert change witnesses',()=>{
 const store=new FactStore(':memory:');const c=seedProcurement(store),service=new ApprovalService(store);store.put('reserves','H-BOUNDARY',{storeId:c.storeId,sku:'RICE',status:'inactive',quantityG:1000,reasonId:'SAFETY'});approve(service,c);
 try{const old=procurementOracle(readWorld(store),c);store.patch('reserves','H-BOUNDARY',{status:'active'});store.patch('reserves','H-BOUNDARY',{status:'inactive'});const current=service.validate(c.draftId);assert.deepEqual(Object.fromEntries(current.clauses.map(x=>[x.id,x.retained])),retained(old,procurementOracle(readWorld(store),c)));assert.equal(current.requiredReviewCount,1);
  const p=service.preview(c.draftId,actor);service.review(c.draftId,actor,{previewId:p.preview.id,seal:p.preview.seal,clauseIds:['quantity:RICE']});const body=store.get('inventory',c.storeId+':RICE').body;store.delete('inventory',c.storeId+':RICE');store.put('inventory',c.storeId+':RICE',body);assert.equal(service.validate(c.draftId).requiredReviewCount,1);
 }finally{store.close();}
});
test('shared budget price change invalidates all clauses; reviewing one cannot leave a valid mixed authorization',()=>{
 const store=new FactStore(':memory:'),c=seedProcurement(store),s=new ApprovalService(store);approve(s,c);try{const original=procurementOracle(readWorld(store),c);store.patch('prices','RICE',{centsPerKg:201});const v=s.validate(c.draftId);assert.equal(v.requiredReviewCount,3);assert.deepEqual(Object.fromEntries(v.clauses.map(x=>[x.id,x.retained])),retained(original,procurementOracle(readWorld(store),c)));
  const p=s.preview(c.draftId,actor);s.review(c.draftId,actor,{previewId:p.preview.id,seal:p.preview.seal,clauseIds:['quantity:RICE']});assert.equal(s.validate(c.draftId).requiredReviewCount,2);assert.throws(()=>s.confirm(actor,'mixed-reviews-0001',s.commitRequest(c.draftId)),e=>e.code==='NEEDS_REVIEW');assert.equal(s.receipts().length,0);
 }finally{store.close();}
});
test('approval grant revoke/restore and contract version mismatch require fresh review',()=>{
 const store=new FactStore(':memory:'),c=seedProcurement(store),s=new ApprovalService(store);approve(s,c);try{store.patch('authority','procurement:'+actor,{approve:false,grantVersion:2});assert.equal(s.validate(c.draftId).requiredReviewCount,3);store.patch('authority','procurement:'+actor,{approve:true,grantVersion:3});assert.equal(s.validate(c.draftId).requiredReviewCount,3);
  const p=s.preview(c.draftId,actor);s.review(c.draftId,actor,{previewId:p.preview.id,seal:p.preview.seal,clauseIds:p.validation.clauses.map(x=>x.id)});const original=s.definition.bind(s);s.definition=d=>({...original(d),version:'contract-changed'});assert.equal(s.validate(c.draftId).requiredReviewCount,3);
 }finally{store.close();}
});
test('same draft cannot be committed twice with a different key or actor; snapshot ledger is immutable',()=>{
 const store=new FactStore(':memory:'),c=seedProcurement(store),s=new ApprovalService(store);const p=approve(s,c);try{const body=s.commitRequest(c.draftId);s.confirm(actor,'first-unique-key-0001',body);assert.throws(()=>s.confirm(actor,'second-unique-key-0002',body),e=>e.code==='DRAFT_ALREADY_COMMITTED');store.put('authority','procurement:synthetic-manager-02',{view:true,approve:true,commit:true,grantVersion:1});assert.throws(()=>s.confirm('synthetic-manager-02','other-actor-key-0003',body),e=>e.code==='APPROVER_MISMATCH');assert.equal(s.receipts().length,1);assert.throws(()=>store.db.prepare('UPDATE snapshots SET body=? WHERE id=?').run('{}',p.snapshotId),/immutable evidence/);assert.throws(()=>store.db.prepare('INSERT INTO receipts VALUES(?,?,?)').run('DUPLICATE',c.draftId,'{}'),/UNIQUE/);
 }finally{store.close();}
});
