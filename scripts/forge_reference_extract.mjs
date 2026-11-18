#!/usr/bin/env node
/* FFAX external reference structural extract. Never downloads/install engines, reads originals only. */
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,realpath,stat} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {reserveLocalReportDirectory} from './ffax_local_report_guard.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const pngSig=Buffer.from([137,80,78,71,13,10,26,10]);
const maxBytes=24*1024*1024;
const fail=m=>{throw Error(m)};
async function parsePng(path){
 const actual=await realpath(resolve(path));
 const info=await stat(actual);
 if(!info.isFile()||info.size<33||info.size>maxBytes)fail('FORGE_REFERENCE_SIZE_INVALID');
 const bytes=await readFile(actual);
 if(!bytes.subarray(0,8).equals(pngSig)||bytes.readUInt32BE(8)!==13||bytes.toString('ascii',12,16)!=='IHDR')fail('FORGE_REFERENCE_NOT_PNG');
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 if(width<1||height<1||width>10000||height>10000||width*height>32e6)fail('FORGE_REFERENCE_DIMENSIONS_INVALID');
 return {path:actual,width,height,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};
}
async function runEngine(path,args){
 let entry;
 try{entry=await realpath(resolve(path));}catch{fail('FORGE_EXTRACT_ENGINE_NOT_INSTALLED');}
 if(!entry.endsWith('.mjs')||!(await stat(entry)).isFile())fail('FORGE_EXTRACT_ENGINE_INVALID');
 return new Promise((accept,reject)=>{
  const cp=spawn(process.execPath,[entry,...args],{shell:false,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,NO_COLOR:'1'}});
  let out='',err='',finished=false;
  const done=(error,value)=>{if(finished)return;finished=true;clearTimeout(timeout);error?reject(error):accept(value);};
  const timeout=setTimeout(()=>{cp.kill();done(Error('FORGE_EXTRACT_TIMEOUT'));},90000);
  cp.stdout.on('data',d=>{out+=d.toString('utf8');if(out.length>2e6){cp.kill();done(Error('FORGE_EXTRACT_RESULT_TOO_LARGE'));}});
  cp.stderr.on('data',d=>{if(err.length<1024)err+=d.toString('utf8').slice(0,1024-err.length);});
  cp.on('error',()=>done(Error('FORGE_EXTRACT_SPAWN_FAILED')));
  cp.on('close',code=>{
   if(code!==0)return done(Error('FORGE_EXTRACT_FAILED: '+err.slice(0,180)));
   try{done(null,JSON.parse(out));}catch{done(Error('FORGE_EXTRACT_JSON_INVALID'));}
  });
 });
}
export async function extractReference({reference,out,engineEntry=join(root,'node_modules/one-shot-ui/dist/cli.mjs')}={}){
 if(!reference||!out)fail('FORGE_EXTRACT_INPUT_REQUIRED');
 const src=await parsePng(reference),dir=resolve(out);
 await reserveLocalReportDirectory(dir);
 const extracted=await runEngine(engineEntry,['extract',src.path,'--json','--no-ocr']);
 if(!extracted||typeof extracted!=='object'||Array.isArray(extracted))fail('FORGE_EXTRACT_PAYLOAD_INVALID');
 const report={schema:'ffax.reference-structural-analysis.v1',engine:'one-shot-ui',input:src,structuralResult:extracted,
  confidence:'UPSTREAM_UNVERIFIED',fontIdentity:'UNKNOWN',hiddenLayers:'UNRECOVERABLE_FROM_FLATTENED_IMAGE',text:'NOT_EXTRACTED_NO_OCR',
  assetManifest:{status:'NEEDS_MANUAL_REVIEW'},sourceModified:false,externalTransmission:false};
 await writeFile(join(dir,'structure.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return {schema:report.schema,output:dir,referenceSha256:src.sha256,structure:'structure.json',humanReviewRequired:true};
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){
 try{
  let reference,out,engineEntry;
  const args=process.argv.slice(2);
  if(args[0]!=='extract')fail('FORGE_EXTRACT_USAGE');
  for(let i=1;i<args.length;i+=2){const key=args[i],value=args[i+1];if(!value)fail('FORGE_EXTRACT_USAGE');if(key==='--reference')reference=value;else if(key==='--out')out=value;else if(key==='--engine-entry')engineEntry=value;else fail('FORGE_EXTRACT_USAGE');}
  console.log(JSON.stringify({ok:true,...await extractReference({reference,out,engineEntry})}));
 }catch(e){console.error(JSON.stringify({ok:false,error:(e?.message||'FORGE_EXTRACT_FAILED').slice(0,250)}));process.exitCode=1;}
}
