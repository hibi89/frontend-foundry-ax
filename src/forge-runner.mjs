/* Explicit owner-approved, memory-only local PNG convergence API.
 * Entrypoint is reached only AFTER Forge API's exact loopback Host/Origin/CSRF gate.
 * No external fetch, customer source write, deployment, or automatic installation.
 */
import {createHash,randomBytes} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {verifyForgeBundle} from './design-forge.mjs';
import {converge} from '../scripts/forge_converge.mjs';
const MAX_PNG=6*1024*1024;
const pngSig=Buffer.from([137,80,78,71,13,10,26,10]);
const json=(res,status,value)=>res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'})
  .end(JSON.stringify(value));
const refuse=(res,status,err)=>json(res,status,{error:err});
function inspectPNG(buffer){
 if(buffer.length<33||buffer.length>MAX_PNG||!buffer.subarray(0,8).equals(pngSig)||
    buffer.readUInt32BE(8)!==13||buffer.toString('ascii',12,16)!=='IHDR')throw Error('FORGE_RUNNER_PNG_INVALID');
 const width=buffer.readUInt32BE(16),height=buffer.readUInt32BE(20);
 if(!width||!height||width>2560||height>2200||width*height>2560*2200)throw Error('FORGE_RUNNER_PNG_DIMENSIONS');
 return {sha256:createHash('sha256').update(buffer).digest('hex'),width,height};
}
async function readBounded(req,maxBytes){
 let total=0;const chunks=[];
 for await(const chunk of req){total+=chunk.length;if(total>maxBytes)throw Error('FORGE_RUNNER_INPUT_TOO_LARGE');chunks.push(chunk);}
 return Buffer.concat(chunks);
}
export function createForgeRunner(){
 const references=new Map(),results=new Map();
 let busy=false;
 async function handle(req,res,path){
  if(!path.startsWith('/api/design/runner/'))return false;
  if(req.method==='GET'){
   const id=path.split('/').at(-1);
   if(!/^[a-f0-9]{32}$/.test(id))return refuse(res,404,'FORGE_RUNNER_UNKNOWN_RESULT'),true;
   const saved=results.get(id);
   if(path==='/api/design/runner/results/'+id){
    return saved?json(res,200,{schema:'ffax.runner-result.v1',id,report:saved.report}):
      refuse(res,404,'FORGE_RUNNER_RESULT_EXPIRED'),true;
   }
   if(path==='/api/design/runner/png/'+id){
    if(!saved)return refuse(res,404,'FORGE_RUNNER_PNG_EXPIRED'),true;
    res.writeHead(200,{'Content-Type':'image/png','Content-Length':saved.bestPng.length,
      'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(saved.bestPng);
    return true;
   }
   return refuse(res,404,'FORGE_RUNNER_UNKNOWN_ROUTE'),true;
  }
  if(req.method!=='POST')return refuse(res,405,'FORGE_RUNNER_METHOD_FORBIDDEN'),true;
  if(busy)return refuse(res,429,'FORGE_RUNNER_BUSY'),true;
  busy=true;
  try{
   if(path==='/api/design/runner/reference'){
    if(req.headers['content-type']!=='image/png'||
       req.headers['x-ffax-owner-consent']!=='APPROVE_LOCAL_PNG_ANALYSIS')throw Error('FORGE_RUNNER_REFERENCE_CONSENT_REQUIRED');
    const bytes=await readBounded(req,MAX_PNG),meta=inspectPNG(bytes);
    const id=randomBytes(16).toString('hex');
    references.set(id,{bytes,meta});
    while(references.size>2)references.delete(references.keys().next().value);
    json(res,200,{schema:'ffax.runner-reference.v1',id,...meta,scope:'LOCAL_MEMORY_ONLY'});
   }else if(path==='/api/design/runner/start'){
    if(req.headers['content-type']!=='application/json')throw Error('FORGE_RUNNER_JSON_REQUIRED');
    const raw=await readBounded(req,200000);
    let body;try{body=JSON.parse(raw.toString('utf8'));}catch{throw Error('FORGE_RUNNER_JSON_INVALID');}
    if(!body||Array.isArray(body)||Object.keys(body).sort().join(',')!=='approval,bundle,maxPasses,referenceId')throw Error('FORGE_RUNNER_FIELDS_INVALID');
    if(body.approval!=='APPROVE_LOCAL_CANDIDATE_CONVERGENCE')throw Error('FORGE_RUNNER_OWNER_APPROVAL_REQUIRED');
    if(!Number.isInteger(body.maxPasses)||body.maxPasses<1||body.maxPasses>5)throw Error('FORGE_RUNNER_BUDGET_INVALID');
    const input=references.get(body.referenceId);
    if(!input)throw Error('FORGE_RUNNER_REFERENCE_EXPIRED');
    await verifyForgeBundle(body.bundle);
    const work=await mkdtemp(join(tmpdir(),'ffax-runner-'));
    try{
     const source=join(work,'bundle.json'),reference=join(work,'reference.png'),out=join(work,'output');
     await writeFile(source,JSON.stringify(body.bundle),{flag:'wx',mode:0o600});
     await writeFile(reference,input.bytes,{flag:'wx',mode:0o600});
     await converge({bundle:source,reference,out,width:input.meta.width,height:input.meta.height,
       dpr:1,maxPasses:body.maxPasses});
     const evidence=JSON.parse(await readFile(join(out,'convergence.json'),'utf8'));
     if(evidence.schema!=='ffax.convergence-receipt.v1'||evidence.referenceSha256!==input.meta.sha256||
       !/^pass-[0-5]\/capture\/render\.png$/.test(evidence.bestScreenshot))throw Error('FORGE_RUNNER_RECEIPT_INVALID');
     const bestPng=await readFile(join(out,...evidence.bestScreenshot.split('/')));
     if(bestPng.length>MAX_PNG||inspectPNG(bestPng).sha256!==
       evidence.attempts.find(x=>x.pass===evidence.selectedPass)?.renderSha256)throw Error('FORGE_RUNNER_BEST_PNG_MISMATCH');
     const id=randomBytes(16).toString('hex');
     results.set(id,{report:evidence,bestPng});
     while(results.size>1)results.delete(results.keys().next().value);
     json(res,200,{schema:'ffax.runner-completed.v1',id,referenceSha256:input.meta.sha256,
       baselineScore:evidence.initialScore,bestScore:evidence.bestScore,
       passesTried:evidence.passesTried,selectedPass:evidence.selectedPass,
       status:evidence.status,download:'/api/design/runner/png/'+id});
    }finally{await rm(work,{recursive:true,force:true});}
   }else refuse(res,404,'FORGE_RUNNER_UNKNOWN_ROUTE');
  }catch(err){
   const code=String(err?.message||'FORGE_RUNNER_FAILED');
   refuse(res,/^FORGE_RUNNER_/.test(code)?400:500,/^[A-Z0-9_]{5,100}$/.test(code)?code:'FORGE_RUNNER_FAILED');
  }finally{busy=false;}
  return true;
 }
 return {handle};
}
