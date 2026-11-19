/* FID-10: explicit visual-review receipt and safe owner-local resume snapshot.
 * Approval is NOT F95, product functional acceptance, publication or deployment.
 */
import {createFidelityArtifacts} from './fidelity-renderer.mjs';
const sha=/^[a-f0-9]{64}$/;
export function createV3OwnerVisualReview(diagnostic,referenceReceipt,captureReceipt,{decision,approval}={}){
 if(approval!=='APPROVE_V3_CANDIDATE_VISUAL_REVIEW')
  throw Error('FIDELITY_REVIEW_OWNER_APPROVAL_REQUIRED');
 if(!['ACCEPT_VISUAL_CANDIDATE','REJECT_VISUAL_CANDIDATE'].includes(decision))
  throw Error('FIDELITY_REVIEW_DECISION_INVALID');
 if(diagnostic?.schema!=='ffax.f95-region-diagnostics.v1'||
   diagnostic.status!=='F95_UNASSESSED'||!Number.isInteger(diagnostic.sceneRevision)||
   diagnostic.sceneRevision<1||captureReceipt?.sceneRevision!==diagnostic.sceneRevision||
   diagnostic.weightedF95Score!==null||
   diagnostic.passed95!==false||
   referenceReceipt?.schema!=='ffax.reference-bundle.v3'||
   captureReceipt?.schema!=='ffax.v3.capture-receipt.v1'||
   !sha.test(diagnostic.referenceSha256||'')||!sha.test(diagnostic.renderSha256||'')||
   diagnostic.referenceSha256!==referenceReceipt.referenceSha256||
   diagnostic.renderSha256!==captureReceipt.sha256||
   captureReceipt.referenceSha256!==referenceReceipt.referenceSha256||
   referenceReceipt.provenance?.publicRedistributionAllowed!==false||
   // A visual approval is meaningful only when all three pieces of evidence
   // refer to the same physical pixels and exact CSS viewport/DPR.
   !Number.isInteger(diagnostic.viewport?.width)||
   !Number.isInteger(diagnostic.viewport?.height)||
   diagnostic.viewport.width<2||diagnostic.viewport.height<2||
   diagnostic.viewport.width>2560||diagnostic.viewport.height>2200||
   diagnostic.viewport.dpr!==1||
   referenceReceipt.original?.pixelWidth!==diagnostic.viewport.width||
   referenceReceipt.original?.pixelHeight!==diagnostic.viewport.height||
   referenceReceipt.viewport?.cssWidth!==diagnostic.viewport.width||
   referenceReceipt.viewport?.cssHeight!==diagnostic.viewport.height||
   referenceReceipt.viewport?.dpr!==diagnostic.viewport.dpr||
   captureReceipt.width!==diagnostic.viewport.width||
   captureReceipt.height!==diagnostic.viewport.height||
   captureReceipt.dpr!==diagnostic.viewport.dpr||
   captureReceipt.preflight?.viewport?.width!==diagnostic.viewport.width||
   captureReceipt.preflight?.viewport?.height!==diagnostic.viewport.height||
   captureReceipt.preflight?.dpr!==diagnostic.viewport.dpr||
   captureReceipt.preflight?.sceneRevision!==diagnostic.sceneRevision||
   captureReceipt.preflight?.referenceSha256!==diagnostic.referenceSha256||
   captureReceipt.scriptExecution!=='DISABLED'||
   captureReceipt.network!=='ABORT_ALL')
  throw Error('FIDELITY_REVIEW_EVIDENCE_MISMATCH');
 return {schema:'ffax.v3.visual-review.v1',sceneRevision:diagnostic.sceneRevision,referenceSha256:diagnostic.referenceSha256,
  renderSha256:diagnostic.renderSha256,
  decision,ownerVisualAccepted:decision==='ACCEPT_VISUAL_CANDIDATE',
  status:decision==='ACCEPT_VISUAL_CANDIDATE'?
   'OWNER_VISUAL_CANDIDATE_ACCEPTED_NOT_INDEPENDENTLY_VERIFIED':'OWNER_VISUAL_CANDIDATE_REJECTED',
  f95:'UNASSESSED',p2FullVerification:'NOT_RUN',independentAudit:'NOT_RUN',
  applicationContract:'NOT_VERIFIED',publishApproved:false,
  originalSourceModified:false,externalRequests:0};
}
export function createV3LocalWorkSnapshot(scene,typography,assets,{referenceSha256,approval}={}){
 if(approval!=='APPROVE_LOCAL_V3_SNAPSHOT_EXPORT')
  throw Error('FIDELITY_SNAPSHOT_OWNER_APPROVAL_REQUIRED');
 if(!sha.test(referenceSha256||'')||scene?.sourceSha256!==referenceSha256)
  throw Error('FIDELITY_SNAPSHOT_REFERENCE_MISMATCH');
 createFidelityArtifacts(scene,{typography,assets,
  approval:'APPROVE_FIDELITY_SCENE_SOURCE_EXPORT'});
 return {schema:'ffax.v3.work-snapshot.v1',referenceSha256,
  scene:structuredClone(scene),typography:typography===null?null:structuredClone(typography),
  assets:assets===null?null:structuredClone(assets),
  scope:'LOCAL_OWNER_EXPORT_NO_BYTES',vaultRecheckRequired:true,
  f95:'UNASSESSED',originalSourceModified:false};
}
export function restoreV3LocalWorkSnapshot(value,{referenceSha256,approval}={}){
 if(approval!=='APPROVE_LOCAL_V3_SNAPSHOT_RESTORE')
  throw Error('FIDELITY_RESTORE_OWNER_APPROVAL_REQUIRED');
 const obj=typeof value==='string'?JSON.parse(value):value;
 if(obj?.schema!=='ffax.v3.work-snapshot.v1'||
   !sha.test(referenceSha256||'')||obj.referenceSha256!==referenceSha256||
   obj.vaultRecheckRequired!==true||obj.originalSourceModified!==false)
  throw Error('FIDELITY_RESTORE_SOURCE_MISMATCH');
 createFidelityArtifacts(obj.scene,{typography:obj.typography,assets:obj.assets,
  approval:'APPROVE_FIDELITY_SCENE_SOURCE_EXPORT'});
 return {scene:structuredClone(obj.scene),
  typography:obj.typography===null?null:structuredClone(obj.typography),
  assets:obj.assets===null?null:structuredClone(obj.assets),
  state:'LOCAL_RESTORED_RECAPTURE_AND_VAULT_RECHECK_REQUIRED'};
}
