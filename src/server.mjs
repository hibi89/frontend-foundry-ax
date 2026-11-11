import http from 'node:http';
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
