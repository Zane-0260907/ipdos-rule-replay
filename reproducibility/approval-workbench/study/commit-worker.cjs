'use strict';
// Study-only process worker. No changes to default confirmation behavior.
const fs=require('node:fs');
const {FactStore}=require('../core/store.cjs'),{ApprovalService}=require('../core/service.cjs');
const [file,inputFile,outputFile]=process.argv.slice(2),input=JSON.parse(fs.readFileSync(inputFile,'utf8'));
const store=new FactStore(file);
async function main(){
 try{
  if(input.barrier){fs.writeFileSync(input.barrier.ready,String(process.pid));const started=Date.now();while(!fs.existsSync(input.barrier.go)){if(Date.now()-started>10000)throw Error('STUDY_BARRIER_TIMEOUT');await new Promise(r=>setTimeout(r,5));}}
  const service=new ApprovalService(store),result=input.operation==='validate'?service.validate(input.draftId,input.mode):service.confirm(input.actor,input.key,input.request);
  fs.writeFileSync(outputFile,JSON.stringify({ok:true,result,pid:process.pid}));
 }catch(e){fs.writeFileSync(outputFile,JSON.stringify({ok:false,code:e.code||e.message,status:e.status,pid:process.pid}));}
 finally{store.close();}
}
main();
