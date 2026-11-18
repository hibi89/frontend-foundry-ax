/* RF-01: Owner opt-in local reference PNG vault, immutable by content SHA.
 * Never modifies the selected source image, auto-publishes or executes it.
 */
import {createHash} from 'node:crypto';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {mkdir,readFile,writeFile,lstat} from 'node:fs/promises';

const MAX=6*1024*1024, SHA=/^[a-f0-9]{64}$/;
const MAGIC=Buffer.from([137,80,78,71,13,10,26,10]);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const defaultRoot=()=>join(homedir(),'.ffax','reference-vault');
function inspect(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<33||bytes.length>MAX||
    !bytes.subarray(0,8).equals(MAGIC)||bytes.readUInt32BE(8)!==13||
    bytes.toString('ascii',12,16)!=='IHDR')throw Error('REFERENCE_VAULT_PNG_INVALID');
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 if(width<1||height<1||width>2560||height>2200||width*height>2560*2200)
  throw Error('REFERENCE_VAULT_DIMENSIONS_INVALID');
 return {sha256:hash(bytes),bytes:bytes.length,width,height};
}
async function safeDirectory(dir){
 try{await mkdir(dir,{mode:0o700});}
 catch(e){if(e.code!=='EEXIST')throw e;}
 const stat=await lstat(dir);
 if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('REFERENCE_VAULT_UNSAFE_DIRECTORY');
}
async function directory(root){
 const path=root||defaultRoot(),parent=join(path,'..');
 // For the default path, fail closed if ~/.ffax was replaced by a symlink.
 await safeDirectory(parent);await safeDirectory(path);
 return path;
}
async function checkedRead(root,sha256){
 if(!SHA.test(sha256||''))throw Error('REFERENCE_VAULT_SHA_INVALID');
 const file=join(root,sha256+'.png');
 const st=await lstat(file);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size>MAX)
  throw Error('REFERENCE_VAULT_UNSAFE_FILE');
 const bytes=await readFile(file),meta=inspect(bytes);
 if(meta.sha256!==sha256)throw Error('REFERENCE_VAULT_CHANGED_OR_CORRUPT');
 return {bytes,meta};
}
export async function saveLocalReference({bytes,sha256,rightsConfirmed,approval,root}={}){
 if(approval!=='APPROVE_LOCAL_REFERENCE_VAULT'||rightsConfirmed!==true)
  throw Error('REFERENCE_VAULT_OWNER_APPROVAL_REQUIRED');
 const meta=inspect(bytes);
 if(!SHA.test(sha256||'')||sha256!==meta.sha256)throw Error('REFERENCE_VAULT_SHA_MISMATCH');
 const dir=await directory(root);
 const file=join(dir,sha256+'.png');
 try{await writeFile(file,bytes,{flag:'wx',mode:0o600});}
 catch(err){if(err.code!=='EEXIST')throw err;}
 // Existing files are neither replaced nor trusted; every load re-hashes original bytes.
 const saved=await checkedRead(dir,sha256);
 if(saved.bytes.length!==bytes.length||!saved.bytes.equals(bytes))
  throw Error('REFERENCE_VAULT_CONTENT_CONFLICT');
 return {schema:'ffax.local-reference-receipt.v1',sha256,bytes:meta.bytes,width:meta.width,
  height:meta.height,mime:'image/png',storage:'LOCAL_OWNER_OPT_IN_ONLY',immutable:true,
  rights:'OWNER_ASSERTED_NOT_VERIFIED',publicRedistributionAllowed:false,
  executionAllowed:false,networkRequests:0};
}
export async function loadLocalReference({sha256,root}={}){
 if(!SHA.test(sha256||''))throw Error('REFERENCE_VAULT_SHA_INVALID');
 const dir=await directory(root);
 const saved=await checkedRead(dir,sha256);
 return {bytes:Buffer.from(saved.bytes),receipt:{
  schema:'ffax.local-reference-receipt.v1',...saved.meta,mime:'image/png',
  storage:'LOCAL_OWNER_OPT_IN_ONLY',immutable:true,rights:'OWNER_ASSERTED_NOT_VERIFIED',
  publicRedistributionAllowed:false,executionAllowed:false,networkRequests:0
 }};
}
