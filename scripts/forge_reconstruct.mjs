#!/usr/bin/env node
/* FFAX source-first fidelity evidence pipeline: immutable bundle -> actual Chromium PNG -> one-shot-ui diff. */
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {capture} from './forge_capture.mjs';
import {compareReference} from './ffax_reference_fidelity.mjs';
function parseArgs(args){
 if(args[0]!=='run')throw Error('FORGE_RECONSTRUCTION_USAGE');
 const result={};
 for(let i=1;i<args.length;i++){
  const x=args[i];if(x==='--suggest'){result.suggest=true;continue;}
  if(!['--bundle','--reference','--out','--width','--height','--dpr','--engine-entry'].includes(x)||!args[i+1]||result[x])throw Error('FORGE_RECONSTRUCTION_USAGE');
  result[x]=args[++i];
 }
 for(const needed of ['--bundle','--reference','--out'])if(!result[needed])throw Error('FORGE_RECONSTRUCTION_INPUT_REQUIRED');
 const width=Number(result['--width']??1440),height=Number(result['--height']??900),dpr=Number(result['--dpr']??1);
 if(!Number.isInteger(width)||width<320||width>2560||!Number.isInteger(height)||height<320||height>2200||![1,2].includes(dpr))throw Error('FORGE_VIEWPORT_UNSUPPORTED');
 return {bundle:result['--bundle'],reference:result['--reference'],out:result['--out'],width,height,dpr,suggest:!!result.suggest,engineEntry:result['--engine-entry']};
}
export async function runFidelityPipeline({bundle,reference,out,width=1440,height=900,dpr=1,suggest=false,engineEntry}){
 const directory=resolve(out);
 await mkdir(directory,{recursive:false});
 const captureResult=await capture({bundle,out:join(directory,'render'),width,height,dpr});
 const options={reference,render:join(directory,'render','render.png'),out:join(directory,'compare'),suggest};
 if(engineEntry)options.engineEntry=engineEntry;
 const comparison=await compareReference(options);
 const evidence={schema:'ffax.fidelity-pipeline.v1',status:'MEASURED_NOT_OWNER_APPROVED',referenceFile:resolve(reference),bundleFile:resolve(bundle),capture:captureResult,comparisonReport:'compare/report.json',heatmap:'compare/heatmap.png',attempts:1,sourceMutation:false,ownerApproval:'REQUIRED'};
 await writeFile(join(directory,'pipeline.json'),JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});
 return evidence;
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname)){
 try{const settings=parseArgs(process.argv.slice(2));console.log(JSON.stringify({ok:true,...await runFidelityPipeline(settings)}));}
 catch(e){console.error(JSON.stringify({ok:false,error:(e?.message||'FORGE_PIPELINE_FAILED').slice(0,300)}));process.exitCode=1;}
}
