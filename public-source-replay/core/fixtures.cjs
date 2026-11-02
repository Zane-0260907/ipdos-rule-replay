'use strict';
function seedProcurement(store,{draftId='PROC-001',storeId='STORE-001',actorId='synthetic-manager-01',count=3,opaque=false}={}){
 const skus=['RICE','CHICKEN','GREENS'];for(let i=3;i<count;i++)skus.push('ITEM-'+String(i).padStart(3,'0'));
 store.transact(()=>{
  store.put('authority','procurement:'+actorId,{view:true,approve:true,commit:true,grantVersion:1});
  store.put('authority','procurement:synthetic-viewer-01',{view:true,approve:false,commit:false,grantVersion:1});
  store.put('rules','inventory',{enabled:true,bufferBp:11300,maxQuantityG:10000000,version:'inventory-1'});
  store.put('rules','budget',{enabled:true,version:'budget-1'});
  store.put('budgets',storeId,{limitCents:Math.max(20000,count*10000),version:'budget-1'});
  store.put('reserveReasons','SAFETY',{active:true,version:'reason-1',label:'Safety reserve'});
  for(let i=0;i<skus.length;i++){
   const sku=skus[i],demandG=[50000,30000,20000][i]??20000,onHandG=[25000,8000,26000][i]??10000,quantityG=[31500,25000,0][i]??12000;
   store.put('inventory',storeId+':'+sku,{storeId,sku,demandG,onHandG,name:['Synthetic rice','Synthetic chicken','Synthetic greens'][i]||'Synthetic '+sku,note:'Display-only note'});
   store.put('prices',sku,{centsPerKg:[200,300,100][i]??100,version:'price-1'});
   store.put('proposalLines',draftId+':'+sku,{draftId,sku,quantityG});
  }
  store.put('inventory','OTHER-STORE:RICE',{storeId:'OTHER-STORE',sku:'RICE',demandG:90000,onHandG:60000,name:'Other-store rice',note:'Outside this approval contract'});
  store.createDraft(draftId,'procurement',{draftId,storeId,actorId,skus,opaque});
 });
 return {draftId,storeId,actorId,skus,opaque};
}
function seedDocuments(store,{draftId='DOC-001',actorId='synthetic-manager-01',channelId='LOCAL-DEMO'}={}){
 const docIds=['GUIDE-A','RUNBOOK-B'];
 store.transact(()=>{
  store.put('authority','document:'+actorId,{view:true,approve:true,commit:true,grantVersion:1});store.put('authority','document:synthetic-viewer-01',{view:true,approve:false,commit:false,grantVersion:1});
  store.put('rules','publishing',{enabled:true,minSignoffs:2,allowInternal:true,version:'publishing-1'});store.put('releaseChannels',channelId,{enabled:true,version:'channel-1'});
  for(const id of ['READER-A','READER-B'])store.put('principals',id,{active:true,grantVersion:1,name:'Synthetic '+id});store.put('audienceMembers','AUDIENCE-A',{channelId,enabled:true,principalId:'READER-A',role:'reader'});
  for(const id of ['EDITOR-A','EDITOR-B'])store.put('editors',id,{active:true,canSign:true,grantVersion:1});
  for(const docId of docIds){
   const contentDigest=require('node:crypto').createHash('sha256').update('synthetic content '+docId).digest('hex');store.put('documents',docId,{title:'Synthetic '+docId,note:'Display-only title/note',contentDigest,classification:'internal',ready:true,version:'content-1'});store.put('publicationLines',draftId+':'+docId,{draftId,docId,requested:true});
   for(const editorId of ['EDITOR-A','EDITOR-B'])store.put('signoffs',docId+':'+editorId,{docId,state:'approved',editorId,decision:'approve',contentDigest,version:1});
  }
  store.createDraft(draftId,'document',{draftId,actorId,channelId,docIds});
 });return {draftId,actorId,channelId,docIds};
}
module.exports={seedProcurement,seedDocuments};
