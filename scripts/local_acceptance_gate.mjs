/** FFAX local D1-D5 functional-rehearsal gate.
 * No remote service, customer files, external model, repo writes or payment.
 * Passing local scenarios does NOT satisfy the clean-CI/real-LLM release gates.
 */
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildBrief, newDocument, createReference, approveReference, exportReact } from '../src/core.mjs';
import { importReactProject, inspectReactProject, createUIPatch, previewUIPatch, applyApprovedUIPatch, rollbackUIPatch, verifyOriginalUnchanged } from '../src/workspace.mjs';
import { makeApprovedPlan, AILedger, executeApprovedPrompt } from '../src/ai-gate.mjs';
import { parseModelDesign, makeLocalFixtureDesign } from '../src/ai-structured-output.mjs';
const ROOT=resolve(import.meta.dirname, '..');
const output=[]; const track=(id,passed,detail)=>{output.push({id,status:passed?'PASS':'FAIL',detail});console.log((passed?'PASS':'FAIL')+' '+id+' — '+detail);};
const temp=await mkdtemp(join(tmpdir(),'ffax-acceptance-'));
try{
 // D1: brief -> two approved options -> structured adapter boundary -> real typecheck.
 const prompt='글로벌 프리랜서 마켓플레이스의 검색 프로필과 AI 협상 화면을 만들어줘';
 const brief=buildBrief(prompt);assert.equal(brief.approaches.length,2);
 const a=newDocument(brief,'A'), b=newDocument(brief,'B');assert.notEqual(a.layout,b.layout);
 const model=parseModelDesign(makeLocalFixtureDesign(0,prompt),{ownerBrief:prompt,approval:'APPROVE_DESIGN_PREVIEW'});
 assert.ok(exportReact(a).includes('GeneratedScreen'));assert.ok(model.reactSource.includes('GeneratedScreen'));
 const compiled=JSON.parse(execFileSync('node',['scripts/model_contract_probe.mjs'],{cwd:ROOT,encoding:'utf8'}));
 assert.equal(compiled.typechecked,12);track('D1',true,'two layouts; 12 synthetic strict TSX outputs typechecked; no actual AI');
 // D2: original immutable, five API flows per fixture, CSS only, safe revert.
 for(const fixture of ['react-market','react-analytics']){
  const source=join(ROOT,'fixtures',fixture);
  const before=await inspectReactProject(source);
  const job=await importReactProject({source,dest:temp,id:fixture});
  const original=job.manifest.files.find(f=>f.path==='src/ui/theme.css');
  const patch=createUIPatch({expectedSha:original.sha256,content:':root { --primary: #7645cc; --surface:#101827; }'});
  const check=await previewUIPatch({sourceDir:job.sourceDir,patch});assert.equal(check.needsApproval,true);
  let refused=false;try{await applyApprovedUIPatch({workDir:job.workDir,patch,jobId:'acceptance-d2',approval:''});}catch{refused=true;}assert.ok(refused);
  const receipt=await applyApprovedUIPatch({workDir:job.workDir,patch,jobId:'acceptance-d2',approval:'APPROVE_UI_PATCH'});assert.equal(receipt.gitPush,false);
  assert.equal((await verifyOriginalUnchanged({workDir:job.workDir})).unchanged,true);
  await rollbackUIPatch({workDir:job.workDir,jobId:'acceptance-d2',approval:'APPROVE_ROLLBACK'});
  assert.equal((await inspectReactProject(job.sourceDir)).digest,before.digest);
  assert.equal((await inspectReactProject(source)).digest,before.digest);
 }
 track('D2',true,'2 React fixture imports, original preserved, UI-only apply/rollback; 5-flow logic in unit regression');
 // D3: owner attests image rights; two style candidates; approving one distinct variant.
 const doc=newDocument(brief,'A');
 let denied=false;try{createReference(doc,'local-concept.png',false,['#415aff','#652aff']);}catch{denied=true;}assert.ok(denied);
 const ref=createReference(doc,'local-concept.png',true,['#415aff','#652aff']);assert.equal(ref.reference.candidates.length,2);
 const approved=approveReference(ref,'B');assert.equal(approved.reference.approvedCandidate,'B');assert.equal(approved.layout,'grid');
 track('D3',true,'reference rights gate; two palette variants and explicit selection; not pixel reproduction');
 // D4: bounded error handling with no real vendor transmission.
 const plan=makeApprovedPlan({prompt:'Create a secure dashboard interface with safe labels',provider:'test-only',model:'local-mock-1',consent:'APPROVE_EXTERNAL_AI_PROMPT_ONLY',estimatedInputTokens:320,maxOutputTokens:200,usdPerMillionInputTokens:.3,usdPerMillionOutputTokens:.6,maxJobUsd:.005,jobId:'acceptance-d4-job'});
 const ledger=new AILedger({maxSessionUsd:.005});let attempts=0;
 const result=await executeApprovedPrompt({plan,ledger,adapter:{generate:async()=>{attempts++;if(attempts===1)throw Object.assign(new Error('rate-limited'),{status:429});return {output:'{"theme":"midnight"}',inputTokens:320,outputTokens:40};}}});
 assert.equal(result.receipt.status,'succeeded');assert.equal(attempts,2);
 assert.throws(()=>ledger.reserve(plan.policy),/DUPLICATE/);
 const extra=makeApprovedPlan({prompt:'Create an accessible profile and settings screen',provider:'test-only',model:'local-mock-1',consent:'APPROVE_EXTERNAL_AI_PROMPT_ONLY',estimatedInputTokens:320,maxOutputTokens:200,usdPerMillionInputTokens:.3,usdPerMillionOutputTokens:.6,maxJobUsd:.005,jobId:'acceptance-interrupted'});
 const interrupted=new AILedger({maxSessionUsd:.005});interrupted.reserve(extra.policy);const resumed=AILedger.restore(interrupted.snapshot());assert.equal(resumed.snapshot().jobs[0].status,'review_hold');
 track('D4',true,'429 retry <=2, duplicate blocked, restart REVIEW_HOLD; no provider API');
 // D5: browser forced overflow/recovery, code/contrast checks; same-source injected Chromium (not URL verification).
 const probe=execFileSync('python',['scripts/browser_qa.py'],{cwd:ROOT,encoding:'utf8',timeout:50000});
 assert.match(probe,/30 PASS \/ 0 FAIL/);
 const contrast=execFileSync('python',['scripts/contrast_probe.py'],{cwd:ROOT,encoding:'utf8',timeout:30000});
 assert.match(contrast,/low-contrast candidates 0/);
 track('D5',true,'Chromium injected DOM 30/30, overflow fail->repair, computed text contrast candidates 0; not axe');
} catch (error){track('gate',false,String(error.message)); process.exitCode=1;}
finally{
 await rm(temp,{recursive:true,force:true});
 await mkdir(join(ROOT,'artifacts','qa'),{recursive:true});
 await writeFile(join(ROOT,'artifacts','qa','local-acceptance-gate.json'),JSON.stringify({schema:'ffax-d1-d5.v1',checks:output,localOnly:true,liveLLM:false,axe:false,actualCI:false,production:false},null,2));
}
if(output.filter(x=>x.status==='PASS').length!==5) process.exitCode=1;
