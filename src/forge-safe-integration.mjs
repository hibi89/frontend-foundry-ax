/* FFAX V2.1 RF-08: additive React export review in an isolated local copy.
 * Existing routes, auth, API handlers and customer source stay read-only.
 * No code execution, network, git push, PR, merge or deployment.
 */
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rm,lstat,unlink,rmdir} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {verifyForgeBundle} from './design-forge.mjs';
import {importReactProject,inspectReactProject,verifyOriginalUnchanged} from './workspace.mjs';
import {requestDraftPR,assertReviewPlan} from './github-review.mjs';

const TARGET='src/ffax/GeneratedScreen.tsx';
const HEX=/^[a-f0-9]{64}$/;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const SAFE_JOB=/^[A-Za-z0-9-]{3,64}$/;
const sensitivePath=/(^|\/)(?:auth|login|oauth|session|api|routes?|middleware|database|db|secrets?)(?:\/|[._-])/i;
async function sameSnapshot(sourceDir,manifest){
 for(const entry of manifest.files){
  const file=join(sourceDir,...entry.path.split('/'));
  const stat=await lstat(file);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
     sha(await readFile(file))!==entry.sha256)throw Error('FORGE_INTEGRATION_EXISTING_FILE_CHANGED');
 }
}
function reviewDiff(source){
 const lines=source.replace(/\r\n/g,'\n').split('\n');
 if(lines.at(-1)==='')lines.pop();
 return 'diff --git a/'+TARGET+' b/'+TARGET+'\nnew file mode 100644\n--- /dev/null\n+++ b/'+TARGET+
   '\n@@ -0,0 +1,'+lines.length+' @@\n'+lines.map(x=>'+'+x).join('\n')+'\n';
}
export async function prepareForgeIntegration({bundle,source,dest,jobId,approval}={}){
 if(approval!=='APPROVE_LOCAL_INTEGRATION_REVIEW')throw Error('FORGE_INTEGRATION_OWNER_REVIEW_REQUIRED');
 if(!SAFE_JOB.test(jobId||''))throw Error('FORGE_INTEGRATION_JOB_ID_INVALID');
 if(typeof source!=='string'||typeof dest!=='string'||!source.trim()||!dest.trim())throw Error('FORGE_INTEGRATION_PATH_REQUIRED');
 await verifyForgeBundle(bundle);
 if(bundle.approval!=='OWNER_APPROVED_THIS_VARIANT'||bundle.manifest.source!=='FFAX_FORGE_NATIVE')
  throw Error('FORGE_INTEGRATION_APPROVED_BUNDLE_REQUIRED');
 const code=bundle.manifest.reactSource;
 if(typeof code!=='string'||code.length<50||code.length>512000)throw Error('FORGE_INTEGRATION_SOURCE_INVALID');
 const before=await inspectReactProject(source);
 let created=null;
 try{
  const imported=await importReactProject({source,dest,id:jobId});
  created=imported.workDir;
  if(imported.manifest.digest!==before.digest)throw Error('FORGE_INTEGRATION_SOURCE_CHANGED');
  const srcDir=join(imported.sourceDir,'src');
  const stat=await lstat(srcDir);
  if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('FORGE_INTEGRATION_SRC_INVALID');
  const targetDir=join(srcDir,'ffax');
  // Fail closed if this target already exists; never replace an existing component.
  await mkdir(targetDir,{mode:0o700});
  const file=join(targetDir,'GeneratedScreen.tsx');
  await writeFile(file,code,{flag:'wx',mode:0o600});
  const sourceSha256=sha(Buffer.from(code));
  if(sha(await readFile(file))!==sourceSha256)throw Error('FORGE_INTEGRATION_READBACK_MISMATCH');
  await sameSnapshot(imported.sourceDir,imported.manifest);
  const original=await verifyOriginalUnchanged({workDir:created});
  if(!original.unchanged)throw Error('FORGE_INTEGRATION_ORIGINAL_CHANGED');
  const diff=reviewDiff(code);
  const diffSha256=sha(Buffer.from(diff));
  await writeFile(join(created,'review.patch'),diff,{flag:'wx',mode:0o600});
  const protectedFiles=imported.manifest.files.filter(x=>sensitivePath.test(x.path)).map(x=>x.path);
  const receipt={
   schema:'ffax.forge-integration-review.v1',jobId,bundleSha256:bundle.sha256,
   originalDigest:before.digest,sourceSha256,diffSha256,
   target:TARGET,state:'REVIEW_ONLY_IN_ISOLATED_COPY',approval,
   protectedPathsRetained:protectedFiles,existingFilesModified:0,
   originalSourceModified:false,routesVerified:false,authVerified:false,
   apiVerified:false,eventsVerified:false,buildVerified:false,
   generatedCodeExecuted:false,gitPush:false,prCreated:false,productionDeployed:false,
   requiredNextGate:'OWNER_REVIEW_AND_SEPARATE_SCOPED_INTEGRATION_APPROVAL'
  };
  await writeFile(join(created,'forge-integration-receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
  return {schema:receipt.schema,workDir:created,sourceDir:imported.sourceDir,receipt,
   diffPath:join(created,'review.patch'),originalUnchanged:true};
 }catch(error){
  if(created)await rm(created,{recursive:true,force:true});
  throw error;
 }
}
export async function rollbackForgeIntegration({workDir,approval}={}){
 if(approval!=='APPROVE_LOCAL_INTEGRATION_ROLLBACK')throw Error('FORGE_INTEGRATION_ROLLBACK_APPROVAL_REQUIRED');
 if(typeof workDir!=='string'||!workDir.trim())throw Error('FORGE_INTEGRATION_WORKDIR_REQUIRED');
 const root=resolve(workDir);
 const manifest=JSON.parse(await readFile(join(root,'manifest.json'),'utf8'));
 const receiptFile=join(root,'forge-integration-receipt.json');
 const receipt=JSON.parse(await readFile(receiptFile,'utf8'));
 if(manifest.schema!=='ffax-project-snapshot.v1'||receipt.schema!=='ffax.forge-integration-review.v1'||
    receipt.state!=='REVIEW_ONLY_IN_ISOLATED_COPY'||!SAFE_JOB.test(receipt.jobId)||
    receipt.jobId!==manifest.id||receipt.target!==TARGET||
    !HEX.test(receipt.sourceSha256||'')||receipt.originalDigest!==manifest.digest)
   throw Error('FORGE_INTEGRATION_ROLLBACK_RECEIPT_INVALID');
 const targetDir=join(root,'source','src','ffax');
 const file=join(targetDir,'GeneratedScreen.tsx');
 const stat=await lstat(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
    sha(await readFile(file))!==receipt.sourceSha256)throw Error('FORGE_INTEGRATION_ROLLBACK_CONFLICT');
 await sameSnapshot(join(root,'source'),manifest);
 await unlink(file);
 await rmdir(targetDir);
 const clone=await inspectReactProject(join(root,'source'));
 if(clone.digest!==manifest.digest)throw Error('FORGE_INTEGRATION_ROLLBACK_VERIFY_FAILED');
 const after=await verifyOriginalUnchanged({workDir:root});
 if(!after.unchanged)throw Error('FORGE_INTEGRATION_ORIGINAL_CHANGED');
 const updated={...receipt,state:'ROLLED_BACK_IN_ISOLATED_COPY'};
 await writeFile(receiptFile,JSON.stringify(updated,null,2)+'\n',{mode:0o600});
 return {schema:receipt.schema,state:updated.state,originalUnchanged:true,workDir:root};
}

/** RF-08: immutable-source contract audit. Identical bytes establish source
 * preservation, NOT runtime parity or that generated code safely integrates. */
export async function auditForgeIntegration({workDir,approval}={}){
 if(approval!=='APPROVE_LOCAL_INTEGRATION_AUDIT')
  throw Error('FORGE_INTEGRATION_AUDIT_APPROVAL_REQUIRED');
 if(typeof workDir!=='string'||!workDir.trim())throw Error('FORGE_INTEGRATION_WORKDIR_REQUIRED');
 const root=resolve(workDir),manifest=JSON.parse(await readFile(join(root,'manifest.json'),'utf8'));
 const receipt=JSON.parse(await readFile(join(root,'forge-integration-receipt.json'),'utf8'));
 if(manifest.schema!=='ffax-project-snapshot.v1'||receipt.schema!=='ffax.forge-integration-review.v1'||
    receipt.state!=='REVIEW_ONLY_IN_ISOLATED_COPY'||manifest.id!==receipt.jobId||
    receipt.originalDigest!==manifest.digest||receipt.target!==TARGET||
    !HEX.test(receipt.bundleSha256||'')||!HEX.test(receipt.diffSha256||'')||
    receipt.existingFilesModified!==0||receipt.gitPush!==false||receipt.productionDeployed!==false)
  throw Error('FORGE_INTEGRATION_AUDIT_RECEIPT_INVALID');
 const original=await verifyOriginalUnchanged({workDir:root});
 if(!original.unchanged)throw Error('FORGE_INTEGRATION_ORIGINAL_CHANGED');
 const sourceDir=join(root,'source');
 await assertV3GeneratedParents(sourceDir);
 await sameSnapshot(sourceDir,manifest);
 const target=join(sourceDir,...TARGET.split('/'));
 const stat=await lstat(target);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1)throw Error('FORGE_INTEGRATION_UNSAFE_TARGET');
 const generated=await readFile(target),text=generated.toString('utf8');
 if(sha(generated)!==receipt.sourceSha256)throw Error('FORGE_INTEGRATION_GENERATED_CHANGED');
 const actualDiff=await readFile(join(root,'review.patch'));
 if(sha(actualDiff)!==receipt.diffSha256||
    actualDiff.toString('utf8')!==reviewDiff(text))
  throw Error('FORGE_INTEGRATION_DIFF_CHANGED');
 const contractPaths=manifest.files.filter(x=>sensitivePath.test(x.path)).map(x=>({
  path:x.path,sha256:x.sha256,state:'SOURCE_BYTES_UNCHANGED_RUNTIME_NOT_VERIFIED'
 }));
 // Some frameworks import all files through dynamic-glob discovery, in which
 // even an additive TSX can modify bundle behavior. Fail closed before PR plan.
 const wildcardPatterns=/(?:import\.meta\.glob|require\.context)\s*\(/;
 const dynamicDiscovery=[];
 for(const f of manifest.files){
  if(!/\.(?:[cm]?js|jsx|tsx?|mjs)$/.test(f.path)||f.bytes>512000)continue;
  const bytes=await readFile(join(sourceDir,...f.path.split('/')));
  if(wildcardPatterns.test(bytes.toString('utf8')))dynamicDiscovery.push(f.path);
 }
 const audit={
  schema:'ffax.forge-integration-audit.v1',jobId:receipt.jobId,
  originalDigest:manifest.digest,sourceSha256:receipt.sourceSha256,
  diffSha256:receipt.diffSha256,
  state:dynamicDiscovery.length?'BLOCKED_DYNAMIC_FILE_DISCOVERY':'P1_STATIC_ADDITIVE_REVIEW_READY',
  existingFilesModified:0,originalSourceModified:false,
  protectedContractFiles:contractPaths,
  dynamicDiscovery,sourceHashParity:true,generatedFileOnly:true,
  authRuntimeVerified:false,routesRuntimeVerified:false,apiRuntimeVerified:false,
  dataRuntimeVerified:false,eventsRuntimeVerified:false,buildVerified:false,
  securityAuditedIndependently:false,
  ownerMergeApproved:false,gitPush:false,prCreated:false,productionDeployed:false,
  next:'HUMAN_SCOPED_DRAFT_PR_GO_AND_FULL_P2_PARITY_VALIDATION'
 };
 const auditFile=join(root,'forge-integration-audit.json'),serialized=JSON.stringify(audit,null,2)+'\n';
 try{await writeFile(auditFile,serialized,{flag:'wx',mode:0o600});}
 catch(err){
  if(err.code!=='EEXIST')throw err;
  if(await readFile(auditFile,'utf8')!==serialized)throw Error('FORGE_INTEGRATION_AUDIT_STALE_OR_TAMPERED');
 }
 return {audit,workDir:root,auditPath:auditFile,originalUnchanged:true};
}
/** Generates a complete, *offline* GitHub draft-PR review plan. No remote
 * branch, source, PR or credential changes happen here. */
export async function planForgeDraftPR({workDir,repo,branch,base,commit,approval}={}){
 if(approval!=='APPROVE_DRAFT_PR_PLAN_ONLY')throw Error('FORGE_DRAFT_PLAN_OWNER_APPROVAL_REQUIRED');
 if(!/^[-\w.]+\/[-\w.]+$/.test(repo||'')||
    !/^feature\/[a-z0-9/_-]{3,100}$/i.test(branch||'')||
    !/^[-\w./]+$/.test(base||'')||base===branch||
    !/^[a-f0-9]{40}$/.test(commit||''))
  throw Error('FORGE_DRAFT_PLAN_GIT_INPUT_INVALID');
 const reviewed=await auditForgeIntegration({workDir,approval:'APPROVE_LOCAL_INTEGRATION_AUDIT'});
 const a=reviewed.audit;
 if(a.state!=='P1_STATIC_ADDITIVE_REVIEW_READY')
  throw Error('FORGE_DRAFT_PLAN_DYNAMIC_DISCOVERY_BLOCKED');
 const tests=[
  {id:'EXISTING_SOURCE_SHA_PARITY',status:'pass',kind:'STATIC_SOURCE_HASH'},
  {id:'OWNER_SOURCE_READ_ONLY',status:'pass',kind:'STATIC_SOURCE_HASH'},
  {id:'REVIEWED_ADDITIVE_TSX_DIFF',status:'pass',kind:'STATIC_SOURCE_HASH'},
  {id:'GENERATED_SOURCE_SHA',status:'pass',kind:'STATIC_SOURCE_HASH'},
  {id:'NO_AUTO_PUSH_OR_DEPLOY',status:'pass',kind:'STATIC_POLICY_GATE'}
 ];
 const plan={
  schema:'ffax-git-review-plan.v1',repo,head:branch,base,sourceCommit:commit,
  reviewRequired:true,mergeAllowed:false,deployAllowed:false,
  receiptId:a.jobId,tests,rollback:'git revert <separately approved commit SHA>',
  sourceAuditDigest:a.originalDigest,diffSha256:a.diffSha256,
  plannedFiles:[TARGET],noOriginalFileWrites:true,
  semanticParity:'P2_NOT_RUN',remoteHeadVerified:false,branchPushed:false,
  draftPRApprovalRequired:true,ownerMergeApproved:false,productionDeploy:false,
  purpose:'owner-controlled draft PR of additive FFAX file only'
 };
 assertReviewPlan(plan);
 const planPath=join(reviewed.workDir,'forge-draft-pr-plan.json'),serialized=JSON.stringify(plan,null,2)+'\n';
 try{await writeFile(planPath,serialized,{flag:'wx',mode:0o600});}
 catch(err){
  if(err.code!=='EEXIST')throw err;
  if(await readFile(planPath,'utf8')!==serialized)throw Error('FORGE_DRAFT_PLAN_STALE_OR_TAMPERED');
 }
 return {plan,planPath,workDir:reviewed.workDir,remoteChanges:false};
}
/** Only with a separate explicit owner action and injected verified adapter:
 * existing requestDraftPR checks remote head SHA and never merges/deploys. */
export async function requestApprovedForgeDraft({plan,approval,adapter}={}){
 if(plan?.noOriginalFileWrites!==true||plan?.draftPRApprovalRequired!==true||
    plan?.semanticParity!=='P2_NOT_RUN'||plan?.ownerMergeApproved!==false||
    plan?.plannedFiles?.length!==1||plan.plannedFiles[0]!==TARGET)
  throw Error('FORGE_DRAFT_PLAN_SCOPE_INVALID');
 return requestDraftPR({plan,approval,adapter});
}


/* FFAX V3 FID-11: actual typed props and intent-callback bridge in an isolated
 * snapshot, never existing app/auth/routes/API changes or privileged execution.
 * Runtime parity and customer integration remain P2/owner approval gates.
 */
import {createFidelityArtifacts} from './fidelity-renderer.mjs';
const V3_FILES=Object.freeze([
 'src/ffax/FidelityScene.tsx','src/ffax/FidelityScene.css','src/ffax/FidelityBindings.tsx'
]);
/** Audit/rollback must reject a redirected generated directory before reading or
 * unlinking. A hash match on the child file does not make its parent safe:
 * a junction/symlink can point at a customer directory with identical bytes.
 */
async function assertV3GeneratedParents(sourceDir){
 let cursor=resolve(sourceDir);
 for(;;){
  const info=await lstat(cursor);
  if(!info.isDirectory()||info.isSymbolicLink())
   throw Error('FORGE_V3_GENERATED_UNSAFE_PARENT');
  const parent=dirname(cursor);
  if(parent===cursor)break;
  cursor=parent;
 }
 for(const part of ['src','src/ffax']){
  const info=await lstat(join(sourceDir,...part.split('/')));
  if(!info.isDirectory()||info.isSymbolicLink())
   throw Error('FORGE_V3_GENERATED_UNSAFE_PARENT');
 }
}
const contractKey=/^[A-Za-z][A-Za-z0-9_]{0,47}$/;
function exactlyKeys(value,keys){
 return value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).sort().join(',')===keys.slice().sort().join(',');
}
export function validateV3BindingContract(contract,scene,typography,originalDigest){
 if(!exactlyKeys(contract,['schema','sourceDigest','textBindings','intentBindings','boundaries'])||
    contract.schema!=='ffax.v3.app-binding-contract.v1'||contract.sourceDigest!==originalDigest||
    !HEX.test(originalDigest||'')||
    !exactlyKeys(contract.boundaries,['auth','api','routes'])||
    Object.values(contract.boundaries).some(v=>v!=='OWNER_APPLICATION_ONLY')||
    !Array.isArray(contract.textBindings)||!Array.isArray(contract.intentBindings)||
    contract.textBindings.length>32||contract.intentBindings.length>16||
    contract.textBindings.length+contract.intentBindings.length<1)
  throw Error('FORGE_V3_CONTRACT_INVALID');
 const labels=new Set(typography?.textBoxes?.map(t=>t.id)||[]);
 const buttons=new Set(scene?.regions?.filter(r=>r.role==='button').map(r=>r.id)||[]);
 const textSlots=new Set(),dataKeys=new Set(),intents=new Set(),regions=new Set();
 for(const t of contract.textBindings){
  if(!exactlyKeys(t,['slotId','dataKey'])||!labels.has(t.slotId)||
     !contractKey.test(t.dataKey||'')||textSlots.has(t.slotId)||dataKeys.has(t.dataKey))
   throw Error('FORGE_V3_TEXT_BINDING_INVALID');
  textSlots.add(t.slotId);dataKeys.add(t.dataKey);
 }
 for(const t of contract.intentBindings){
  if(!exactlyKeys(t,['regionId','intent'])||!buttons.has(t.regionId)||
     !contractKey.test(t.intent||'')||regions.has(t.regionId)||intents.has(t.intent))
   throw Error('FORGE_V3_INTENT_BINDING_INVALID');
  regions.add(t.regionId);intents.add(t.intent);
 }
 return {textBindings:contract.textBindings.map(t=>({...t})),
  intentBindings:contract.intentBindings.map(t=>({...t}))};
}
function buildV3BindingsSource(contract){
 const textMappings=contract.textBindings.map(t=>'  if(Object.prototype.hasOwnProperty.call(safeData,'+JSON.stringify(t.dataKey)+') && typeof safeData['+JSON.stringify(t.dataKey)+'] === "string") textSlots['+JSON.stringify(t.slotId)+'] = safeData['+JSON.stringify(t.dataKey)+'];').join('\n');
 const intents=contract.intentBindings.map(t=>'  '+JSON.stringify(t.regionId)+': '+JSON.stringify(t.intent)+',').join('\n');
 return 'import * as React from "react";\nimport FidelityScene from "./FidelityScene.js";\n'+
  'export type FidelityBindingData = Record<string,unknown>;\n'+
  'export type FidelityBindingProps = { data?: FidelityBindingData | null; onIntent?: (intent:string)=>void };\n'+
  'const INTENTS:Record<string,string> = {\n'+intents+'\n};\n'+
  'export default function FidelityBindings({data,onIntent}:FidelityBindingProps){\n'+
  ' const safeData:FidelityBindingData = data && typeof data === "object" && !Array.isArray(data) ? data : {};\n'+ ' const textSlots:Record<string,string> = {};\n'+textMappings+'\n'+
  ' const handleIntent=(regionId:string)=>{const intent=INTENTS[regionId]; if(intent!==undefined)onIntent?.(intent);};\n'+
  ' return <FidelityScene textSlots={textSlots} onAction={handleIntent}/>;\n}\n';
}
function v3FileDiff(path,value){
 const lines=value.replace(/\r\n/g,'\n').split('\n');if(lines.at(-1)==='')lines.pop();
 return 'diff --git a/'+path+' b/'+path+'\nnew file mode 100644\n--- /dev/null\n+++ b/'+path+
  '\n@@ -0,0 +1,'+lines.length+' @@\n'+lines.map(l=>'+'+l).join('\n')+'\n';
}
export async function prepareV3FidelityIntegration({source,dest,jobId,scene,typography=null,assets=null,dpr=1,contract,approval}={}){
 if(approval!=='APPROVE_LOCAL_V3_INTEGRATION_REVIEW')
  throw Error('FORGE_V3_INTEGRATION_OWNER_APPROVAL_REQUIRED');
 if(!SAFE_JOB.test(jobId||'')||typeof source!=='string'||!source.trim()||
    typeof dest!=='string'||!dest.trim())
  throw Error('FORGE_V3_INTEGRATION_INPUT_INVALID');
 const generated=createFidelityArtifacts(scene,{typography,assets,dpr,approval:'APPROVE_FIDELITY_SCENE_SOURCE_EXPORT'});
 const before=await inspectReactProject(source);
 const bindings=validateV3BindingContract(contract,scene,typography,before.digest);
 // Glob discovery may auto-bundle new files even without a route import. Fail closed.
 for(const item of before.files){
  if(!/\.(?:[cm]?js|jsx|tsx?)$/.test(item.path)||item.size>512000)continue;
  const file=await readFile(join(before.source,...item.path.split('/')),'utf8');
  if(/(?:import\.meta\.glob|require\.context)\s*\(/.test(file))
   throw Error('FORGE_V3_DYNAMIC_DISCOVERY_BLOCKED');
 }
 const sources=[generated.tsx,generated.css,buildV3BindingsSource(bindings)];
 if(sources.some(s=>s.length<15||s.length>512000))
  throw Error('FORGE_V3_GENERATED_SOURCE_INVALID');
 let workDir=null;
 try{
  const copy=await importReactProject({source,dest,id:jobId});
  workDir=copy.workDir;
  if(copy.manifest.digest!==before.digest)throw Error('FORGE_V3_INTEGRATION_SOURCE_CHANGED');
  const targetDir=join(copy.sourceDir,'src','ffax');
  await mkdir(targetDir,{mode:0o700});
  for(let i=0;i<V3_FILES.length;i++){
   const target=join(copy.sourceDir,...V3_FILES[i].split('/'));
   await writeFile(target,sources[i],{flag:'wx',mode:0o600});
   if(sha(await readFile(target))!==sha(Buffer.from(sources[i])))
    throw Error('FORGE_V3_INTEGRATION_READBACK_FAILED');
  }
  await sameSnapshot(copy.sourceDir,copy.manifest);
  if(!(await verifyOriginalUnchanged({workDir})).unchanged)
   throw Error('FORGE_V3_INTEGRATION_ORIGINAL_CHANGED');
  const diff=V3_FILES.map((p,i)=>v3FileDiff(p,sources[i])).join('');
  await writeFile(join(workDir,'v3-fidelity-review.patch'),diff,{flag:'wx',mode:0o600});
  const protectedFiles=copy.manifest.files.filter(f=>sensitivePath.test(f.path))
   .map(f=>({path:f.path,sha256:f.sha256,state:'ORIGINAL_SHA_IDENTICAL_RUNTIME_UNVERIFIED'}));
  const receipt={schema:'ffax.v3.integration-review.v1',jobId,
   originalDigest:before.digest,referenceSha256:scene.sourceSha256,
   dpr:generated.dpr,pixelWidth:generated.pixelWidth,pixelHeight:generated.pixelHeight,
   cssWidth:generated.cssWidth,cssHeight:generated.cssHeight,
   sourceFiles:V3_FILES.map((path,i)=>({path,sha256:sha(Buffer.from(sources[i]))})),
   diffSha256:sha(Buffer.from(diff)),textBindingCount:bindings.textBindings.length,
   intentBindingCount:bindings.intentBindings.length,contractBoundaries:{...contract.boundaries},
   protectedFiles,existingFilesModified:0,originalSourceModified:false,
   state:'ISOLATED_REACT_PROP_INTENT_BRIDGE_REVIEW_ONLY',
   dataBindings:'TYPED_PROPS_ONLY_CUSTOMER_HANDLER_NOT_CONNECTED',
   apiVerified:false,authVerified:false,routesVerified:false,buildVerified:false,
   gitPush:false,prCreated:false,productionDeployed:false,
   requiredNextGate:'OWNER_CONTRACT_REVIEW_THEN_P2_REAL_APP_BUILD'};
  await writeFile(join(workDir,'v3-fidelity-integration-receipt.json'),JSON.stringify(receipt,null,2)+'\n',
   {flag:'wx',mode:0o600});
  return {schema:receipt.schema,workDir,sourceDir:copy.sourceDir,receipt,
   diffPath:join(workDir,'v3-fidelity-review.patch'),originalUnchanged:true};
 }catch(e){if(workDir)await rm(workDir,{recursive:true,force:true});throw e;}
}
/** P2-04: Read-only evidence integrity audit for V3 isolated React additions.
 * This verifies snapshot bytes and the *actual* review patch, never customer
 * auth/API runtime behavior, application build success or independent review.
 */
async function verifyV3ReviewIntegrity(root,manifest,receipt){
 if(manifest?.schema!=='ffax-project-snapshot.v1'||
    receipt?.schema!=='ffax.v3.integration-review.v1'||
    receipt.state!=='ISOLATED_REACT_PROP_INTENT_BRIDGE_REVIEW_ONLY'||
    !SAFE_JOB.test(receipt.jobId||'')||receipt.jobId!==manifest.id||
    receipt.originalDigest!==manifest.digest||
    ![1,2].includes(receipt.dpr)||
    !Number.isInteger(receipt.pixelWidth)||!Number.isInteger(receipt.pixelHeight)||
    receipt.pixelWidth<1||receipt.pixelHeight<1||
    receipt.pixelWidth>10000||receipt.pixelHeight>10000||
    receipt.pixelWidth*receipt.pixelHeight>32000000||
    receipt.pixelWidth%receipt.dpr!==0||receipt.pixelHeight%receipt.dpr!==0||
    receipt.cssWidth!==receipt.pixelWidth/receipt.dpr||
    receipt.cssHeight!==receipt.pixelHeight/receipt.dpr||
    receipt.existingFilesModified!==0||receipt.originalSourceModified!==false||
    !HEX.test(receipt.diffSha256||'')||
    !Array.isArray(receipt.sourceFiles)||receipt.sourceFiles.length!==V3_FILES.length||
    receipt.sourceFiles.some((f,i)=>f.path!==V3_FILES[i]||!HEX.test(f.sha256||'')))
   throw Error('FORGE_V3_AUDIT_RECEIPT_INVALID');
 const sourceDir=join(root,'source');
 // Must validate the actual generated directory before any hash-based audit.
 // Equal file hashes do not grant permission to follow a redirected directory.
 await assertV3GeneratedParents(sourceDir);
 await sameSnapshot(sourceDir,manifest);
 if(!(await verifyOriginalUnchanged({workDir:root})).unchanged)
   throw Error('FORGE_V3_AUDIT_ORIGINAL_CHANGED');
 const sources=[];
 for(const f of receipt.sourceFiles){
   const path=join(sourceDir,...f.path.split('/')),info=await lstat(path);
   if(!info.isFile()||info.isSymbolicLink()||info.nlink!==1)
     throw Error('FORGE_V3_AUDIT_GENERATED_UNSAFE');
   const bytes=await readFile(path);
   if(sha(bytes)!==f.sha256)throw Error('FORGE_V3_AUDIT_GENERATED_CHANGED');
   sources.push(bytes.toString('utf8'));
 }
 // Bind recorded DPR metadata to actual CSS; otherwise a coherent forged
 // dpr/cssWidth pair could survive static hashing of unrelated CSS bytes.
 const cssRoot='.ffax-v3-root { position:relative; box-sizing:border-box; width:'+
  receipt.cssWidth+'px; height:'+receipt.cssHeight+'px; overflow:hidden;';
 if(!sources[1].includes(cssRoot))
  throw Error('FORGE_V3_AUDIT_DPR_CSS_MISMATCH');
 const expected=V3_FILES.map((p,i)=>v3FileDiff(p,sources[i])).join('');
 const patchFile=join(root,'v3-fidelity-review.patch');
 const patchInfo=await lstat(patchFile);
 if(!patchInfo.isFile()||patchInfo.isSymbolicLink()||patchInfo.nlink!==1)
   throw Error('FORGE_V3_AUDIT_DIFF_UNSAFE');
 const patch=await readFile(patchFile);
 if(sha(patch)!==receipt.diffSha256||patch.toString('utf8')!==expected)
   throw Error('FORGE_V3_AUDIT_DIFF_CHANGED');
 return {generatedFiles:V3_FILES.length,verifiedDiffSha256:receipt.diffSha256};
}
export async function auditV3FidelityIntegration({workDir,approval}={}){
 if(approval!=='APPROVE_LOCAL_V3_INTEGRATION_AUDIT')
   throw Error('FORGE_V3_AUDIT_APPROVAL_REQUIRED');
 if(typeof workDir!=='string'||!workDir.trim())
   throw Error('FORGE_V3_AUDIT_WORKDIR_INVALID');
 const root=resolve(workDir);
 const manifest=JSON.parse(await readFile(join(root,'manifest.json'),'utf8'));
 const receipt=JSON.parse(await readFile(join(root,'v3-fidelity-integration-receipt.json'),'utf8'));
 const verified=await verifyV3ReviewIntegrity(root,manifest,receipt);
 return {schema:'ffax.v3.integration-audit.v1',workDir:root,
   state:'P2_STATIC_ISOLATED_REVIEW_INTEGRITY_PASS',
   ...verified,originalSourceModified:false,
   customerAuthRuntimeVerified:false,customerApiRuntimeVerified:false,
   customerRoutesRuntimeVerified:false,fullCustomerBuildVerified:false,
   independentSecurityAudit:'NOT_RUN',ownerAcceptance:'NOT_RUN',
   remoteChanges:false};
}

export async function rollbackV3FidelityIntegration({workDir,approval}={}){
 if(approval!=='APPROVE_LOCAL_V3_INTEGRATION_ROLLBACK')
  throw Error('FORGE_V3_ROLLBACK_APPROVAL_REQUIRED');
 if(typeof workDir!=='string'||!workDir.trim())throw Error('FORGE_V3_ROLLBACK_WORKDIR_INVALID');
 const root=resolve(workDir);
 const manifest=JSON.parse(await readFile(join(root,'manifest.json'),'utf8'));
 const receiptPath=join(root,'v3-fidelity-integration-receipt.json');
 const receipt=JSON.parse(await readFile(receiptPath,'utf8'));
 if(manifest.schema!=='ffax-project-snapshot.v1'||
    receipt.schema!=='ffax.v3.integration-review.v1'||
    receipt.state!=='ISOLATED_REACT_PROP_INTENT_BRIDGE_REVIEW_ONLY'||
    receipt.jobId!==manifest.id||receipt.originalDigest!==manifest.digest||
    !Array.isArray(receipt.sourceFiles)||receipt.sourceFiles.length!==3||
    receipt.sourceFiles.some((r,i)=>r.path!==V3_FILES[i]||!HEX.test(r.sha256||'')))
  throw Error('FORGE_V3_ROLLBACK_RECEIPT_INVALID');
 const clone=join(root,'source');
 await assertV3GeneratedParents(clone);
 await sameSnapshot(clone,manifest);
 if(!(await verifyOriginalUnchanged({workDir:root})).unchanged)
  throw Error('FORGE_V3_ROLLBACK_ORIGINAL_CHANGED');
 for(const f of receipt.sourceFiles){
  const file=join(clone,...f.path.split('/')),stat=await lstat(file);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
     sha(await readFile(file))!==f.sha256)
   throw Error('FORGE_V3_ROLLBACK_GENERATED_CONFLICT');
 }
 // Recheck generated directory after integrity verification and before deletion.
 await verifyV3ReviewIntegrity(root,manifest,receipt);
 await assertV3GeneratedParents(clone);
 for(const f of receipt.sourceFiles)await unlink(join(clone,...f.path.split('/')));
 await rmdir(join(clone,'src','ffax'));
 const after=await inspectReactProject(clone);
 if(after.digest!==manifest.digest)throw Error('FORGE_V3_ROLLBACK_COPY_MISMATCH');
 const updated={...receipt,state:'ROLLED_BACK_IN_ISOLATED_COPY'};
 await writeFile(receiptPath,JSON.stringify(updated,null,2)+'\n',{mode:0o600});
 return {schema:updated.schema,state:updated.state,originalUnchanged:true,workDir:root};
}
