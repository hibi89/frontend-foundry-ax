import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,symlink,mkdir,stat,copyFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {inspectReactProject,importReactProject,createUIPatch,previewUIPatch,applyApprovedUIPatch,rollbackUIPatch,verifyOriginalUnchanged,createReviewPlan} from '../src/workspace.mjs';
const require=createRequire(import.meta.url);let ts;try{ts=require('typescript');}catch{const {execFileSync}=await import('node:child_process');ts=require(execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim()+'/typescript');}
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const fixtures=['react-market','react-analytics'];
const digest=s=>createHash('sha256').update(s).digest('hex');
const makeTemp=()=>mkdtemp(join(tmpdir(),'ffax-p75-test-'));
async function withWork(fixture,fn){const tmp=await makeTemp();try{const source=join(root,'fixtures',fixture);const data=await importReactProject({source,dest:tmp,id:'review-001'});return await fn({tmp,source,...data});}finally{await rm(tmp,{recursive:true,force:true});}}

for(const fixture of fixtures){
 test(`AC01 ${fixture}: immutable manifest / exact source digest / React TSX`,async()=>withWork(fixture,async({source,sourceDir,manifest,workDir})=>{
   const origin=await inspectReactProject(source),copy=await inspectReactProject(sourceDir);assert.equal(origin.digest,manifest.digest);assert.equal(copy.digest,origin.digest);
   assert.equal(origin.files.length,4);assert.ok(origin.files.some(f=>f.path==='src/App.tsx'));assert.equal((await verifyOriginalUnchanged({workDir})).unchanged,true);
 }));
 test(`AC07 ${fixture}: React TSX syntax and five actual event handlers`,async()=>{
   const app=await readFile(join(root,'fixtures',fixture,'src/App.tsx'),'utf8');
   const parsed=ts.createSourceFile('App.tsx',app,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
   assert.equal(parsed.parseDiagnostics.length,0,parsed.parseDiagnostics.map(x=>x.messageText).join('\n'));
   assert.equal((app.match(/onClick=/g)||[]).length,5);
   const js=ts.transpileModule(app,{fileName:'App.tsx',compilerOptions:{jsx:ts.JsxEmit.React, target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
   assert.equal((js.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
   assert.match(js.outputText,/React\.createElement/);
 });
 test(`AC07 ${fixture}: five service/API user flows identical before after UI patch and after rollback`,async()=>withWork(fixture,async({source,sourceDir,workDir,manifest})=>{
   const old=manifest.files.find(f=>f.path==='src/ui/theme.css');
   const patch=createUIPatch({expectedSha:old.sha256,content:':root { --primary: #8b5cf6; --surface: #0f172a; --radius: 16px; }'});
   const before=await runFiveFlows(join(source,'src/service.mjs'),fixture);
   const plan=await previewUIPatch({sourceDir,patch});assert.equal(plan.needsApproval,true);assert.notEqual(plan.newSha,old.sha256);
   const denied=await readFile(join(sourceDir,'src/ui/theme.css'),'utf8');
   await assert.rejects(applyApprovedUIPatch({workDir,patch,approval:'',jobId:'phase-001'}),/APPROVAL/);
   assert.equal((await readFile(join(sourceDir,'src/ui/theme.css'),'utf8')),denied);
   const receipt=await applyApprovedUIPatch({workDir,patch,approval:'APPROVE_UI_PATCH',jobId:'phase-001'});
   const after=await runFiveFlows(join(sourceDir,'src/service.mjs'),fixture);
   assert.deepEqual(after,before);
   assert.equal(receipt.state,'applied-in-isolated-copy');
   assert.equal((await verifyOriginalUnchanged({workDir})).unchanged,true);
   assert.equal((await inspectReactProject(source)).digest,manifest.digest);
   await assert.rejects(applyApprovedUIPatch({workDir,patch,approval:'APPROVE_UI_PATCH',jobId:'phase-001'}),/DUPLICATE/);
   const git=createReviewPlan({repo:'hibi89/frontend-foundry-ax',branch:'feature/ffax-workbench-p75-20261112',base:'main',commit:'a'.repeat(40),receipt,checks:before.map((v,i)=>({id:`flow-${i+1}`,status:'pass'}))});
   assert.equal(git.mergeAllowed,false);assert.equal(git.deployAllowed,false);assert.equal(git.receiptId,'phase-001');
   const restored=await rollbackUIPatch({workDir,jobId:'phase-001',approval:'APPROVE_ROLLBACK'});
   assert.equal(restored.state,'rolled-back');
   assert.equal((await inspectReactProject(sourceDir)).digest,manifest.digest);
   assert.deepEqual(await runFiveFlows(join(sourceDir,'src/service.mjs'),fixture),before);
 }));
}
async function runFiveFlows(path,fixture){
 const mod=await import(pathToFileURL(path).href + '?v='+Date.now()+Math.random());
 const calls=[]; const transport=async(p,d)=>{calls.push({path:p,data:d??null});return {ok:true,path:p,data:d??null};};
 let client,ops;
 if(fixture==='react-market'){
   client=mod.createMarketService(transport,{userId:'alice',approver:true});
   ops=[()=>client.search('AI design'),()=>client.profile(17),()=>client.quote(17,150),()=>client.approve(5),()=>client.checkout(5)];
 }else{
   client=mod.createAnalyticsService(transport,{userId:'alice',canExport:true,isAuditor:true});
   ops=[()=>client.load(),()=>client.filter('open'),()=>client.sort('desc'),()=>client.export(),()=>client.audit()];
 }
 const results=await Promise.all(ops.map(op=>op()));
 assert.equal(calls.length,5);assert.ok(results.every(r=>r.ok));
 return calls;
}
test('AC07 auth and approval invariants (market)',async()=>{
 const mod=await import('../fixtures/react-market/src/service.mjs');let calls=0;
 const client=mod.createMarketService(()=>{calls++;}, {userId:'',approver:false});
 await assert.rejects(client.search('abc'),/AUTH_REQUIRED/);
 const c2=mod.createMarketService(()=>{calls++;},{userId:'alice',approver:false});
 await assert.rejects(c2.approve(1),/APPROVAL_REQUIRED/);await assert.rejects(c2.checkout(1),/APPROVAL_REQUIRED/);await assert.rejects(c2.quote(1,-2),/INVALID_AMOUNT/);
 assert.equal(calls,0);
});
test('AC07 permission and filter invariants (analytics)',async()=>{
 const mod=await import('../fixtures/react-analytics/src/service.mjs');let calls=0;
 const c=mod.createAnalyticsService(()=>{calls++;},{userId:'alice',canExport:false,isAuditor:false});
 await assert.rejects(c.export(),/EXPORT_FORBIDDEN/);await assert.rejects(c.audit(),/AUDITOR_REQUIRED/);await assert.rejects(c.filter('admin'),/INVALID_FILTER/);await assert.rejects(c.sort('DROP'),/INVALID_SORT/);assert.equal(calls,0);
});
test('AC01 refuses symlink before import and does not create destination',async()=>{
 const tmp=await makeTemp();try{
  const source=join(tmp,'src');await mkdir(source);await writeFile(join(source,'package.json'),'{"dependencies":{"react":"19"}}');await mkdir(join(source,'src'));await writeFile(join(source,'src','App.tsx'),'export function App(){return <div/>;}');
  await symlink('/etc/passwd',join(source,'src','evil.js'));
  await assert.rejects(importReactProject({source,dest:tmp,id:'reject-001'}),/SYMLINK_REFUSED/);
  await assert.rejects(stat(join(tmp,'reject-001')),e=>e.code==='ENOENT');
 }finally{await rm(tmp,{recursive:true,force:true});}
});
test('AC01 refuses .env secret even if file is never consumed',async()=>{
 const tmp=await makeTemp();try{
  const source=join(tmp,'src');await mkdir(source);await writeFile(join(source,'package.json'),'{"dependencies":{"react":"19"}}');await mkdir(join(source,'src'));await writeFile(join(source,'src','App.tsx'),'export function App(){return <div/>;}');await writeFile(join(source,'.env'),'SECRET=abc');
  await assert.rejects(inspectReactProject(source),/SENSITIVE_PATH_REFUSED/);
 }finally{await rm(tmp,{recursive:true,force:true});}
});
test('AC01 refuses nested destination to prevent source overwrite',async()=>{
 const source=join(root,'fixtures',fixtures[0]);await assert.rejects(importReactProject({source,dest:join(source,'src'),id:'nope'}),/DESTINATION_MUST_BE_ISOLATED/);
});
test('AC07 forbids patching service.mjs and HTML script injection',async()=>{
 assert.throws(()=>createUIPatch({path:'src/service.mjs',expectedSha:'a'.repeat(64),content:'evil'}),/UI_PATCH_ALLOWLIST_ONLY/);
 assert.throws(()=>createUIPatch({expectedSha:'a'.repeat(64),content:'body{background:url(https://attacker.test)}'}),/UNSAFE_CSS_REFUSED/);
 assert.throws(()=>createUIPatch({path:'../.env',expectedSha:'a'.repeat(64),content:'key=x'}),/UI_PATCH_ALLOWLIST_ONLY/);
});
test('AC07 stale SHA patch fails closed and preserves bytes',async()=>withWork(fixtures[0],async({sourceDir})=>{
 const path=join(sourceDir,'src/ui/theme.css'),before=await readFile(path);
 const patch=createUIPatch({expectedSha:'a'.repeat(64),content:'body{color:red}'});
 await assert.rejects(previewUIPatch({sourceDir,patch}),/SOURCE_SHA_MISMATCH/);assert.deepEqual(await readFile(path),before);
}));
test('AC07 rollback refuses divergent latest UI edit and requires approval',async()=>withWork(fixtures[0],async({workDir,sourceDir,manifest})=>{
 const p=createUIPatch({expectedSha:manifest.files.find(f=>f.path==='src/ui/theme.css').sha256,content:'body { color: red; }'});
 await applyApprovedUIPatch({workDir,patch:p,approval:'APPROVE_UI_PATCH',jobId:'rollback-001'});
 await assert.rejects(rollbackUIPatch({workDir,jobId:'rollback-001',approval:''}),/APPROVAL/);
 await writeFile(join(sourceDir,'src/ui/theme.css'),'body { color: green; }');
 await assert.rejects(rollbackUIPatch({workDir,jobId:'rollback-001',approval:'APPROVE_ROLLBACK'}),/ROLLBACK_CONFLICT/);
}));
test('AC10 review plan blocks unchecked statuses, invalid repo, and direct main merge',()=>{
 const receipt={state:'applied-in-isolated-copy',jobId:'test-001',gitPush:false,productionDeploy:false};
 const args={repo:'hibi89/frontend-foundry-ax',branch:'feature/review-001',base:'main',commit:'f'.repeat(40),receipt,checks:Array.from({length:5},(_,i)=>({id:i,status:'pass'}))};
 assert.equal(createReviewPlan(args).reviewRequired,true);
 assert.throws(()=>createReviewPlan({...args,base:'feature/review-001'}),/GIT_REVIEW_NOT_READY/);
 assert.throws(()=>createReviewPlan({...args,checks:[...args.checks.slice(0,4),{status:'fail'}]}),/GIT_REVIEW_NOT_READY/);
 assert.throws(()=>createReviewPlan({...args,repo:'../../etc'}),/INVALID_GIT_REVIEW_INPUT/);
 assert.throws(()=>createReviewPlan({...args,receipt:{...receipt,productionDeploy:true}}),/GIT_REVIEW_NOT_READY/);
});
