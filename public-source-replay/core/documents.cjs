'use strict';
const {C,R,V,F,O}=require('./contracts.cjs');
function documents(context){
 const {draftId,actorId,channelId,docIds}=context,nodes=[],clauses=[];
 const key=(id,table,k,fields)=>nodes.push({id,kind:'key',table,key:k,fields});
 const scan=(id,table,predicate,fields)=>nodes.push({id,kind:'scan',table,predicate,fields});
 const calc=(id,expression)=>nodes.push({id,kind:'compute',expression});
 key('release-authority','authority','document:'+actorId,['view','approve','commit','grantVersion']);
 key('publish-rule','rules','publishing',['enabled','minSignoffs','allowInternal','version']);
 key('release-channel','releaseChannels',channelId,['enabled','version']);
 scan('publication-lines','publicationLines',{op:'eq',field:'draftId',value:draftId},['docId','requested']);
 scan('release-audience','audienceMembers',{op:'and',args:[{op:'eq',field:'channelId',value:channelId},{op:'eq',field:'enabled',value:true}]},['principalId','role']);
 nodes.push({id:'audience-principals',kind:'joinKey',left:'release-audience',leftField:'principalId',table:'principals',fields:['active','grantVersion'],as:'principal'});
 calc('release-gate',O({audienceCount:{op:'count',items:R('release-audience')},channelVersion:R('release-channel','version'),
  canCommit:F('and',F('eq',R('publish-rule','enabled'),C(true)),F('eq',R('release-channel','enabled'),C(true)),F('keysEqual',R('publication-lines'),C(docIds.map(d=>draftId+':'+d))),
   {op:'every',items:R('publication-lines'),value:F('eq',V('requested'),C(true))},F('gte',{op:'count',items:R('release-audience')},C(1)),
   {op:'every',items:R('audience-principals'),value:F('and',F('eq',V('principal.active'),C(true)),F('eq',V('role'),C('reader')))})}));
 for(const doc of docIds){
  key('document:'+doc,'documents',doc,['contentDigest','classification','ready','version']);
  key('publication:'+doc,'publicationLines',draftId+':'+doc,['draftId','docId','requested']);
  scan('signoffs:'+doc,'signoffs',{op:'and',args:[{op:'eq',field:'docId',value:doc},{op:'eq',field:'state',value:'approved'}]},['editorId','decision','contentDigest','version']);
  nodes.push({id:'signoff-editors:'+doc,kind:'joinKey',left:'signoffs:'+doc,leftField:'editorId',table:'editors',fields:['active','canSign','grantVersion'],as:'editor'});
  calc('eligible-signoffs:'+doc,{op:'countDistinct',items:R('signoff-editors:'+doc),skipNull:true,value:{op:'if',condition:F('and',F('eq',V('decision'),C('approve')),F('eq',V('contentDigest'),R('document:'+doc,'contentDigest')),F('eq',V('editor.active'),C(true)),F('eq',V('editor.canSign'),C(true))),then:V('editorId'),else:C(null)}});
  calc('release-decision:'+doc,O({docId:C(doc),contentDigest:R('document:'+doc,'contentDigest'),classification:R('document:'+doc,'classification'),requested:R('publication:'+doc,'requested'),eligibleSignoffs:R('eligible-signoffs:'+doc),requiredSignoffs:R('publish-rule','minSignoffs'),releaseAudience:R('release-gate'),policyVersion:R('publish-rule','version'),grantVersion:R('release-authority','grantVersion'),
   canCommit:F('and',R('release-gate','canCommit'),F('eq',R('release-authority','view'),C(true)),F('eq',R('release-authority','approve'),C(true)),F('eq',R('release-authority','commit'),C(true)),F('eq',R('document:'+doc,'ready'),C(true)),F('isText',R('document:'+doc,'contentDigest')),
    F('eq',R('publication:'+doc,'draftId'),C(draftId)),F('eq',R('publication:'+doc,'docId'),C(doc)),F('eq',R('publication:'+doc,'requested'),C(true)),
    F('or',F('eq',R('document:'+doc,'classification'),C('public')),F('and',F('eq',R('publish-rule','allowInternal'),C(true)),F('eq',R('document:'+doc,'classification'),C('internal')))),
    F('isInt',R('publish-rule','minSignoffs')),F('gte',R('publish-rule','minSignoffs'),C(1)),F('gte',R('eligible-signoffs:'+doc),R('publish-rule','minSignoffs')))}));
  clauses.push({id:'publish:'+doc,label:doc+' release decision',node:'release-decision:'+doc});
 }
 return {id:'document-release-v1',version:'approval-contract-3',context,nodes,clauses,displayOnly:[{table:'documents',fields:['title','note']},{table:'principals',fields:['name']}],protectedScope:'Document content digests, classification/readiness, distinct eligible signers and all signoff members, current audience/principal membership, policy and authority versions.'};
}
module.exports={documents};
