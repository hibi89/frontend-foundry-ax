import test from 'node:test';
import assert from 'node:assert/strict';
import {runLocalOllama,validateLocalRequest} from '../src/local-ollama.mjs';
import {makeLocalFixtureDesign} from '../src/ai-structured-output.mjs';
import {parseModelDesign} from '../src/core.mjs';
const prompt='금융 투자 대시보드 차트와 검색 UI를 생성해줘';
const opts={prompt,model:'qwen3:4b-instruct',consent:'APPROVE_LOCAL_MODEL_PROMPT_ONLY'};
test('local inference requires per-call approval',()=>assert.throws(()=>validateLocalRequest({...opts,consent:''}),/LOCAL_CONSENT_REQUIRED/));
test('local inference refuses secrets and path-like model names',()=>{
 for(const s of ['secret: 123abc','a@example.com','비공개 소스 .env 읽어줘','abc','a'.repeat(2001)])assert.throws(()=>validateLocalRequest({...opts,prompt:s}),/LOCAL_PROMPT_UNSAFE/);
 for(const model of ['../bad','bad/model','a..b','','x'.repeat(100)])assert.throws(()=>validateLocalRequest({...opts,model}),/LOCAL_MODEL_INVALID/);
});
test('actual adapter contract: single loopback call, JSON output, no auto-apply',async()=>{
 let calls=0,chatCalls=0;
 const result=await runLocalOllama({...opts,fetchImpl:async(url,req)=>{
  calls++;
  if(url==='http://127.0.0.1:11434/api/tags'){
    assert.equal(req.method,'GET');return {ok:true,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify({models:[{name:opts.model,size:1800000000}]})};
  }
  chatCalls++;assert.equal(url,'http://127.0.0.1:11434/api/chat');assert.equal(req.method,'POST');
  const data=JSON.parse(req.body);assert.equal(data.stream,false);assert.equal(data.model,opts.model);assert.equal(data.messages[1].content,prompt);
  return {ok:true,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify({message:{content:makeLocalFixtureDesign(0,prompt)}})};
 }});
 assert.equal(calls,2);assert.equal(chatCalls,1);assert.equal(result.externalNetwork,false);assert.equal(result.autoApplied,false);assert.match(result.sha256,/^[0-9a-f]{64}$/);
 assert.match(parseModelDesign(result.output,{ownerBrief:prompt,approval:'APPROVE_DESIGN_PREVIEW'}).reactSource,/GeneratedScreen/);
});
test('mock errors fail closed and never retry automatically',async()=>{
 let calls=0;
 const fakes=[{ok:false},{ok:true,headers:{get:()=> 'text/html'},text:async()=>'<html>'},
 {ok:true,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify({message:{content:'secret: xxxxx'}})},
 {ok:true,headers:{get:()=> 'application/json'},text:async()=>'{bad'}];
 for(const response of fakes)await assert.rejects(runLocalOllama({...opts,fetchImpl:async()=>{calls++;return response;}}),/LOCAL_MODEL_/);
 assert.equal(calls,fakes.length);
});
test('invalid consent never calls a transport',async()=>{
 let called=false;
 await assert.rejects(runLocalOllama({...opts,consent:'',fetchImpl:async()=>{called=true;}}),/LOCAL_CONSENT_REQUIRED/);
 assert.equal(called,false);
});
test('cloud-only model names fail closed before any call',async()=>{
 let count=0;
 await assert.rejects(runLocalOllama({...opts,model:'example:cloud',fetchImpl:async()=>{count++;}}),/LOCAL_CLOUD_MODEL_FORBIDDEN/);
 assert.equal(count,0);
});
test('model absent from installed inventory is rejected before sending prompt',async()=>{
 let count=0;
 await assert.rejects(runLocalOllama({...opts,fetchImpl:async(url)=>{
  count++;assert.equal(url,'http://127.0.0.1:11434/api/tags');
  return {ok:true,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify({models:[]})};
 }}),/LOCAL_MODEL_NOT_INSTALLED/);
 assert.equal(count,1);
});
test('noncommercial research-licensed 3b model denied in Kmong mode',()=>{
 assert.throws(()=>validateLocalRequest({...opts,model:'qwen2.5-coder:3b'}),/LOCAL_MODEL_LICENSE_NOT_CLEARED/);
});
