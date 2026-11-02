'use strict';
const C=value=>({const:value}),R=(ref,path)=>({ref,...(path?{path}:{})}),V=row=>({row}),F=(op,...args)=>({op,args}),O=object=>({object});
const sum=(id,field)=>({op:'sum',items:R(id),value:V(field)});
const positive=val=>F('and',F('isInt',val),F('gte',val,C(0)));
const ruleActive=id=>F('eq',R(id,'enabled'),C(true));
function procurement(context){
 const {draftId,storeId,actorId,skus}=context,nodes=[];
 const key=(id,table,k,fields)=>nodes.push({id,kind:'key',table,key:k,fields});
 const scan=(id,table,predicate,fields)=>nodes.push({id,kind:'scan',table,predicate,fields});
 const calc=(id,expression)=>nodes.push({id,kind:'compute',expression});
 key('authority','authority','procurement:'+actorId,['view','approve','commit','grantVersion']);
 key('inventory-rule','rules','inventory',['enabled','bufferBp','maxQuantityG','version']);
 key('budget-rule','rules','budget',['enabled','version']);
 key('budget','budgets',storeId,['limitCents','version']);
 scan('draft-lines','proposalLines',{op:'eq',field:'draftId',value:draftId},['sku','quantityG']);
 nodes.push({id:'priced-lines',kind:'joinKey',left:'draft-lines',leftField:'sku',table:'prices',fields:['centsPerKg','version'],as:'price'});
 calc('total-cost',{op:'sum',items:R('priced-lines'),value:{op:'ceilDiv',args:[F('mul',V('quantityG'),V('price.centsPerKg')),C(1000)]}});
 scan('committed-budget-uses','budgetUses',{op:'and',args:[{op:'eq',field:'storeId',value:storeId},{op:'ne',field:'draftId',value:draftId},{op:'eq',field:'status',value:'committed'}]},['amountCents']);
 calc('already-used',sum('committed-budget-uses','amountCents'));
 calc('shared-budget',O({limitCents:R('budget','limitCents'),priorUseCents:R('already-used'),proposedCostCents:R('total-cost'),
  canCommit:F('and',ruleActive('budget-rule'),positive(R('budget','limitCents')),F('keysEqual',R('draft-lines'),C(skus.map(s=>draftId+':'+s))),F('lte',F('add',R('already-used'),R('total-cost')),R('budget','limitCents'))),ruleVersion:R('budget-rule','version')}));
 const clauses=[];
 for(const sku of skus){
  key('line:'+sku,'proposalLines',draftId+':'+sku,['draftId','sku','quantityG']);
  key('stock:'+sku,'inventory',storeId+':'+sku,['storeId','sku','demandG','onHandG']);
  key('price:'+sku,'prices',sku,['centsPerKg','version']);
  scan('reserves:'+sku,'reserves',{op:'and',args:[{op:'eq',field:'storeId',value:storeId},{op:'eq',field:'sku',value:sku},{op:'eq',field:'status',value:'active'}]},['quantityG','reasonId']);
  nodes.push({id:'reserve-join:'+sku,kind:'joinKey',left:'reserves:'+sku,leftField:'reasonId',table:'reserveReasons',fields:['active','version'],as:'reason'});
  calc('reserved:'+sku,{op:'sum',items:R('reserve-join:'+sku),value:{op:'if',condition:F('eq',V('reason.active'),C(true)),then:V('quantityG'),else:C(0)}});
  calc('suggested:'+sku,F('max',C(0),F('sub',F('ceilDiv',F('mul',R('stock:'+sku,'demandG'),R('inventory-rule','bufferBp')),C(10000)),F('max',C(0),F('sub',R('stock:'+sku,'onHandG'),R('reserved:'+sku))))));
  calc('decision:'+sku,O({sku:C(sku),proposedG:R('line:'+sku,'quantityG'),demandG:R('stock:'+sku,'demandG'),onHandG:R('stock:'+sku,'onHandG'),reservedG:R('reserved:'+sku),suggestedG:R('suggested:'+sku),unitPriceCents:R('price:'+sku,'centsPerKg'),sharedBudget:R('shared-budget'),inventoryRuleVersion:R('inventory-rule','version'),grantVersion:R('authority','grantVersion'),
   canCommit:F('and',F('eq',R('authority','view'),C(true)),F('eq',R('authority','approve'),C(true)),F('eq',R('authority','commit'),C(true)),ruleActive('inventory-rule'),R('shared-budget','canCommit'),
    F('eq',R('line:'+sku,'draftId'),C(draftId)),F('eq',R('line:'+sku,'sku'),C(sku)),F('eq',R('stock:'+sku,'storeId'),C(storeId)),F('eq',R('stock:'+sku,'sku'),C(sku)),
    positive(R('stock:'+sku,'demandG')),positive(R('stock:'+sku,'onHandG')),positive(R('line:'+sku,'quantityG')),positive(R('price:'+sku,'centsPerKg')),F('lte',R('line:'+sku,'quantityG'),R('inventory-rule','maxQuantityG')),
    {op:'every',items:R('reserves:'+sku),value:positive(V('quantityG'))})}));
  clauses.push({id:'quantity:'+sku,label:sku+' procurement decision',node:'decision:'+sku});
 }
 if(context.opaque){nodes.push({id:'opaque-legacy',kind:'opaque',name:'legacyNonnegativeStock'});for(const n of nodes)if(n.id.startsWith('decision:')){n.expression.object.legacy=R('opaque-legacy');n.expression.object.canCommit=F('and',n.expression.object.canCommit,R('opaque-legacy'));}}
 return {id:'procurement-v1',version:'approval-contract-2',context,nodes,clauses,
  displayOnly:[{table:'inventory',fields:['name','note']},{table:'reserveReasons',fields:['label']}],
  numericalSemantics:'Integer grams and cents; ceil products at declared currency/quantity boundaries; no float coercion.',
  protectedScope:'Every selected key field, scan membership/generation, projected field version, joined key and shared-budget input is in the witness.'};
}
module.exports={procurement,C,R,V,F,O};
