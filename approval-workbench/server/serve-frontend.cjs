'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const directory=path.resolve(__dirname,'../frontend/build'),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon'};
if(!fs.existsSync(path.join(directory,'index.html')))throw Error('Build frontend first or use the prebuilt package.');
const server=http.createServer((req,res)=>{try{const requested=decodeURIComponent(new URL(req.url,'http://127.0.0.1:3338').pathname),relative=requested.replace(/^\/+/,'');let file=path.resolve(directory,relative||'index.html');if(!file.startsWith(directory+path.sep)){res.writeHead(403);res.end();return;}if(!fs.existsSync(file)||!fs.statSync(file).isFile())file=path.join(directory,'index.html');res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);}catch{res.writeHead(400);res.end('Invalid local path');}});
server.listen(3338,'127.0.0.1',()=>console.log('English frontend: http://127.0.0.1:3338'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close());
