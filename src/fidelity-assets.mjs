/* FID-04: browser-only local font/image asset receipt and required-kind gate.
 * Never persists bytes, publishes third-party art, or claims rights verification.
 */
const SHA=/^[a-f0-9]{64}$/;
const kinds=new Set(['logo','hero-photo','illustration','brand-font','icon']);
const imageKinds=new Set(['logo','hero-photo','illustration','icon']);
const isImage=(mime)=>['image/png','image/jpeg','image/webp'].includes(mime);
function inspectAsset(bytes){
 const byteLength=bytes.length;
 const starts=(p)=>p.every((v,i)=>bytes[i]===v);
 if(starts([137,80,78,71,13,10,26,10]))return 'image/png';
 if(starts([0xff,0xd8,0xff])&&bytes[byteLength-2]===0xff&&bytes[byteLength-1]===0xd9)return 'image/jpeg';
 const ascii=(start,end)=>String.fromCharCode(...bytes.subarray(start,end));
 if(ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP'&&
    new DataView(bytes.buffer,bytes.byteOffset+4,4).getUint32(0,true)===byteLength-8)return 'image/webp';
 if(ascii(0,4)==='wOFF')return 'font/woff';
 if(ascii(0,4)==='wOF2')return 'font/woff2';
 if(ascii(0,4)==='OTTO')return 'font/otf';
 if(starts([0,1,0,0]))return 'font/ttf';
 throw Error('FIDELITY_ASSET_UNSUPPORTED_BINARY');
}
export function createFidelityAssetManifest(referenceSha256){
 if(!SHA.test(referenceSha256||''))throw Error('FIDELITY_ASSET_REFERENCE_INVALID');
 return {schema:'ffax.fidelity-local-assets.v1',referenceSha256,assets:[],
  byteRetention:'NOT_STORED_IN_MANIFEST',rightsVerification:'OWNER_ASSERTION_ONLY',
  externalRequests:0,sourceModified:false,
  requiredKinds:[],missingKinds:[],state:'NO_ASSETS_SUPPLIED',
  publishGate:'VERIFY_LICENSE_AND_IMPORT_ORIGINAL_BYTES'};
}
export async function addFidelityAssetFile(manifest,file,{kind,approval,rightsBasis='OWNER_ASSERTED'}={}){
 if(approval!=='APPROVE_LOCAL_FIDELITY_ASSET'||!['OWNER_ASSERTED','LICENSED_OWNER_ASSERTION'].includes(rightsBasis))
  throw Error('FIDELITY_ASSET_OWNER_APPROVAL_REQUIRED');
 if(manifest?.schema!=='ffax.fidelity-local-assets.v1'||!SHA.test(manifest.referenceSha256||'')||
    !Array.isArray(manifest.assets)||manifest.assets.length>=24)
  throw Error('FIDELITY_ASSET_MANIFEST_INVALID');
 if(!kinds.has(kind)||!file||typeof file.name!=='string'||file.name.length<1||file.name.length>100||
    /[/\\:<>|\u0000-\u001f\u007f]/u.test(file.name)||
    !Number.isInteger(file.size)||file.size<33||file.size>4*1024*1024||
    typeof file.arrayBuffer!=='function'||!globalThis.crypto?.subtle)
  throw Error('FIDELITY_ASSET_INPUT_INVALID');
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(bytes.length!==file.size)throw Error('FIDELITY_ASSET_BYTES_CHANGED');
 const mime=inspectAsset(bytes);
 if((imageKinds.has(kind)&&!isImage(mime))||(kind==='brand-font'&&isImage(mime)))
  throw Error('FIDELITY_ASSET_ROLE_MISMATCH');
 // File.type may be empty for WOFF2/OTF; if present it must match the detected MIME.
 const permitted=new Set([mime,'application/octet-stream']);
 if(mime==='font/woff')permitted.add('application/font-woff');
 if(mime==='font/woff2')permitted.add('application/font-woff2');
 if(mime==='font/ttf')permitted.add('application/x-font-ttf');
 if(mime==='font/otf')permitted.add('application/x-font-otf');
 if(file.type&&!permitted.has(file.type))throw Error('FIDELITY_ASSET_MIME_MISMATCH');
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 const sha256=[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
 if(manifest.assets.some(x=>x.sha256===sha256))throw Error('FIDELITY_ASSET_DUPLICATE_SHA');
 const next=structuredClone(manifest);
 next.assets.push({id:'asset-'+(next.assets.length+1),kind,mime,sha256,name:file.name,
  byteLength:bytes.length,rightsBasis,rightsStatus:'OWNER_ASSERTED_NOT_VERIFIED',
  remoteRequests:0,publicRedistributionAllowed:false,byteStorage:'LOCAL_FILE_NOT_EMBEDDED'});
 next.state='LOCAL_ASSETS_CATALOGUED_NOT_IMPORTED';
 return next;
}
export function gateFidelityAssets(manifest,{requiredKinds=[],approval}={}){
 if(approval!=='APPROVE_FIDELITY_ASSET_REQUIREMENTS')throw Error('FIDELITY_ASSET_REQUIREMENTS_OWNER_APPROVAL_REQUIRED');
 if(manifest?.schema!=='ffax.fidelity-local-assets.v1'||!SHA.test(manifest.referenceSha256||'')||
    !Array.isArray(manifest.assets)||!Array.isArray(requiredKinds)||
    requiredKinds.length>kinds.size||requiredKinds.some(k=>!kinds.has(k))||
    new Set(requiredKinds).size!==requiredKinds.length)
  throw Error('FIDELITY_ASSET_REQUIREMENTS_INVALID');
 const next=structuredClone(manifest),present=new Set(next.assets.map(a=>a.kind));
 next.requiredKinds=[...requiredKinds];
 next.missingKinds=requiredKinds.filter(k=>!present.has(k));
 next.state=next.missingKinds.length?'BLOCKED_REQUIRED_ASSETS':'CATALOGUED_NEEDS_RUNTIME_IMPORT_AND_RIGHTS_REVIEW';
 next.publishGate=next.missingKinds.length?'BLOCKED_MISSING_REQUIRED_ASSETS':'VERIFY_LICENSE_AND_IMPORT_ORIGINAL_BYTES';
 return next;
}
