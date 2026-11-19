import test from 'node:test';
import assert from 'node:assert/strict';
import {createFidelityAssetManifest,addFidelityAssetFile,gateFidelityAssets} from '../src/fidelity-assets.mjs';
const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64'));
const file=(bytes,name,type)=>({size:bytes.length,name,type,arrayBuffer:async()=>Uint8Array.from(bytes).buffer});
test('FID-04 approved local image SHA entry, missing-font gate and no false publication',async()=>{
 const manifest=createFidelityAssetManifest('a'.repeat(64));
 const selected=await addFidelityAssetFile(manifest,file(png,'소유-로고.png','image/png'),{kind:'logo',approval:'APPROVE_LOCAL_FIDELITY_ASSET'});
 assert.equal(manifest.assets.length,0);
 assert.match(selected.assets[0].sha256,/^[a-f0-9]{64}$/);
 assert.equal(selected.assets[0].publicRedistributionAllowed,false);
 assert.equal(selected.assets[0].byteStorage,'LOCAL_FILE_NOT_EMBEDDED');
 const denied=gateFidelityAssets(selected,{requiredKinds:['logo','brand-font'],approval:'APPROVE_FIDELITY_ASSET_REQUIREMENTS'});
 assert.equal(denied.state,'BLOCKED_REQUIRED_ASSETS');
 assert.deepEqual(denied.missingKinds,['brand-font']);
 const limited=gateFidelityAssets(selected,{requiredKinds:['logo'],approval:'APPROVE_FIDELITY_ASSET_REQUIREMENTS'});
 assert.equal(limited.state,'CATALOGUED_NEEDS_RUNTIME_IMPORT_AND_RIGHTS_REVIEW');
 assert.equal(limited.publishGate,'VERIFY_LICENSE_AND_IMPORT_ORIGINAL_BYTES');
 await assert.rejects(addFidelityAssetFile(selected,file(png,'copy.png','image/png'),{kind:'logo',approval:'APPROVE_LOCAL_FIDELITY_ASSET'}),/DUPLICATE_SHA/);
});
test('FID-04 refuses active SVG, mismatched font/image roles and forged rights',async()=>{
 const manifest=createFidelityAssetManifest('a'.repeat(64));
 await assert.rejects(addFidelityAssetFile(manifest,file(png,'logo.png','image/png'),{kind:'brand-font',approval:'APPROVE_LOCAL_FIDELITY_ASSET'}),/ROLE_MISMATCH/);
 await assert.rejects(addFidelityAssetFile(manifest,file(png,'logo.png','image/png'),{kind:'logo',approval:'NO'}),/OWNER_APPROVAL_REQUIRED/);
 await assert.rejects(addFidelityAssetFile(manifest,file(new TextEncoder().encode('<svg xmlns="a">'), 'bad.svg','image/svg+xml'),{kind:'logo',approval:'APPROVE_LOCAL_FIDELITY_ASSET'}),/INPUT_INVALID|UNSUPPORTED_BINARY/);
 assert.throws(()=>gateFidelityAssets(manifest,{requiredKinds:['unlisted'],approval:'APPROVE_FIDELITY_ASSET_REQUIREMENTS'}),/REQUIREMENTS_INVALID/);
});
