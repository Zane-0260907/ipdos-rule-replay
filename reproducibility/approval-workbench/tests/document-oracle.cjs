'use strict';
// Separate complete materialization, not a second invocation of the candidate DSL.
const {createHash}=require('node:crypto');
const text=v=>Array.isArray(v)?'['+v.map(text).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+text(v[k])).join(',')+'}':JSON.stringify(v);
const sha=v=>createHash('sha256').update(text(v)).digest('hex');
function documentOracle(world,c){
 const shared=new Map(),lookup=(table,key)=>world.facts.find(r=>r.table===table&&r.key===key);
 function key(table,id,columns,tokens){
  const fields=[...columns].sort(),row=lookup(table,id),tokenId='key:'+text({table,key:id,fields});let token,value=null;
  if(!row)token={id:tokenId,kind:'key',table,key:id,exists:false,absenceEpoch:Math.max(0,...world.history.filter(e=>e.table===table&&e.key===id).map(e=>e.seq))};
  else{const projected={};value={_key:id};for(const f of fields){const present=Object.hasOwn(row.body,f),v=present?row.body[f]:null;projected[f]={present,value:v,version:row.versions[f]??0};value[f]=v;}token={id:tokenId,kind:'key',table,key:id,exists:true,birth:row.birth,fields:projected};}
  tokens.set(tokenId,token);return value;
 }
 function scan(id,table,predicate,columns,match,tokens){
  const fields=[...columns].sort(),members=[],values=[];for(const row of world.facts.filter(r=>r.table===table).sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0)){if(!match(row.body))continue;const projected={},value={_key:row.key};for(const f of fields){const present=Object.hasOwn(row.body,f),v=present?row.body[f]:null;projected[f]={present,value:v,version:row.versions[f]??0};value[f]=v;}members.push({key:row.key,birth:row.birth,fields:projected});values.push(value);}
  let epoch=0;for(const e of world.history)if(e.table===table&&Boolean(e.before&&match(e.before.body))!==Boolean(e.after&&match(e.after.body)))epoch=e.seq;
  tokens.set('scan:'+id,{id:'scan:'+id,kind:'scan',table,predicate,fieldsProjected:fields,membershipEpoch:epoch,members});return values;
 }
 const authority=key('authority','document:'+c.actorId,['view','approve','commit','grantVersion'],shared),rule=key('rules','publishing',['enabled','minSignoffs','allowInternal','version'],shared),channel=key('releaseChannels',c.channelId,['enabled','version'],shared);
 const lines=scan('publication-lines','publicationLines',{op:'eq',field:'draftId',value:c.draftId},['docId','draftId','requested'],r=>r.draftId===c.draftId,shared);
 const audience=scan('release-audience','audienceMembers',{op:'and',args:[{op:'eq',field:'channelId',value:c.channelId},{op:'eq',field:'enabled',value:true}]},['channelId','enabled','principalId','role'],r=>r.channelId===c.channelId&&r.enabled===true,shared);
 const principals=audience.map(r=>key('principals',r.principalId,['active','grantVersion'],shared));
 const gate={audienceCount:audience.length,channelVersion:channel?.version??null,canCommit:rule?.enabled===true&&channel?.enabled===true&&text(lines.map(r=>r._key).sort())===text(c.docIds.map(d=>c.draftId+':'+d).sort())&&lines.every(r=>r.requested===true)&&audience.length>0&&audience.every((r,i)=>r.role==='reader'&&principals[i]?.active===true)};
 const clauses=c.docIds.map(docId=>{
  const tokens=new Map(shared),document=key('documents',docId,['contentDigest','classification','ready','version'],tokens),line=key('publicationLines',c.draftId+':'+docId,['draftId','docId','requested'],tokens);
  const signoffs=scan('signoffs:'+docId,'signoffs',{op:'and',args:[{op:'eq',field:'docId',value:docId},{op:'eq',field:'state',value:'approved'}]},['contentDigest','decision','docId','editorId','state','version'],r=>r.docId===docId&&r.state==='approved',tokens);
  const eligible=new Set();signoffs.forEach(s=>{const editor=key('editors',s.editorId,['active','canSign','grantVersion'],tokens);if(s.decision==='approve'&&s.contentDigest===document?.contentDigest&&editor?.active===true&&editor?.canSign===true)eligible.add(s.editorId);});
  let value=null,error=false;
  try{if(!Number.isSafeInteger(rule?.minSignoffs))throw Error('invalid quorum');value={docId,contentDigest:document?.contentDigest??null,classification:document?.classification??null,requested:line?.requested??null,eligibleSignoffs:eligible.size,requiredSignoffs:rule.minSignoffs,releaseAudience:gate,policyVersion:rule?.version??null,grantVersion:authority?.grantVersion??null,
   canCommit:gate.canCommit&&authority?.view===true&&authority?.approve===true&&authority?.commit===true&&document?.ready===true&&typeof document?.contentDigest==='string'&&document.contentDigest.length>0&&document.contentDigest.length<=256&&line?.draftId===c.draftId&&line?.docId===docId&&line?.requested===true&&(document?.classification==='public'||(rule?.allowInternal===true&&document?.classification==='internal'))&&rule.minSignoffs>=1&&eligible.size>=rule.minSignoffs};}catch{error=true;}
  return {id:'publish:'+docId,value,error,canCommit:!error&&value.canCommit,tokens,tokensHash:sha([...tokens.values()].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0))};
 });return {revision:world.revision,generation:world.generation,fallback:!world.historyTrusted,clauses,rowsMaterialized:world.facts.length};
}
module.exports={documentOracle};
