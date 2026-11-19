import test from 'node:test';
import assert from 'node:assert/strict';
import {createFidelityArtifacts} from '../src/fidelity-renderer.mjs';
import {createTypographyDraft,addOwnerTextBox} from '../src/fidelity-typography.mjs';
import {createFidelityAssetManifest,gateFidelityAssets} from '../src/fidelity-assets.mjs';
const scene=()=>({
 schema:'ffax.fidelity-scene.v1',sourceSha256:'a'.repeat(64),width:600,height:300,revision:1,
 regions:[
 {id:'canvas',parentId:null,role:'canvas',bounds:{x:0,y:0,width:600,height:300},style:{background:'#111111'}},
 {id:'section-1',parentId:'canvas',role:'navbar',bounds:{x:0,y:0,width:600,height:100},style:{background:'#112233'}},
 {id:'section-1-panel-1',parentId:'section-1',role:'button',bounds:{x:300,y:10,width:200,height:50},style:{background:'#445566'}}
 ]
});
test('FID-06 real nested React source and matched local static preview retain coordinates/Korean text',()=>{
 const s=scene();
 let t=createTypographyDraft(s);
 t=addOwnerTextBox(t,s,{regionId:'section-1-panel-1',text:'서비스 시작',bounds:{x:310,y:20,width:170,height:30},approval:'APPROVE_FIDELITY_LOCAL_TEXT_LABEL'});
 const assets=createFidelityAssetManifest(s.sourceSha256);
 const r=createFidelityArtifacts(s,{typography:t,assets,approval:'APPROVE_FIDELITY_SCENE_SOURCE_EXPORT'});
 assert.equal(r.regionCount,3);
 assert.match(r.tsx,/export default function FidelityScene/);
 assert.match(r.tsx,/onAction\?\./);
 assert.match(r.tsx,/서비스 시작/);
 assert.match(r.css,/left:300px; top:10px; width:200px; height:50px/);
 assert.match(r.css,/left:10px; top:10px; width:170px; height:30px/);
 assert.match(r.html,/<button/);
 assert.match(r.html,/sandbox|Content-Security-Policy/);
 assert.equal(r.canPublish,false);
 assert.equal(r.externalRequests,0);
});
test('FID-06 no owner approval, invalid child, stale typography or unimported required asset',()=>{
 const s=scene(),t=createTypographyDraft(s);
 assert.throws(()=>createFidelityArtifacts(s),/OWNER_APPROVAL_REQUIRED/);
 assert.throws(()=>createFidelityArtifacts({...s,regions:s.regions.map(x=>x.id==='section-1-panel-1'?{...x,bounds:{x:590,y:10,width:200,height:50}}:x)},
  {approval:'APPROVE_FIDELITY_SCENE_SOURCE_EXPORT'}),/REGION_INVALID|PARENT_INVALID/);
 assert.throws(()=>createFidelityArtifacts({...s,revision:2},{typography:t,approval:'APPROVE_FIDELITY_SCENE_SOURCE_EXPORT'}),/TYPOGRAPHY_INVALID/);
 const blocked=gateFidelityAssets(createFidelityAssetManifest(s.sourceSha256),
  {requiredKinds:['logo'],approval:'APPROVE_FIDELITY_ASSET_REQUIREMENTS'});
 assert.throws(()=>createFidelityArtifacts(s,{assets:blocked,approval:'APPROVE_FIDELITY_SCENE_SOURCE_EXPORT'}),/REQUIRED_ASSET_BYTES_NOT_IMPORTED/);
});
