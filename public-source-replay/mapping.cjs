'use strict';
// Input-only adapter outside the frozen core. No repository code is imported.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=__dirname,read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,''));
const sha=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const compare=(a,b)=>a<b?-1:a>b?1:0;
const isSource=row=>row.type==='blob'&&['100644','100755'].includes(row.mode)&&/\.(rst|md|txt)$/i.test(row.path);
const partition=p=>p.includes('/')?p.split('/')[0]:'@root';
function load(){
 const window=read('data/window.json'),catalog=new Map(read('data/blob-catalog.json').blobs.map(b=>[b.git_blob_sha,b]));
 const trees=window.commits_oldest_first.map(c=>read('data/trees/'+c.tree_sha+'.json').entries.filter(e=>e.type!=='tree').sort((a,b)=>compare(a.path,b.path)));
 const names=[...new Set(trees.flatMap(t=>t.filter(isSource).map(r=>partition(r.path))))].sort(compare);
 const scopes=names.map(name=>({name,docId:'SRC-'+sha(name).slice(0,16)}));
 const states=trees.map((tree,index)=>{
  const documents=scopes.map(scope=>{
   const members=tree.filter(r=>isSource(r)&&partition(r.path)===scope.name).map(r=>{
    const blob=catalog.get(r.sha);if(!blob||blob.verified_git_blob_sha!==r.sha)throw Error('Unverified source object');
    return [r.path,r.mode,r.sha,blob.content_sha256];
   });
   return {...scope,contentDigest:sha(members),memberCount:members.length,members};
  });
  const sharedMembers=tree.filter(r=>!isSource(r)).map(r=>[r.path,r.mode,r.type,r.sha]);
  return {index,commit:window.commits_oldest_first[index],documents,sharedDigest:sha(sharedMembers),sharedMembers,tree};
 });
 return {window,scopes,states};
}
function seed(store,state,scopes){
 const context={draftId:'CF-DOCUMENT-001',actorId:'researcher-synthetic-manager',channelId:'COUNTERFACTUAL-LOCAL',docIds:scopes.map(s=>s.docId)};
 store.transact(()=>{
  store.put('authority','document:'+context.actorId,{view:true,approve:true,commit:true,grantVersion:1});
  store.put('rules','publishing',{enabled:true,minSignoffs:2,allowInternal:false,version:state.sharedDigest});
  store.put('releaseChannels',context.channelId,{enabled:true,version:'researcher-generated-channel-v1'});
  store.put('principals','CF-READER',{active:true,grantVersion:1,name:'Researcher-generated fictional reader'});
  store.put('audienceMembers','CF-AUDIENCE',{channelId:context.channelId,enabled:true,principalId:'CF-READER',role:'reader'});
  for(const id of ['CF-EDITOR-A','CF-EDITOR-B'])store.put('editors',id,{active:true,canSign:true,grantVersion:1});
  for(const doc of state.documents){
   store.put('documents',doc.docId,{title:'Counterfactual source bundle '+doc.name,note:'Source membership/content only; no rendered semantics or real project approvals.',contentDigest:doc.contentDigest,classification:'public',ready:true,version:doc.contentDigest});
   store.put('publicationLines',context.draftId+':'+doc.docId,{draftId:context.draftId,docId:doc.docId,requested:true});
   for(const editorId of ['CF-EDITOR-A','CF-EDITOR-B'])store.put('signoffs',doc.docId+':'+editorId,{docId:doc.docId,state:'approved',editorId,decision:'approve',contentDigest:doc.contentDigest,version:doc.contentDigest});
  }
  store.createDraft(context.draftId,'document',context);
 });return context;
}
function apply(store,before,after){
 const changed=[];
 store.transact(()=>{
  if(before.sharedDigest!==after.sharedDigest){store.patch('rules','publishing',{version:after.sharedDigest});changed.push({table:'rules',key:'publishing',synthetic:true});}
  for(const doc of after.documents){
   const old=before.documents.find(d=>d.docId===doc.docId);if(old.contentDigest===doc.contentDigest)continue;
   store.patch('documents',doc.docId,{contentDigest:doc.contentDigest,version:doc.contentDigest});changed.push({table:'documents',key:doc.docId,synthetic:false,meaning:'Hash of actual exact source member vector'});
   for(const editorId of ['CF-EDITOR-A','CF-EDITOR-B']){const key=doc.docId+':'+editorId;store.patch('signoffs',key,{contentDigest:doc.contentDigest,version:doc.contentDigest});changed.push({table:'signoffs',key,synthetic:true});}
  }
 });return changed;
}
function transition(before,after){
 const old=new Map(before.tree.map(e=>[e.path,e])),next=new Map(after.tree.map(e=>[e.path,e]));
 const changes=[...new Set([...old.keys(),...next.keys()])].sort(compare).filter(p=>JSON.stringify(old.get(p))!==JSON.stringify(next.get(p))).map(p=>({path:p,type:!old.has(p)?'A':!next.has(p)?'D':'M',before:old.get(p)||null,after:next.get(p)||null,source:isSource(old.get(p)||{})||isSource(next.get(p)||{})}));
 const affected=after.documents.filter(d=>before.documents.find(o=>o.docId===d.docId).contentDigest!==d.contentDigest).map(d=>({name:d.name,docId:d.docId}));
 return {beforeSha:before.commit.sha,afterSha:after.commit.sha,timeUtc:after.commit.time_utc,changes,affectedSourcePartitions:affected,sharedBindingChanged:before.sharedDigest!==after.sharedDigest};
}
module.exports={load,seed,apply,transition};
if(require.main===module){const x=load();fs.writeFileSync(path.join(root,'data/mapped-states.json'),JSON.stringify({scopes:x.scopes,states:x.states.map(({tree,...s})=>s)},null,2)+'\n');console.log(JSON.stringify({states:x.states.length,scopes:x.scopes}));}
