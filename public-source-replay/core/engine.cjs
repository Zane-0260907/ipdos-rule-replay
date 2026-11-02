'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {canonical,digest,equal,integer,add,mul,ceilDiv}=require('./value.cjs');
const P=require('./predicate.cjs');
const ENGINE_BUILD=crypto.createHash('sha256').update(['value.cjs','predicate.cjs','engine.cjs'].map(f=>fs.readFileSync(path.join(__dirname,f),'utf8')).join('\n')).digest('hex');
const unique=a=>[...new Set(a)];
function at(v,p){if(!p)return v;for(const k of p.split('.')){if(v===null||v===undefined)return null;v=v[k];}return v===undefined?null:v;}
function refs(e){if(!e||typeof e!=='object')return [];if(e.ref)return [e.ref];return unique(Object.values(e).flatMap(v=>Array.isArray(v)?v.flatMap(refs):refs(v)));}
function expr(e,values,row){
 if(Object.hasOwn(e,'const'))return e.const;
 if(e.ref)return at(values[e.ref],e.path);
 if(e.row)return at(row,e.row);
 if(e.object)return Object.fromEntries(Object.entries(e.object).map(([k,x])=>[k,expr(x,values,row)]));
 if(e.op==='sum'){const rows=expr(e.items,values,row);if(!Array.isArray(rows))throw Error('sum requires rows');return rows.reduce((n,r)=>{const x=integer(expr(e.value,values,r));if(e.nonnegative!==false&&x<0)throw Error('Negative aggregate value');return add(n,x);},0);}
 if(e.op==='count'){const v=expr(e.items,values,row);if(!Array.isArray(v))throw Error('count requires rows');return v.length;}
 if(e.op==='countDistinct'){const rows=expr(e.items,values,row);if(!Array.isArray(rows))throw Error('distinct count requires rows');const selected=rows.map(r=>expr(e.value,values,r)).filter(v=>!(e.skipNull&&v===null));return new Set(selected.map(canonical)).size;}
 if(e.op==='every'){const rows=expr(e.items,values,row);if(!Array.isArray(rows))throw Error('every requires rows');return rows.every(r=>expr(e.value,values,r)===true);}
 if(e.op==='if')return expr(e.condition,values,row)===true?expr(e.then,values,row):expr(e.else,values,row);
 const a=(e.args||[]).map(x=>expr(x,values,row));
 switch(e.op){
  case 'add':return a.reduce(add,0);case 'sub':return integer(integer(a[0])-integer(a[1]));case 'mul':return a.reduce(mul,1);case 'ceilDiv':return ceilDiv(a[0],a[1]);
  case 'max':a.forEach(integer);return Math.max(...a);case 'min':a.forEach(integer);return Math.min(...a);
  case 'eq':return equal(a[0],a[1]);case 'ne':return !equal(a[0],a[1]);
  case 'lte':return integer(a[0])<=integer(a[1]);case 'gte':return integer(a[0])>=integer(a[1]);
  case 'and':return a.every(v=>v===true);case 'or':return a.some(v=>v===true);case 'not':return a[0]!==true;
  case 'isInt':return Number.isSafeInteger(a[0]);
  case 'isText':return typeof a[0]==='string'&&a[0].length>0&&a[0].length<=256;
  case 'keysEqual':return Array.isArray(a[0])&&Array.isArray(a[1])&&equal(a[0].map(r=>r._key).sort(),[...a[1]].sort());
  default:throw Error('Unsupported finite expression: '+e.op);
 }
}
function keyToken(store,table,key,fields){
 const row=store.get(table,key),id='key:'+canonical({table,key,fields});
 if(!row)return {id,kind:'key',table,key,exists:false,absenceEpoch:store.keyEpoch(table,key),value:null,coarse:{id,kind:'key',table,key,exists:false,version:store.keyEpoch(table,key)}};
 const projected=Object.fromEntries(fields.map(f=>[f,Object.hasOwn(row.body,f)?row.body[f]:null]));
 return {id,kind:'key',table,key,exists:true,birth:row.birth,fields:Object.fromEntries(fields.map(f=>[f,{present:Object.hasOwn(row.body,f),value:projected[f],version:row.versions[f]??0}])),
  value:{_key:key,...projected},coarse:{id,kind:'key',table,key,exists:true,birth:row.birth,version:row.rowVersion}};
}
function fieldWitness(row,fields){return {key:row.key,birth:row.birth,fields:Object.fromEntries(fields.map(f=>[f,{present:Object.hasOwn(row.body,f),value:Object.hasOwn(row.body,f)?row.body[f]:null,version:row.versions[f]??0}]))};}
function stripped(token){const {value,coarse,...protectedToken}=token;return protectedToken;}
class DependencyEngine{
 constructor(store,definition){
  this.store=store;this.definition=definition;this.contractHash=digest({definition,engineBuild:ENGINE_BUILD});
  this.defs=new Map(definition.nodes.map(n=>[n.id,n]));if(this.defs.size!==definition.nodes.length)throw Error('Duplicate rule node');
  this.parents=new Map();this.order=[];this.children=new Map();const visited=new Set(),active=new Set();
  const visit=id=>{if(active.has(id))throw Error('Rule cycle');if(visited.has(id))return;const n=this.defs.get(id);if(!n)throw Error('Unknown rule reference '+id);active.add(id);
   if(!['key','scan','joinKey','compute','opaque'].includes(n.kind))throw Error('Unsupported rule kind');
   if(n.kind==='scan')P.validate(n.predicate);
   const children=n.kind==='joinKey'?[n.left]:n.kind==='compute'?refs(n.expression):[];this.children.set(id,children);
   for(const c of children){if(!this.parents.has(c))this.parents.set(c,new Set());this.parents.get(c).add(id);visit(c);}
   active.delete(id);visited.add(id);this.order.push(id);
  };
  for(const c of definition.clauses)visit(c.node);
  this.opaque=this.order.some(id=>this.defs.get(id).kind==='opaque');
  this.cache=new Map();this.keyIndex=new Map();this.scanIndex=new Map();this.lastMeta=null;this.historyTrusted=true;
 }
 register(id,specs){
  for(const s of this.cache.get(id)?.specs||[]){if(s.kind==='key')this.keyIndex.get(s.table+'\0'+s.key)?.delete(id);else this.scanIndex.get(s.table)?.delete(id);}
  for(const s of specs){if(s.kind==='key'){const k=s.table+'\0'+s.key;if(!this.keyIndex.has(k))this.keyIndex.set(k,new Map());this.keyIndex.get(k).set(id,s);}else{if(!this.scanIndex.has(s.table))this.scanIndex.set(s.table,new Map());this.scanIndex.get(s.table).set(id,s);}}
 }
 evaluate(mode='incremental'){
  const meta=this.store.meta(),started=process.hrtime.bigint();this.store.resetStats();
  const fresh=!this.lastMeta||this.lastMeta.generation!==meta.generation||this.lastMeta.revision>meta.revision;
  const events=this.store.eventsSince(fresh?0:this.lastMeta.revision);
  const expected=meta.revision-(fresh?0:this.lastMeta.revision);
  const contiguous=events.length===expected&&events.every((e,i)=>e.seq===(fresh?0:this.lastMeta.revision)+i+1);
  this.historyTrusted=(fresh?true:this.historyTrusted)&&contiguous&&meta.journal_floor===0;
  const fallback=this.opaque||!this.historyTrusted;
  const dirty=new Set();let nominatedLeaves=0,fanout=0;
  if(mode==='full'||fresh||fallback){for(const id of this.order)dirty.add(id);}else{
   for(const event of events){
    for(const [id,s] of this.keyIndex.get(event.table+'\0'+event.key)||[]){if(!event.before||!event.after||s.fields.some(f=>event.fields.includes(f))){dirty.add(id);nominatedLeaves++;}}
    for(const [id,s] of this.scanIndex.get(event.table)||[]){const old=P.matches(s.predicate,event.before?.body),now=P.matches(s.predicate,event.after?.body);if(old!==now||((old||now)&&s.fields.some(f=>event.fields.includes(f)))){dirty.add(id);nominatedLeaves++;}}
   }
   const queue=[...dirty];for(let i=0;i<queue.length;i++)for(const parent of this.parents.get(queue[i])||[]){fanout++;if(!dirty.has(parent)){dirty.add(parent);queue.push(parent);}}
  }
  let evaluated=0;
  for(const id of this.order){
   if(!dirty.has(id))continue;evaluated++;const n=this.defs.get(id),children=(this.children.get(id)||[]).map(c=>this.cache.get(c));
   let own=[],specs=[],value=null,error=null,scanEpoch;
   const tokens=new Map(),coarse=new Map();
   for(const child of children){for(const [k,v] of child.tokens)tokens.set(k,v);for(const [k,v] of child.coarse)coarse.set(k,v);if(child.error&&!error)error=child.error;}
   try{
    if(n.kind==='key'){
     const fields=unique(n.fields).sort(),token=keyToken(this.store,n.table,n.key,fields);own.push(token);specs.push({kind:'key',table:n.table,key:n.key,fields});value=token.value;
    }else if(n.kind==='scan'){
     const fields=unique([...n.fields,...P.fields(n.predicate)]).sort(),rows=this.store.scan(n.table,n.predicate).sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);
     const previous=this.cache.get(id);scanEpoch=(!fresh&&previous&&this.historyTrusted)?previous.scanEpoch:this.store.membershipEpoch(n.table,n.predicate);
     if(!fresh&&previous&&this.historyTrusted)for(const e of events)if(e.table===n.table&&P.matches(n.predicate,e.before?.body)!==P.matches(n.predicate,e.after?.body))scanEpoch=e.seq;
     const token={id:'scan:'+id,kind:'scan',table:n.table,predicate:n.predicate,fieldsProjected:fields,membershipEpoch:scanEpoch,members:rows.map(r=>fieldWitness(r,fields)),
      value:rows.map(r=>({_key:r.key,...Object.fromEntries(fields.map(f=>[f,Object.hasOwn(r.body,f)?r.body[f]:null]))})),
      coarse:{id:'fence:'+n.table,kind:'tableFence',table:n.table,version:this.store.tableRevision(n.table)}};
     own.push(token);specs.push({kind:'scan',table:n.table,predicate:n.predicate,fields});value=token.value;
    }else if(n.kind==='joinKey'){
     const rows=this.cache.get(n.left).value;if(!Array.isArray(rows))throw Error('Key join requires left rows');
     value=rows.map(r=>{const key=at(r,n.leftField);if(typeof key!=='string')throw Error('Join key must be a string');const token=keyToken(this.store,n.table,key,unique(n.fields).sort());own.push(token);specs.push({kind:'key',table:n.table,key,fields:n.fields});return {...r,[n.as]:token.value};});
    }else if(n.kind==='compute'){
     if(error)throw Error(error.message);const values=Object.fromEntries((this.children.get(id)||[]).map(c=>[c,this.cache.get(c).value]));value=expr(n.expression,values,null);
    }else if(n.kind==='opaque'){
     if(n.name!=='legacyNonnegativeStock')throw Error('Unsupported opaque plugin');value=this.store.all('inventory').every(r=>Number.isSafeInteger(r.body.onHandG)&&r.body.onHandG>=0);
    }
   }catch(e){error={node:id,message:e.message};value=null;}
   for(const token of own){tokens.set(token.id,stripped(token));coarse.set(token.coarse.id,token.coarse);}
   this.register(id,specs);
   const tokenArray=[...tokens.values()].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
   this.cache.set(id,{value,error,tokens,coarse,specs,scanEpoch,tokensHash:digest(tokenArray),valueHash:digest({value,error})});
  }
  this.lastMeta={...meta};
  const clauses=this.definition.clauses.map(c=>{const e=this.cache.get(c.node);const viewHash=digest({contractHash:this.contractHash,clause:c.id,generation:meta.generation,protectedTokensHash:e.tokensHash,decisionHash:e.valueHash,globalFallback:fallback?meta.revision:null});
   return {id:c.id,label:c.label,node:c.node,value:e.value,error:e.error,canCommit:!e.error&&e.value?.canCommit===true,viewHash,decisionHash:e.valueHash,
    tokens:e.tokens,tokensHash:e.tokensHash,coarse:e.coarse,coarseHash:digest([...e.coarse.values()].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0))};});
  const metrics={mode,revision:meta.revision,totalNodes:this.order.length,evaluatedNodes:evaluated,reusedNodes:this.order.length-evaluated,nominatedLeaves,propagationEdges:fanout,
   ...this.store.stats,elapsedMicroseconds:Number(process.hrtime.bigint()-started)/1000,fallback:fallback?(this.opaque?'opaque rule requires whole-contract revision':'journal provenance incomplete'):null,
   trackedKeyBuckets:this.keyIndex.size,trackedScanNodes:[...this.scanIndex.values()].reduce((n,m)=>n+m.size,0)};
  return {contractHash:this.contractHash,engineBuild:ENGINE_BUILD,revision:meta.revision,generation:meta.generation,fallback,clauses,metrics};
 }
 pathsFromToken(tokenId,rootNode){
  const starts=this.order.filter(id=>this.cache.get(id)?.specs.length&&this.cache.get(id).tokens.has(tokenId));
  const paths=[];for(const start of starts){const q=[[start]];for(let i=0;i<q.length&&paths.length<8;i++){const p=q[i],tail=p.at(-1);if(tail===rootNode){paths.push(p);continue;}for(const next of this.parents.get(tail)||[])if(!p.includes(next))q.push([...p,next]);}}
  return paths;
 }
}
module.exports={DependencyEngine,ENGINE_BUILD,expr};
