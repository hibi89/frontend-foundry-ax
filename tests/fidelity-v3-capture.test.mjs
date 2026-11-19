import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectV3CaptureReadiness} from '../scripts/forge_capture.mjs';
const sha='a'.repeat(64),html='<html><head><meta charset="utf-8"></head><body><main>static canvas only</main></body></html>';
const artifacts={schema:'ffax.fidelity-render-artifacts.v1',sourceSha256:sha,
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
