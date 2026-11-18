/* FFAX V2.1 RF-08: additive React export review in an isolated local copy.
 * Existing routes, auth, API handlers and customer source stay read-only.
 * No code execution, network, git push, PR, merge or deployment.
 */
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rm,lstat,unlink,rmdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
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
