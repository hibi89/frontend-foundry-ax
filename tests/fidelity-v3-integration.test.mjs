import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inspectReactProject} from '../src/workspace.mjs';
import {main as integrationCli} from '../scripts/forge_integration_review.mjs';
import {prepareV3FidelityIntegration,rollbackV3FidelityIntegration,auditV3FidelityIntegration} from '../src/forge-safe-integration.mjs';
const hash='a'.repeat(64);
const scene={schema:'ffax.fidelity-scene.v1',sourceSha256:hash,width:640,height:400,revision:1,regions:[
 {id:'canvas',role:'canvas',parentId:null,bounds:{x:0,y:0,width:640,height:400},style:{background:'#ffffff'}},
 {id:'region-button',role:'button',parentId:'canvas',bounds:{x:50,y:40,width:220,height:80},style:{background:'#112233'}}
]};
const typography={schema:'ffax.fidelity-typography.v1',referenceSha256:hash,sceneRevision:1,
 ocr:{status:'NOT_RUN_NO_LOCAL_ENGINE'},textBoxes:[{id:'text-1',regionId:'region-button',
 bounds:{x:55,y:45,width:200,height:35},text:'열기',confidence:'OWNER_SUPPLIED_NOT_OCR'}]};
const contract=(digest)=>({schema:'ffax.v3.app-binding-contract.v1',sourceDigest:digest,
 textBindings:[{slotId:'text-1',dataKey:'headline'}],
 intentBindings:[{regionId:'region-button',intent:'openPanel'}],
 boundaries:{auth:'OWNER_APPLICATION_ONLY',api:'OWNER_APPLICATION_ONLY',routes:'OWNER_APPLICATION_ONLY'}});
async function fixture(glob=false){
 const root=await mkdtemp(join(tmpdir(),'ffax-v3-int-'));
 const source=join(root,'customer'),dest=join(root,'isolated');
 await mkdir(join(source,'src'),{recursive:true});await mkdir(dest);
 await writeFile(join(source,'package.json'),JSON.stringify({name:'synthetic',dependencies:{react:'19.2.7'}}));
 const app=glob?'const all=import.meta.glob("./*.tsx");\nexport const App=()=>null;\n':
 'import * as React from "react";\nexport function App(){return <button>Existing sign in</button>}\n';
 await writeFile(join(source,'src','App.tsx'),app);
 await writeFile(join(source,'src','auth.ts'),'export const token=()=> "unchanged";\n');
 return {root,source,dest,app,project:await inspectReactProject(source)};
}
test('FID-11 approved data and intent bridge generates three real files in isolated React clone, original hashes match',async()=>{
 const f=await fixture();
 try{
 const result=await prepareV3FidelityIntegration({source:f.source,dest:f.dest,jobId:'fid11-real',
 scene,typography,contract:contract(f.project.digest),approval:'APPROVE_LOCAL_V3_INTEGRATION_REVIEW'});
 const code=await readFile(join(result.sourceDir,'src','ffax','FidelityBindings.tsx'),'utf8');
 assert.match(code,/safeData\["headline"\]/);
 assert.match(code,/Object\.prototype\.hasOwnProperty\.call\(safeData,"headline"\)/);
 assert.match(code,/typeof safeData\["headline"\] === "string"/);
 assert.doesNotMatch(code,/\?\? ""/);
 assert.match(code,/onIntent\?\.\(intent\)/);
 assert.match(code,/region-button/);
 assert.match(code,/from "\.\/FidelityScene\.js"/);
 assert.match(await readFile(join(result.sourceDir,'src','ffax','FidelityScene.tsx'),'utf8'),/function FidelityScene/);
 assert.match(await readFile(result.diffPath,'utf8'),/diff --git a\/src\/ffax\/FidelityBindings.tsx/);
 assert.equal(result.receipt.protectedFiles[0].path,'src/auth.ts');
 assert.equal(result.receipt.existingFilesModified,0);
 assert.equal(result.receipt.authVerified,false);
 assert.equal((await inspectReactProject(f.source)).digest,f.project.digest);
 const rolled=await rollbackV3FidelityIntegration({workDir:result.workDir,approval:'APPROVE_LOCAL_V3_INTEGRATION_ROLLBACK'});
 assert.equal(rolled.originalUnchanged,true);
 assert.equal((await inspectReactProject(f.source)).digest,f.project.digest);
 }finally{await rm(f.root,{recursive:true,force:true});}
});
test('FID-11 fails closed on forged source contract, dynamic discovery, unauthorized intent and tampering',async()=>{
 const f=await fixture();
 try{
 await assert.rejects(prepareV3FidelityIntegration({source:f.source,dest:f.dest,jobId:'bad-01',
 scene,typography,contract:contract(f.project.digest)}),/OWNER_APPROVAL_REQUIRED/);
 await assert.rejects(prepareV3FidelityIntegration({source:f.source,dest:f.dest,jobId:'bad-02',
 scene,typography,contract:contract('b'.repeat(64)),approval:'APPROVE_LOCAL_V3_INTEGRATION_REVIEW'}),/CONTRACT_INVALID/);
 await assert.rejects(prepareV3FidelityIntegration({source:f.source,dest:f.dest,jobId:'bad-03',
 scene,typography,contract:{...contract(f.project.digest),intentBindings:[{regionId:'canvas',intent:'hack'}]},
 approval:'APPROVE_LOCAL_V3_INTEGRATION_REVIEW'}),/INTENT_BINDING_INVALID/);
 const result=await prepareV3FidelityIntegration({source:f.source,dest:f.dest,jobId:'good-04',
 scene,typography,contract:contract(f.project.digest),approval:'APPROVE_LOCAL_V3_INTEGRATION_REVIEW'});
 await writeFile(join(result.sourceDir,'src','ffax','FidelityBindings.tsx'),'modified');
 await assert.rejects(rollbackV3FidelityIntegration({workDir:result.workDir,
 approval:'APPROVE_LOCAL_V3_INTEGRATION_ROLLBACK'}),/GENERATED_CONFLICT/);
 assert.equal((await inspectReactProject(f.source)).digest,f.project.digest);
 }finally{await rm(f.root,{recursive:true,force:true});}
 const g=await fixture(true);
 try{await assert.rejects(prepareV3FidelityIntegration({source:g.source,dest:g.dest,jobId:'blocked',
 scene,typography,contract:contract(g.project.digest),approval:'APPROVE_LOCAL_V3_INTEGRATION_REVIEW'}),/DYNAMIC_DISCOVERY_BLOCKED/);}
 finally{await rm(g.root,{recursive:true,force:true});}
});

test('FID-11 real CLI prepare-v3/rollback-v3 roundtrip preserves customer app bytes',async()=>{
 const f=await fixture();
 try{
  const sceneFile=join(f.root,'scene.json'),typographyFile=join(f.root,'typography.json'),
   contractFile=join(f.root,'contract.json');
  await Promise.all([
   writeFile(sceneFile,JSON.stringify(scene)),
   writeFile(typographyFile,JSON.stringify(typography)),
   writeFile(contractFile,JSON.stringify(contract(f.project.digest)))
  ]);
  const result=await integrationCli(['prepare-v3','--source',f.source,'--dest',f.dest,
   '--job','cli-001','--scene',sceneFile,'--typography',typographyFile,
   '--contract',contractFile,'--approval','APPROVE_LOCAL_V3_INTEGRATION_REVIEW']);
  assert.equal(result.receipt.textBindingCount,1);
  assert.equal(result.receipt.intentBindingCount,1);
  assert.equal(result.receipt.originalSourceModified,false);
  assert.equal((await inspectReactProject(f.source)).digest,f.project.digest);
  const undone=await integrationCli(['rollback-v3','--workdir',result.workDir,
   '--approval','APPROVE_LOCAL_V3_INTEGRATION_ROLLBACK']);
  assert.equal(undone.state,'ROLLED_BACK_IN_ISOLATED_COPY');
  assert.equal((await inspectReactProject(f.source)).digest,f.project.digest);
 }finally{await rm(f.root,{recursive:true,force:true});}
});

test('P2-04 V3 review-only audit detects exact patch tampering and preserves originals',async()=>{
 const f=await fixture();
 try{
  const result=await prepareV3FidelityIntegration({source:f.source,dest:f.dest,jobId:'v3-audit-01',
   scene,typography,contract:contract(f.project.digest),approval:'APPROVE_LOCAL_V3_INTEGRATION_REVIEW'});
  await assert.rejects(auditV3FidelityIntegration({workDir:result.workDir}),/AUDIT_APPROVAL_REQUIRED/);
  const audit=await auditV3FidelityIntegration({workDir:result.workDir,
   approval:'APPROVE_LOCAL_V3_INTEGRATION_AUDIT'});
  assert.equal(audit.state,'P2_STATIC_ISOLATED_REVIEW_INTEGRITY_PASS');
  assert.equal(audit.generatedFiles,3);
  assert.equal(audit.customerAuthRuntimeVerified,false);
  assert.equal(audit.customerApiRuntimeVerified,false);
  assert.equal(audit.fullCustomerBuildVerified,false);
  const viaCli=await integrationCli(['audit-v3','--workdir',result.workDir,
   '--approval','APPROVE_LOCAL_V3_INTEGRATION_AUDIT']);
  assert.equal(viaCli.verifiedDiffSha256,audit.verifiedDiffSha256);
  await writeFile(result.diffPath,'diff --git a/malicious b/malicious\n');
  await assert.rejects(auditV3FidelityIntegration({workDir:result.workDir,
   approval:'APPROVE_LOCAL_V3_INTEGRATION_AUDIT'}),/DIFF_CHANGED/);
  await assert.rejects(rollbackV3FidelityIntegration({workDir:result.workDir,
   approval:'APPROVE_LOCAL_V3_INTEGRATION_ROLLBACK'}),/DIFF_CHANGED/);
  assert.equal((await inspectReactProject(f.source)).digest,f.project.digest);
  assert.match(await readFile(join(result.sourceDir,'src','ffax','FidelityBindings.tsx'),'utf8'),/function FidelityBindings/);
 }finally{await rm(f.root,{recursive:true,force:true});}
});
test('P2-04 V3 audit refuses modified protected auth and generated source',async()=>{
 const f=await fixture();
 try{
  const r=await prepareV3FidelityIntegration({source:f.source,dest:f.dest,jobId:'v3-audit-02',
   scene,typography,contract:contract(f.project.digest),approval:'APPROVE_LOCAL_V3_INTEGRATION_REVIEW'});
  const audit=()=>auditV3FidelityIntegration({workDir:r.workDir,
   approval:'APPROVE_LOCAL_V3_INTEGRATION_AUDIT'});
  await writeFile(join(r.sourceDir,'src','auth.ts'),'export const token=()=> "tampered";\n');
  await assert.rejects(audit(),/EXISTING_FILE_CHANGED/);
  await writeFile(join(r.sourceDir,'src','auth.ts'),'export const token=()=> "unchanged";\n');
  await writeFile(join(r.sourceDir,'src','ffax','FidelityScene.css'),'body { color:red }');
  await assert.rejects(audit(),/GENERATED_CHANGED/);
  assert.equal((await inspectReactProject(f.source)).digest,f.project.digest);
 }finally{await rm(f.root,{recursive:true,force:true});}
});

test('P2-04 V3 audit and rollback refuse symlinked generated parent even with matching SHA bytes',async(t)=>{
 const f=await fixture();
 try{
  const r=await prepareV3FidelityIntegration({source:f.source,dest:f.dest,jobId:'v3-p2-symlink',
   scene,typography,contract:contract(f.project.digest),approval:'APPROVE_LOCAL_V3_INTEGRATION_REVIEW'});
  const generated=join(r.sourceDir,'src','ffax'),external=join(f.root,'external-owner-files');
  await mkdir(external);
  const expected=new Map();
  for(const name of ['FidelityScene.tsx','FidelityScene.css','FidelityBindings.tsx']){
   const bytes=await readFile(join(generated,name));
   expected.set(name,bytes);
   await writeFile(join(external,name),bytes);
  }
  await rm(generated,{recursive:true});
  try{await symlink(external,generated,process.platform==='win32'?'junction':'dir');}
  catch(e){
   if(['EPERM','EACCES','ENOTSUP'].includes(e.code)){t.skip('Test OS denies directory links');return;}
   throw e;
  }
  await assert.rejects(auditV3FidelityIntegration({workDir:r.workDir,
   approval:'APPROVE_LOCAL_V3_INTEGRATION_AUDIT'}),/GENERATED_UNSAFE_PARENT/);
  await assert.rejects(rollbackV3FidelityIntegration({workDir:r.workDir,
   approval:'APPROVE_LOCAL_V3_INTEGRATION_ROLLBACK'}),/GENERATED_UNSAFE_PARENT/);
  for(const [name,bytes] of expected)
   assert.deepEqual(await readFile(join(external,name)),bytes);
  assert.equal((await inspectReactProject(f.source)).digest,f.project.digest);
 }finally{await rm(f.root,{recursive:true,force:true});}
});


test('P2-04 2x owner original yields half-size CSS inside untouched isolated React app',async()=>{
 const f=await fixture();
 try{
  const prepared=await prepareV3FidelityIntegration({
   source:f.source,dest:f.dest,jobId:'retina-2x',scene,typography,
   dpr:2,contract:contract(f.project.digest),
   approval:'APPROVE_LOCAL_V3_INTEGRATION_REVIEW'
  });
  const css=await readFile(join(prepared.sourceDir,'src','ffax','FidelityScene.css'),'utf8');
  assert.match(css,/width:320px; height:200px/);
  assert.match(css,/left:25px; top:20px; width:110px; height:40px/);
  assert.equal(prepared.receipt.dpr,2);
  assert.equal(prepared.receipt.pixelWidth,640);
  assert.equal(prepared.receipt.pixelHeight,400);
  assert.equal(prepared.receipt.cssWidth,320);
  assert.equal(prepared.receipt.cssHeight,200);
  assert.equal((await inspectReactProject(f.source)).digest,f.project.digest);
  const audit=()=>auditV3FidelityIntegration({workDir:prepared.workDir,
   approval:'APPROVE_LOCAL_V3_INTEGRATION_AUDIT'});
  assert.equal((await audit()).generatedFiles,3);
  const receiptPath=join(prepared.workDir,'v3-fidelity-integration-receipt.json');
  await writeFile(receiptPath,JSON.stringify({...prepared.receipt,cssWidth:640}));
  await assert.rejects(audit(),/AUDIT_RECEIPT_INVALID/);
  await writeFile(receiptPath,JSON.stringify(prepared.receipt));
  assert.equal((await audit()).generatedFiles,3);
  const rolled=await rollbackV3FidelityIntegration({workDir:prepared.workDir,
   approval:'APPROVE_LOCAL_V3_INTEGRATION_ROLLBACK'});
  assert.equal(rolled.originalUnchanged,true);
  assert.equal((await inspectReactProject(f.source)).digest,f.project.digest);
 }finally{await rm(f.root,{recursive:true,force:true});}
});

test('P2-04 CLI --dpr 2 passes owner physical/CSS dimensions and refuses unsafe DPRs',async()=>{
 const f=await fixture();
 try{
  const sceneFile=join(f.root,'scene.json'),contractFile=join(f.root,'contract.json'),
   typographyFile=join(f.root,'typography.json');
  await writeFile(sceneFile,JSON.stringify(scene));
  await writeFile(contractFile,JSON.stringify(contract(f.project.digest)));
  await writeFile(typographyFile,JSON.stringify(typography));
  const base=['prepare-v3','--source',f.source,'--dest',f.dest,
   '--job','cli-retina','--scene',sceneFile,'--contract',contractFile,'--typography',typographyFile,
   '--approval','APPROVE_LOCAL_V3_INTEGRATION_REVIEW'];
  for(const invalid of ['0','3','2.0','Infinity','NaN','-1'])
   await assert.rejects(integrationCli([...base,'--dpr',invalid]),/DPR_INVALID/);
  const prepared=await integrationCli([...base,'--dpr','2']);
  assert.equal(prepared.receipt.dpr,2);
  assert.equal(prepared.receipt.cssWidth,320);
  const css=await readFile(join(prepared.sourceDir,'src','ffax','FidelityScene.css'),'utf8');
  assert.match(css,/width:320px; height:200px/);
  await integrationCli(['rollback-v3','--workdir',prepared.workDir,
   '--approval','APPROVE_LOCAL_V3_INTEGRATION_ROLLBACK']);
  assert.equal((await inspectReactProject(f.source)).digest,f.project.digest);
  await assert.rejects(prepareV3FidelityIntegration({
   source:f.source,dest:f.dest,jobId:'wrong-retina',scene,typography,dpr:3,
   contract:contract(f.project.digest),approval:'APPROVE_LOCAL_V3_INTEGRATION_REVIEW'
  }),/DPR_UNSUPPORTED/);
 }finally{await rm(f.root,{recursive:true,force:true});}
});
