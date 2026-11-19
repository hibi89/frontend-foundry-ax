import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectV3CaptureReadiness,createV3CaptureReceipt} from '../scripts/forge_capture.mjs';
import {createHash} from 'node:crypto';
const sha='a'.repeat(64),html='<html><head><meta charset="utf-8"></head><body><main role="main" style="width:600px;height:400px;background:#ffffff">Static local canvas, no network and no scripts.</main></body></html>';
const artifacts={schema:'ffax.fidelity-render-artifacts.v1',sourceSha256:sha,sceneRevision:1,
 originalSourceModified:false,externalRequests:0,tsx:'export function F(){}',css:'.a{}',html};
const reference={schema:'ffax.reference-bundle.v3',referenceSha256:sha,
 original:{pixelWidth:600,pixelHeight:400},viewport:{cssWidth:600,cssHeight:400,dpr:1},
 provenance:{publicRedistributionAllowed:false}};
test('FID-07 exact capture preflight locks screenshot source, DPR and forbidden-network state',()=>{
 const result=inspectV3CaptureReadiness(artifacts,reference,{width:600,height:400,dpr:1});
 assert.equal(result.referenceSha256,sha);
 assert.equal(result.network,'BLOCK_ALL');
 assert.equal(result.visualAcceptance,'NOT_VERIFIED');
});
test('FID-07 rejects unbound reference, manipulated source and unsupported DPR/viewport',()=>{
 assert.throws(()=>inspectV3CaptureReadiness({...artifacts,sourceSha256:'b'.repeat(64)},reference,{width:600,height:400}),/REFERENCE_MISMATCH/);
 assert.throws(()=>inspectV3CaptureReadiness({...artifacts,originalSourceModified:true},reference,{width:600,height:400}),/ARTIFACTS_INVALID/);
 assert.throws(()=>inspectV3CaptureReadiness(artifacts,reference,{width:600,height:400,dpr:2}),/VIEWPORT_UNSUPPORTED/);
 assert.throws(()=>inspectV3CaptureReadiness(artifacts,reference,{width:200,height:400}),/VIEWPORT_UNSUPPORTED/);
});

test('FID-07/P2 capture receipt overrides raw worker V1 schema and binds canonical source digest',()=>{
 const preflight=inspectV3CaptureReadiness(artifacts,reference,{width:600,height:400,dpr:1});
 const response={schema:'ffax.capture.v1',sha256:'c'.repeat(64),width:600,height:400,
  dpr:1,scriptExecution:'DISABLED',network:'ABORT_ALL'};
 const receipt=createV3CaptureReceipt(response,artifacts,preflight);
 assert.equal(receipt.schema,'ffax.v3.capture-receipt.v1');
 assert.equal(receipt.sceneRevision,1);
 assert.equal(receipt.referenceSha256,sha);
 assert.equal(receipt.typedSourceSha256,
  createHash('sha256').update(artifacts.tsx+'\n'+artifacts.css).digest('hex'));
 assert.equal(receipt.sha256,'c'.repeat(64));
 assert.equal(receipt.visualAcceptance,'NOT_VERIFIED');
 assert.throws(()=>createV3CaptureReceipt({...response,network:'ALLOW_ALL'},artifacts,preflight),
  /RECEIPT_INVALID/);
 assert.throws(()=>createV3CaptureReceipt({...response,width:1},artifacts,preflight),
  /RECEIPT_INVALID/);
});

test('P2-03 V3 capture forbids preflight re-use across mutated Scene versions',()=>{
 const preflight=inspectV3CaptureReadiness(artifacts,reference,{width:600,height:400,dpr:1});
 const worker={schema:'ffax.capture.v1',sha256:'c'.repeat(64),width:600,height:400,
  dpr:1,scriptExecution:'DISABLED',network:'ABORT_ALL'};
 assert.throws(()=>createV3CaptureReceipt(worker,{...artifacts,sceneRevision:2},preflight),
  /RECEIPT_INVALID/);
});
