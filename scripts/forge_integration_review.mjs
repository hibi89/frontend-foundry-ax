#!/usr/bin/env node
/* Read-only customer source intake + isolated FFAX component addition/revert. */
import {readFile,stat,realpath} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareForgeIntegration,rollbackForgeIntegration,auditForgeIntegration,planForgeDraftPR,prepareV3FidelityIntegration,rollbackV3FidelityIntegration,auditV3FidelityIntegration} from '../src/forge-safe-integration.mjs';
async function main(argv){
 const mode=argv.shift();
 if(!['prepare','rollback','audit','plan','prepare-v3','rollback-v3','audit-v3'].includes(mode)||argv.length%2!==0)throw Error('FORGE_INTEGRATION_USAGE');
 const args={};
 for(let i=0;i<argv.length;i+=2){
  const key=argv[i],val=argv[i+1];
  if(!['--bundle','--source','--dest','--job','--workdir','--approval','--repo','--branch','--base','--commit','--scene','--typography','--assets','--contract'].includes(key)||
     Object.hasOwn(args,key)||!val)throw Error('FORGE_INTEGRATION_ARGUMENT_INVALID');
  args[key]=val;
 }
 if(mode==='audit-v3'){
  if(Object.keys(args).sort().join(',')!=='--approval,--workdir')
   throw Error('FORGE_V3_INTEGRATION_USAGE');
  return auditV3FidelityIntegration({workDir:args['--workdir'],approval:args['--approval']});
 }
 if(mode==='rollback-v3'){
  if(Object.keys(args).sort().join(',')!=='--approval,--workdir')throw Error('FORGE_V3_INTEGRATION_USAGE');
  return rollbackV3FidelityIntegration({workDir:args['--workdir'],approval:args['--approval']});
 }
 if(mode==='prepare-v3'){
  const required=['--approval','--contract','--dest','--job','--scene','--source'];
  const optional=['--assets','--typography'];
  const supplied=Object.keys(args);
  if(!required.every(x=>supplied.includes(x))||
     supplied.some(x=>!required.includes(x)&&!optional.includes(x)))
   throw Error('FORGE_V3_INTEGRATION_USAGE');
  const load=async filename=>{
   const file=await realpath(resolve(filename)),s=await stat(file);
   if(!s.isFile()||s.size<20||s.size>512000)throw Error('FORGE_V3_INTEGRATION_JSON_SIZE_INVALID');
   return JSON.parse(await readFile(file,'utf8'));
  };
  const [scene,contract,typography,assets]=await Promise.all([
   load(args['--scene']),load(args['--contract']),
   args['--typography']?load(args['--typography']):Promise.resolve(null),
   args['--assets']?load(args['--assets']):Promise.resolve(null)
  ]);
  return prepareV3FidelityIntegration({source:args['--source'],dest:args['--dest'],
   jobId:args['--job'],scene,contract,typography,assets,approval:args['--approval']});
 }
 if(mode==='rollback'){
  if(Object.keys(args).sort().join(',')!=='--approval,--workdir')throw Error('FORGE_INTEGRATION_USAGE');
  return rollbackForgeIntegration({workDir:args['--workdir'],approval:args['--approval']});
 }
 if(mode==='audit'){
  if(Object.keys(args).sort().join(',')!=='--approval,--workdir')throw Error('FORGE_INTEGRATION_USAGE');
  return auditForgeIntegration({workDir:args['--workdir'],approval:args['--approval']});
 }
 if(mode==='plan'){
  if(Object.keys(args).sort().join(',')!=='--approval,--base,--branch,--commit,--repo,--workdir')throw Error('FORGE_INTEGRATION_USAGE');
  return planForgeDraftPR({workDir:args['--workdir'],approval:args['--approval'],
    repo:args['--repo'],branch:args['--branch'],base:args['--base'],commit:args['--commit']});
 }
 if(Object.keys(args).sort().join(',')!=='--approval,--bundle,--dest,--job,--source')throw Error('FORGE_INTEGRATION_USAGE');
 const path=await realpath(resolve(args['--bundle']));
 const info=await stat(path);
 if(!info.isFile()||info.size<100||info.size>512000)throw Error('FORGE_INTEGRATION_BUNDLE_SIZE_INVALID');
 const bundle=JSON.parse(await readFile(path,'utf8'));
 return prepareForgeIntegration({bundle,source:args['--source'],dest:args['--dest'],
   jobId:args['--job'],approval:args['--approval']});
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){
 main(process.argv.slice(2)).then(result=>console.log(JSON.stringify({ok:true,...result})))
 .catch(err=>{console.error(JSON.stringify({ok:false,error:/^FORGE_|^SOURCE_|^LOCAL_|^DESTINATION_|^INVALID_/.test(err?.message||'')?err.message:'FORGE_INTEGRATION_FAILED'}));process.exitCode=1;});
}
export {main};
