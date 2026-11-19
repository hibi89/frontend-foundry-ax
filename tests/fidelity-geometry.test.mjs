import test from 'node:test';
import assert from 'node:assert/strict';
import {segmentReferenceGeometry} from '../src/fidelity-geometry.mjs';
function raster(w,h,fn){
 const data=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4,c=fn(x,y);
  data.set([...c,255],i);
 }
 return {data,width:w,height:h};
}
test('FID-02 color edges resolve nested section and panel boxes at source scale',()=>{
 const image=raster(64,64,(x,y)=>y<32?(x<32?[20,30,40]:[220,220,220]):(x<32?[240,80,20]:[20,220,150]));
 const out=segmentReferenceGeometry(image,{sourceWidth:1280,sourceHeight:960});
 assert.equal(out.schema,'ffax.fidelity-geometry.v1');
 assert.ok(out.regions.filter(x=>x.role==='section').length>=2);
 assert.ok(out.regions.filter(x=>x.role==='panel').length>=2);
 assert.ok(out.regions.every(x=>x.bounds.x+x.bounds.width<=1280&&x.bounds.y+x.bounds.height<=960));
 assert.equal(out.ocrPerformed,false);
 assert.equal(out.remoteRequests,0);
});
test('FID-02 uniform image avoids inventing regions',()=>{
 const out=segmentReferenceGeometry(raster(32,48,()=>[120,150,180]),{sourceWidth:320,sourceHeight:480});
 assert.deepEqual(out.regions.map(x=>x.id),['canvas','section-1']);
});
test('FID-02 malformed pixel input fails closed',()=>{
 const img=raster(32,32,()=>[0,0,0]);
 assert.throws(()=>segmentReferenceGeometry({...img,data:new Uint8ClampedArray(3)},{sourceWidth:320,sourceHeight:320}),/INPUT_INVALID/);
 assert.throws(()=>segmentReferenceGeometry(img,{sourceWidth:10000,sourceHeight:10000}),/INPUT_INVALID/);
});
