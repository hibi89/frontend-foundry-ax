import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm,mkdir,symlink,lstat,link} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {saveLocalReference,loadLocalReference,inspectLocalReference,createV3ReferenceReceipt} from '../src/reference-vault.mjs';
const sample=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');
const sha=createHash('sha256').update(sample).digest('hex');
test('RF-01 immutable local PNG save, exact SHA reload, repeat idempotently',async()=>{
 const home=await mkdtemp(join(tmpdir(),'ffax-vault-')),root=join(home,'safe');
 try{
  const input={root,bytes:sample,sha256:sha,approval:'APPROVE_LOCAL_REFERENCE_VAULT',rightsConfirmed:true};
  const receipt=await saveLocalReference(input);
  assert.equal(receipt.sha256,sha);assert.equal(receipt.rights,'OWNER_ASSERTED_NOT_VERIFIED');
  await saveLocalReference(input);
  const saved=await loadLocalReference({root,sha256:sha});
  assert.ok(saved.bytes.equals(sample));
  assert.equal(saved.receipt.networkRequests,0);
  assert.equal(saved.receipt.immutable,true);
 }finally{await rm(home,{recursive:true,force:true});}
});
test('RF-01 refuses absent approval, SHA mismatch, forged bytes and later tampering',async()=>{
 const home=await mkdtemp(join(tmpdir(),'ffax-vault-')),root=join(home,'safe');
 try{
  await assert.rejects(saveLocalReference({root,bytes:sample,sha256:sha}),/OWNER_APPROVAL_REQUIRED/);
  await assert.rejects(saveLocalReference({root,bytes:sample,sha256:'b'.repeat(64),rightsConfirmed:true,approval:'APPROVE_LOCAL_REFERENCE_VAULT'}),/SHA_MISMATCH/);
  await saveLocalReference({root,bytes:sample,sha256:sha,rightsConfirmed:true,approval:'APPROVE_LOCAL_REFERENCE_VAULT'});
  await writeFile(join(root,sha+'.png'),Buffer.concat([sample,Buffer.from([0])]));
  await assert.rejects(loadLocalReference({root,sha256:sha}),/CHANGED_OR_CORRUPT/);
  await assert.rejects(saveLocalReference({root,bytes:sample,sha256:sha,rightsConfirmed:true,approval:'APPROVE_LOCAL_REFERENCE_VAULT'}),/CHANGED_OR_CORRUPT/);
 }finally{await rm(home,{recursive:true,force:true});}
});
test('RF-01 refuses symlink reference vault and invalid binary data',async()=>{
 const home=await mkdtemp(join(tmpdir(),'ffax-vault-')),root=join(home,'safe');
 try{
  await assert.rejects(saveLocalReference({root,bytes:Buffer.from('fake'),sha256:sha,rightsConfirmed:true,approval:'APPROVE_LOCAL_REFERENCE_VAULT'}),/IMAGE_INVALID/);
  await assert.rejects(loadLocalReference({root,sha256:'../bad'}),/SHA_INVALID/);
 }finally{await rm(home,{recursive:true,force:true});}
});

test('RF-01 stores and verifies SHA-addressed JPEG and WebP reference headers without executing them',async()=>{
 const home=await mkdtemp(join(tmpdir(),'ffax-vault-')),root=join(home,'safe');
 const jpeg=Buffer.from([0xff,0xd8,0xff,0xe0,0x00,0x10,
  ...Buffer.alloc(14),0xff,0xc0,0x00,0x11,0x08,0x00,0x02,0x00,0x03,0x03,
  0x01,0x11,0x00,0x02,0x11,0x00,0x03,0x11,0x00,0xff,0xda,0x00,0x02,0xff,0xd9]);
 const webp=Buffer.alloc(34);
 webp.write('RIFF',0,'ascii');webp.writeUInt32LE(26,4);webp.write('WEBP',8,'ascii');
 webp.write('VP8X',12,'ascii');webp.writeUInt32LE(10,16);
 webp.writeUIntLE(2,24,3);webp.writeUIntLE(1,27,3);
 try{
  for(const [bytes,mime] of [[jpeg,'image/jpeg'],[webp,'image/webp']]){
   const hashValue=createHash('sha256').update(bytes).digest('hex');
   const rec=await saveLocalReference({root,bytes,sha256:hashValue,
    rightsConfirmed:true,approval:'APPROVE_LOCAL_REFERENCE_VAULT'});
   assert.equal(rec.mime,mime);assert.equal(rec.rightsScope,'REFERENCE_ONLY');
   assert.equal(rec.width,3);assert.equal(rec.height,2);
   assert.equal(rec.verification,'HEADER_AND_SHA_ONLY_BROWSER_DECODE_REQUIRED');
   const restored=await loadLocalReference({root,sha256:hashValue});
   assert.ok(restored.bytes.equals(bytes));
  }
 }finally{await rm(home,{recursive:true,force:true});}
});

test('P2-01 vault rejects symlinked parent before any SHA-named customer byte write',async(t)=>{
 const home=await mkdtemp(join(tmpdir(),'ffax-vault-p2-link-'));
 const target=join(home,'safe-target'),alias=join(home,'alias');
 try{
  await mkdir(target);
  try{await symlink(target,alias,process.platform==='win32'?'junction':'dir');}
  catch(e){
   if(['EPERM','ENOTSUP','EACCES'].includes(e.code)){t.skip('OS denies test symlink creation');return;}
   throw e;
  }
  const root=join(alias,'vault');
  const options={root,bytes:sample,sha256:sha,
   rightsConfirmed:true,approval:'APPROVE_LOCAL_REFERENCE_VAULT'};
  await assert.rejects(saveLocalReference(options),/UNSAFE_ANCESTOR/);
  await assert.rejects(loadLocalReference({root,sha256:sha}),/UNSAFE_ANCESTOR/);
  await assert.rejects(lstat(join(target,'vault')),e=>e.code==='ENOENT');
  // A direct symlink to the purported vault is equally unsafe.
  await assert.rejects(saveLocalReference({...options,root:alias}),/UNSAFE_ANCESTOR/);
 }finally{await rm(home,{recursive:true,force:true});}
});

test('P2-01 vault refuses a SHA-matching symlink file even when target bytes are valid',async(t)=>{
 const home=await mkdtemp(join(tmpdir(),'ffax-vault-p2-filelink-')),root=join(home,'vault');
 try{
  await mkdir(root);
  const external=join(home,'external-reference.png');
  await writeFile(external,sample);
  try{await symlink(external,join(root,sha+'.png'),'file');}
  catch(e){
   if(['EPERM','ENOTSUP','EACCES'].includes(e.code)){t.skip('OS denies file symlink creation');return;}
   throw e;
  }
  await assert.rejects(loadLocalReference({root,sha256:sha}),/UNSAFE_FILE/);
  await assert.rejects(saveLocalReference({root,bytes:sample,sha256:sha,
   rightsConfirmed:true,approval:'APPROVE_LOCAL_REFERENCE_VAULT'}),/UNSAFE_FILE/);
 }finally{await rm(home,{recursive:true,force:true});}
});
test('P2-01 vault refuses SHA-matching hardlinks to another local owner file',async(t)=>{
 const home=await mkdtemp(join(tmpdir(),'ffax-vault-p2-hardlink-')),root=join(home,'vault');
 try{
  await mkdir(root);
  const external=join(home,'external-reference.png');
  await writeFile(external,sample);
  try{await link(external,join(root,sha+'.png'));}
  catch(e){
   if(['EPERM','ENOTSUP','EACCES','EXDEV'].includes(e.code)){t.skip('OS denies hardlink creation');return;}
   throw e;
  }
  await assert.rejects(loadLocalReference({root,sha256:sha}),/UNSAFE_FILE/);
  await assert.rejects(saveLocalReference({root,bytes:sample,sha256:sha,
   rightsConfirmed:true,approval:'APPROVE_LOCAL_REFERENCE_VAULT'}),/UNSAFE_FILE/);
 }finally{await rm(home,{recursive:true,force:true});}
});

test('P2-01 exact 6MiB SHA image loads through bounded descriptor and larger file fails closed',async()=>{
 const MAX=6*1024*1024;
 const home=await mkdtemp(join(tmpdir(),'ffax-vault-p2-bound-')),root=join(home,'vault');
 try{
  // Structural PNG header only; browser decoding remains a separate P2 gate.
  const bytes=Buffer.alloc(MAX);
  sample.copy(bytes);
  const contentSha=createHash('sha256').update(bytes).digest('hex');
  await saveLocalReference({root,bytes,sha256:contentSha,
   rightsConfirmed:true,approval:'APPROVE_LOCAL_REFERENCE_VAULT'});
  const reloaded=await loadLocalReference({root,sha256:contentSha});
  assert.equal(reloaded.bytes.length,MAX);
  assert.equal(reloaded.receipt.verification,'HEADER_AND_SHA_ONLY_BROWSER_DECODE_REQUIRED');
  assert.ok(reloaded.bytes.equals(bytes));
  await writeFile(join(root,contentSha+'.png'),Buffer.concat([bytes,Buffer.from([1])]));
  await assert.rejects(loadLocalReference({root,sha256:contentSha}),/UNSAFE_FILE/);
 }finally{await rm(home,{recursive:true,force:true});}
});

function exifJpeg(orientation,{width=800,height=600,endianness='II',badIfd=false}={}){
 const tiff=Buffer.alloc(26),le=endianness==='II';
 tiff.write(endianness,0,'ascii');
 const u16=(v,p)=>le?tiff.writeUInt16LE(v,p):tiff.writeUInt16BE(v,p);
 const u32=(v,p)=>le?tiff.writeUInt32LE(v,p):tiff.writeUInt32BE(v,p);
 u16(42,2);u32(badIfd?0xfffffff0:8,4);
 u16(1,8);u16(0x0112,10);u16(3,12);u32(1,14);u16(orientation,18);
 const payload=Buffer.concat([Buffer.from('Exif\\0\\0','ascii'),tiff]);
 const app1=Buffer.concat([Buffer.from([0xff,0xe1,(payload.length+2)>>8,(payload.length+2)&255]),payload]);
 const sof=Buffer.from([0xff,0xc0,0,17,8,height>>8,height&255,width>>8,width&255,
  3,1,0x11,0,2,0x11,0,3,0x11,0]);
 return Buffer.concat([Buffer.from([0xff,0xd8]),app1,sof,Buffer.from([0xff,0xda,0,2,0xff,0xd9])]);
}
test('P2-02 JPEG EXIF 90/270 rotations produce browser-facing display dimensions and same immutable SHA',async()=>{
 const home=await mkdtemp(join(tmpdir(),'ffax-vault-p2-exif-')),root=join(home,'vault');
 try{
  for(const endianness of ['II','MM'])for(const orientation of [1,2,3,4,5,6,7,8]){
   const bytes=exifJpeg(orientation,{endianness});
   const info=inspectLocalReference(bytes);
   const rotated=orientation>=5;
   assert.equal(info.width,rotated?600:800);
   assert.equal(info.height,rotated?800:600);
   assert.equal(info.mime,'image/jpeg');
   const receipt=await saveLocalReference({root,bytes,sha256:info.sha256,
    rightsConfirmed:true,approval:'APPROVE_LOCAL_REFERENCE_VAULT'});
   assert.equal(receipt.width,info.width);
   assert.equal(receipt.height,info.height);
   const loaded=await loadLocalReference({root,sha256:info.sha256});
   assert.deepEqual(loaded.bytes,bytes);
   const v3=createV3ReferenceReceipt(loaded.receipt,{
    approval:'APPROVE_LOCAL_REFERENCE_RECEIPT',
    sourceType:'OWNER_GENERATED',rightsBasis:'OWNER_CREATED',
    dpr:2,projectLabel:'EXIF rotated synthetic'});
   assert.equal(v3.viewport.cssWidth,info.width/2);
   assert.equal(v3.viewport.cssHeight,info.height/2);
   assert.equal(v3.original.sha256,info.sha256);
   assert.equal(v3.provenance.publicRedistributionAllowed,false);
  }
 }finally{await rm(home,{recursive:true,force:true});}
});
test('P2-02 JPEG invalid orientation metadata fails closed without falsely verifying a browser image',()=>{
 for(const bad of [0,9])assert.throws(()=>inspectLocalReference(exifJpeg(bad)),/EXIF_INVALID/);
 assert.throws(()=>inspectLocalReference(exifJpeg(6,{badIfd:true})),/EXIF_INVALID/);
 // Header inspection never substitutes for actual browser image decode.
 const info=inspectLocalReference(exifJpeg(6));
 assert.equal(info.verification,'HEADER_AND_SHA_ONLY_BROWSER_DECODE_REQUIRED');
});
