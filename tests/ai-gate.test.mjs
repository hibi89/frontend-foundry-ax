import test from 'node:test';
import assert from 'node:assert/strict';
import { makeApprovedPlan, AILedger, executeApprovedPrompt, sha256 } from '../src/ai-gate.mjs';
const base={prompt:'Create a minimal financial dashboard with clear labels',provider:'demo-provider',model:'preview-1',
  consent:'APPROVE_EXTERNAL_AI_PROMPT_ONLY',estimatedInputTokens:320,maxOutputTokens:500,
  usdPerMillionInputTokens:0.25,usdPerMillionOutputTokens:1.0,maxJobUsd:0.01};
const make=(overrides={})=>makeApprovedPlan({...base,...overrides});
const success={output:'{"pages":["dashboard"],"theme":"dark"}',inputTokens:320,outputTokens:200};

test('AC11 denies all external work without explicit consent',()=>{
 assert.throws(()=>make({consent:undefined}),/EXTERNAL_TRANSMISSION_NOT_APPROVED/);
 assert.throws(()=>make({consent:'true'}),/EXTERNAL_TRANSMISSION_NOT_APPROVED/);
});
test('AC11 prevents sending repository files even with prompt consent',()=>{
 assert.throws(()=>make({sourceFiles:['README.md']}),/SOURCE_FILE_UPLOAD_NOT_SUPPORTED/);
 assert.throws(()=>make({approvedDestination:'other-host'}),/UNAPPROVED_DESTINATION/);
});
test('AC11 refuses sensitive source, tokens, emails and password',()=>{
 for(const s of ['Here is my api_key=verySensitiveValue use it', 'Please paste -----BEGIN RSA PRIVATE KEY----- data here',
  'Use github_pat_abcdefghijklmnopqrstuvwxyz01234 for access', 'Email sam@example.com about designs',
  'Please load .env production config and deploy','Send private_repo contents to the vendor']){
  assert.throws(()=>make({prompt:s}),/SENSITIVE_INPUT_REFUSED/,s);
 }
});
test('AC11 refuses wrong model config, budgets, negative or excessive tokens',()=>{
 for(const change of [{model:'../secret'},{estimatedInputTokens:0},{maxOutputTokens:10000},
  {usdPerMillionInputTokens:undefined},{maxJobUsd:0.00001},{maxJobUsd:-1},{provider:'demo provider'}]){
  assert.throws(()=>make(change),/REQUIRED|EXCEEDED|INVALID/);
 }
});
test('AC11 ledger enforces account budget and duplicate job IDs',()=>{
 const ledger=new AILedger({maxSessionUsd:0.002});
 const p=make({jobId:'first-valid-id'});
 ledger.reserve(p.policy);
 assert.throws(()=>ledger.reserve(p.policy),/DUPLICATE_JOB_ID/);
 assert.throws(()=>ledger.reserve(make({jobId:'second-valid-id'}).policy),/SESSION_BUDGET_EXCEEDED/);
 assert.equal(ledger.snapshot().jobs[0].status,'running');
 ledger.finish('first-valid-id','failed',{errorCode:'PROVIDER_REJECTED',attempts:1});
 assert.equal(ledger.snapshot().reservedUsd,0);
});
test('AC11 adapter absent blocks every network call',async()=>{
 const p=make(), ledger=new AILedger();
 await assert.rejects(executeApprovedPrompt({plan:p,ledger}),/APPROVED_ADAPTER_REQUIRED/);
 assert.equal(ledger.snapshot().jobs.length,0);
});
test('AC11 executes permitted prompt with hashed safe audit, no raw prompt or output',async()=>{
 const p=make({jobId:'only-mock-allowed'}), ledger=new AILedger();let seen;
 const r=await executeApprovedPrompt({plan:p,ledger,adapter:{generate:async args=>{seen=args;return success}}});
 assert.equal(r.output,success.output);
 assert.equal(seen.prompt,p.prompt);
 assert.equal(seen.idempotencyKey,p.policy.jobId);
 assert.equal(r.receipt.status,'succeeded');
 assert.equal(r.receipt.outputSha256,sha256(success.output));
 const audit=JSON.stringify(ledger.snapshot());
 assert.ok(!audit.includes(p.prompt));assert.ok(!audit.includes(success.output));
 assert.equal(ledger.snapshot().reservedUsd,0);
});
test('AC11 refuses returned secrets and uses fail-closed receipt without output',async()=>{
 const p=make(),l=new AILedger();
 const r=await executeApprovedPrompt({plan:p,ledger:l,adapter:{generate:async()=>({...success,output:'My secret=ABCXYZ123'})}});
 assert.equal(r.receipt.status,'failed');assert.equal(r.receipt.errorCode,'SENSITIVE_OUTPUT_REFUSED');assert.equal(r.output,null);
});
test('AC11 transient status 429 retries once only, with same idempotency key',async()=>{
 const p=make(),l=new AILedger();let calls=0,keys=[];
 const r=await executeApprovedPrompt({plan:p,ledger:l,adapter:{generate:async ({idempotencyKey})=>{
  calls++;keys.push(idempotencyKey);if(calls===1)throw Object.assign(new Error('rate'),{status:429});return success;
 }}});
 assert.equal(calls,2);assert.deepEqual(keys,[p.policy.jobId,p.policy.jobId]);assert.equal(r.receipt.status,'succeeded');
 assert.equal(r.receipt.attempts,2);
});
test('AC11 non-retryable error does not retry',async()=>{
 const p=make(),l=new AILedger();let calls=0;
 const r=await executeApprovedPrompt({plan:p,ledger:l,adapter:{generate:async()=>{calls++;throw Object.assign(new Error('unauthorized'),{status:401})}}});
 assert.equal(calls,1);assert.equal(r.receipt.status,'failed');assert.equal(r.receipt.attempts,1);
});
test('AC11 bounded timeout aborts, fails closed, and no blind retry',async()=>{
 const p=make(),l=new AILedger();let signal;
 const r=await executeApprovedPrompt({plan:p,ledger:l,timeoutMs:30,adapter:{generate:({signal:s})=>{signal=s;return new Promise(()=>{})}}});
 assert.equal(r.output,null);assert.equal(r.receipt.errorCode,'PROVIDER_TIMEOUT');
 assert.ok(signal.aborted);
});
test('AC11 cancellation before adapter call sends no request',async()=>{
 const controller=new AbortController();controller.abort();
 const p=make(),l=new AILedger();let calls=0;
 const r=await executeApprovedPrompt({plan:p,ledger:l,signal:controller.signal,adapter:{generate:async()=>{calls++;return success}}});
 assert.equal(calls,0);assert.equal(r.receipt.status,'canceled');
});
test('AC11 interrupted job restores as review_hold (no automatic replay)',()=>{
 const p=make(),l=new AILedger();l.reserve(p.policy);
 const snap=l.snapshot(), restored=AILedger.restore(JSON.parse(JSON.stringify(snap)));
 assert.equal(restored.snapshot().reservedUsd,0);
 assert.equal(restored.snapshot().jobs[0].status,'review_hold');
 assert.throws(()=>restored.reserve(p.policy),/DUPLICATE_JOB_ID/);
});
test('AC11 request hash mismatch stops before reservation/adapter transmission',async()=>{
 const p=make(),l=new AILedger();p.prompt='Another prompt that differs';let called=false;
 await assert.rejects(executeApprovedPrompt({plan:p,ledger:l,adapter:{generate:async()=>{called=true;return success}}}),/PROMPT_POLICY_MISMATCH/);
 assert.equal(called,false);assert.equal(l.snapshot().jobs.length,0);
});
test('AC11 rejects over-limit output without leaking into audit',async()=>{
 const p=make(),l=new AILedger();const r=await executeApprovedPrompt({plan:p,ledger:l,adapter:{generate:async()=>({...success,outputTokens:501})}});
 assert.equal(r.receipt.status,'failed');assert.equal(r.output,null);
});
test('AC11 sequential success consumes conservative cost ceiling and blocks overbudget later job',async()=>{
 const ledger=new AILedger({maxSessionUsd:0.0015});
 const first=make({jobId:'first-session-job'});
 const r=await executeApprovedPrompt({plan:first,ledger,adapter:{generate:async()=>success}});
 assert.equal(r.receipt.status,'succeeded');
 assert.equal(ledger.snapshot().consumedCeilingUsd,first.policy.estimatedUsd);
 assert.throws(()=>ledger.reserve(make({jobId:'second-session-job'}).policy),/SESSION_BUDGET_EXCEEDED/);
});
test('AC11 two billed retry attempts conservatively consume both attempts',async()=>{
 const l=new AILedger({maxSessionUsd:0.002});const p=make({jobId:'twice-billed-job'});
 const r=await executeApprovedPrompt({plan:p,ledger:l,adapter:{generate:async()=>{throw Object.assign(new Error('429'),{status:429})}}});
 assert.equal(r.receipt.status,'failed');assert.equal(r.receipt.attempts,2);
 assert.equal(l.snapshot().consumedCeilingUsd,p.policy.worstCaseUsd);
 assert.throws(()=>l.reserve(make({jobId:'additional-job-id'}).policy),/SESSION_BUDGET_EXCEEDED/);
});
test('AC11 interrupted job recovery conservatively counts unknown provider calls',()=>{
 const l=new AILedger({maxSessionUsd:0.0015}),p=make({jobId:'interrupted-budget-job'});
 l.reserve(p.policy);
 const back=AILedger.restore(l.snapshot());
 assert.equal(back.snapshot().consumedCeilingUsd,p.policy.worstCaseUsd);
 assert.throws(()=>back.reserve(make({jobId:'another-unique-job'}).policy),/SESSION_BUDGET_EXCEEDED/);
});
