#!/usr/bin/env node
/* FFAX V3 P2 controlled synthetic rehearsal:
 * - actual generated FidelityBindings React19 strict TSX, SSR, typed event callback
 * - real localhost API, pre-saved synthetic immutable PNG, Origin/CSRF controls
 * - NO customer originals, external IAE_dev clients, API credentials or network AI
 * These are partial P2 probes, never 8/8 P2 or F95 pass evidence.
 */
import {createRequire} from 'node:module';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import http from 'node:http';
import net from 'node:net';
import assert from 'node:assert/strict';
import {inspectReactProject} from '../src/workspace.mjs';
import {prepareV3FidelityIntegration} from '../src/forge-safe-integration.mjs';
import {strictDiagnostics} from '../src/probe-policy.mjs';
import {saveLocalReference} from '../src/reference-vault.mjs';
const require=createRequire(import.meta.url);
const ts=require('typescript'),React=require('react'),ReactDOMServer=require('react-dom/server');
const hash=value=>createHash('sha256').update(value).digest('hex');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');
const scene={schema:'ffax.fidelity-scene.v1',sourceSha256:'a'.repeat(64),width:640,height:400,revision:1,regions:[
 {id:'canvas',role:'canvas',parentId:null,bounds:{x:0,y:0,width:640,height:400},style:{background:'#ffffff'}},
 {id:'region-button',role:'button',parentId:'canvas',bounds:{x:20,y:30,width:250,height:80},style:{background:'#223344'}}
]};
const typo={schema:'ffax.fidelity-typography.v1',referenceSha256:scene.sourceSha256,sceneRevision:1,
 ocr:{status:'NOT_RUN_NO_LOCAL_ENGINE'},textBoxes:[{id:'text-1',regionId:'region-button',
 bounds:{x:30,y:40,width:220,height:45},text:'원본 표시',confidence:'OWNER_SUPPLIED_NOT_OCR'}]};
async function reservePort(){
 const socket=net.createServer();
 await new Promise((ok,fail)=>socket.once('error',fail).listen(0,'127.0.0.1',ok));
 const port=socket.address().port;await new Promise(ok=>socket.close(ok));return port;
}
function call(port,path,{method='GET',csrf=null,body=null,origin=null}={}){
 return new Promise((resolve,reject)=>{
  const data=body===null?null:JSON.stringify(body);
  const headers={};
  if(csrf!==null)headers['x-ffax-csrf']=csrf;
  if(origin!==null)headers.origin=origin;
  if(data!==null)headers['content-type']='application/json';
  const req=http.request({host:'127.0.0.1',port,path,method,headers,timeout:3000},res=>{
   let raw='';res.setEncoding('utf8');
   res.on('data',b=>{raw+=b;if(raw.length>350000)req.destroy(Error('V3_HTTP_OVERSIZED'));});
   res.on('end',()=>{
    try{resolve({status:res.statusCode,data:raw?JSON.parse(raw):null});}
    catch{reject(Error('V3_HTTP_INVALID_JSON'));}
   });
  });
  req.on('error',reject);req.on('timeout',()=>req.destroy(Error('V3_HTTP_TIMEOUT')));
  req.end(data||undefined);
 });
}
async function typeAndReactProbe(root){
 const source=join(root,'customer'),dest=join(root,'isolated');
 await mkdir(join(source,'src'),{recursive:true});await mkdir(dest);
 await writeFile(join(source,'package.json'),JSON.stringify({name:'synthetic-fixture',type:'module',
  dependencies:{react:'19.2.7'}}));
 const original='export function App(){return <section>Original owner app stays unchanged</section>}\n';
 await writeFile(join(source,'src','App.tsx'),original);
 await writeFile(join(source,'src','auth.ts'),'export function hasAuth(){return true}\n');
 const originalDigest=(await inspectReactProject(source)).digest;
 const contract={schema:'ffax.v3.app-binding-contract.v1',sourceDigest:originalDigest,
  textBindings:[{slotId:'text-1',dataKey:'headline'}],
  intentBindings:[{regionId:'region-button',intent:'openPanel'}],
  boundaries:{auth:'OWNER_APPLICATION_ONLY',api:'OWNER_APPLICATION_ONLY',routes:'OWNER_APPLICATION_ONLY'}};
 const result=await prepareV3FidelityIntegration({source,dest,jobId:'v3-ssr-01',scene,typography:typo,
  contract,approval:'APPROVE_LOCAL_V3_INTEGRATION_REVIEW'});
 assert.equal((await inspectReactProject(source)).digest,originalDigest);
 const dir=join(result.sourceDir,'src','ffax');
 const paths=['FidelityScene.tsx','FidelityBindings.tsx'];
 for(const name of paths){
  const issues=strictDiagnostics(ts,join(dir,name));
  if(issues.length)throw Error('V3_P2_TYPESCRIPT_FAILED '+JSON.stringify(issues).slice(0,500));
 }
 function compile(path,load){
  const source=ts.transpileModule(require('node:fs').readFileSync(join(dir,path),'utf8'),
   {fileName:path,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.React,
    module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}});
  if(source.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error))
   throw Error('V3_P2_TRANSPILE_FAILED');
  const mod={exports:{}};
  new Function('require','module','exports',source.outputText)(load,mod,mod.exports);
  return mod.exports;
 }
 const app=compile('FidelityScene.tsx',id=>{
  if(id==='react')return React;
  if(id==='./FidelityScene.css')return {};
  throw Error('V3_P2_IMPORT_FORBIDDEN');
 });
 const bridge=compile('FidelityBindings.tsx',id=>{
  if(id==='react')return React;
  if(id==='./FidelityScene')return app;
  throw Error('V3_P2_IMPORT_FORBIDDEN');
 });
 const overridden=ReactDOMServer.renderToStaticMarkup(
  React.createElement(bridge.default,{data:{headline:'실제 연결 테스트'}}));
 if(!overridden.includes('실제 연결 테스트')||overridden.includes('원본 표시'))
  throw Error('V3_P2_DATA_SLOT_NOT_CONNECTED');
 const fallback=ReactDOMServer.renderToStaticMarkup(
  React.createElement(bridge.default,{data:{}}));
 if(!fallback.includes('원본 표시'))throw Error('V3_P2_OWNER_TEXT_FALLBACK_BROKEN');
 let emitted=null;
 const element=bridge.default({data:{headline:'X'},onIntent:intent=>{emitted=intent;}});
 element.props.onAction('region-button');
 if(emitted!=='openPanel')throw Error('V3_P2_INTENT_CALLBACK_BROKEN');
 assert.equal((await readFile(join(source,'src','App.tsx'),'utf8'),original);
 return {sourceDigest:originalDigest,tsxTypeErrors:0,react19SSR:true,
  textBound:true,defaultTextPreserved:true,intentCallback:true,originalSourcePreserved:true};
}
async function realLocalIaeProbe(root){
 const home=join(root,'private-home'),vault=join(home,'.ffax','reference-vault');
 await mkdir(home);
 const sha=hash(png);
 await saveLocalReference({root:vault,bytes:png,sha256:sha,
  approval:'APPROVE_LOCAL_REFERENCE_VAULT',rightsConfirmed:true});
 const localScene={schema:'ffax.fidelity-scene.v1',sourceSha256:sha,width:1,height:1,
 revision:1,regions:[
  {id:'canvas',role:'canvas',parentId:null,bounds:{x:0,y:0,width:1,height:1},style:{background:'#ffffff'}},
  {id:'section-1',role:'section',parentId:'canvas',bounds:{x:0,y:0,width:1,height:1},style:{background:'#223344'}}
 ]};
 const port=await reservePort(),origin='http://127.0.0.1:'+port;
 const cp=spawn(process.execPath,['src/server.mjs'],{cwd:process.cwd(),
  env:{...process.env,HOME:home,PORT:String(port)},stdio:['ignore','ignore','ignore'],shell:false});
 try{
  let ready=false;
  for(let i=0;i<60;i++){
   if(cp.exitCode!==null)throw Error('V3_P2_SERVER_EXITED');
   try{if((await call(port,'/api/design/session')).status===200){ready=true;break;}}
   catch{}await new Promise(r=>setTimeout(r,80));
  }
  if(!ready)throw Error('V3_P2_SERVER_NOT_READY');
  const session=await call(port,'/api/design/session');
  const csrf=session.data.csrf;
  const payload={package:{schema:'iae.ffax-reference-request.v1',jobKey:'synthetic_fixture',
   mode:'MATCH_REFERENCE',source:'IAE_DESIGN_INTELLIGENCE_LOCAL',referenceSha256:sha,
   rightsBasis:'OWNER_ASSERTED_REFERENCE_ONLY',target:'FFAX_REACT_SOURCE_CANDIDATE_ONLY'},
   scene:localScene,typography:null,assets:null,
   approval:'APPROVE_LOCAL_IAE_TO_FFAX_SOURCE_REVIEW'};
  const denied=await call(port,'/api/design/iae/submit',{method:'POST',
   origin:'https://evil.invalid',csrf,body:payload});
  assert.equal(denied.status,403);
  const noApproval=await call(port,'/api/design/iae/submit',{method:'POST',
   origin,csrf,body:{...payload,approval:'NO'}});
  assert.equal(noApproval.status,400);
  const result=await call(port,'/api/design/iae/submit',{method:'POST',origin,csrf,body:payload});
  if(result.status!==200||result.data?.schema!=='ffax.iae-accepted.v1')
   throw Error('V3_P2_LOCAL_IAE_SUBMIT_FAILED');
  const withoutToken=await call(port,result.data.resultUrl);
  assert.equal(withoutToken.status,403);
  const status=await call(port,result.data.statusUrl,{csrf,origin});
  assert.equal(status.status,200);
  assert.equal(status.data.p2,'NOT_RUN');
  const content=await call(port,result.data.resultUrl,{csrf,origin});
  assert.equal(content.status,200);
  assert.equal(content.data.receipt.localVaultReferenceVerified,true);
  assert.equal(content.data.receipt.productionDeploy,false);
  assert.match(content.data.tsx,/FidelityScene/);
  return {liveLoopback:true,rightsBoundVault:true,csrfgate:true,
   originGate:true,sourceReadback:true,externalRequests:0,ownerOriginalModified:false};
 }finally{
  if(cp.exitCode===null){cp.kill();await Promise.race([
   new Promise(ok=>cp.once('exit',ok)),new Promise(ok=>setTimeout(ok,800))]);}
 }
}
const root=await mkdtemp(join(process.cwd(),'.ffax-v3-p2-synthetic-'));
try{
 const react=await typeAndReactProbe(root);
 const api=await realLocalIaeProbe(root);
 console.log(JSON.stringify({schema:'ffax.v3.partial-p2-probe.v1',
  status:'PASS_SYNTHETIC_ONLY_NOT_P2_ACCEPTANCE',react,api,
  f95:'UNASSESSED',ownerRealImages:0,independentAudit:'NOT_RUN',
  originalCustomerFileWrites:0,remoteAIRequests:0}));
}finally{await rm(root,{recursive:true,force:true});}
