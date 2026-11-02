'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const base='http://127.0.0.1:3337',checks=[];let manager,viewer;
async function call(path,{token=manager,workflow='procurement',method='GET',body,key}={}){const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json','X-Demo-Workflow':workflow,...(token?{Authorization:'Bearer '+token}:{}),...(key?{'Idempotency-Key':key}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await response.json();return {status:response.status,data};}
function check(name,actual,expected){assert.equal(actual,expected,name);checks.push({name,actual,expected,passed:true});}
async function main(){
 check('unauthenticated context', (await call('/approval/context',{token:null})).status,401);
 manager=(await call('/auth/login',{token:null,method:'POST',body:{role:'manager'}})).data.token;viewer=(await call('/auth/login',{token:null,method:'POST',body:{role:'viewer'}})).data.token;
 await call('/demo/reset',{method:'POST',body:{}});check('viewer can inspect',(await call('/approval/context',{token:viewer})).status,200);
 check('viewer can save procurement proposal',(await call('/approval/quantity',{token:viewer,method:'POST',body:{sku:'RICE',quantityG:31750}})).status,200);
 const vp=(await call('/approval/preview',{token:viewer,method:'POST',body:{mode:'incremental'}})).data;
 check('viewer cannot approve',(await call('/approval/review',{token:viewer,method:'POST',body:{mode:'incremental',previewId:vp.preview.id,seal:vp.preview.seal,clauseIds:['quantity:RICE']}})).status,403);
 const vc=(await call('/approval/context',{token:viewer})).data;
 check('viewer cannot confirm',(await call('/approval/confirm',{token:viewer,method:'POST',body:vc.request,key:'http-viewer-confirm'})).status,403);
 check('viewer cannot change source',(await call('/demo/change',{token:viewer,method:'POST',body:{id:'related_stock'}})).status,403);
 check('viewer cannot reset fixture',(await call('/demo/reset',{token:viewer,method:'POST',body:{}})).status,403);
 check('unknown validation mode rejected',(await call('/approval/context?mode=unprotected')).status,400);
 const p=(await call('/approval/preview',{method:'POST',body:{mode:'incremental'}})).data;
 const approved=await call('/approval/review',{method:'POST',body:{mode:'incremental',previewId:p.preview.id,seal:p.preview.seal,clauseIds:p.validation.clauses.map(c=>c.id)}});check('manager explicit review',approved.status,200);
 const c=(await call('/approval/context')).data,first=await call('/approval/confirm',{method:'POST',body:c.request,key:'http-manager-confirm'});check('manager confirm',first.status,200);
 check('different key same draft',(await call('/approval/confirm',{method:'POST',body:c.request,key:'http-manager-second'})).data.error.code,'DRAFT_ALREADY_COMMITTED');
 check('changed body same key',(await call('/approval/confirm',{method:'POST',body:{...c.request,intentHash:'changed'},key:'http-manager-confirm'})).data.error.code,'IDEMPOTENCY_CONFLICT');
 check('receipt export authorized',(await call('/receipts/'+first.data.receipt.id)).status,200);
 await call('/demo/change',{method:'POST',body:{id:'related_stock'}});const retry=await call('/approval/confirm',{method:'POST',body:c.request,key:'http-manager-confirm'});check('retry same receipt after source change',retry.data.receipt.id,first.data.receipt.id);check('retry marked repeated',retry.data.repeated,true);
 const docContext=await call('/approval/context',{workflow:'document',token:viewer});check('viewer can inspect second workflow',docContext.status,200);
 check('workflow request identity checked',(await call('/approval/confirm',{workflow:'document',method:'POST',body:c.request,key:'http-cross-workflow'})).data.error.code,'WORKFLOW_MISMATCH');
 fs.writeFileSync('artifacts/http-boundary-evidence.json',JSON.stringify({passed:true,checks,scope:'Loopback HTTP adapter and actual server token role boundary; no production authentication claim'},null,2));console.log(JSON.stringify({passed:true,checks:checks.length}));
}
main().catch(e=>{fs.writeFileSync('artifacts/http-boundary-failure.json',JSON.stringify({error:e.stack,checks},null,2));console.error(e);process.exitCode=1;});
