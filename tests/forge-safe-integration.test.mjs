import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {makeForgeBrief,generateForgeVariants,freezeForgeVariant} from '../src/design-forge.mjs';
import {prepareForgeIntegration,rollbackForgeIntegration,auditForgeIntegration,planForgeDraftPR,requestApprovedForgeDraft} from '../src/forge-safe-integration.mjs';

async function fixture(){
 const root=await mkdtemp(join(tmpdir(),'ffax-integrate-test-')),source=join(root,'customer'),dest=join(root,'isolated');
 await mkdir(join(source,'src'),{recursive:true});await mkdir(dest);
 await writeFile(join(source,'package.json'),JSON.stringify({name:'customer',dependencies:{react:'19.2.7'}}));
 const app='import React from "react";\nexport function App(){const onLogin=()=>{};return <button onClick={onLogin}>Sign in</button>}\n';
 await writeFile(join(source,'src','App.tsx'),app);
 const brief=makeForgeBrief({prompt:'Build a simple functional business analytics dashboard'});
 const bundle=await freezeForgeVariant(generateForgeVariants(brief)[0],{approval:'APPROVE_FORGE_REFERENCE'});
 return {root,source,dest,app,bundle};
}
test('RF-08 creates reviewed TSX and a real additive diff without touching existing app',async()=>{
 const f=await fixture();
 try{
  const result=await prepareForgeIntegration({source:f.source,dest:f.dest,bundle:f.bundle,jobId:'review-001',approval:'APPROVE_LOCAL_INTEGRATION_REVIEW'});
  assert.equal(result.receipt.state,'REVIEW_ONLY_IN_ISOLATED_COPY');
  assert.equal(result.receipt.existingFilesModified,0);
  assert.equal(result.receipt.prCreated,false);
  assert.equal(await readFile(join(f.source,'src','App.tsx'),'utf8'),f.app);
  assert.equal(await readFile(join(result.sourceDir,'src','App.tsx'),'utf8'),f.app);
  assert.equal(await readFile(join(result.sourceDir,'src','ffax','GeneratedScreen.tsx'),'utf8'),f.bundle.manifest.reactSource);
  assert.match(await readFile(result.diffPath,'utf8'),/new file mode 100644/);
  const undone=await rollbackForgeIntegration({workDir:result.workDir,approval:'APPROVE_LOCAL_INTEGRATION_ROLLBACK'});
  assert.equal(undone.state,'ROLLED_BACK_IN_ISOLATED_COPY');
  await assert.rejects(rollbackForgeIntegration({workDir:result.workDir,approval:'APPROVE_LOCAL_INTEGRATION_ROLLBACK'}),/ROLLBACK_RECEIPT_INVALID/);
  assert.equal(await readFile(join(f.source,'src','App.tsx'),'utf8'),f.app);
 }finally{await rm(f.root,{recursive:true,force:true});}
});
test('RF-08 blocks missing approval, duplicate job and tampered generated file',async()=>{
 const f=await fixture();
 try{
  await assert.rejects(prepareForgeIntegration({source:f.source,dest:f.dest,bundle:f.bundle,jobId:'review-002'}),/OWNER_REVIEW_REQUIRED/);
  const result=await prepareForgeIntegration({source:f.source,dest:f.dest,bundle:f.bundle,jobId:'review-002',approval:'APPROVE_LOCAL_INTEGRATION_REVIEW'});
  await assert.rejects(prepareForgeIntegration({source:f.source,dest:f.dest,bundle:f.bundle,jobId:'review-002',approval:'APPROVE_LOCAL_INTEGRATION_REVIEW'}));
  await writeFile(join(result.sourceDir,'src','ffax','GeneratedScreen.tsx'),'tampered');
  await assert.rejects(rollbackForgeIntegration({workDir:result.workDir,approval:'APPROVE_LOCAL_INTEGRATION_ROLLBACK'}),/ROLLBACK_CONFLICT/);
  assert.equal(await readFile(join(f.source,'src','App.tsx'),'utf8'),f.app);
 }finally{await rm(f.root,{recursive:true,force:true});}
});

test('RF-08: source-only auth/API contract audit and owner-scoped draft plan (no remote changes)',async()=>{
 const f=await fixture();
 try{
  await writeFile(join(f.source,'src','auth.ts'),'export function auth(){return true};\n');
  const result=await prepareForgeIntegration({source:f.source,dest:f.dest,bundle:f.bundle,
   jobId:'review-003',approval:'APPROVE_LOCAL_INTEGRATION_REVIEW'});
  await assert.rejects(auditForgeIntegration({workDir:result.workDir}),/AUDIT_APPROVAL_REQUIRED/);
  const checked=await auditForgeIntegration({workDir:result.workDir,approval:'APPROVE_LOCAL_INTEGRATION_AUDIT'});
  assert.equal(checked.audit.state,'P1_STATIC_ADDITIVE_REVIEW_READY');
  assert.equal(checked.audit.protectedContractFiles[0].path,'src/auth.ts');
  assert.equal(checked.audit.authRuntimeVerified,false);
  assert.equal(checked.audit.originalSourceModified,false);
  const planResult=await planForgeDraftPR({workDir:result.workDir,repo:'owner/react-app',
   branch:'feature/ffax-review',base:'main',commit:'a'.repeat(40),approval:'APPROVE_DRAFT_PR_PLAN_ONLY'});
  assert.equal(planResult.plan.plannedFiles[0],'src/ffax/GeneratedScreen.tsx');
  assert.equal(planResult.plan.semanticParity,'P2_NOT_RUN');
  assert.equal(planResult.plan.mergeAllowed,false);
  assert.equal(planResult.remoteChanges,false);
  await assert.rejects(requestApprovedForgeDraft({plan:planResult.plan,approval:'NO'}),/OWNER_DRAFT_PR_APPROVAL_REQUIRED/);
  // Only a fake injected adapter; it never contacts GitHub or the customer repo.
  const adapter={
   getBranch:async(_repo,branch)=>({sha:branch==='main'?'b'.repeat(40):'a'.repeat(40)}),
   findOpenPR:async()=>null,
   createDraftPR:async({draft})=>({draft,number:7,url:'https://github.com/owner/react-app/pull/7',merged:false})
  };
  const fake=await requestApprovedForgeDraft({plan:planResult.plan,approval:'APPROVE_CREATE_DRAFT_PR',adapter});
  assert.equal(fake.draft,true);assert.equal(fake.action,'created');
  assert.equal((await readFile(join(f.source,'src','App.tsx'),'utf8')),f.app);
 }finally{await rm(f.root,{recursive:true,force:true});}
});
test('RF-08: changed source and dynamic module discovery block audit and draft PR',async()=>{
 const f=await fixture();
 try{
  const result=await prepareForgeIntegration({source:f.source,dest:f.dest,bundle:f.bundle,
   jobId:'review-004',approval:'APPROVE_LOCAL_INTEGRATION_REVIEW'});
  await writeFile(join(result.sourceDir,'src','App.tsx'),f.app+'//tampered');
  await assert.rejects(auditForgeIntegration({workDir:result.workDir,approval:'APPROVE_LOCAL_INTEGRATION_AUDIT'}),/EXISTING_FILE_CHANGED/);
  assert.equal(await readFile(join(f.source,'src','App.tsx'),'utf8'),f.app);
 }finally{await rm(f.root,{recursive:true,force:true});}
 const g=await fixture();
 try{
  await writeFile(join(g.source,'src','discovery.ts'),'const x=import.meta.glob("./*.tsx");\n');
  const result=await prepareForgeIntegration({source:g.source,dest:g.dest,bundle:g.bundle,
   jobId:'review-005',approval:'APPROVE_LOCAL_INTEGRATION_REVIEW'});
  const audit=await auditForgeIntegration({workDir:result.workDir,approval:'APPROVE_LOCAL_INTEGRATION_AUDIT'});
  assert.equal(audit.audit.state,'BLOCKED_DYNAMIC_FILE_DISCOVERY');
  await assert.rejects(planForgeDraftPR({workDir:result.workDir,repo:'owner/react-app',
   branch:'feature/ffax-review',base:'main',commit:'a'.repeat(40),
   approval:'APPROVE_DRAFT_PR_PLAN_ONLY'}),/DYNAMIC_DISCOVERY_BLOCKED/);
 }finally{await rm(g.root,{recursive:true,force:true});}
});
