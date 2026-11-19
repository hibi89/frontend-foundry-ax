import test from 'node:test';
import assert from 'node:assert/strict';
import {applyFidelityPatch,planFidelityPatches} from '../src/fidelity-patch.mjs';
import {createFidelityArtifacts} from '../src/fidelity-renderer.mjs';
import {createTypographyDraft,addOwnerTextBox} from '../src/fidelity-typography.mjs';
const scene=()=>({schema:'ffax.fidelity-scene.v1',sourceSha256:'a'.repeat(64),width:600,height:400,revision:1,
 regions:[
 {id:'canvas',role:'canvas',parentId:null,bounds:{x:0,y:0,width:600,height:400},style:{background:'#ffffff'}},
 {id:'section-1',role:'hero',parentId:'canvas',bounds:{x:0,y:0,width:600,height:200},style:{background:'#112233'},ownerReviewed:true}
 ]});
const diag={schema:'ffax.f95-region-diagnostics.v1',status:'F95_UNASSESSED',sceneRevision:1,
 referenceSha256:'a'.repeat(64),regions:[{regionId:'section-1',meanRgbError:80}]};
test('FID-09 owner patches color and typography on a copy, CSS actually reflects edit',()=>{
 const s=scene(),t=addOwnerTextBox(createTypographyDraft(s),s,{regionId:'section-1',
  text:'역학달력',bounds:{x:10,y:10,width:200,height:40},approval:'APPROVE_FIDELITY_LOCAL_TEXT_LABEL'});
 const color=applyFidelityPatch(s,t,null,diag,{regionId:'section-1',property:'background',
  value:'#abcdef',approval:'APPROVE_LOCAL_V3_TYPED_PATCH'});
 assert.equal(s.regions[1].style.background,'#112233');
 assert.equal(color.candidateScene.regions[1].style.background,'#abcdef');
 assert.match(createFidelityArtifacts(color.candidateScene,{typography:color.candidateTypography,
  approval:'APPROVE_FIDELITY_SCENE_SOURCE_EXPORT'}).css,/background-color:#abcdef/);
 assert.throws(()=>applyFidelityPatch(color.candidateScene,color.candidateTypography,null,diag,
  {regionId:'section-1',property:'fontSize',textId:'text-1',value:'24',approval:'APPROVE_LOCAL_V3_TYPED_PATCH'}),/DIAGNOSTIC_INVALID/);
 const font=applyFidelityPatch(color.candidateScene,color.candidateTypography,null,{...diag,sceneRevision:2},
  {regionId:'section-1',property:'fontSize',textId:'text-1',value:'24',approval:'APPROVE_LOCAL_V3_TYPED_PATCH'});
 assert.match(createFidelityArtifacts(font.candidateScene,{typography:font.candidateTypography,
  approval:'APPROVE_FIDELITY_SCENE_SOURCE_EXPORT'}).css,/font-size:24px/);
 assert.equal(font.originalSourceModified,false);
});
test('FID-09 rejects unauthorized CSS, out-of-bounds geometry and locked properties',()=>{
 const s=scene();
 assert.equal(planFidelityPatches(diag,s).options.length,1);
 assert.throws(()=>applyFidelityPatch(s,null,null,diag,{regionId:'section-1',
  property:'background',value:'url(http://bad)',approval:'APPROVE_LOCAL_V3_TYPED_PATCH'}),/VALUE_INVALID/);
 assert.throws(()=>applyFidelityPatch(s,null,null,diag,{regionId:'section-1',
  property:'height',value:600,approval:'APPROVE_LOCAL_V3_TYPED_PATCH'}),/REGION_INVALID|PARENT_INVALID/);
 const locked={...s,regions:s.regions.map(r=>r.id==='section-1'?{...r,lockedProperties:['background']}:r)};
 assert.throws(()=>applyFidelityPatch(locked,null,null,diag,{regionId:'section-1',
  property:'background',value:'#ffffff',approval:'APPROVE_LOCAL_V3_TYPED_PATCH'}),/LOCKED/);
 assert.throws(()=>applyFidelityPatch(s,null,null,diag,{regionId:'section-1',
  property:'assetSha',value:'not-allowed',approval:'APPROVE_LOCAL_V3_TYPED_PATCH'}),/PROPERTY_UNSUPPORTED/);
});


test('P2-03 local text family and alignment patches reach generated React CSS without arbitrary CSS',()=>{
 const s=scene(),t=addOwnerTextBox(createTypographyDraft(s),s,{regionId:'section-1',
  text:'역학달력',bounds:{x:10,y:10,width:200,height:40},approval:'APPROVE_FIDELITY_LOCAL_TEXT_LABEL'});
 const family=applyFidelityPatch(s,t,null,diag,{
  regionId:'section-1',property:'fontFamily',textId:'text-1',value:'korean-serif',
  approval:'APPROVE_LOCAL_V3_TYPED_PATCH'
 });
 assert.equal(t.textBoxes[0].fontFamily,'UNKNOWN');
 assert.equal(family.candidateTypography.textBoxes[0].fontFamily,'korean-serif');
 const aligned=applyFidelityPatch(family.candidateScene,family.candidateTypography,null,
  {...diag,sceneRevision:2},{
   regionId:'section-1',property:'textAlign',textId:'text-1',value:'center',
   approval:'APPROVE_LOCAL_V3_TYPED_PATCH'
  });
 const output=createFidelityArtifacts(aligned.candidateScene,{
  typography:aligned.candidateTypography,approval:'APPROVE_FIDELITY_SCENE_SOURCE_EXPORT'
 });
 assert.match(output.css,/font-family:"Nanum Myeongjo","Batang",serif;/);
 assert.match(output.css,/text-align:center;/);
 assert.match(output.tsx,/역학달력/);
 assert.match(output.html,/font-family:"Nanum Myeongjo","Batang",serif;/);
 assert.equal(output.canPublish,false);
 for(const [property,value] of [
  ['fontFamily','url(https://invalid.example/font.woff)'],
  ['fontFamily','serif;position:fixed'],
  ['textAlign','justify; color:red'],
  ['fontFamily','']
 ]){
  assert.throws(()=>applyFidelityPatch(s,t,null,diag,{
   regionId:'section-1',property,textId:'text-1',value,
   approval:'APPROVE_LOCAL_V3_TYPED_PATCH'
  }),/VALUE_INVALID/);
 }
 assert.throws(()=>applyFidelityPatch(s,t,null,diag,{
  regionId:'section-1',property:'fontFamily',textId:'text-99',value:'serif',
  approval:'APPROVE_LOCAL_V3_TYPED_PATCH'
 }),/TEXT_NOT_FOUND/);
});
