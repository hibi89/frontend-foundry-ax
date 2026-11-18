import test from 'node:test';
import assert from 'node:assert/strict';
import {makeForgeBrief,generateForgeVariants,freezeForgeVariant} from '../src/design-forge.mjs';
import {inspectCaptureReadiness,validateCaptureOutputDestination} from '../scripts/forge_capture.mjs';
import {join,resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {mkdtemp,symlink,rm} from 'node:fs/promises';

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

test('P2: capture output never enters source tree (including Windows path semantics)',async()=>{
 const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
 await assert.rejects(validateCaptureOutputDestination(join(projectRoot,'src','capture-attempt')),
  /FORGE_OUTPUT_CONFLICT/);
 const outside=join(tmpdir(),'ffax-capture-guard-output-new');
 assert.equal(await validateCaptureOutputDestination(outside),resolve(outside));
 // On Unix, ensure a safe-looking path through a symlink cannot reach source.
 if(process.platform!=='win32'){
  const temp=await mkdtemp(join(tmpdir(),'ffax-capture-guard-'));
  try{
   await symlink(join(projectRoot,'src'),join(temp,'alias'),'dir');
   await assert.rejects(validateCaptureOutputDestination(join(temp,'alias','capture-attempt')),
    /FORGE_OUTPUT_CONFLICT/);
  }finally{await rm(temp,{recursive:true,force:true});}
 }
});
