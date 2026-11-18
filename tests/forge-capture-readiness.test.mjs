import test from 'node:test';
import assert from 'node:assert/strict';
import {makeForgeBrief,generateForgeVariants,freezeForgeVariant} from '../src/design-forge.mjs';
import {inspectCaptureReadiness} from '../scripts/forge_capture.mjs';

async function bundle(){
 const v=generateForgeVariants(makeForgeBrief({prompt:'화면 캡처 품질 검사 대상 페이지를 제작해줘'}))[0];
 return freezeForgeVariant(v,{approval:'APPROVE_FORGE_REFERENCE'});
}
test('DF-05: trusted bundle checks source, fonts, assets, viewport and warnings',async()=>{
 const value=await bundle();
 const result=inspectCaptureReadiness(value,{width:1440,height:900,dpr:1});
 assert.equal(result.schema,'ffax.capture-preflight.v1');
 assert.equal(result.visualAcceptance,'NOT_VERIFIED');
 assert.ok(result.warnings.some(w=>w.code==='FONT_AVAILABILITY_UNVERIFIED'));
 assert.equal(result.networkUse,'BLOCKED');
 const prev=structuredClone(value);
 prev.manifest.referencePng={width:1440,height:900,dpr:1,sha256:'a'.repeat(64)};
 const mismatch=inspectCaptureReadiness(prev,{width:375,height:800,dpr:2});
 assert.ok(mismatch.warnings.some(w=>w.code==='REFERENCE_VIEWPORT_MISMATCH'));
});
test('DF-05: unknown asset provider and forged external provenance fail closed',async()=>{
 const value=await bundle();
 const asset=structuredClone(value);
 asset.manifest.assets.push({path:'https://evil.example/asset.png'});
 assert.throws(()=>inspectCaptureReadiness(asset,{width:1440,height:900,dpr:1}),/ASSETS_NOT_RESOLVED/);
 const forged=structuredClone(value);
 forged.manifest.externalAssetManifest={schema:'ffax.external-asset-manifest.v1',reference:{sha256:'b'.repeat(64)},rights:{publicRedistributionAllowed:false}};
 assert.throws(()=>inspectCaptureReadiness(forged,{width:1440,height:900,dpr:1}),/EXTERNAL_MANIFEST_MISMATCH/);
 assert.throws(()=>inspectCaptureReadiness(value,{width:250,height:900,dpr:1}),/VIEWPORT_UNSUPPORTED/);
});
