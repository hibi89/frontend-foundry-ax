#!/usr/bin/env node
/* FFAX real bounded convergence: approved immutable bundle -> local Chromium PNG
 * -> offline pixel metric -> typed candidate patch -> re-capture -> keep best.
 * Never executes imported JSX, installs tools, or touches an owner project.
 */
import {readFile,writeFile,realpath,stat,mkdir} from 'node:fs/promises';
import {resolve,join,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {freezeForgeVariant,verifyForgeBundle} from '../src/design-forge.mjs';
import {runBoundedConvergence,planLocalTrials} from '../src/forge-convergence.mjs';
import {capture} from './forge_capture.mjs';
import {compareReference} from './ffax_reference_fidelity.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const MAX_BYTES=650000;
const readJSON=async filename=>{
 const filenameReal=await realpath(resolve(filename));
 const st=await stat(filenameReal);
 if(!st.isFile()||st.size<12||st.size>MAX_BYTES)throw Error('FORGE_CONVERGE_JSON_SIZE_INVALID');
 return JSON.parse(await readFile(filenameReal,'utf8'));
};
function opts(argv){
 if(argv[0]!=='run')throw Error('USAGE: forge_converge.mjs run --bundle FILE --reference PNG --out NEW_DIR --approve-local-convergence');
 const o={};
 for(let i=1;i<argv.length;i++){
  const k=argv[i];
  if(k==='--approve-local-convergence'){o.approved=true;continue;}
  if(!['--bundle','--reference','--out','--width','--height','--dpr','--max-passes','--plan','--engine-entry'].includes(k)||o[k]||!argv[i+1])throw Error('FORGE_CONVERGE_USAGE');
  o[k]=argv[++i];
 }
 if(!o.approved||!o['--bundle']||!o['--reference']||!o['--out'])throw Error('FORGE_CONVERGE_OWNER_APPROVAL_REQUIRED');
 const width=Number(o['--width']??1440),height=Number(o['--height']??900),dpr=Number(o['--dpr']??1),maxPasses=Number(o['--max-passes']??5);
 if(!Number.isInteger(width)||width<320||width>2560||!Number.isInteger(height)||height<320||height>2200||
    ![1,2].includes(dpr)||!Number.isInteger(maxPasses)||maxPasses<1||maxPasses>5)throw Error('FORGE_CONVERGE_VIEWPORT_OR_BUDGET_INVALID');
 return {bundle:o['--bundle'],reference:o['--reference'],out:o['--out'],width,height,dpr,
   maxPasses,plan:o['--plan'],engineEntry:o['--engine-entry']};
}
async function metric(reference,render){
 return await new Promise((accept,reject)=>{
  const exe=process.platform==='win32'?'python':'python3';
  const cp=spawn(exe,[join(root,'scripts/forge_pixel_metric.py'),'--reference',reference,'--render',render],
   {shell:false,windowsHide:true,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'},stdio:['ignore','pipe','pipe']});
  let out='',err='',done=false;
  const finish=(error,result)=>{if(done)return;done=true;clearTimeout(timer);error?reject(error):accept(result);};
  const timer=setTimeout(()=>{cp.kill();finish(Error('FORGE_METRIC_TIMEOUT'));},60000);
  cp.stdout.on('data',b=>{out+=b.toString('utf8');if(out.length>70000){cp.kill();finish(Error('FORGE_METRIC_OUTPUT_LIMIT'));}});
  cp.stderr.on('data',b=>{if(err.length<1000)err+=b.toString('utf8').slice(0,1000-err.length);});
  cp.on('error',()=>finish(Error('FORGE_METRIC_PYTHON_MISSING')));
  cp.on('close',code=>{if(code!==0)return finish(Error('FORGE_METRIC_FAILED: '+err.slice(0,250)));
   try{finish(null,JSON.parse(out));}catch{finish(Error('FORGE_METRIC_JSON_INVALID'));}
  });
 });
}
export async function converge({bundle,reference,out,width=1440,height=900,dpr=1,maxPasses=5,plan,engineEntry}){
 const source=await readJSON(bundle);
 const project=await verifyForgeBundle(source);
 const chosen=source.manifest;
 if(!['A','B','C'].includes(chosen.variantId)||!['editorial','structured','expressive'].includes(chosen.styleId))throw Error('FORGE_CONVERGE_BUNDLE_VARIANT_INVALID');
 const variant={schema:'ffax.design-variant.v1',id:chosen.variantId,styleId:chosen.styleId,revision:chosen.revision,
   parentVariantId:null,document:project,brief:{},recommendation:{},previewStatus:'SOURCE_READY_RENDER_NOT_VERIFIED'};
 const referencePath=await realpath(resolve(reference)),referenceStat=await stat(referencePath);
 if(!referenceStat.isFile()||referenceStat.size>8*1024*1024)throw Error('FORGE_CONVERGE_REFERENCE_INVALID');
 const destination=resolve(out);
 if(destination===source||destination===referencePath||destination===root||destination.startsWith(root+sep))throw Error('FORGE_CONVERGE_OUTPUT_MUST_BE_OUTSIDE_SOURCE');
 // mkdir without recursive mode ensures a new isolated output; never overwrite reports.
 await mkdir(destination,{recursive:false,mode:0o700});
 const approvedPlan=plan?await readJSON(plan):planLocalTrials(variant,{maxPasses});
 const measurements=[];
 const measure=async(candidate,pass)=>{
  const passDirectory=join(destination,'pass-'+pass);
  await mkdir(passDirectory,{recursive:false,mode:0o700});
  // Local transient candidate snapshot. Caller explicitly consented to convergence;
  // this is never stored as the final owner-approved reference.
  const trialBundle=await freezeForgeVariant(candidate,{approval:'APPROVE_FORGE_REFERENCE'});
  const bundlePath=join(passDirectory,'candidate.json');
  await writeFile(bundlePath,JSON.stringify(trialBundle),{flag:'wx',mode:0o600});
  const result=await capture({bundle:bundlePath,out:join(passDirectory,'capture'),width,height,dpr});
  const screenshot=join(passDirectory,'capture','render.png');
  const measured=await metric(referencePath,screenshot);
  if(measured?.schema!=='ffax.pixel-metric.v1'||measured.renderSha256!==result.sha256||
    measured.width!==width||measured.height!==height||measured.status!=='DIAGNOSTIC_NOT_VISUAL_ACCEPTANCE')throw Error('FORGE_CONVERGE_METRIC_RECEIPT_INVALID');
  const record={pass,bundleSha256:trialBundle.sha256,capture:result,metric:measured,
    relativeScreenshot:'pass-'+pass+'/capture/render.png'};
  measurements.push(record);
  await writeFile(join(passDirectory,'measurement.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx'});
  return {...measured,receipt:{pass,bundleSha256:trialBundle.sha256,renderSha256:result.sha256,screenshot:record.relativeScreenshot}};
 };
 const result=await runBoundedConvergence({variant,plan:approvedPlan,measure,
   approval:'APPROVE_LOCAL_CANDIDATE_CONVERGENCE',maxPasses,minImprovement:0.01});
 let selected=0;for(const step of result.records)if(step.accepted)selected=step.pass;
 const bestRecord=measurements.find(v=>v.pass===selected);
 const bestScreenshot=join(destination,bestRecord.relativeScreenshot);
 let engineReport=null;
 if(engineEntry){
  const compared=await compareReference({reference:referencePath,render:bestScreenshot,
    out:join(destination,'one-shot-comparison'),engineEntry,suggest:true});
  engineReport={engine:'one-shot-ui',file:'one-shot-comparison/report.json',sha256:compared.report.reference.sha256,
    status:'MEASURED_NOT_APPROVED'};
 }
 const evidence={schema:'ffax.convergence-receipt.v1',status:'CANDIDATE_ONLY_OWNER_REVIEW_REQUIRED',
   originalBundleSha256:source.sha256,referenceSha256:result.referenceSha256,
   initialScore:result.baselineScore,bestScore:result.bestScore,selectedPass:selected,passesTried:result.passesTried,
   attempts:result.records,bestScreenshot:bestRecord.relativeScreenshot,bestCandidate:result.bestVariant,
   checkpoint0:variant.document,engineReport,sourceMutated:false,productionDeployed:false};
 await writeFile(join(destination,'convergence.json'),JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});
 return {status:evidence.status,report:join(destination,'convergence.json'),selectedPass:selected,
   score:evidence.bestScore,attempts:evidence.passesTried,sourceMutated:false};
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){
 try{console.log(JSON.stringify({ok:true,...await converge(opts(process.argv.slice(2)))}));}
 catch(e){console.error(JSON.stringify({ok:false,error:(e?.message||'FORGE_CONVERGE_FAILED').slice(0,350)}));process.exitCode=1;}
}
