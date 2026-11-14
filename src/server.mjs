import http from 'node:http';
import {runLocalOllama} from './local-ollama.mjs';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
const port=Number(process.env.PORT || '4173');
const host='127.0.0.1';
if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid PORT');
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url || '/',`http://${host}:${port}`);
  if(url.pathname==='/api/local-model'){
    if(req.method!=='POST'){res.writeHead(405,{'Allow':'POST'}).end();return;}
    if(req.headers.host!==host+':'+port || req.headers.origin!=='http://'+host+':'+port || req.headers['content-type']!=='application/json'){
      res.writeHead(403,{'Content-Type':'application/json','Cache-Control':'no-store'}).end('{"error":"LOCAL_REQUEST_FORBIDDEN"}');return;
    }
    try{
      let data='',size=0;
      for await(const chunk of req){size+=chunk.length;if(size>6000)throw Error('LOCAL_REQUEST_TOO_LARGE');data+=chunk.toString('utf8');}
      let body;try{body=JSON.parse(data);}catch{throw Error('LOCAL_REQUEST_INVALID_JSON');}
      if(!body||Object.keys(body).sort().join(',')!=='consent,model,prompt')throw Error('LOCAL_REQUEST_INVALID_FIELDS');
      const result=await runLocalOllama(body),reply=JSON.stringify(result);
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(reply);
    }catch(err){
      const code=/^LOCAL_[A-Z_]+$/.test(err?.message||'')?err.message:'LOCAL_MODEL_UNAVAILABLE';
      res.writeHead(400,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}).end(JSON.stringify({error:code}));
    }
    return;
  }
  if (req.method!=='GET' && req.method!=='HEAD'){res.writeHead(405,{'Allow':'GET, HEAD'}).end();return;}
  let pathname;
  try {pathname=decodeURIComponent(url.pathname);} catch {res.writeHead(400).end();return;}
  if(pathname==='/' )pathname='/index.html';
  const abs=resolve(root,'.'+pathname);
  if(!abs.startsWith(root+sep)){res.writeHead(403).end();return;}
  const type=mime[extname(abs)];
  if(!type){res.writeHead(404).end();return;}
  try{
    const s=await stat(abs);
    if(!s.isFile()){res.writeHead(404).end();return;}
    const body=await readFile(abs);
    res.writeHead(200,{'Content-Type':type,'Content-Length':body.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'SAMEORIGIN','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; object-src 'none'; connect-src 'self'; base-uri 'self'; form-action 'none'; frame-src 'self'"});
    res.end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(404).end();}
});
server.listen(port,host,()=>console.log(`FFAX local workbench http://${host}:${port}`));
