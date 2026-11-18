import test from 'node:test';
import assert from 'node:assert/strict';
import {mapReferenceToSource,approveMappedReference} from '../src/external-reference-to-forge.mjs';
import {validateProjectImport,exportReact} from '../src/core.mjs';
import {verifyForgeBundle} from '../src/design-forge.mjs';
const inventory={schema:'ffax.external-reference-inventory.v1',name:'owner-astrology.png',
  mime:'image/png',bytes:2048,rightsConfirmed:true,sha256:'a'.repeat(64),width:1440,height:900,
  regions:[0,1,2].map(i=>({id:'band-'+(i+1),
    bounds:{x:0,y:i*300,width:1440,height:300},
    colorHint:['#112233','#334455','#778899'][i]})),
  paletteHints:['#112233','#334455','#778899']};
const annotations=[
 {regionId:'band-1',type:'Navbar',text:'역학 달력'},
 {regionId:'band-2',type:'Hero',text:'오늘의 역학 날짜'},
 {regionId:'band-3',type:'Form',text:'생년월일시 입력'}
];
test('RF-02/03: explicit annotated screenshot yields real valid FFAX React source and SHA bundle',async()=>{
 const options={prompt:'역학달력 날짜 조회와 사주 입력을 포함한 프론트엔드를 제작해줘',approval:'APPROVE_EXTERNAL_REFERENCE_MAPPING',rightsConfirmed:true,assetDecision:'APPROVE_TYPED_FALLBACK',fallbackApproval:true};
 const result=await approveMappedReference(inventory,annotations,options);
 assert.equal(validateProjectImport(result.variant.document),true);
 assert.deepEqual(result.variant.document.components.map(x=>x.type),['Navbar','Hero','Form']);
 assert.equal(result.variant.document.reference.sha256,inventory.sha256);
 assert.ok(exportReact(result.variant.document).includes('GeneratedScreen'));
 assert.match(result.bundle.sha256,/^[a-f0-9]{64}$/);
 assert.deepEqual(await verifyForgeBundle(result.bundle),result.variant.document);
 assert.equal(result.evidence.automaticLayerRecovery,false);
 assert.equal(result.evidence.assetManifest.reference.sha256,inventory.sha256);
 assert.equal(result.bundle.manifest.externalAssetManifest.state,'ASSETS_READY_TYPED_FALLBACK_ONLY');
 assert.equal(result.variant.sourceEvidence.missingAssets,'OWNER_APPROVED_TYPED_FALLBACK_NOT_ORIGINAL_ART');
});
test('RF-02/03: missing owner approval, unsupported components, or invalid inventory are blocked',()=>{
 const options={prompt:'역학달력 날짜 조회와 사주 입력을 포함한 프론트엔드를 제작해줘',approval:'APPROVE_EXTERNAL_REFERENCE_MAPPING',rightsConfirmed:true,assetDecision:'APPROVE_TYPED_FALLBACK',fallbackApproval:true};
 assert.throws(()=>mapReferenceToSource(inventory,annotations,{...options,rightsConfirmed:false}),/EXTERNAL_REFERENCE_OWNER_APPROVAL_REQUIRED/);
 assert.throws(()=>mapReferenceToSource(inventory,[{regionId:'band-1',type:'Script',text:'bad'}],options),/EXTERNAL_REFERENCE_REGION_MAPPING_INVALID/);
 assert.throws(()=>mapReferenceToSource({...inventory,sha256:'short'},annotations,options),/EXTERNAL_REFERENCE_INVENTORY_INVALID/);
});

test('RF-02/03: original asset requirements fail closed before React generation',()=>{
 const options={prompt:'역학달력 원본 이미지와 폰트 보존한 UI를 제작해줘',
  approval:'APPROVE_EXTERNAL_REFERENCE_MAPPING',rightsConfirmed:true};
 assert.throws(()=>mapReferenceToSource(inventory,annotations,options),/ASSET_GATE_BLOCKED/);
 assert.throws(()=>mapReferenceToSource(inventory,annotations,
  {...options,assetDecision:'APPROVE_TYPED_FALLBACK',fallbackApproval:false}),/FALLBACK_APPROVAL_REQUIRED/);
 assert.throws(()=>mapReferenceToSource(inventory,annotations,
  {...options,assetDecision:'APPROVE_TYPED_FALLBACK',fallbackApproval:true,
   requiredAssetKinds:['logo']}),/ASSET_GATE_BLOCKED/);
});
