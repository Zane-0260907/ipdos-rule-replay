'use strict';
// Independent complete materialization. No engine, predicate interpreter, dirty
// index, candidate filtering, node graph evaluator or production arithmetic import.
const {createHash}=require('node:crypto');
function text(v){if(Array.isArray(v))return '['+v.map(text).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+text(v[k])).join(',')+'}';return JSON.stringify(v);}
const sha=v=>createHash('sha256').update(text(v)).digest('hex');
function readWorld(store){
 const m=store.db.prepare('SELECT * FROM meta WHERE id=1').get();
 const facts=store.db.prepare('SELECT * FROM facts ORDER BY table_name,row_key').all().map(r=>({table:r.table_name,key:r.row_key,body:JSON.parse(r.body),versions:JSON.parse(r.versions),birth:r.birth_rev,rowVersion:r.row_rev}));
 const history=store.db.prepare('SELECT * FROM changes ORDER BY seq').all().map(r=>({seq:r.seq,table:r.table_name,key:r.row_key,before:r.before_body?JSON.parse(r.before_body):null,after:r.after_body?JSON.parse(r.after_body):null}));
 return {revision:m.revision,generation:m.generation,journal_floor:m.journal_floor,facts,history,historyTrusted:history.length===m.revision&&history.every((e,i)=>e.seq===i+1)&&m.journal_floor===0};
}
function procurementOracle(world,context){
 const {draftId,storeId,actorId,skus}=context;const shared=new Map();
 const lookup=(table,key)=>world.facts.find(f=>f.table===table&&f.key===key)||null;
 function key(table,id,columns,catalog){
  const cols=[...columns].sort(),row=lookup(table,id),tokenId='key:'+text({table,key:id,fields:cols});let token,value;
  if(!row){token={id:tokenId,kind:'key',table,key:id,exists:false,absenceEpoch:Math.max(0,...world.history.filter(e=>e.table===table&&e.key===id).map(e=>e.seq))};value=null;}
  else{const fields={};value={_key:id};for(const col of cols){const present=Object.prototype.hasOwnProperty.call(row.body,col),v=present?row.body[col]:null;fields[col]={present,value:v,version:row.versions[col]??0};value[col]=v;}token={id:tokenId,kind:'key',table,key:id,exists:true,birth:row.birth,fields};}
  catalog.set(token.id,token);return value;
 }
 function query(nodeId,table,predicate,columns,match,catalog){
  const cols=[...columns].sort(),members=[],values=[];for(const row of world.facts.filter(x=>x.table===table).sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0)){if(!match(row.body))continue;const f={},v={_key:row.key};for(const col of cols){const present=Object.prototype.hasOwnProperty.call(row.body,col);f[col]={present,value:present?row.body[col]:null,version:row.versions[col]??0};v[col]=f[col].value;}members.push({key:row.key,birth:row.birth,fields:f});values.push(v);}
  let epoch=0;for(const e of world.history)if(e.table===table&&Boolean(e.before&&match(e.before.body))!==Boolean(e.after&&match(e.after.body)))epoch=e.seq;
  const token={id:'scan:'+nodeId,kind:'scan',table,predicate,fieldsProjected:cols,membershipEpoch:epoch,members};catalog.set(token.id,token);return values;
 }
 const asInt=v=>{if(!Number.isSafeInteger(v))throw Error('invalid integer');return BigInt(v);};
 const asNum=v=>{const n=Number(v);if(!Number.isSafeInteger(n))throw Error('overflow');return n;};
 const ceil=(a,b)=>{if(a<0n||b<=0n)throw Error('invalid division');return a/b+(a%b?1n:0n);};
 const auth=key('authority','procurement:'+actorId,['approve','commit','grantVersion','view'],shared);
 const rule=key('rules','inventory',['bufferBp','enabled','maxQuantityG','version'],shared);
 const budgetRule=key('rules','budget',['enabled','version'],shared);
 const budget=key('budgets',storeId,['limitCents','version'],shared);
 const lines=query('draft-lines','proposalLines',{op:'eq',field:'draftId',value:draftId},['draftId','quantityG','sku'],r=>r.draftId===draftId,shared);
 const priceBySku=new Map();for(const line of lines)priceBySku.set(line.sku,key('prices',line.sku,['centsPerKg','version'],shared));
 const uses=query('committed-budget-uses','budgetUses',{op:'and',args:[{op:'eq',field:'storeId',value:storeId},{op:'ne',field:'draftId',value:draftId},{op:'eq',field:'status',value:'committed'}]},['amountCents','draftId','status','storeId'],r=>r.storeId===storeId&&r.draftId!==null&&r.draftId!==undefined&&r.draftId!==draftId&&r.status==='committed',shared);
 let sharedValue=null,sharedError=false;
 try{
  let cost=0n,prior=0n;for(const l of lines){const q=asInt(l.quantityG),price=asInt(priceBySku.get(l.sku)?.centsPerKg);cost+=ceil(q*price,1000n);asNum(cost);}for(const u of uses){const amount=asInt(u.amountCents);if(amount<0n)throw Error('negative');prior+=amount;asNum(prior);}
  const limit=asInt(budget?.limitCents),sameKeys=text(lines.map(l=>l._key).sort())===text(skus.map(s=>draftId+':'+s).sort());
  sharedValue={limitCents:asNum(limit),priorUseCents:asNum(prior),proposedCostCents:asNum(cost),canCommit:budgetRule?.enabled===true&&limit>=0n&&sameKeys&&prior+cost<=limit,ruleVersion:budgetRule?.version??null};
 }catch{sharedError=true;}
 const clauses=[];
 for(const sku of skus){
  const tokens=new Map(shared);
  const line=key('proposalLines',draftId+':'+sku,['draftId','sku','quantityG'],tokens);
  const stock=key('inventory',storeId+':'+sku,['storeId','sku','demandG','onHandG'],tokens);
  const price=key('prices',sku,['centsPerKg','version'],tokens);
  const reservations=query('reserves:'+sku,'reserves',{op:'and',args:[{op:'eq',field:'storeId',value:storeId},{op:'eq',field:'sku',value:sku},{op:'eq',field:'status',value:'active'}]},['quantityG','reasonId','sku','status','storeId'],r=>r.storeId===storeId&&r.sku===sku&&r.status==='active',tokens);
  const reasons=reservations.map(r=>key('reserveReasons',r.reasonId,['active','version'],tokens));
  let value=null,error=false;
  try{
   if(sharedError)throw Error('bad shared input');let reserved=0n;
   reservations.forEach((r,i)=>{if(reasons[i]?.active===true){const x=asInt(r.quantityG);if(x<0n)throw Error('negative reserve');reserved+=x;asNum(reserved);}});
   const demand=asInt(stock?.demandG),onHand=asInt(stock?.onHandG),proposed=asInt(line?.quantityG),unitPrice=asInt(price?.centsPerKg),buffer=asInt(rule?.bufferBp),maximum=asInt(rule?.maxQuantityG);
   const product=demand*buffer;asNum(product);const target=ceil(product,10000n),available=onHand-reserved>0n?onHand-reserved:0n,suggested=target-available>0n?target-available:0n;
   const reserveRowsValid=reservations.every(r=>Number.isSafeInteger(r.quantityG)&&r.quantityG>=0);
   value={sku,proposedG:asNum(proposed),demandG:asNum(demand),onHandG:asNum(onHand),reservedG:asNum(reserved),suggestedG:asNum(suggested),unitPriceCents:asNum(unitPrice),sharedBudget:sharedValue,inventoryRuleVersion:rule?.version??null,grantVersion:auth?.grantVersion??null,
    canCommit:auth?.view===true&&auth?.approve===true&&auth?.commit===true&&rule?.enabled===true&&sharedValue.canCommit&&line?.draftId===draftId&&line?.sku===sku&&stock?.storeId===storeId&&stock?.sku===sku&&demand>=0n&&onHand>=0n&&proposed>=0n&&unitPrice>=0n&&proposed<=maximum&&reserveRowsValid};
   if(context.opaque){value.legacy=world.facts.filter(f=>f.table==='inventory').every(f=>Number.isSafeInteger(f.body.onHandG)&&f.body.onHandG>=0);value.canCommit=value.canCommit&&value.legacy;}
  }catch{error=true;value=null;}
  clauses.push({id:'quantity:'+sku,value,error,canCommit:!error&&value.canCommit===true,tokens,tokensHash:sha([...tokens.values()].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0))});
 }
 return {revision:world.revision,generation:world.generation,fallback:Boolean(context.opaque||!world.historyTrusted),clauses,rowsMaterialized:world.facts.length,historyEntries:world.history.length};
}
function retained(original,current){
 const answers={};for(const now of current.clauses){const old=original.clauses.find(c=>c.id===now.id);answers[now.id]=Boolean(old&&now.canCommit&&old.tokensHash===now.tokensHash&&text(old.value)===text(now.value)&&original.generation===current.generation&&original.fallback===current.fallback&&(!current.fallback||original.revision===current.revision));}return answers;
}
module.exports={readWorld,procurementOracle,retained};
