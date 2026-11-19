#!/usr/bin/env node
/* FFAX source-first Forge capture. Reads an approved bundle; never executes imported JSX. */
import { readFile,writeFile,mkdir,realpath,stat,mkdtemp,rm } from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderMarkup} from '../src/core.mjs';
import {verifyForgeBundle} from '../src/design-forge.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');

/** P1 preflight: deterministic *warnings* are not proof of a missing system font.
 * Unknown external assets may not silently fall back to an inaccurate render. */
export function inspectCaptureReadiness(item,{width,height,dpr}={}){
 const manifest=item?.manifest;
 if(manifest?.schema!=='ffax.design-bundle.v1'||manifest.source!=='FFAX_FORGE_NATIVE')
  throw Error('FORGE_CAPTURE_BUNDLE_INVALID');
 if(!Number.isInteger(width)||width<320||width>2560||
    !Number.isInteger(height)||height<320||height>2200||![1,2].includes(dpr))
  throw Error('FORGE_VIEWPORT_UNSUPPORTED');
 if(!Array.isArray(manifest.assets))throw Error('FORGE_CAPTURE_ASSETS_INVALID');
 // Asset providers are intentionally not trusted/installed in this P1 renderer.
 // Every non-empty asset object needs a validated local resolver before capture.
 if(manifest.assets.length!==0)throw Error('FORGE_CAPTURE_ASSETS_NOT_RESOLVED');
 const warnings=[],font=manifest.project?.designSystem?.fontStack;
 if(typeof font!=='string'||font.length>160||/[\u0000-\u001f\u007f]/.test(font))
  throw Error('FORGE_CAPTURE_FONT_DECLARATION_INVALID');
 warnings.push({code:'FONT_AVAILABILITY_UNVERIFIED',
  detail:'Installed system fonts and glyph fallback differ across Windows/Linux. Screenshot hash does not prove exact typeface.'});
 if(!font.startsWith('system-ui'))warnings.push({code:'PRIMARY_FONT_LOCAL_FALLBACK_POSSIBLE',
  detail:'The selected primary family is not bundled; capture can use a substitute unless independently checked.'});
 const reference=manifest.referencePng;
 if(reference!==null&&reference!==undefined){
  if(reference.width!==width||reference.height!==height||reference.dpr!==dpr)
   warnings.push({code:'REFERENCE_VIEWPORT_MISMATCH',
    detail:'Requested viewport/DPR differs from the previously approved PNG; independent visual approval is required.'});
 }
 const ext=manifest.externalAssetManifest;
 if(ext!==undefined){
  if(ext?.schema!=='ffax.external-asset-manifest.v1'||ext.reference?.sha256!==manifest.project?.reference?.sha256)
   throw Error('FORGE_CAPTURE_EXTERNAL_MANIFEST_MISMATCH');
  if(!ext.rights||ext.rights.publicRedistributionAllowed!==false)throw Error('FORGE_CAPTURE_RIGHTS_UNRESOLVED');
  warnings.push({code:'EXTERNAL_RASTER_ASSETS_NOT_RECONSTRUCTED',
   detail:'Original image layers, photos, icons or fonts were not included in the approved source bundle.'});
  if(ext.unresolved?.length)warnings.push({code:'EXTERNAL_LAYERS_UNKNOWN',
   detail:'External screenshot is flat; unknown layers must be reviewed before visual parity acceptance.'});
 }
 return {schema:'ffax.capture-preflight.v1',assetStatus:ext?'EXTERNAL_ASSETS_PARTIAL':'SOURCE_ONLY_NO_EXTRA_ASSETS',
  fontStatus:'SYSTEM_FONT_PRESENCE_UNVERIFIED',warnings,
  visualAcceptance:'NOT_VERIFIED',networkUse:'BLOCKED',scope:'OWNER_APPROVED_STATIC_TYPED_COMPONENTS_ONLY'};
}

function parse(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 if(argv[0]!=='capture')throw Error('FORGE_CAPTURE_USAGE');
 const a={};
 for(let i=1;i<argv.length;i+=2){
  if(!['--bundle','--out','--width','--height','--dpr'].includes(argv[i])||a[argv[i]]||!argv[i+1])throw Error('FORGE_CAPTURE_USAGE');
  a[argv[i]]=argv[i+1];
 }
 if(!a['--bundle']||!a['--out'])throw Error('FORGE_CAPTURE_INPUT_REQUIRED');
 const width=Number(a['--width']??1440),height=Number(a['--height']??900),dpr=Number(a['--dpr']??1);
 if(!Number.isInteger(width)||width<320||width>2560||!Number.isInteger(height)||height<320||height>2200||![1,2].includes(dpr))throw Error('FORGE_VIEWPORT_UNSUPPORTED');
 return {bundle:a['--bundle'],out:a['--out'],width,height,dpr};
}
function runPython(args,timeoutMs=65000){
 return new Promise((ok,fail)=>{
  // Python executable comes from the owner's own PATH; fixed trusted repository script only.
  const executable=process.platform==='win32'?'python':'python3';
  const cp=spawn(executable,args,{shell:false,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
  let stdout='',stderr='',done=false;
  const complete=(error,value)=>{if(done)return;done=true;clearTimeout(timer);error?fail(error):ok(value);};
  const timer=setTimeout(()=>{
   cp.kill();
   const stage=[...stderr.matchAll(/FORGE_CAPTURE_STAGE_(BEGIN|DRIVER_READY|BROWSER_READY|PAGE_READY|HTML_LOADED|CSS_ADDED|PNG_CAPTURED|BROWSER_CLOSED)/g)].at(-1)?.[1]||'UNKNOWN';
   complete(Error('FORGE_CAPTURE_TIMEOUT_STAGE_'+stage));
  },timeoutMs);
  cp.stdout.on('data',x=>{stdout+=x.toString('utf8');if(stdout.length>40000){cp.kill();complete(Error('FORGE_CAPTURE_OUTPUT_OVERSIZE'));}});
  cp.stderr.on('data',x=>{if(stderr.length<2500)stderr+=x.toString('utf8').slice(0,2500-stderr.length);});
  cp.on('error',()=>complete(Error('FORGE_PYTHON_MISSING')));
  cp.on('close',code=>{if(code!==0){
   const stage=[...stderr.matchAll(/FORGE_CAPTURE_STAGE_(BEGIN|DRIVER_READY|BROWSER_READY|PAGE_READY|HTML_LOADED|CSS_ADDED|PNG_CAPTURED|BROWSER_CLOSED)/g)].at(-1)?.[1]||'UNKNOWN';
   complete(Error('FORGE_CAPTURE_FAILED_STAGE_'+stage));
  }else{try{complete(null,JSON.parse(stdout));}catch{complete(Error('FORGE_CAPTURE_RECEIPT_INVALID'));}}});
 });
}
/** A capture must never create an output directory inside the FFAX source tree.
 * Resolve the existing parent to catch symlinks and use OS-specific separators on Windows.
 * The actual output directory must not exist (mkdir remains non-recursive).
 */
export async function validateCaptureOutputDestination(out){
 if(typeof out!=='string'||!out.trim())throw Error('FORGE_OUTPUT_CONFLICT');
 const destination=resolve(out);
 const [sourceRoot,parent]=await Promise.all([realpath(join(root,'src')),realpath(dirname(destination))]);
 const canonicalTarget=resolve(parent,basename(destination));
 if(canonicalTarget===sourceRoot||canonicalTarget.startsWith(sourceRoot+sep))
  throw Error('FORGE_OUTPUT_CONFLICT');
 return destination;
}
async function capture({bundle,out,width,height,dpr}){
 const source=await realpath(resolve(bundle));
 const s=await stat(source);if(!s.isFile()||s.size>500000||s.size<100)throw Error('FORGE_BUNDLE_FILE_INVALID');
 const item=JSON.parse(await readFile(source,'utf8'));const document=await verifyForgeBundle(item);
 const destination=await validateCaptureOutputDestination(out);
 if(destination===source)throw Error('FORGE_OUTPUT_CONFLICT');
 const preflight=inspectCaptureReadiness(item,{width,height,dpr});
 await mkdir(destination,{recursive:false});
 const scratch=await mkdtemp(join(tmpdir(),'ffax-forge-capture-'));
 try{
  const css=await readFile(join(root,'styles.css'),'utf8');
  if(css.length>250000||/<\/style/i.test(css))throw Error('FORGE_STYLESHEET_INVALID');
  const markup='<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:0;background:#fff}'+css+'</style></head><body>'+renderMarkup(document)+'</body></html>';
  const html=join(scratch,'preview.html');await writeFile(html,markup,{flag:'wx'});
  const png=join(destination,'render.png');
  const report=await runPython([join(root,'scripts/forge_capture.py'),'--html',html,'--out',png,'--width',String(width),'--height',String(height),'--dpr',String(dpr)]);
  const pngBytes=await readFile(png);
  if(report?.schema!=='ffax.capture.v1'||report.width!==width||report.height!==height||report.dpr!==dpr||report.sha256!==createHash('sha256').update(pngBytes).digest('hex'))throw Error('FORGE_CAPTURE_RECEIPT_MISMATCH');
  const evidence={...report,bundleSha256:item.sha256,sourceFileSha256:createHash('sha256').update(markup).digest('hex'),referenceId:item.manifest.variantId,renderPath:'render.png',preflight,qualityWarnings:preflight.warnings,acceptance:'CAPTURED_WITH_FONT_AND_ASSET_WARNINGS_NOT_P2_VERIFIED'};
  await writeFile(join(destination,'capture.json'),JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});
  return evidence;
 }finally{await rm(scratch,{recursive:true,force:true});}
}
if(import.meta.url==='file://'+process.argv[1] || process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=parse(process.argv.slice(2));
  if(args.help)console.log('node scripts/forge_capture.mjs capture --bundle APPROVED.json --out NEW_EMPTY_DIR [--width 1440 --height 900 --dpr 1]');
  else console.log(JSON.stringify({ok:true,...await capture(args)}));
 }catch(e){console.error(JSON.stringify({ok:false,code:(e.message||'UNKNOWN').slice(0,300)}));process.exitCode=1;}
}
export {capture};

/** FID-07: approved typed V3 scene -> offline static Chromium screenshot and bound receipt.
 * Uses the already-vetted Python capture script; imported TSX is NEVER executed.
 */
export function inspectV3CaptureReadiness(artifacts,referenceReceipt,{width,height,dpr=1}={}){
 if(artifacts?.schema!=='ffax.fidelity-render-artifacts.v1'||
    artifacts.originalSourceModified!==false||artifacts.externalRequests!==0||
    typeof artifacts.html!=='string'||artifacts.html.length<100||artifacts.html.length>100000||
    !/^[a-f0-9]{64}$/.test(artifacts.sourceSha256||''))
  throw Error('FORGE_V3_CAPTURE_ARTIFACTS_INVALID');
 if(!Number.isInteger(width)||width<320||width>2560||
    !Number.isInteger(height)||height<320||height>2200||
    dpr!==1)throw Error('FORGE_V3_CAPTURE_VIEWPORT_UNSUPPORTED');
 if(referenceReceipt?.schema!=='ffax.reference-bundle.v3'||
    referenceReceipt.referenceSha256!==artifacts.sourceSha256||
    referenceReceipt.original?.pixelWidth!==width||
    referenceReceipt.original?.pixelHeight!==height||
    referenceReceipt.viewport?.cssWidth!==width||
    referenceReceipt.viewport?.cssHeight!==height||
    referenceReceipt.viewport?.dpr!==1||
    referenceReceipt.provenance?.publicRedistributionAllowed!==false)
  throw Error('FORGE_V3_CAPTURE_REFERENCE_MISMATCH');
 return {schema:'ffax.v3.capture-preflight.v1',referenceSha256:artifacts.sourceSha256,
  sourceKind:'TYPED_SCENE_STATIC_HTML',browserScripts:'DISABLED',
  network:'BLOCK_ALL',fontStatus:'SYSTEM_FONTS_NOT_VERIFIED',
  assetStatus:'ORIGINAL_RASTER_ASSETS_NOT_ATTACHED',
  visualAcceptance:'NOT_VERIFIED',dpr,viewport:{width,height}};
}
export async function captureV3FidelitySource(artifacts,referenceReceipt,{width,height,dpr=1}={}){
 const preflight=inspectV3CaptureReadiness(artifacts,referenceReceipt,{width,height,dpr});
 const scratch=await mkdtemp(join(tmpdir(),'ffax-v3-capture-'));
 try{
  const html=join(scratch,'typed.html'),png=join(scratch,'screenshot.png');
  await writeFile(html,artifacts.html,{flag:'wx',mode:0o600});
  const response=await runPython([join(root,'scripts/forge_capture.py'),
   '--html',html,'--out',png,'--width',String(width),'--height',String(height),'--dpr',String(dpr)]);
  const bytes=await readFile(png),sha256=createHash('sha256').update(bytes).digest('hex');
  if(response?.schema!=='ffax.capture.v1'||response.sha256!==sha256||
      response.width!==width||response.height!==height||response.dpr!==dpr||
      response.scriptExecution!=='DISABLED'||response.network!=='ABORT_ALL'||
      bytes.length<33||bytes.length>6*1024*1024)
   throw Error('FORGE_V3_CAPTURE_RECEIPT_MISMATCH');
  return {bytes,receipt:{schema:'ffax.v3.capture-receipt.v1',...response,
   referenceSha256:artifacts.sourceSha256,
   typedSourceSha256:createHash('sha256').update(artifacts.tsx+'\\n'+artifacts.css).digest('hex'),
   preflight,visualAcceptance:'NOT_VERIFIED',customerAppIntegration:'NOT_RUN'}};
 }finally{await rm(scratch,{recursive:true,force:true});}
}
