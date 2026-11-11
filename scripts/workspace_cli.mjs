#!/usr/bin/env node
/** Local offline FFAX workspace proof. All side-effects are in a user-provided new destination. */
import {readFile} from 'node:fs/promises';
import {inspectReactProject,importReactProject,previewUIPatch,applyApprovedUIPatch,rollbackUIPatch,createUIPatch,verifyOriginalUnchanged} from '../src/workspace.mjs';
const [command,...args]=process.argv.slice(2);
const usage='Use: inspect <source> | import <source> <new-parent-dir> <id> | preview <workDir> <css-file> | apply <workDir> <css-file> <job-id> APPROVE_UI_PATCH | rollback <workDir> <job-id> APPROVE_ROLLBACK | verify-original <workDir>';
try {
 let result;
 if(command==='inspect' && args.length===1) result=await inspectReactProject(args[0]);
 else if(command==='import' && args.length===3) result=await importReactProject({source:args[0],dest:args[1],id:args[2]});
 else if ((command==='preview'&&args.length===2)||(command==='apply'&&args.length===4)){
   const {resolve,join}=await import('node:path');const dir=resolve(args[0]);
   const manifest=JSON.parse(await readFile(join(dir,'manifest.json'),'utf8'));
   const original=manifest.files.find(f=>f.path==='src/ui/theme.css');if(!original)throw new Error('NO_ALLOWED_CSS_TARGET');
   const content=await readFile(args[1],'utf8');
   const patch=createUIPatch({path:original.path,expectedSha:original.sha256,content});
   result=command==='preview'?await previewUIPatch({sourceDir:join(dir,'source'),patch}):await applyApprovedUIPatch({workDir:dir,patch,jobId:args[2],approval:args[3]});
 } else if(command==='rollback'&&args.length===3)result=await rollbackUIPatch({workDir:args[0],jobId:args[1],approval:args[2]});
 else if(command==='verify-original'&&args.length===1)result=await verifyOriginalUnchanged({workDir:args[0]});
 else throw new Error(usage);
 // never output path contents or tokens; returns only hashes and state
 if(result?.manifest)result={workDir:result.workDir,digest:result.manifest.digest,fileCount:result.manifest.files.length,writePolicy:result.manifest.writePolicy};
 console.log(JSON.stringify(result,null,2));
} catch(e){console.error(JSON.stringify({status:'FAIL_CLOSED',reason:e.message}));process.exitCode=2;}
