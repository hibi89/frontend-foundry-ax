/** Local browser device checkpoint. Explicit user action only; no automatic save,
 * network transfer, raw-source execution, or replacement of original Git files.
 * Browser storage is plaintext and tied to this device/browser origin, NOT encrypted backup.
 */
import {exportLocalProject,importLocalProject} from './core.mjs';

export const DEVICE_CHECKPOINT_KEY='ffax.device-checkpoint.v1';
export const DEVICE_CHECKPOINT_SCHEMA='ffax-device-checkpoint.v1';
const MAX_ARCHIVE_CHARS=262144;
const MAX_ENVELOPE_CHARS=MAX_ARCHIVE_CHARS+1024;
const SHA256=/^[a-f0-9]{64}$/;
// Best-effort defense. Cannot reliably detect every secret; UI requires explicit owner review.
const OBVIOUS_SECRET=/(?:-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|github_pat_[A-Za-z0-9_]+|gh[pousr]_[A-Za-z0-9_]{12,}|sk-[A-Za-z0-9_-]{20,}|(?:api[_-]?key|access[_-]?token|password|client[_-]?secret)\s*[:=]\s*['"]?[A-Za-z0-9+/=_-]{8,})/i;
function storageFrom(value){
 if(!value||typeof value.getItem!=='function'||typeof value.setItem!=='function'||typeof value.removeItem!=='function')
  throw Error('DEVICE_STORAGE_UNAVAILABLE');
 return value;
}
function safeCall(fn){
 try{return fn();}
 catch(err){if(String(err?.message||'').startsWith('DEVICE_'))throw err;throw Error('DEVICE_STORAGE_UNAVAILABLE');}
}
async function digest(text,cryptoProvider){
 if(!cryptoProvider?.subtle?.digest)throw Error('DEVICE_CHECKPOINT_CRYPTO_REQUIRED');
 const bytes=await cryptoProvider.subtle.digest('SHA-256',new TextEncoder().encode(text));
 return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function validEnvelope(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||
    Object.keys(value).sort().join(',')!=='archive,savedAt,schema,sha256'||
    value.schema!==DEVICE_CHECKPOINT_SCHEMA||typeof value.archive!=='string'||
    value.archive.length<32||value.archive.length>MAX_ARCHIVE_CHARS||
    !SHA256.test(value.sha256)||typeof value.savedAt!=='string'||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.savedAt)||
    !Number.isFinite(Date.parse(value.savedAt)))throw Error('DEVICE_CHECKPOINT_CORRUPT');
 return value;
}
export async function saveDeviceCheckpoint(doc,{
 storage,consent='',cryptoProvider=globalThis.crypto,now=new Date()
}={}){
 if(consent!=='APPROVE_PLAINTEXT_DEVICE_SAVE')throw Error('DEVICE_CHECKPOINT_CONSENT_REQUIRED');
 const target=storageFrom(storage);
 const archive=exportLocalProject(doc); // strict project schema validation
 if(archive.length>MAX_ARCHIVE_CHARS)throw Error('DEVICE_CHECKPOINT_TOO_LARGE');
 if(OBVIOUS_SECRET.test(archive))throw Error('DEVICE_CHECKPOINT_POSSIBLE_SECRET');
 const savedAt=new Date(now);
 if(!Number.isFinite(savedAt.getTime()))throw Error('DEVICE_CHECKPOINT_DATE_INVALID');
 const sha256=await digest(archive,cryptoProvider);
 const record={schema:DEVICE_CHECKPOINT_SCHEMA,savedAt:savedAt.toISOString(),sha256,archive};
 // Browser localStorage setItem replaces one record atomically or throws (old remains).
 safeCall(()=>target.setItem(DEVICE_CHECKPOINT_KEY,JSON.stringify(record)));
 return Object.freeze({savedAt:record.savedAt,sha256,localOnly:true,encrypted:false,
  bytes:new TextEncoder().encode(archive).byteLength,externalRequests:0});
}
export async function loadDeviceCheckpoint({storage,approval='',cryptoProvider=globalThis.crypto}={}){
 if(approval!=='APPROVE_RESTORE_DEVICE_CHECKPOINT')throw Error('DEVICE_CHECKPOINT_RESTORE_APPROVAL_REQUIRED');
 const target=storageFrom(storage);
 const raw=safeCall(()=>target.getItem(DEVICE_CHECKPOINT_KEY));
 if(raw===null)throw Error('DEVICE_CHECKPOINT_NOT_FOUND');
 if(typeof raw!=='string'||raw.length>MAX_ENVELOPE_CHARS)throw Error('DEVICE_CHECKPOINT_CORRUPT');
 let parsed;try{parsed=JSON.parse(raw);}catch{throw Error('DEVICE_CHECKPOINT_CORRUPT');}
 const item=validEnvelope(parsed);
 if(await digest(item.archive,cryptoProvider)!==item.sha256)throw Error('DEVICE_CHECKPOINT_HASH_MISMATCH');
 if(OBVIOUS_SECRET.test(item.archive))throw Error('DEVICE_CHECKPOINT_POSSIBLE_SECRET');
 const document=importLocalProject(item.archive);
 return {document,savedAt:item.savedAt,sha256:item.sha256,localOnly:true,encrypted:false};
}
export function deleteDeviceCheckpoint({storage,approval=''}={}){
 if(approval!=='APPROVE_DELETE_DEVICE_CHECKPOINT')throw Error('DEVICE_CHECKPOINT_DELETE_APPROVAL_REQUIRED');
 const target=storageFrom(storage);
 safeCall(()=>target.removeItem(DEVICE_CHECKPOINT_KEY));
 return {deleted:true,remoteWrites:0};
}
