import test from 'node:test';
import assert from 'node:assert/strict';
import {createV3OwnerVisualReview,createV3LocalWorkSnapshot,restoreV3LocalWorkSnapshot} from '../src/fidelity-review.mjs';
const sha='a'.repeat(64),renderSha='b'.repeat(64);
const diag={schema:'ffax.f95-region-diagnostics.v1',status:'F95_UNASSESSED',
 weightedF95Score:null,passed95:false,referenceSha256:sha,renderSha256:renderSha};
const reference={schema:'ffax.reference-bundle.v3',referenceSha256:sha,
 provenance:{publicRedistributionAllowed:false}};
const capture={schema:'ffax.v3.capture-receipt.v1',sha256:renderSha,referenceSha256:sha};
const scene={schema:'ffax.fidelity-scene.v1',sourceSha256:sha,width:600,height:400,revision:1,
 regions:[
 {id:'canvas',parentId:null,role:'canvas',bounds:{x:0,y:0,width:600,height:400},style:{background:'#ffffff'}},
 {id:'section-1',parentId:'canvas',role:'section',bounds:{x:0,y:0,width:600,height:400},style:{background:'#123456'}}
 ]};
test('FID-10 owner visual decision is provenance-bound and never F95/production approval',()=>{
 const accepted=createV3OwnerVisualReview(diag,reference,capture,{decision:'ACCEPT_VISUAL_CANDIDATE',approval:'APPROVE_V3_CANDIDATE_VISUAL_REVIEW'});
 assert.equal(accepted.ownerVisualAccepted,true);
 assert.equal(accepted.f95,'UNASSESSED');
 assert.equal(accepted.publishApproved,false);
 const rejected=createV3OwnerVisualReview(diag,reference,capture,{decision:'REJECT_VISUAL_CANDIDATE',approval:'APPROVE_V3_CANDIDATE_VISUAL_REVIEW'});
 assert.equal(rejected.ownerVisualAccepted,false);
 assert.throws(()=>createV3OwnerVisualReview(diag,reference,{...capture,sha256:'c'.repeat(64)},
  {decision:'ACCEPT_VISUAL_CANDIDATE',approval:'APPROVE_V3_CANDIDATE_VISUAL_REVIEW'}),/MISMATCH/);
});
test('FID-10 safe JSON work checkpoint resumes only under same source SHA and owner approval',()=>{
 const snap=createV3LocalWorkSnapshot(scene,null,null,{referenceSha256:sha,approval:'APPROVE_LOCAL_V3_SNAPSHOT_EXPORT'});
 const restored=restoreV3LocalWorkSnapshot(JSON.stringify(snap),{referenceSha256:sha,approval:'APPROVE_LOCAL_V3_SNAPSHOT_RESTORE'});
 assert.equal(restored.scene.sourceSha256,sha);
 assert.equal(restored.state,'LOCAL_RESTORED_RECAPTURE_AND_VAULT_RECHECK_REQUIRED');
 assert.throws(()=>restoreV3LocalWorkSnapshot(JSON.stringify(snap),{referenceSha256:'c'.repeat(64),approval:'APPROVE_LOCAL_V3_SNAPSHOT_RESTORE'}),/SOURCE_MISMATCH/);
 assert.throws(()=>restoreV3LocalWorkSnapshot(JSON.stringify(snap),{referenceSha256:sha,approval:'NO'}),/OWNER_APPROVAL_REQUIRED/);
});
