import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {makeForgeBrief,generateForgeVariants,freezeForgeVariant} from '../src/design-forge.mjs';
import {prepareForgeIntegration,rollbackForgeIntegration} from '../src/forge-safe-integration.mjs';

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
