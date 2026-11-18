/* FFAX loopback Design Forge API: strict origin/CSRF, typed only, optional owner-approved local storage. */
import {randomBytes} from 'node:crypto';
import {homedir,tmpdir} from 'node:os';
import {join} from 'node:path';
import {mkdir,readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {makeForgeBrief,recommendForgeStyles,generateForgeVariants,refineForgeVariant,mixForgeVariants,freezeForgeVariant,finalizeForgeBundleWithCapture,verifyForgeBundle} from './design-forge.mjs';
import {proposeTypedVisualFixes,applyBoundedVisualPatches} from './forge-correction.mjs';
import {capture} from '../scripts/forge_capture.mjs';
import {createForgeRunner} from './forge-runner.mjs';
import {readBoundedUtf8} from './http-body.mjs';
const MAX_BYTES=150000,MAX_RESPONSE=350000;
const storeRoot=join(homedir(),'.ffax','forge-bundles');
function reply(res,status,value){
 const data=JSON.stringify(value);
 if(data.length>MAX_RESPONSE){res.writeHead(413,{'Cache-Control':'no-store'}).end();return;}
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}).end(data);
}
async function parseJson(req){
 const data=await readBoundedUtf8(req,MAX_BYTES,'FORGE_INPUT_TOO_LARGE','FORGE_UTF8_INVALID');
 let result;try{result=JSON.parse(data);}catch{throw Error('FORGE_JSON_INVALID');}
 if(!result||Array.isArray(result)||typeof result!=='object'||Object.getPrototypeOf(result)!==Object.prototype)throw Error('FORGE_BODY_INVALID');
 return result;
}
function assertKeys(body,allowed){
 if(Object.keys(body).some(x=>!allowed.includes(x)))throw Error('FORGE_FIELDS_INVALID');
}
export function createForgeApi({host='127.0.0.1',port=4173}={}){
 const origin='http://'+host+':'+port;
 const csrf=randomBytes(32).toString('hex');
 let busy=false;
 const captures=new Map();
 const runner=createForgeRunner();
 const handle=async(req,res,path)=>{
  if(!path.startsWith('/api/design/'))return false;
  const requestOrigin=req.headers.origin;
  const fetchSite=req.headers['sec-fetch-site'];
  if(requestOrigin&&requestOrigin!==origin){reply(res,403,{error:'FORGE_ORIGIN_FORBIDDEN'});return true;}
  if(fetchSite&&fetchSite!=='same-origin'&&fetchSite!=='none'){reply(res,403,{error:'FORGE_FETCH_SITE_FORBIDDEN'});return true;}
  if(path==='/api/design/session'){
   if(req.method!=='GET'){reply(res,405,{error:'FORGE_METHOD_FORBIDDEN'});return true;}
   reply(res,200,{schema:'ffax.forge-session.v1',csrf,origin,storage:'OWNER_OPT_IN_ONLY'});return true;
  }
  if(req.headers['x-ffax-csrf']!==csrf){reply(res,403,{error:'FORGE_CSRF_FORBIDDEN'});return true;}
  if(path.startsWith('/api/design/runner/')){
   if(req.method==='POST' && requestOrigin!==origin){reply(res,403,{error:'FORGE_LOCAL_POST_ONLY'});return true;}
   return await runner.handle(req,res,path);
  }
  if(req.method==='GET'&&/^\/api\/design\/captures\/[a-f0-9]{32}\.png$/.test(path)){
   const id=path.split('/').at(-1).slice(0,-4),saved=captures.get(id);
   if(!saved){reply(res,404,{error:'FORGE_CAPTURE_NOT_FOUND'});return true;}
   res.writeHead(200,{'Content-Type':'image/png','Content-Length':saved.bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}).end(saved.bytes);
   return true;
  }
  if(req.method==='GET'&&/^\/api\/design\/jobs\/[a-f0-9]{64}$/.test(path)){
   try{
    const id=path.slice('/api/design/jobs/'.length);
    const body=JSON.parse(await readFile(join(storeRoot,id+'.json'),'utf8'));
    await verifyForgeBundle(body);
    if(body.sha256!==id)throw Error('FORGE_STORED_ID_MISMATCH');
    reply(res,200,{schema:'ffax.design-job.v1',id,state:'DESIGN_LOCKED',bundle:body});return true;
   }catch{reply(res,404,{error:'FORGE_JOB_UNAVAILABLE'});return true;}
  }
  if(req.method!=='POST'){reply(res,405,{error:'FORGE_METHOD_FORBIDDEN'});return true;}
  if(req.headers['content-type']!=='application/json'||requestOrigin!==origin){
   reply(res,403,{error:'FORGE_LOCAL_POST_ONLY'});return true;
  }
  if(busy){reply(res,429,{error:'FORGE_BUSY'});return true;}
  busy=true;
  try{
   const body=await parseJson(req);
   let value;
   switch(path){
    case '/api/design/brief':
     assertKeys(body,['brief']);value={schema:'ffax.design-brief-result.v1',brief:makeForgeBrief(body.brief)};break;
    case '/api/design/recommend':{
     assertKeys(body,['brief']);const brief=makeForgeBrief(body.brief);
     value={schema:'ffax.design-recommend-result.v1',brief,recommendations:recommendForgeStyles(brief)};break;}
    case '/api/design/variants':{
     assertKeys(body,['brief']);const brief=makeForgeBrief(body.brief);
     value={schema:'ffax.design-variants-result.v1',brief,variants:generateForgeVariants(brief)};break;}
    case '/api/design/refine':
     assertKeys(body,['variant','command']);value={schema:'ffax.design-refine-result.v1',variant:refineForgeVariant(body.variant,body.command)};break;
    case '/api/design/mix':
     assertKeys(body,['primary','secondary','options']);value={schema:'ffax.design-mix-result.v1',variant:mixForgeVariants(body.primary,body.secondary,body.options)};break;
    case '/api/design/capture':{
     assertKeys(body,['bundle','width','height','dpr','approval']);
     if(body.approval!=='APPROVE_LOCAL_CAPTURE')throw Error('FORGE_CAPTURE_APPROVAL_REQUIRED');
     if(!Number.isInteger(body.width)||body.width<320||body.width>2560||
        !Number.isInteger(body.height)||body.height<320||body.height>2200||
        ![1,2].includes(body.dpr))throw Error('FORGE_VIEWPORT_UNSUPPORTED');
     await verifyForgeBundle(body.bundle);
     const dir=await mkdtemp(join(tmpdir(),'ffax-owner-capture-'));
     try{
      const source=join(dir,'bundle.json');await writeFile(source,JSON.stringify(body.bundle),{flag:'wx',mode:0o600});
      const receipt=await capture({bundle:source,out:join(dir,'render'),width:body.width,height:body.height,dpr:body.dpr});
      const bytes=await readFile(join(dir,'render','render.png'));
      if(bytes.length>6*1024*1024)throw Error('FORGE_CAPTURE_SIZE_LIMIT');
      const id=randomBytes(16).toString('hex');
      captures.set(id,{bytes,receipt});
      while(captures.size>2)captures.delete(captures.keys().next().value);
      value={schema:'ffax.design-capture-result.v1',id,receipt,download:'/api/design/captures/'+id+'.png',status:'CAPTURED_WITH_WARNINGS_NOT_VISUALLY_APPROVED',qualityWarnings:receipt.qualityWarnings||[]};
     }finally{await rm(dir,{recursive:true,force:true});}
     break;}
    case '/api/design/finalize':{
     assertKeys(body,['bundle','captureId','approval']);
     if(typeof body.captureId!=='string'||!/^[a-f0-9]{32}$/.test(body.captureId))throw Error('FORGE_CAPTURE_ID_INVALID');
     const captured=captures.get(body.captureId);
     if(!captured)throw Error('FORGE_CAPTURE_EXPIRED');
     const finalized=await finalizeForgeBundleWithCapture(body.bundle,captured.receipt,{approval:body.approval});
     value={schema:'ffax.design-finalized-result.v1',bundle:finalized,parentSha256:body.bundle.sha256,pngSha256:captured.receipt.sha256};
     break;}
    case '/api/design/visual-propose':
     assertKeys(body,['issues','variant']);value={schema:'ffax.design-visual-proposal-result.v1',plan:proposeTypedVisualFixes(body.issues,body.variant)};break;
    case '/api/design/visual-apply':
     assertKeys(body,['variant','plan','approval','maxPasses']);value={schema:'ffax.design-visual-apply-result.v1',result:applyBoundedVisualPatches(body.variant,body.plan,{approval:body.approval,maxPasses:body.maxPasses})};break;
    case '/api/design/freeze':{
     assertKeys(body,['variant','approval','persist','persistConsent']);
     const bundle=await freezeForgeVariant(body.variant,{approval:body.approval});
     if(body.persist===true){
      if(body.persistConsent!=='APPROVE_LOCAL_FORGE_STORAGE')throw Error('FORGE_STORAGE_APPROVAL_REQUIRED');
      await mkdir(storeRoot,{recursive:true,mode:0o700});
      const path=join(storeRoot,bundle.sha256+'.json');
      try{await writeFile(path,JSON.stringify(bundle),{flag:'wx',mode:0o600});}
      catch(err){
       if(err?.code!=='EEXIST')throw Error('FORGE_STORAGE_FAILED');
       const previous=JSON.parse(await readFile(path,'utf8'));
       await verifyForgeBundle(previous);
       if(previous.sha256!==bundle.sha256)throw Error('FORGE_STORAGE_CONFLICT');
      }
     }
     value={schema:'ffax.design-freeze-result.v1',id:bundle.sha256,persisted:body.persist===true,bundle};break;}
    default:reply(res,404,{error:'FORGE_ROUTE_UNKNOWN'});return true;
   }
   reply(res,200,value);
  }catch(err){const name=String(err?.message||'FORGE_UNAVAILABLE');reply(res,/^(FORGE_|PROJECT_)/.test(name)?400:500,{error:/^[A-Z_]{4,90}$/.test(name)?name:'FORGE_OPERATION_FAILED'});}
  finally{busy=false;}
  return true;
 };
 return {handle};
}
