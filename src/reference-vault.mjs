/* RF-01: explicit owner opt-in, content-addressed local PNG/JPEG/WebP reference vault.
 * Raw bytes are neither decoded nor executed on the server. Browser performs
 * image decoding before upload and on re-import; all fetches are localhost.
 * Existing SHA-named PNG entries are retained and readable without migration.
 */
import {createHash} from 'node:crypto';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {mkdir,readFile,writeFile,lstat} from 'node:fs/promises';
const MAX=6*1024*1024,SHA=/^[a-f0-9]{64}$/;
const PNG=Buffer.from([137,80,78,71,13,10,26,10]);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const defaultRoot=()=>join(homedir(),'.ffax','reference-vault');
const FORMAT={
 'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp'
};
function dimensions(width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||
    width>10000||height>10000||width*height>32000000)
  throw Error('REFERENCE_VAULT_DIMENSIONS_INVALID');
 return {width,height};
}
function inspectJPEG(b){
 if(b.length<40||b[0]!==0xff||b[1]!==0xd8||b[b.length-2]!==0xff||b[b.length-1]!==0xd9)
  throw Error('REFERENCE_VAULT_JPEG_INVALID');
 let i=2;
 while(i<b.length-8){
  if(b[i++]!==0xff)throw Error('REFERENCE_VAULT_JPEG_INVALID');
  while(i<b.length&&b[i]===0xff)i++;
  const marker=b[i++];
  if(marker===0xd9||marker===0xda)break;
  if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
  if(i+2>b.length)break;
  const size=b.readUInt16BE(i);
  if(size<2||i+size>b.length)throw Error('REFERENCE_VAULT_JPEG_INVALID');
  if(([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]).includes(marker)){
   if(size<7)throw Error('REFERENCE_VAULT_JPEG_INVALID');
   return dimensions(b.readUInt16BE(i+3),b.readUInt16BE(i+1));
  }
  i+=size;
 }
 throw Error('REFERENCE_VAULT_JPEG_DIMENSIONS_UNAVAILABLE');
}
function inspectWEBP(b){
 if(b.length<34||b.toString('ascii',0,4)!=='RIFF'||
    b.readUInt32LE(4)!==b.length-8||b.toString('ascii',8,12)!=='WEBP')
  throw Error('REFERENCE_VAULT_WEBP_INVALID');
 const chunk=b.toString('ascii',12,16),size=b.readUInt32LE(16);
 if(size<5||20+size>b.length)throw Error('REFERENCE_VAULT_WEBP_INVALID');
 if(chunk==='VP8X'&&size>=10)
  return dimensions(1+b.readUIntLE(24,3),1+b.readUIntLE(27,3));
 if(chunk==='VP8L'&&b[20]===0x2f){
  const width=1+b[21]+((b[22]&0x3f)<<8);
  const height=1+(b[22]>>6)+(b[23]<<2)+((b[24]&0x0f)<<10);
  return dimensions(width,height);
 }
 if(chunk==='VP8 '&&size>=10&&b[23]===0x9d&&b[24]===0x01&&b[25]===0x2a)
  return dimensions(b.readUInt16LE(26)&0x3fff,b.readUInt16LE(28)&0x3fff);
 throw Error('REFERENCE_VAULT_WEBP_DIMENSIONS_UNAVAILABLE');
}
export function inspectLocalReference(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<33||bytes.length>MAX)
  throw Error('REFERENCE_VAULT_IMAGE_INVALID');
 let mime,dim;
 if(bytes.subarray(0,8).equals(PNG)){
  if(bytes.readUInt32BE(8)!==13||bytes.toString('ascii',12,16)!=='IHDR')
   throw Error('REFERENCE_VAULT_PNG_INVALID');
  mime='image/png';dim=dimensions(bytes.readUInt32BE(16),bytes.readUInt32BE(20));
 }else if(bytes[0]===0xff&&bytes[1]===0xd8){
  mime='image/jpeg';dim=inspectJPEG(bytes);
 }else if(bytes.toString('ascii',0,4)==='RIFF'){
  mime='image/webp';dim=inspectWEBP(bytes);
 }else throw Error('REFERENCE_VAULT_IMAGE_INVALID');
 return {sha256:hash(bytes),bytes:bytes.length,...dim,mime,
  verification:'HEADER_AND_SHA_ONLY_BROWSER_DECODE_REQUIRED'};
}
async function safeDirectory(dir){
 try{await mkdir(dir,{mode:0o700});}catch(e){if(e.code!=='EEXIST')throw e;}
 const stat=await lstat(dir);
 if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('REFERENCE_VAULT_UNSAFE_DIRECTORY');
}
async function directory(root){
 const path=root||defaultRoot();
 await safeDirectory(join(path,'..'));await safeDirectory(path);
 return path;
}
async function readExact(root,sha256,extension){
 const path=join(root,sha256+extension);
 let stat;
 try{stat=await lstat(path);}catch(e){if(e.code==='ENOENT')return null;throw e;}
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size>MAX)
  throw Error('REFERENCE_VAULT_UNSAFE_FILE');
 const bytes=await readFile(path),meta=inspectLocalReference(bytes);
 if(meta.sha256!==sha256||FORMAT[meta.mime]!==extension)
  throw Error('REFERENCE_VAULT_CHANGED_OR_CORRUPT');
 return {bytes,meta};
}
async function checkedRead(root,sha256){
 if(!SHA.test(sha256||''))throw Error('REFERENCE_VAULT_SHA_INVALID');
 let found=null;
 for(const ext of Object.values(FORMAT)){
  const next=await readExact(root,sha256,ext);
  if(next){
   if(found)throw Error('REFERENCE_VAULT_DUPLICATE_SHA_FILES');
   found=next;
  }
 }
 if(!found)throw Error('REFERENCE_VAULT_NOT_FOUND');
 return found;
}
function receipt(meta){
 return {schema:'ffax.local-reference-receipt.v1',...meta,
  storage:'LOCAL_OWNER_OPT_IN_ONLY',immutable:true,
  rights:'OWNER_ASSERTED_NOT_VERIFIED',rightsScope:'REFERENCE_ONLY',
  publicRedistributionAllowed:false,executionAllowed:false,networkRequests:0};
}
export async function saveLocalReference({bytes,sha256,rightsConfirmed,approval,root}={}){
 if(approval!=='APPROVE_LOCAL_REFERENCE_VAULT'||rightsConfirmed!==true)
  throw Error('REFERENCE_VAULT_OWNER_APPROVAL_REQUIRED');
 const meta=inspectLocalReference(bytes);
 if(!SHA.test(sha256||'')||sha256!==meta.sha256)
  throw Error('REFERENCE_VAULT_SHA_MISMATCH');
 const dir=await directory(root),file=join(dir,sha256+FORMAT[meta.mime]);
 try{await writeFile(file,bytes,{flag:'wx',mode:0o600});}
 catch(e){if(e.code!=='EEXIST')throw e;}
 const saved=await checkedRead(dir,sha256);
 if(!saved.bytes.equals(bytes))throw Error('REFERENCE_VAULT_CONTENT_CONFLICT');
 return receipt(meta);
}
export async function loadLocalReference({sha256,root}={}){
 if(!SHA.test(sha256||''))throw Error('REFERENCE_VAULT_SHA_INVALID');
 const dir=await directory(root),saved=await checkedRead(dir,sha256);
 return {bytes:Buffer.from(saved.bytes),receipt:receipt(saved.meta)};
}
