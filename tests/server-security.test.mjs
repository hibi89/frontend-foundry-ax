/** Security regression: exercise the actual localhost HTTP server, not a mocked handler. */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
async function port(){
 const s=net.createServer();
 await new Promise((ok,fail)=>s.once('error',fail).listen(0,'127.0.0.1',ok));
 const p=s.address().port;await new Promise(ok=>s.close(ok));return p;
}
function req(port,path='/',opts={}){
 return new Promise((ok,fail)=>{
  const r=http.request({hostname:'127.0.0.1',port,path,method:opts.method||'GET',headers:opts.headers||{},timeout:2000},res=>{
   let data='';res.setEncoding('utf8');res.on('data',v=>data+=v);res.on('end',()=>ok({status:res.statusCode,headers:res.headers,body:data}));
  });
  r.on('error',fail).on('timeout',()=>r.destroy(Error('TIMEOUT')));r.end(opts.body);
 });
}
test('FFAX localhost static assets require exact Host and path allowlist',async()=>{
 const p=await port();
 const proc=spawn(process.execPath,['src/server.mjs'],{cwd:root,env:{...process.env,PORT:String(p)},stdio:'ignore'});
 try{
  let ready=false;
  for(let i=0;i<60;i++){if(proc.exitCode!==null)throw Error('SERVER_EXITED');try{if((await req(p)).status===200){ready=true;break;}}catch{}await new Promise(ok=>setTimeout(ok,70));}
  assert.ok(ready,'SERVER_NOT_READY');
  for(const path of ['/','/index.html','/styles.css','/src/app.mjs','/src/core.mjs','/src/local-repo-intake.mjs','/src/github-readonly-intake.mjs','/src/github-compare-review.mjs','/src/device-checkpoint.mjs','/assets/ffax-favicon.svg']){
   const r=await req(p,path);assert.equal(r.status,200,'public '+path);assert.equal(r.headers['x-content-type-options'],'nosniff');
  }
  for(const path of ['/package.json','/SOURCE_SHA.txt','/FFAX-LIVE-MODEL-RESULT.json','/src/local-ollama.mjs','/src/server.mjs','/src/workspace.mjs','/scripts/react_real_probe.mjs','/REQUIREMENTS.md','/THIRD_PARTY_NOTICES.md','/assets/concepts/ffax-v1-vision.webp']){
   assert.equal((await req(p,path)).status,404,'private '+path);
  }
  for(const path of ['/','/styles.css','/api/local-model']){
   assert.equal((await req(p,path,{headers:{Host:'attacker.invalid'}})).status,403,'bad host '+path);
   assert.equal((await req(p,path,{headers:{Host:'127.0.0.1'}})).status,403,'missing port '+path);
  }
  assert.equal((await req(p,'/api/local-model',{method:'POST',headers:{Origin:'https://attacker.invalid','Content-Type':'application/json'},body:'{}'})).status,403);
  assert.equal((await req(p,'/api/local-model')).status,405);
  const head=await req(p,'/src/app.mjs',{method:'HEAD'});assert.equal(head.status,200);assert.equal(head.body,'');
  assert.match((await req(p,'/')).headers['content-security-policy'],/connect-src 'self' https:\/\/api\.github\.com/);
  console.log('FFAX_REAL_HTTP_SECURITY_PASS public=10 private=10 badhost=6');
 }finally{
  if(proc.exitCode===null){proc.kill();await Promise.race([new Promise(ok=>proc.once('exit',ok)),new Promise(ok=>setTimeout(ok,600))]);}
 }
});