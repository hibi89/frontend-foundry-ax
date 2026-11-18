import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {saveLocalReference,loadLocalReference} from '../src/reference-vault.mjs';
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
  await assert.rejects(saveLocalReference({root,bytes:Buffer.from('fake'),sha256:sha,rightsConfirmed:true,approval:'APPROVE_LOCAL_REFERENCE_VAULT'}),/PNG_INVALID/);
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
   assert.equal(rec.verification,'HEADER_AND_SHA_ONLY_BROWSER_DECODE_REQUIRED');
   const restored=await loadLocalReference({root,sha256:hashValue});
   assert.ok(restored.bytes.equals(bytes));
  }
 }finally{await rm(home,{recursive:true,force:true});}
});
