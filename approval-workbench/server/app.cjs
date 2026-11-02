'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),{randomUUID,createHash}=require('node:crypto');
const {FactStore}=require('../core/store.cjs'),{seedProcurement,seedDocuments}=require('../core/fixtures.cjs'),{ApprovalService,ContractError}=require('../core/service.cjs');
const root=path.resolve(__dirname,'..'),artifacts=path.join(root,'artifacts');fs.mkdirSync(artifacts,{recursive:true});const states=new Map(),sessions=new Map(),actor='synthetic-manager-01';
const error=(code,message,status=400)=>{throw new ContractError(code,message,status);};
function workflowOf(value='procurement'){if(!['procurement','document'].includes(value))error('UNKNOWN_WORKFLOW','Choose procurement or document release.');return value;}
function open(workflow,fresh=false){
 const pointer=path.join(artifacts,'interactive-'+workflow+'-current.json');let file;states.get(workflow)?.store.close();
 const previous=!fresh&&(fs.existsSync(pointer)?pointer:workflow==='procurement'&&fs.existsSync(path.join(artifacts,'interactive-current.json'))?path.join(artifacts,'interactive-current.json'):null);
 if(previous){file=JSON.parse(fs.readFileSync(previous,'utf8')).file;if(!path.resolve(file).startsWith(path.resolve(artifacts)+path.sep))throw Error('Database path outside prototype artifacts');}
 else file=path.join(artifacts,'interactive-runs',workflow+'-'+randomUUID(),'synthetic.sqlite');
 fs.writeFileSync(pointer,JSON.stringify({file},null,2));const store=new FactStore(file);let context;
 if(!store.db.prepare('SELECT id FROM drafts LIMIT 1').get()){
  context=workflow==='document'?seedDocuments(store):seedProcurement(store);
  if(workflow==='procurement'){store.put('reserves','DEMO-MISSING',{storeId:context.storeId,sku:'RICE',status:'active',quantityG:0,reasonId:'PENDING'});store.put('reserves','DEMO-INACTIVE',{storeId:context.storeId,sku:'RICE',status:'inactive',quantityG:1000,reasonId:'SAFETY'});}
 }else context=JSON.parse(store.db.prepare('SELECT context FROM drafts LIMIT 1').get().context);
 const state={store,context,service:new ApprovalService(store),initialRevision:store.meta().revision};states.set(workflow,state);return state;
}
function modeOf(value){if(!['whole','rows','full','incremental'].includes(value))error('UNKNOWN_MODE','Choose a supported safe validation mode.');return value;}
function view(session,mode,state,workflow){
 const {store,service,context,initialRevision}=state;service.permission(store.draft(context.draftId),session.actor);
 const validation=service.validate(context.draftId,mode),clauses=service.explain(context.draftId,validation),heads=[...service.heads(context.draftId).values()],baseline=heads.length?Math.min(...heads.map(h=>h.revision)):initialRevision;
 return {workflow,draft:store.draft(context.draftId),actor:session.actor,role:session.role,mode,validation:{...validation,clauses},
  items:workflow==='procurement'?context.skus.map(sku=>({sku,...store.get('inventory',context.storeId+':'+sku)?.body,quantityG:store.get('proposalLines',context.draftId+':'+sku)?.body.quantityG})):[],
  documents:workflow==='document'?context.docIds.map(docId=>({docId,...store.get('documents',docId)?.body})):[],
  changes:store.eventsSince(baseline).slice(-12).map(e=>({revision:e.seq,table:e.table,key:e.key,fields:e.fields,before:e.before?.body??null,after:e.after?.body??null})),receipts:service.receipts(),request:service.commitRequest(context.draftId,mode),displayOnly:service.engine(context.draftId).definition.displayOnly,protectedScope:service.engine(context.draftId).definition.protectedScope,grants:store.get('authority',workflow+':'+session.actor)?.body};
}
function change(id,state,workflow){
 const {store,context}=state,grant=store.get('authority',workflow+':'+actor).body;
 if(workflow==='document'){
  const doc='GUIDE-A';
  switch(id){
   case 'display_title':store.patch('documents',doc,{title:'Synthetic GUIDE-A (title updated)',note:'Current display note'});break;
   case 'unrelated_document':store.put('documents','OUTSIDE',{title:'Unrelated document',contentDigest:'outside',classification:'internal',ready:true,version:store.meta().revision+1});break;
   case 'content_change':store.patch('documents',doc,{contentDigest:createHash('sha256').update('Synthetic updated guide '+store.meta().revision).digest('hex'),version:'content-'+(store.meta().revision+1)});break;
   case 'resign_content':for(const editor of ['EDITOR-A','EDITOR-B'])store.patch('signoffs',doc+':'+editor,{contentDigest:store.get('documents',doc).body.contentDigest,version:store.meta().revision+1});break;
   case 'audience_insert':{const old=store.get('audienceMembers','AUDIENCE-B');if(old)store.delete('audienceMembers','AUDIENCE-B');else store.put('audienceMembers','AUDIENCE-B',{channelId:context.channelId,enabled:true,principalId:'READER-B',role:'reader'});break;}
   case 'editor_revoke':store.patch('editors','EDITOR-A',{canSign:false,grantVersion:store.get('editors','EDITOR-A').body.grantVersion+1});break;
   case 'rule_revoke':store.patch('rules','publishing',{enabled:false,version:'publishing-'+(store.meta().revision+1)});break;
   case 'permission_revoke':store.patch('authority','document:'+actor,{commit:false,grantVersion:grant.grantVersion+1});break;
   case 'restore':store.patch('rules','publishing',{enabled:true,version:'publishing-'+(store.meta().revision+1)});store.patch('authority','document:'+actor,{approve:true,commit:true,grantVersion:grant.grantVersion+1});store.patch('editors','EDITOR-A',{canSign:true,grantVersion:store.get('editors','EDITOR-A').body.grantVersion+1});break;
   default:error('UNKNOWN_CHANGE','Choose a supported document fixture change.');
  }return;
 }
 const rice=context.storeId+':RICE';
 switch(id){
  case 'unrelated_stock':store.patch('inventory','OTHER-STORE:RICE',{onHandG:store.get('inventory','OTHER-STORE:RICE').body.onHandG-1000});break;
  case 'display_only':store.patch('inventory',rice,{name:'Synthetic rice (label updated)',note:'Display update '+store.meta().revision});break;
  case 'related_stock':{const n=store.get('inventory',rice).body.onHandG;if(n<5000)error('STOCK_BOUND','Stock is below 5 kg. Start a fresh fixture.');store.patch('inventory',rice,{onHandG:n-5000});break;}
  case 'zero_stock':store.patch('inventory',context.storeId+':GREENS',{onHandG:store.get('inventory',context.storeId+':GREENS').body.onHandG-1000});break;
  case 'matching_insert':store.put('reserves','DEMO-'+randomUUID(),{storeId:context.storeId,sku:'RICE',status:'active',quantityG:1000,reasonId:'SAFETY'});break;
  case 'nonmatching_insert':store.put('reserves','DEMO-'+randomUUID(),{storeId:'OTHER-STORE',sku:'RICE',status:'active',quantityG:1000,reasonId:'SAFETY'});break;
  case 'predicate_boundary':{const row=store.get('reserves','DEMO-INACTIVE').body;store.patch('reserves','DEMO-INACTIVE',{status:row.status==='active'?'inactive':'active'});break;}
  case 'absent_aba':store.put('reserveReasons','PENDING',{active:true,version:'temporary'});store.delete('reserveReasons','PENDING');break;
  case 'shared_price':store.patch('prices','RICE',{centsPerKg:store.get('prices','RICE').body.centsPerKg+1});break;
  case 'shared_budget':store.put('budgetUses','DEMO-USE-'+randomUUID(),{storeId:context.storeId,draftId:'OTHER-DRAFT',status:'committed',amountCents:500});break;
  case 'rule_revoke':store.patch('rules','inventory',{enabled:false,version:'inventory-'+(store.meta().revision+1)});break;
  case 'permission_revoke':store.patch('authority','procurement:'+actor,{commit:false,grantVersion:grant.grantVersion+1});break;
  case 'restore':store.patch('rules','inventory',{enabled:true,version:'inventory-'+(store.meta().revision+1)});store.patch('authority','procurement:'+actor,{approve:true,commit:true,grantVersion:grant.grantVersion+1});break;
  default:error('UNKNOWN_CHANGE','Choose a supported procurement fixture change.');
 }
}
async function bodyOf(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>128000)error('BODY_LIMIT','Request too large.',413);}try{return text?JSON.parse(text):{};}catch{error('INVALID_JSON','Request JSON is invalid.');}}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
const server=http.createServer(async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:3338');res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization,Idempotency-Key,X-Demo-Workflow');if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
 try{
  const url=new URL(req.url,'http://127.0.0.1:3337'),route=url.pathname,body=req.method==='POST'?await bodyOf(req):{};
  if(route==='/health'){json(res,200,{status:'ok',prototype:'approval-contract',workflows:['procurement','document']});return;}
  if(route==='/auth/login'&&req.method==='POST'){if(!['manager','viewer'].includes(body.role))error('ROLE_REQUIRED','Choose a demo manager or viewer role.');const token=randomUUID();sessions.set(token,{role:body.role,actor:body.role==='manager'?actor:'synthetic-viewer-01'});json(res,200,{token,role:body.role});return;}
  const session=sessions.get((req.headers.authorization||'').replace(/^Bearer /,''));if(!session)error('SIGN_IN_REQUIRED','Sign in to this local prototype.',401);
  const workflow=workflowOf(req.headers['x-demo-workflow']),state=states.get(workflow)||open(workflow),{service,store,context}=state;
  if(route==='/approval/context'&&req.method==='GET'){json(res,200,view(session,modeOf(url.searchParams.get('mode')||'incremental'),state,workflow));return;}
  if(route==='/approval/preview'&&req.method==='POST'){json(res,200,service.preview(context.draftId,session.actor,modeOf(body.mode)));return;}
  if(route==='/approval/review'&&req.method==='POST'){json(res,200,service.review(context.draftId,session.actor,{...body,mode:modeOf(body.mode)}));return;}
  if(route==='/approval/quantity'&&req.method==='POST'){if(workflow!=='procurement')error('UNSUPPORTED_INTENT_EDIT','Quantity edits apply to procurement only.');json(res,200,service.editQuantity(context.draftId,session.actor,body.sku,body.quantityG));return;}
  if(route==='/approval/confirm'&&req.method==='POST'){if(body.draftId!==context.draftId)error('WORKFLOW_MISMATCH','Request draft does not belong to this selected workflow.');json(res,200,service.confirm(session.actor,req.headers['idempotency-key'],body));return;}
  if(route==='/demo/change'&&req.method==='POST'){if(session.role!=='manager')error('PERMISSION_REVOKED','Only the demo manager may change synthetic source data.',403);service.permission(store.draft(context.draftId),session.actor);change(body.id,state,workflow);json(res,200,{revision:store.meta().revision});return;}
  if(route==='/demo/reset'&&req.method==='POST'){if(session.role!=='manager')error('PERMISSION_REVOKED','Only the demo manager may create a fresh fixture.',403);open(workflow,true);json(res,200,{workflow});return;}
  if(route.startsWith('/receipts/')&&req.method==='GET'){service.permission(store.draft(context.draftId),session.actor);const id=decodeURIComponent(route.slice('/receipts/'.length)),r=service.receipts().find(x=>x.id===id);if(!r)error('RECEIPT_NOT_FOUND','Saved receipt was not found.',404);res.setHeader('Content-Disposition','attachment; filename="'+id+'.json"');json(res,200,r);return;}
  error('NOT_FOUND','This endpoint is not available.',404);
 }catch(e){json(res,e.status||500,{error:{code:e.code||'LOCAL_ERROR',message:e.message,details:e.details}});}
});
server.listen(3337,'127.0.0.1',()=>{fs.writeFileSync(path.join(artifacts,'server-process.json'),JSON.stringify({pid:process.pid,port:3337,entry:__filename},null,2));console.log(JSON.stringify({listening:'http://127.0.0.1:3337',pid:process.pid,workflows:['procurement','document']}));});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{for(const state of states.values())state.store.close();process.exit(0);}));
