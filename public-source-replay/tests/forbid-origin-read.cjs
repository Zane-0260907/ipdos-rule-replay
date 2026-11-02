'use strict';
// Clean-extraction verification guard: make the original desktop source
// inaccessible even when it happens to exist on the validation machine.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=JSON.parse(fs.readFileSync(path.join(root,'source-freeze.json'),'utf8').replace(/^\uFEFF/,'')).source_root;
const normalize=p=>String(p).replace(/\\/g,'/').replace(/\/$/,'').toLowerCase();
const blocked=normalize(source);
let denied=0;
for(const name of ['readFileSync','openSync','statSync','lstatSync','accessSync','existsSync','readdirSync','readlinkSync','realpathSync']){
 const original=fs[name];fs[name]=function(candidate,...args){
  if(typeof candidate==='string'||Buffer.isBuffer(candidate)){
   const value=normalize(candidate);
   if(value===blocked||value.startsWith(blocked+'/')){denied++;throw Error('PORTABILITY_ORIGINAL_SOURCE_ACCESS_FORBIDDEN: '+name);}
  }
  return original.call(this,candidate,...args);
 };
}
process.on('exit',()=>process.stderr.write(JSON.stringify({portabilityGuard:'original source directory inaccessible',deniedAttempts:denied})+'\n'));
