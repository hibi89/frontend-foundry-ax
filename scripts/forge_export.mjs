#!/usr/bin/env node
/* Export a verified Design Forge bundle to a fresh standalone source directory.
 * Never execute generated React, modify customer repos or overwrite existing files. */
import {readFile,writeFile,mkdir,realpath,stat} from 'node:fs/promises';
import {resolve,join,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyForgeBundle} from '../src/design-forge.mjs';
const MAX_BUNDLE_SIZE=512000;
export async function exportForgeSource({bundle,out}={}){
 if(typeof bundle!=='string'||typeof out!=='string'||!bundle.trim()||!out.trim())throw Error('FORGE_EXPORT_INPUT_REQUIRED');
 const actual=await realpath(resolve(bundle));
 const info=await stat(actual);
 if(!info.isFile()||info.size<100||info.size>MAX_BUNDLE_SIZE)throw Error('FORGE_EXPORT_BUNDLE_INVALID');
 const doc=JSON.parse(await readFile(actual,'utf8'));
 await verifyForgeBundle(doc);
 if(doc.approval!=='OWNER_APPROVED_THIS_VARIANT')throw Error('FORGE_EXPORT_OWNER_APPROVAL_MISSING');
 const dest=resolve(out);
 if(dest===actual||dest===dirname(actual)||dest===resolve('.'))throw Error('FORGE_EXPORT_INVALID_DESTINATION');
 const parent=await realpath(dirname(dest));
 if(parent===dest||!basename(dest)||['.','..'].includes(basename(dest)))throw Error('FORGE_EXPORT_INVALID_DESTINATION');
 await mkdir(dest,{recursive:false,mode:0o700});
 const files={
  'GeneratedScreen.tsx':doc.manifest.reactSource,
  'design-tokens.json':JSON.stringify({schema:'ffax.design-tokens.v1',bundleSha256:doc.sha256,...doc.manifest.designTokens},null,2)+'\n',
  'source-manifest.json':JSON.stringify({schema:'ffax.export-receipt.v1',source:'FFAX_FORGE_NATIVE',bundleSha256:doc.sha256,
    variantId:doc.manifest.variantId,revision:doc.manifest.revision,
    visualReference:doc.manifest.referencePng??null,parentBundleSha256:doc.manifest.parentBundleSha256??null,
    claims:{runtimeVerified:false,visualVerified:false,licenseVerified:false,integrated:false}},null,2)+'\n',
  'README.txt':'FFAX isolated React source review export.\nImport only after checking customer application API/auth/routes, component dependencies, assets and rights.\nNo customer source was changed by this export. This is not a verified production build.\n'
 };
 for(const [file,contents]of Object.entries(files))await writeFile(join(dest,file),contents,{flag:'wx',mode:0o600});
 return {schema:'ffax.export-result.v1',directory:dest,bundleSha256:doc.sha256,files:Object.keys(files),sourceMutated:false,productionDeployed:false};
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){
 try{
  if(process.argv.length!==6||process.argv[2]!=='--bundle'||process.argv[4]!=='--out')throw Error('USAGE: node scripts/forge_export.mjs --bundle approved.json --out NEW_DIRECTORY');
  console.log(JSON.stringify({ok:true,...await exportForgeSource({bundle:process.argv[3],out:process.argv[5]})}));
 }catch(err){console.error(JSON.stringify({ok:false,error:(err?.message||'FORGE_EXPORT_FAILED').slice(0,220)}));process.exitCode=1;}
}
