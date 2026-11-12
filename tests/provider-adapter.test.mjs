import test from 'node:test';
import assert from 'node:assert/strict';
import { makeApprovedChatAdapter } from '../src/provider-adapter.mjs';
import { makeApprovedPlan, AILedger, executeApprovedPrompt } from '../src/ai-gate.mjs';
const base={endpoint:'https://api.example.com/v1/chat/completions',allowedOrigins:['https://api.example.com'],apiKey:'demo-private-not-real',model:'fixture-chat-v1',provider:'example'};
function plan(jobId='approvedrun20261112') {return makeApprovedPlan({prompt:'Build a premium dashboard with a table and navigation',provider:'example',model:'fixture-chat-v1',consent:'APPROVE_EXTERNAL_AI_PROMPT_ONLY',estimatedInputTokens:80,maxOutputTokens:300,usdPerMillionInputTokens:1,usdPerMillionOutputTokens:1,maxJobUsd:.01,jobId});}
const output=JSON.stringify({schema:'ffax-model-design.v1',title:'Offline Fixture Dashboard',theme:'midnight',layout:'stack',components:[{type:'Navbar',text:'Dashboard'},{type:'Button',text:'Continue'}]});
const reply=(status=200, body={choices:[{message:{content:output}}],usage:{prompt_tokens:80,completion_tokens:140}})=>({ok:status===200,status,headers:{get:()=> 'application/json'},json:async()=>body});
test('endpoint requires HTTPS, explicit public origin allowlist, no credentials/query/redirect path',()=>{
 for(const url of ['http://api.example.com/v1/chat/completions','https://localhost/v1/chat/completions','https://127.0.0.1/v1/chat/completions','https://api.example.com/v1/chat/completions?token=x','https://user:pass@api.example.com/v1/chat/completions','https://api.example.com/v1/other'])assert.throws(()=>makeApprovedChatAdapter({...base,endpoint:url}),/PROVIDER/);
 assert.throws(()=>makeApprovedChatAdapter({...base,allowedOrigins:['https://malicious.example.com']}),/APPROVED/);
});
test('no network call during adapter construction and only approved model payload sent',async()=>{
 const calls=[];const fake=async(...args)=>{calls.push(args);return reply();};
 const adapter=makeApprovedChatAdapter({...base,fetchImpl:fake});assert.equal(calls.length,0);
 const request=plan();const ledger=new AILedger({maxSessionUsd:.05});const result=await executeApprovedPrompt({plan:request,ledger,adapter});
 assert.equal(result.receipt.status,'succeeded');assert.equal(result.output,output);assert.equal(calls.length,1);
 assert.equal(calls[0][0],base.endpoint);const {body,headers,...options}=calls[0][1];
 assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');
 assert.equal(headers.authorization,'Bearer '+base.apiKey);
 const sent=JSON.parse(body);assert.equal(sent.model,base.model);assert.equal(sent.messages[1].content,request.prompt);
 assert.ok(!JSON.stringify(ledger.snapshot()).includes(request.prompt));
 assert.ok(!JSON.stringify(ledger.snapshot()).includes(base.apiKey));
});
test('provider mismatch and sensitive strings refuse request before fetch',async()=>{
 let calls=0;const adapter=makeApprovedChatAdapter({...base,fetchImpl:async()=>{calls++;return reply()}});
 const approved=plan();await assert.rejects(adapter.generate({provider:'spoofed',model:base.model,prompt:approved.prompt,maxOutputTokens:300,idempotencyKey:'approvedrun20261112'}),/IDENTITY/);
 await assert.rejects(adapter.generate({provider:base.provider,model:base.model,prompt:'Contact hello@example.com about a dashboard',maxOutputTokens:300,idempotencyKey:'approvedrun20261112'}),/SENSITIVE/);
 assert.equal(calls,0);
});
test('HTTP 429 handled by bounded retry and output tokens honored',async()=>{
 let calls=0;const adapter=makeApprovedChatAdapter({...base,fetchImpl:async()=>{calls++;return calls===1?reply(429):reply()}});
 const result=await executeApprovedPrompt({plan:plan('retryrun20261112'),ledger:new AILedger({maxSessionUsd:.05}),adapter});
 assert.equal(result.receipt.status,'succeeded');assert.equal(calls,2);
});
test('non-JSON, malformed usage, secret in response all fail closed',async()=>{
 for(const response of [{...reply(),headers:{get:()=> 'text/plain'}},reply(200,{choices:[{message:{content:output}}],usage:{prompt_tokens:80,completion_tokens:900}}),reply(200,{choices:[{message:{content:'sk-12345678901234567890'}}],usage:{prompt_tokens:80,completion_tokens:60}})]){
  const a=makeApprovedChatAdapter({...base,fetchImpl:async()=>response});const r=await executeApprovedPrompt({plan:plan('refuserun20261112'),ledger:new AILedger({maxSessionUsd:.05}),adapter:a});
  assert.equal(r.receipt.status,'failed');assert.equal(r.output,null);
 }
});
