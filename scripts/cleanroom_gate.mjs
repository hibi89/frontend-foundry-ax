/** Reproducible offline clean-room validation from a fresh isolated copy.
 * No git/github calls, no npm install, no external model or user data.
 */
import { mkdtemp, cp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root=resolve(import.meta.dirname,'..');
const files=['package.json','index.html','styles.css','src','tests','scripts','fixtures'];
const digest=x=>createHash('sha256').update(x).digest('hex');
const clean=await mkdtemp(join(tmpdir(),'ffax-cleanroom-'));
const steps=[
 ['Node automated regressions','node',['--test','tests/core.test.mjs','tests/ai-gate.test.mjs','tests/ai-structured-output.test.mjs','tests/manual-ai-ui.test.mjs','tests/workspace.test.mjs','tests/react-tsx-interactions.test.mjs','tests/github-review.test.mjs','tests/git-revert.test.mjs']],
 ['Structured model TSX contract','node',['scripts/model_contract_probe.mjs']],
 ['Provider adapter 12-prompt offline contract','node',['scripts/provider_contract_probe.mjs']],
 ['Manual bridge in Chromium','python',['scripts/manual_browser_probe.py']],
 ['Browser QA','python',['scripts/browser_qa.py']],
 ['Keyboard and semantics','python',['scripts/accessibility_probe.py']],
 ['Local D1-D5','node',['scripts/local_acceptance_gate.mjs']]
];
const result=[];
try {
 for(const path of files)await cp(join(root,path),join(clean,path),{recursive:true});
 // Omit the original workbench's excluded QA output, use fresh generated data only.
 await rm(join(clean,'scripts','__pycache__'),{recursive:true,force:true});
 await mkdir(join(clean,'artifacts','qa'),{recursive:true});
 for(const [name,bin,args] of steps){
  let output='';let status='PASS';
  try{output=execFileSync(bin,args,{cwd:clean,encoding:'utf8',timeout:120000,maxBuffer:2_000_000});}
  catch(e){status='FAIL';output=(e.stdout||'')+'\n'+(e.stderr||'')+'\n'+e.message;process.exitCode=1;}
  result.push({name,status,command:[bin,...args].join(' '),outputTail:output.slice(-750)});
  console.log(`${status} ${name}: ${output.trim().split('\n').at(-1)}`);
  if(status==='FAIL')break;
 }
 const cleanPackage=await readFile(join(clean,'package.json'));
 const sourcePackage=await readFile(join(root,'package.json'));
 const manifest={schema:'ffax-cleanroom-gate.v1',isolated:true,sourcePreserved:digest(cleanPackage)===digest(sourcePackage),
   externalNetwork:false,actualProvider:false,realWindows:false,axe:false,githubCI:false,
   steps:result,passed:result.filter(x=>x.status==='PASS').length,total:steps.length};
 await mkdir(join(root,'artifacts','qa'),{recursive:true});
 await writeFile(join(root,'artifacts','qa','cleanroom-report.json'),JSON.stringify(manifest,null,2));
 if(!manifest.sourcePreserved || manifest.passed!==steps.length)process.exitCode=1;
}finally{await rm(clean,{recursive:true,force:true});}
