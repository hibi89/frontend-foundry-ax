import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalInferenceGate} from '../src/inference-gate.mjs';

test('model inference permits only one active generation and never queues a second request',async()=>{
 const gate=createLocalInferenceGate();
 let release;
 const first=gate.run(()=>new Promise(resolve=>{release=resolve;}));
 assert.equal(gate.busy,true);
 let duplicateCalls=0;
 await assert.rejects(gate.run(()=>{duplicateCalls++;return 'should never run';}),/LOCAL_MODEL_BUSY/);
 assert.equal(duplicateCalls,0);
 release({response:'private-local-only'});
 assert.deepEqual(await first,{response:'private-local-only'});
 assert.equal(gate.busy,false);
 assert.equal(await gate.run(async()=>42),42);
});
test('model timeout/error frees the gate without retrying or swallowing the original failure',async()=>{
 const gate=createLocalInferenceGate();
 let calls=0;
 await assert.rejects(gate.run(async()=>{calls++;throw Error('LOCAL_MODEL_TIMEOUT');}),/LOCAL_MODEL_TIMEOUT/);
 assert.equal(calls,1);assert.equal(gate.busy,false);
 assert.equal(await gate.run(async()=>{calls++;return 'safe';}),'safe');
 assert.equal(calls,2);
});
test('invalid jobs cannot seize the gate',async()=>{
 const gate=createLocalInferenceGate();
 await assert.rejects(gate.run(null),/LOCAL_MODEL_JOB_INVALID/);
 assert.equal(gate.busy,false);
});
