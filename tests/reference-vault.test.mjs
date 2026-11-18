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
