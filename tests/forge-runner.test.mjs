import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createForgeApi} from '../src/forge-api.mjs';

const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');
function request(method,body,headers){
 const req=Readable.from(body===undefined?[]:[Buffer.isBuffer(body)?body:Buffer.from(JSON.stringify(body))]);
 req.method=method;req.headers=headers;return req;
}
function response(){
 return {status:0,headers:null,body:null,writeHead(status,headers){this.status=status;this.headers=headers;return this;},
  end(body){if(typeof body==='string')this.body=JSON.parse(body);return this;}};
}
test('RF-06/07: local PNG runner requires exact Origin and CSRF and rejects forged mutation',async()=>{
 const api=createForgeApi({host:'127.0.0.1',port:4173});
 let res=response();
 await api.handle(request('GET',undefined,{}),res,'/api/design/session');
 assert.equal(res.status,200);const csrf=res.body.csrf;
 const valid={origin:'http://127.0.0.1:4173','x-ffax-csrf':csrf,
   'content-type':'image/png','x-ffax-owner-consent':'APPROVE_LOCAL_PNG_ANALYSIS'};
 res=response();await api.handle(request('POST',pixel,{...valid,origin:'https://outside.invalid'}),res,'/api/design/runner/reference');
 assert.equal(res.status,403);
 res=response();await api.handle(request('POST',pixel,{...valid,origin:undefined}),res,'/api/design/runner/reference');
 assert.equal(res.status,403);
 res=response();await api.handle(request('POST',pixel,{...valid,'x-ffax-csrf':'bad'}),res,'/api/design/runner/reference');
 assert.equal(res.status,403);
 res=response();await api.handle(request('POST',pixel,{...valid,'x-ffax-owner-consent':'NO'}),res,'/api/design/runner/reference');
 assert.equal(res.status,400);
 res=response();await api.handle(request('POST',pixel,valid),res,'/api/design/runner/reference');
 assert.equal(res.status,200);assert.equal(res.body.schema,'ffax.runner-reference.v1');
 assert.match(res.body.id,/^[a-f0-9]{32}$/);
 assert.equal(res.body.scope,'LOCAL_MEMORY_ONLY');
 res=response();await api.handle(request('POST',{referenceId:'0'.repeat(32),bundle:{},approval:'NO',maxPasses:6},
   {...valid,'content-type':'application/json'}),res,'/api/design/runner/start');
 assert.equal(res.status,400);
 res=response();await api.handle(request('GET',undefined,{'x-ffax-csrf':csrf}),res,'/api/design/runner/results/'+'0'.repeat(32));
 assert.equal(res.status,404);
});

test('RF-01 JPEG/WebP direct archive rejects wrong origin, missing consent and forged MIME',async()=>{
 const api=createForgeApi({host:'127.0.0.1',port:4173});
 const base=response();await api.handle(request('GET',undefined,{}),base,'/api/design/session');
 const token=base.body.csrf;
 const headers={origin:'http://127.0.0.1:4173','x-ffax-csrf':token,
  'content-type':'image/jpeg','x-ffax-owner-consent':'APPROVE_LOCAL_REFERENCE_VAULT',
  'x-ffax-rights-confirmed':'OWNER_ASSERTED_RIGHTS','x-ffax-source-sha256':'a'.repeat(64)};
 let reply=response();
 await api.handle(request('POST',pixel,{...headers,origin:'https://evil.invalid'}),reply,'/api/design/runner/vault-intake');
 assert.equal(reply.status,403);
 reply=response();await api.handle(request('POST',pixel,{...headers,origin:headers.origin,'x-ffax-owner-consent':'NO'}),reply,'/api/design/runner/vault-intake');
 assert.equal(reply.status,400);
 reply=response();await api.handle(request('POST',pixel,headers),reply,'/api/design/runner/vault-intake');
 assert.equal(reply.status,400);
 assert.match(reply.body.error,/FORGE_RUNNER_VAULT_MIME_OR_SHA_MISMATCH/);
});
