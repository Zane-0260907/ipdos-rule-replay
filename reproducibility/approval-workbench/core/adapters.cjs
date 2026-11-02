'use strict';
const {procurement}=require('./contracts.cjs'),{documents}=require('./documents.cjs');
const adapters={
 procurement:{definition:procurement,intentTable:'proposalLines',intentVersionField:'quantityG',liveRules:[['rules','inventory'],['rules','budget']],effectLabel:'SIMULATED_ONLY_NO_SUPPLIER',
  effect(store,draft,heads,receipt){const cost=[...heads.values()][0].value.sharedBudget.proposedCostCents;store.put('budgetUses',receipt.id,{storeId:draft.context.storeId,draftId:draft.id,status:'committed',amountCents:cost});}},
 document:{definition:documents,intentTable:'publicationLines',intentVersionField:'requested',liveRules:[['rules','publishing']],effectLabel:'SIMULATED_ONLY_NO_PUBLICATION',
  effect(store,draft,heads,receipt){store.put('localReleases',receipt.id,{draftId:draft.id,channelId:draft.context.channelId,status:'simulated',documentIds:[...heads.values()].map(h=>h.value.docId).sort()});}}
};
function adapter(workflow){if(!adapters[workflow])throw Error('Unsupported workflow');return adapters[workflow];}
module.exports={adapter};
