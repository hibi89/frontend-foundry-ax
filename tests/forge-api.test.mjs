import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createForgeApi} from '../src/forge-api.mjs';
const makeReq=(method,path,body,headers={})=>{
 const req=Readable.from(body===undefined?[]:[Buffer.from(JSON.stringify(body))]);
 req.method=method;req.headers=headers;return {req,path};
};
const respond=()=>({status:0,headers:{},data:null,writeHead(code,headers){this.status=code;this.headers=headers;return this;},end(text){this.data=text?JSON.parse(text):null;return this;}});
test('Forge API: token, typed variants, approval freeze, and local-only refusal',async()=>{
 const api=createForgeApi({host:'127.0.0.1',port:4173});
 let res=respond();let {req,path}=makeReq('GET','/api/design/session');
 assert.equal(await api.handle(req,res,path),true);
 assert.equal(res.status,200);assert.match(res.data.csrf,/^[a-f0-9]{64}$/);
 const csrf=res.data.csrf;
 const headers={origin:'http://127.0.0.1:4173','content-type':'application/json','x-ffax-csrf':csrf};
 const brief={prompt:'역학달력을 현대적이고 고급스러운 UI로 만들어줘',audience:'모바일 사용자'};
 ({req,path}=makeReq('POST','/api/design/variants',{brief},headers));res=respond();
 await api.handle(req,res,path);
 assert.equal(res.status,200);assert.equal(res.data.variants.length,3);
 const variant=res.data.variants[0];
 ({req,path}=makeReq('POST','/api/design/freeze',{variant,approval:'APPROVE_FORGE_REFERENCE',persist:false},headers));res=respond();
 await api.handle(req,res,path);
 assert.equal(res.status,200);assert.equal(res.data.persisted,false);
 assert.match(res.data.bundle.sha256,/^[a-f0-9]{64}$/);
 ({req,path}=makeReq('POST','/api/design/variants',{brief},{...headers,origin:'https://external.invalid'}));res=respond();
 await api.handle(req,res,path);
 assert.equal(res.status,403);assert.equal(res.data.error,'FORGE_ORIGIN_FORBIDDEN');
 ({req,path}=makeReq('POST','/api/design/variants',{brief},{...headers,'x-ffax-csrf':'nope'}));res=respond();
 await api.handle(req,res,path);
 assert.equal(res.status,403);
});

test('P2: Korean brief remains byte-exact when HTTP body splits UTF-8 characters',async()=>{
 const api=createForgeApi({host:'127.0.0.1',port:4173});
 const session=respond();
 await api.handle(makeReq('GET','/api/design/session').req,session,'/api/design/session');
 const headers={origin:'http://127.0.0.1:4173','content-type':'application/json','x-ffax-csrf':session.data.csrf};
 const prompt='역학달력 한글 화면을 현대적이고 고급스럽게 만들어줘';
 const bytes=Buffer.from(JSON.stringify({brief:{prompt,audience:'모바일 사용자'}}),'utf8');
 const koreanStart=bytes.indexOf(Buffer.from('역'));
 assert.ok(koreanStart>=0);
 const req=Readable.from([bytes.subarray(0,koreanStart+1),bytes.subarray(koreanStart+1,koreanStart+2),bytes.subarray(koreanStart+2)]);
 req.method='POST';req.headers=headers;
 const response=respond();
 await api.handle(req,response,'/api/design/brief');
 assert.equal(response.status,200);
 assert.equal(response.data.brief.prompt,prompt);
 assert.equal(response.data.brief.legacy.raw,prompt);
});
test('P2: invalid UTF-8 and oversized chunked JSON fail closed before Forge processing',async()=>{
 const api=createForgeApi({host:'127.0.0.1',port:4173});
 const session=respond();
 await api.handle(makeReq('GET','/api/design/session').req,session,'/api/design/session');
 const headers={origin:'http://127.0.0.1:4173','content-type':'application/json','x-ffax-csrf':session.data.csrf};
 for(const [chunks,expected] of [
  [[Buffer.from([0x7b,0x22,0x61,0x22,0x3a,0x22,0xc3]),Buffer.from([0x28,0x22,0x7d])],'FORGE_UTF8_INVALID'],
  [[Buffer.alloc(150001,0x20)],'FORGE_INPUT_TOO_LARGE']
 ]){
  const req=Readable.from(chunks);req.method='POST';req.headers=headers;
  const response=respond();
  await api.handle(req,response,'/api/design/brief');
  assert.equal(response.status,400);
  assert.equal(response.data.error,expected);
 }
});
