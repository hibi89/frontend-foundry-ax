import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Readable} from 'node:stream';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {saveLocalReference,loadLocalReference,createV3ReferenceReceipt} from '../src/reference-vault.mjs';
import {createForgeApi} from '../src/forge-api.mjs';
const sample=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');
const sha=createHash('sha256').update(sample).digest('hex');
const args={sourceType:'USER_SUPPLIED',rightsBasis:'REFERENCE_ONLY',dpr:1,projectLabel:'Fixture',approval:'APPROVE_LOCAL_REFERENCE_RECEIPT'};
const makeResponse=()=>({status:0,data:null,writeHead(code){this.status=code;return this;},end(v){this.data=v?JSON.parse(v):null;return this;}});
const request=(method,body,csrf)=>{
 const req=Readable.from(body===undefined?[]:[Buffer.from(JSON.stringify(body))]);
 req.method=method;req.headers={origin:'http://127.0.0.1:4173','x-ffax-csrf':csrf,'content-type':'application/json'};
 return req;
};
test('FID-01 binds verified immutable source SHA and actual pixel viewport to owner-limited receipt',async()=>{
 const home=await mkdtemp(join(tmpdir(),'ffax-v3-receipt-'));
 try{
  const root=join(home,'vault');
  await saveLocalReference({root,bytes:sample,sha256:sha,rightsConfirmed:true,approval:'APPROVE_LOCAL_REFERENCE_VAULT'});
  const {receipt}=await loadLocalReference({root,sha256:sha});
  const v3=createV3ReferenceReceipt(receipt,args);
  assert.equal(v3.referenceSha256,sha);
  assert.deepEqual(v3.viewport,{cssWidth:1,cssHeight:1,dpr:1,capturedPixelWidth:1,capturedPixelHeight:1});
  assert.equal(v3.provenance.publicRedistributionAllowed,false);
  assert.equal(v3.original.reverifiedOnCreate,true);
  assert.equal(v3.remoteRequests,0);
  assert.throws(()=>createV3ReferenceReceipt(receipt,{...args,approval:'NO'}),/APPROVAL_REQUIRED/);
  assert.throws(()=>createV3ReferenceReceipt(receipt,{...args,rightsBasis:'OWNER_CREATED'}),/RIGHTS_CONFLICT/);
  assert.throws(()=>createV3ReferenceReceipt(receipt,{...args,dpr:2}),/FIELDS_INVALID/);
  assert.throws(()=>createV3ReferenceReceipt({...receipt,sha256:'0'.repeat(10)},args),/SOURCE_INVALID/);
 }finally{await rm(home,{recursive:true,force:true});}
});
test('FID-01 local Forge API denies missing vault source and owner/CSRF violations',async()=>{
 const api=createForgeApi({host:'127.0.0.1',port:4173});
 const res=makeResponse();await api.handle(request('GET'),res,'/api/design/session');
 const csrf=res.data.csrf;
 const denied=makeResponse();
 await api.handle(request('POST',{sha256:'f'.repeat(64),...args},csrf),denied,'/api/design/reference-receipt');
 assert.equal(denied.status,400);
 assert.equal(denied.data.error,'FORGE_REFERENCE_RECEIPT_VAULT_UNAVAILABLE');
 const bad=makeResponse();
 await api.handle(request('POST',{sha256:'f'.repeat(64),...args},'bad'),bad,'/api/design/reference-receipt');
 assert.equal(bad.status,403);
});
