import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createForgeApi} from '../src/forge-api.mjs';
const sha='a'.repeat(64);
const receipt={
 schema:'ffax.local-reference-receipt.v1',sha256:sha,immutable:true,
 rights:'OWNER_ASSERTED_NOT_VERIFIED',networkRequests:0,
 verification:'HEADER_AND_SHA_ONLY_BROWSER_DECODE_REQUIRED',width:640,height:400};
const scene={schema:'ffax.fidelity-scene.v1',sourceSha256:sha,width:640,height:400,revision:1,
 regions:[
 {id:'canvas',parentId:null,role:'canvas',bounds:{x:0,y:0,width:640,height:400},style:{background:'#ffffff'}},
 {id:'section-1',parentId:'canvas',role:'section',bounds:{x:0,y:0,width:640,height:400},style:{background:'#123456'}}
 ]};
const body={package:{schema:'iae.ffax-reference-request.v1',jobKey:'project_001',
 mode:'MATCH_REFERENCE',source:'IAE_DESIGN_INTELLIGENCE_LOCAL',
 referenceSha256:sha,rightsBasis:'OWNER_ASSERTED_REFERENCE_ONLY',
 target:'FFAX_REACT_SOURCE_CANDIDATE_ONLY'},scene,typography:null,assets:null,
 approval:'APPROVE_LOCAL_IAE_TO_FFAX_SOURCE_REVIEW'};
const response=()=>({code:0,headers:{},data:null,
 writeHead(code,headers){this.code=code;this.headers=headers;return this;},
 end(value){this.data=value?JSON.parse(value):null;return this;}});
const req=(method,path,csrf,payload,origin='http://127.0.0.1:4173')=>{
 const req=Readable.from(payload===undefined?[]:[Buffer.from(JSON.stringify(payload))]);
 req.method=method;req.headers={
  origin,'content-type':'application/json','x-ffax-csrf':csrf,
  'sec-fetch-site':'same-origin'
 };return req;
};
test('FID-12 owner-approved IAE package -> actual FFAX source job -> CSRF-protected read-only status and TSX result',async()=>{
 let seen=0;
 const api=createForgeApi({host:'127.0.0.1',port:4173,
  iaeReferenceLoader:async({sha256})=>{
   assert.equal(sha256,sha);seen++;return {receipt};}});
 const session=response();
 await api.handle(req('GET','/api/design/session',undefined),session,'/api/design/session');
 assert.equal(session.code,200);
 const csrf=session.data.csrf;
 const submitted=response();
 await api.handle(req('POST','/api/design/iae/submit',csrf,body),submitted,'/api/design/iae/submit');
 assert.equal(submitted.code,200);
 assert.equal(submitted.data.schema,'ffax.iae-accepted.v1');
 assert.equal(seen,1);
 const status=response();
 await api.handle(req('GET',submitted.data.statusUrl,csrf),status,submitted.data.statusUrl);
 assert.equal(status.code,200);assert.equal(status.data.p2,'NOT_RUN');
 assert.equal(status.data.customerOriginalModified,false);
 const result=response();
 await api.handle(req('GET',submitted.data.resultUrl,csrf),result,submitted.data.resultUrl);
 assert.equal(result.code,200);
 assert.match(result.data.tsx,/function FidelityScene/);
 assert.match(result.data.css,/ffax-v3-root/);
 assert.equal(result.data.receipt.productionDeploy,false);
 const noCsrf=response();
 await api.handle(req('GET',submitted.data.resultUrl,'bad'),noCsrf,submitted.data.resultUrl);
 assert.equal(noCsrf.code,403);
 const wrongMethod=response();
 await api.handle(req('POST',submitted.data.resultUrl,csrf,{}),wrongMethod,submitted.data.resultUrl);
 assert.equal(wrongMethod.code,405);
});
test('FID-12 fails closed for unapproved, forged source, mismatched reference and hostile origin',async()=>{
 const api=createForgeApi({host:'127.0.0.1',port:4173,
  iaeReferenceLoader:async()=>({receipt})});
 const s=response();await api.handle(req('GET','/api/design/session',undefined),s,'/api/design/session');
 const csrf=s.data.csrf;
 for(const [candidate,expected] of [
  [{...body,approval:'NO'},'FORGE_IAE_OWNER_APPROVAL_REQUIRED'],
  [{...body,package:{...body.package,referenceSha256:'b'.repeat(64)}},'FORGE_IAE_PACKAGE_INVALID'],
  [{...body,package:{...body.package,sourceUrl:'https://example.test'}},'FORGE_FIELDS_INVALID'],
  [{...body,scene:{...scene,width:1}},'FORGE_IAE_REFERENCE_RECEIPT_INVALID']
 ]){
  const out=response();await api.handle(req('POST','/api/design/iae/submit',csrf,candidate),out,'/api/design/iae/submit');
  assert.equal(out.code,400);assert.equal(out.data.error,expected);
 }
 const origin=response();
 await api.handle(req('POST','/api/design/iae/submit',csrf,body,'https://malicious.example'),
 origin,'/api/design/iae/submit');
 assert.equal(origin.code,403);
 const missing=response();
 await api.handle(req('GET','/api/design/iae/jobs/'+'f'.repeat(32),csrf),
 missing,'/api/design/iae/jobs/'+'f'.repeat(32));
 assert.equal(missing.code,404);
});
