import test from 'node:test';
import assert from 'node:assert/strict';
import {createReferenceAssetManifest,evaluateReferenceAssetGate} from '../src/reference-assets.mjs';

const inventory=()=>({
 schema:'ffax.external-reference-inventory.v1',name:'sample.png',mime:'image/png',
 sha256:'a'.repeat(64),rightsConfirmed:true,width:600,height:300,bytes:4096,
 paletteHints:['#112233','#334455','#667788'],
 regions:[0,1,2].map((i)=>({id:'band-'+(i+1),
  bounds:{x:0,y:i*100,width:600,height:100},
  colorHint:['#112233','#334455','#667788'][i]}))
});
const labels=[{regionId:'band-1',type:'Hero',text:'Owner-confirmed title'}];
test('RF-01/02: owner-reviewed external raster manifest keeps SHA and unknown assets separate',()=>{
 const manifest=createReferenceAssetManifest(inventory(),labels,{approval:'APPROVE_EXTERNAL_REFERENCE_MAPPING'});
 assert.equal(manifest.reference.sha256,'a'.repeat(64));
 assert.equal(manifest.rights.publicRedistributionAllowed,false);
 assert.equal(manifest.ownerLabels[0].evidence,'OWNER_SUPPLIED_NOT_OCR');
 assert.equal(manifest.assets[0].mayUseAsFullScreenBackground,false);
 assert.equal(manifest.state,'STRUCTURE_OWNER_REVIEWED_ASSETS_INCOMPLETE');
 assert.ok(manifest.unresolved.some(x=>x.kind==='font'));
 assert.equal(manifest.remoteRequests,0);
});
test('RF-01/02: no silent rights grant or forged geometry',()=>{
 assert.throws(()=>createReferenceAssetManifest(inventory(),labels,{}),/OWNER_REVIEW_REQUIRED/);
 assert.throws(()=>createReferenceAssetManifest({...inventory(),rightsConfirmed:false},labels,{approval:'APPROVE_EXTERNAL_REFERENCE_MAPPING'}),/INVENTORY_INVALID/);
 assert.throws(()=>createReferenceAssetManifest(inventory(),[{...labels[0],regionId:'unknown'}],{approval:'APPROVE_EXTERNAL_REFERENCE_MAPPING'}),/ANNOTATION_INVALID/);
 const broken=inventory();broken.regions[0].bounds.width=601;
 assert.throws(()=>createReferenceAssetManifest(broken,labels,{approval:'APPROVE_EXTERNAL_REFERENCE_MAPPING'}),/REGION_INVALID/);
});

test('RF-02: image asset gate is explicit READY typed fallback vs BLOCKED_ASSET',()=>{
 const manifest=createReferenceAssetManifest(inventory(),labels,{approval:'APPROVE_EXTERNAL_REFERENCE_MAPPING'});
 const blocked=evaluateReferenceAssetGate(manifest,{decision:'REQUIRE_ORIGINAL_ASSETS',requiredAssetKinds:['logo']});
 assert.equal(blocked.state,'BLOCKED_ASSET');
 assert.equal(blocked.assetGate.automaticallyExtracted,false);
 assert.throws(()=>evaluateReferenceAssetGate(manifest,{decision:'APPROVE_TYPED_FALLBACK'}),/FALLBACK_APPROVAL_REQUIRED/);
 const ready=evaluateReferenceAssetGate(manifest,{decision:'APPROVE_TYPED_FALLBACK',fallbackApproval:true});
 assert.equal(ready.state,'ASSETS_READY_TYPED_FALLBACK_ONLY');
 assert.equal(ready.originalAppearanceEquivalent,false);
 assert.equal(ready.assetGate.originalArtworkIncluded,false);
 assert.equal(manifest.state,'STRUCTURE_OWNER_REVIEWED_ASSETS_INCOMPLETE');
 assert.equal(evaluateReferenceAssetGate(manifest,{decision:'APPROVE_TYPED_FALLBACK',
   fallbackApproval:true,requiredAssetKinds:['hero-photo']}).state,'BLOCKED_ASSET');
});
