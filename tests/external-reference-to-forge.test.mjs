import test from 'node:test';
import assert from 'node:assert/strict';
import {mapReferenceToSource,approveMappedReference} from '../src/external-reference-to-forge.mjs';
import {validateProjectImport,exportReact} from '../src/core.mjs';
import {verifyForgeBundle} from '../src/design-forge.mjs';
const inventory={schema:'ffax.external-reference-inventory.v1',name:'owner-astrology.png',
  rightsConfirmed:true,sha256:'a'.repeat(64),width:1440,height:900,
  regions:[{id:'band-1'},{id:'band-2'},{id:'band-3'}],paletteHints:['#112233','#334455','#778899']};
const annotations=[
 {regionId:'band-1',type:'Navbar',text:'역학 달력'},
 {regionId:'band-2',type:'Hero',text:'오늘의 역학 날짜'},
 {regionId:'band-3',type:'Form',text:'생년월일시 입력'}
];
test('RF-02/03: explicit annotated screenshot yields real valid FFAX React source and SHA bundle',async()=>{
 const options={prompt:'역학달력 날짜 조회와 사주 입력을 포함한 프론트엔드를 제작해줘',approval:'APPROVE_EXTERNAL_REFERENCE_MAPPING',rightsConfirmed:true};
 const result=await approveMappedReference(inventory,annotations,options);
 assert.equal(validateProjectImport(result.variant.document),true);
 assert.deepEqual(result.variant.document.components.map(x=>x.type),['Navbar','Hero','Form']);
 assert.equal(result.variant.document.reference.sha256,inventory.sha256);
 assert.ok(exportReact(result.variant.document).includes('GeneratedScreen'));
 assert.match(result.bundle.sha256,/^[a-f0-9]{64}$/);
 assert.deepEqual(await verifyForgeBundle(result.bundle),result.variant.document);
 assert.equal(result.evidence.automaticLayerRecovery,false);
});
test('RF-02/03: missing owner approval, unsupported components, or invalid inventory are blocked',()=>{
 const options={prompt:'역학달력 날짜 조회와 사주 입력을 포함한 프론트엔드를 제작해줘',approval:'APPROVE_EXTERNAL_REFERENCE_MAPPING',rightsConfirmed:true};
 assert.throws(()=>mapReferenceToSource(inventory,annotations,{...options,rightsConfirmed:false}),/EXTERNAL_REFERENCE_OWNER_APPROVAL_REQUIRED/);
 assert.throws(()=>mapReferenceToSource(inventory,[{regionId:'band-1',type:'Script',text:'bad'}],options),/EXTERNAL_REFERENCE_REGION_MAPPING_INVALID/);
 assert.throws(()=>mapReferenceToSource({...inventory,sha256:'short'},annotations,options),/EXTERNAL_REFERENCE_INVENTORY_INVALID/);
});
