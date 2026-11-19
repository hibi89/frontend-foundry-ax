import test from 'node:test';
import assert from 'node:assert/strict';
import {createTypographyDraft,addOwnerTextBox} from '../src/fidelity-typography.mjs';
const base=()=>({schema:'ffax.fidelity-scene.v1',sourceSha256:'a'.repeat(64),
 width:600,height:300,revision:1,regions:[
 {id:'canvas',bounds:{x:0,y:0,width:600,height:300}},
 {id:'section-1',bounds:{x:0,y:0,width:600,height:200}},
 {id:'section-1-panel-1',bounds:{x:0,y:0,width:300,height:200}}
]});
test('FID-03 real Korean owner textbox edit is spatially anchored and explicitly not OCR',()=>{
 const scene=base(),draft=createTypographyDraft(scene);
 const edited=addOwnerTextBox(draft,scene,{approval:'APPROVE_FIDELITY_LOCAL_TEXT_LABEL',
  regionId:'section-1-panel-1',text:'오늘의 역학달력',
  bounds:{x:20,y:20,width:160,height:40}});
 assert.equal(draft.textBoxes.length,0);
 assert.equal(edited.textBoxes[0].text,'오늘의 역학달력');
 assert.equal(edited.textBoxes[0].confidence,'OWNER_SUPPLIED_NOT_OCR');
 assert.equal(edited.ocr.recognizedText,false);
 assert.equal(edited.fontFamily,'UNKNOWN');
 assert.equal(edited.remoteRequests,0);
});
test('FID-03 refuses unapproved, stale or out-of-parent text coordinates',()=>{
 const scene=base(),d=createTypographyDraft(scene),input={approval:'APPROVE_FIDELITY_LOCAL_TEXT_LABEL',
 regionId:'section-1-panel-1',text:'valid',bounds:{x:290,y:10,width:100,height:30}};
 assert.throws(()=>addOwnerTextBox(d,scene,input),/BOX_INVALID/);
 assert.throws(()=>addOwnerTextBox(d,scene,{...input,approval:'NO'}),/OWNER_APPROVAL_REQUIRED/);
 assert.throws(()=>addOwnerTextBox(d,{...scene,revision:2},
 {...input,bounds:{x:1,y:1,width:80,height:20}}),/STALE_OR_INVALID/);
 assert.throws(()=>addOwnerTextBox(d,scene,{...input,text:'<script>',bounds:{x:1,y:1,width:80,height:20}}),/BOX_INVALID/);
});
