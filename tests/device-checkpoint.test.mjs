import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBrief,newDocument,applyCommand,exportLocalProject} from '../src/core.mjs';
import {DEVICE_CHECKPOINT_KEY,saveDeviceCheckpoint,loadDeviceCheckpoint,deleteDeviceCheckpoint} from '../src/device-checkpoint.mjs';

function fakeStorage(){
 const values=new Map();let writes=0;
 return {
  values,get writes(){return writes;},
  getItem:k=>values.has(k)?values.get(k):null,
  setItem(k,v){writes++;values.set(k,v);},
  removeItem(k){values.delete(k);}
 };
}
const make=()=>newDocument(buildBrief('한국어 디자인 프로젝트를 만들고 기존 결제 API 유지해줘'));
const consent='APPROVE_PLAINTEXT_DEVICE_SAVE';
const restore='APPROVE_RESTORE_DEVICE_CHECKPOINT';
test('device checkpoint saves only on explicit consent, then restores exact local project',async()=>{
 const storage=fakeStorage(),doc=applyCommand(make(),{kind:'update',id:'node-1',prop:'text',value:'로컬 검수 제목'});
 await assert.rejects(saveDeviceCheckpoint(doc,{storage}),/DEVICE_CHECKPOINT_CONSENT_REQUIRED/);
 assert.equal(storage.writes,0);assert.equal(storage.getItem(DEVICE_CHECKPOINT_KEY),null);
 const receipt=await saveDeviceCheckpoint(doc,{storage,consent,now:'2026-11-14T01:02:03.000Z'});
 assert.equal(receipt.savedAt,'2026-11-14T01:02:03.000Z');assert.equal(receipt.encrypted,false);
 assert.equal(receipt.externalRequests,0);assert.match(receipt.sha256,/^[a-f0-9]{64}$/);
 await assert.rejects(loadDeviceCheckpoint({storage}),/DEVICE_CHECKPOINT_RESTORE_APPROVAL_REQUIRED/);
 const loaded=await loadDeviceCheckpoint({storage,approval:restore});
 assert.deepEqual(loaded.document,doc);
 assert.notEqual(loaded.document,doc);assert.equal(loaded.encrypted,false);
 assert.equal(storage.writes,1);
});
test('two explicit saves replace only FFAX device record; same document produces stable digest',async()=>{
 const storage=fakeStorage(),before=make();
 const one=await saveDeviceCheckpoint(before,{storage,consent});
 const same=await saveDeviceCheckpoint(before,{storage,consent});
 assert.equal(one.sha256,same.sha256);
 const updated=applyCommand(before,{kind:'update',id:'node-1',prop:'text',value:'지속된 편집'});
 const two=await saveDeviceCheckpoint(updated,{storage,consent});
 assert.notEqual(two.sha256,one.sha256);
 assert.deepEqual((await loadDeviceCheckpoint({storage,approval:restore})).document,updated);
 assert.equal(storage.values.size,1);
});
test('corrupted body, changed manifest, forged schema, unknown project key all reject restore',async()=>{
 const storage=fakeStorage(),original=make();
 await saveDeviceCheckpoint(original,{storage,consent});
 const good=storage.getItem(DEVICE_CHECKPOINT_KEY);
 const record=JSON.parse(good);
 record.archive=record.archive.replace(original.title,'tampered');
 storage.setItem(DEVICE_CHECKPOINT_KEY,JSON.stringify(record));
 await assert.rejects(loadDeviceCheckpoint({storage,approval:restore}),/DEVICE_CHECKPOINT_HASH_MISMATCH/);
 storage.setItem(DEVICE_CHECKPOINT_KEY,'{not json');
 await assert.rejects(loadDeviceCheckpoint({storage,approval:restore}),/DEVICE_CHECKPOINT_CORRUPT/);
 record.schema='wrong';storage.setItem(DEVICE_CHECKPOINT_KEY,JSON.stringify(record));
 await assert.rejects(loadDeviceCheckpoint({storage,approval:restore}),/DEVICE_CHECKPOINT_CORRUPT/);
 record.schema='ffax-device-checkpoint.v1';record.archive=exportLocalProject(original);record.extra='unexpected';
 storage.setItem(DEVICE_CHECKPOINT_KEY,JSON.stringify(record));
 await assert.rejects(loadDeviceCheckpoint({storage,approval:restore}),/DEVICE_CHECKPOINT_CORRUPT/);
 storage.setItem(DEVICE_CHECKPOINT_KEY,good);
 assert.deepEqual((await loadDeviceCheckpoint({storage,approval:restore})).document,original);
});
test('possible secrets are blocked before writing a device checkpoint',async()=>{
 const storage=fakeStorage(),doc=make();
 const compromised=applyCommand(doc,{kind:'update',id:'node-1',prop:'text',value:'password=supersecrettoken123'});
 await assert.rejects(saveDeviceCheckpoint(compromised,{storage,consent}),/DEVICE_CHECKPOINT_POSSIBLE_SECRET/);
 assert.equal(storage.writes,0);
});
test('explicit deletion cannot run without approval; delete is local and absent restore fails',async()=>{
 const storage=fakeStorage();await saveDeviceCheckpoint(make(),{storage,consent});
 assert.throws(()=>deleteDeviceCheckpoint({storage}),/DEVICE_CHECKPOINT_DELETE_APPROVAL_REQUIRED/);
 assert.ok(storage.getItem(DEVICE_CHECKPOINT_KEY));
 assert.deepEqual(deleteDeviceCheckpoint({storage,approval:'APPROVE_DELETE_DEVICE_CHECKPOINT'}),{deleted:true,remoteWrites:0});
 assert.equal(storage.getItem(DEVICE_CHECKPOINT_KEY),null);
 await assert.rejects(loadDeviceCheckpoint({storage,approval:restore}),/DEVICE_CHECKPOINT_NOT_FOUND/);
});
test('storage unavailable/quota failure cannot falsely claim saved state or lose prior checkpoint',async()=>{
 const base=fakeStorage();await saveDeviceCheckpoint(make(),{storage:base,consent});
 const before=base.getItem(DEVICE_CHECKPOINT_KEY);
 const storage={
  getItem:k=>base.getItem(k),
  setItem(){throw new Error('QuotaExceededError');},
  removeItem:k=>base.removeItem(k)
 };
 await assert.rejects(saveDeviceCheckpoint(make(),{storage,consent}),/DEVICE_STORAGE_UNAVAILABLE/);
 assert.equal(base.getItem(DEVICE_CHECKPOINT_KEY),before);
 await assert.rejects(saveDeviceCheckpoint(make(),{storage:null,consent}),/DEVICE_STORAGE_UNAVAILABLE/);
});
