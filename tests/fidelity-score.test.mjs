import test from 'node:test';
import assert from 'node:assert/strict';
import {measureV3RegionDiagnostics} from '../src/fidelity-score.mjs';
const pixels=(color)=>{const width=32,height=32,data=new Uint8ClampedArray(width*height*4);
 for(let i=0;i<data.length;i+=4)data.set([...color,255],i);return {width,height,data};};
const scene={schema:'ffax.fidelity-scene.v1',sourceSha256:'a'.repeat(64),width:32,height:32,revision:1,
 regions:[
 {id:'canvas',role:'canvas',bounds:{x:0,y:0,width:32,height:32}},
 {id:'section-1',role:'hero',bounds:{x:0,y:0,width:32,height:32},ownerReviewed:true}
 ]};
const params={scene,viewport:{width:32,height:32,dpr:1},
 referenceSha256:'a'.repeat(64),renderSha256:'b'.repeat(64)};
test('FID-08 distinct SHA real raster difference yields per-region evidence but NEVER fake F95',()=>{
 const result=measureV3RegionDiagnostics({...params,reference:pixels([0,0,0]),render:pixels([255,255,255])});
 assert.equal(result.regions.length,1);
 assert.equal(result.axes.colors.status,'APPROXIMATE_RGB_RASTER_COMPARISON');
 assert.equal(result.axes.colors.diagnosticScore,0);
 assert.equal(result.status,'F95_UNASSESSED');
 assert.equal(result.weightedF95Score,null);
 assert.equal(result.passed95,false);
 assert.ok(result.blockingReasons.includes('FONT_NOT_VERIFIED'));
 assert.equal(result.remoteRequests,0);
});
test('FID-08 forbids self image SHA, mismatched viewport, forged source and missing geometry',()=>{
 const black=pixels([0,0,0]);
 assert.throws(()=>measureV3RegionDiagnostics({...params,reference:black,render:black,renderSha256:'a'.repeat(64)}),/SELF_COMPARISON/);
 assert.throws(()=>measureV3RegionDiagnostics({...params,reference:black,render:{...black,width:31}}),/VIEWPORT_OR_RASTER/);
 assert.throws(()=>measureV3RegionDiagnostics({...params,reference:black,render:black,
  scene:{...scene,sourceSha256:'c'.repeat(64)}}),/SCENE_MISMATCH/);
 assert.throws(()=>measureV3RegionDiagnostics({...params,reference:black,render:black,
  scene:{...scene,regions:[scene.regions[0]]}}),/SCENE_MISMATCH/);
});
