import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFidelityScene,reviseFidelityRegion} from '../src/fidelity-scene.mjs';
const inventory=()=>({
 schema:'ffax.external-reference-inventory.v1',sha256:'a'.repeat(64),rightsConfirmed:true,
 width:600,height:300,
 fidelityGeometry:{schema:'ffax.fidelity-geometry.v1',sourceWidth:600,sourceHeight:300,
  regions:[
   {id:'canvas',parentId:null,role:'canvas',bounds:{x:0,y:0,width:600,height:300},colorHint:'#123456'},
   {id:'section-1',parentId:'canvas',role:'section',bounds:{x:0,y:0,width:600,height:300},colorHint:'#123456'},
   {id:'section-1-panel-1',parentId:'section-1',role:'panel',bounds:{x:0,y:0,width:300,height:300},colorHint:'#654321'}
  ]}
});
test('FID-05 observed geometry becomes revisioned nested scene via owner edit',()=>{
 const scene=buildFidelityScene(inventory());
 assert.equal(scene.regions[2].typography.fontFamily,'UNKNOWN');
 const edited=reviseFidelityRegion(scene,{approval:'APPROVE_LOCAL_FIDELITY_REGION_EDIT',
  regionId:'section-1-panel-1',role:'hero',bounds:{x:10,y:10,width:280,height:260}});
 assert.equal(edited.revision,2);
 assert.equal(edited.regions[2].role,'hero');
 assert.equal(edited.regions[2].confidence.semantics,'OWNER_REVIEWED');
 assert.equal(scene.regions[2].role,'panel');
 assert.equal(edited.sourceSha256,scene.sourceSha256);
});
test('FID-05 unsafe/unauthorized edits cannot corrupt parent bounds',()=>{
 const scene=buildFidelityScene(inventory());
 const edited={approval:'APPROVE_LOCAL_FIDELITY_REGION_EDIT',regionId:'section-1-panel-1',
  role:'hero',bounds:{x:400,y:10,width:210,height:100}};
 assert.throws(()=>reviseFidelityRegion(scene,edited),/EDIT_INVALID|PARENT_INVALID/);
 assert.throws(()=>reviseFidelityRegion(scene,{...edited,bounds:{x:0,y:0,width:100,height:100},approval:'NO'}),/OWNER_APPROVAL_REQUIRED/);
 assert.throws(()=>buildFidelityScene({...inventory(),sha256:'bad'}),/SOURCE_INVALID/);
});
