/** No real model is queried: disallowed tag must fail before any network transport. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
test('model benchmark writes HALTED receipt and never mislabels incomplete inference as PASS',async()=>{
 const cwd=await mkdtemp(join(tmpdir(),'ffax-incomplete-receipt-'));
 try{
  const run=spawnSync(process.execPath,[resolve(root,'scripts/react_real_probe.mjs'),'--local','--approve-local','--model=disallowed-in-ci','--save-report'],{cwd,encoding:'utf8',timeout:30000});
  assert.equal(run.error,undefined,run.error?.message);
  assert.equal(run.status,1,'fail-closed exit');
  const r=JSON.parse(await readFile(join(cwd,'FFAX-LIVE-MODEL-RESULT.json'),'utf8'));
  assert.equal(r.mode,'ACTUAL_LOCAL_OLLAMA');assert.equal(r.stage,'HALTED');
  assert.equal(r.reason,'LOCAL_MODEL_LICENSE_NOT_CLEARED');
  assert.equal(r.attempted,1);assert.equal(r.passed,0);assert.equal(r.failed,1);assert.equal(r.skipped,11);
  assert.equal(r.success,false);assert.equal(r.ownerUxApproved,false);assert.equal(r.autoApplied,false);
  assert.match(r.briefSha256,/^[a-f0-9]{64}$/);
  assert.equal(r.results.length,1);assert.equal(r.results[0].pass,false);
  console.log('FFAX_RECEIPT_FAIL_CLOSED_PASS attempted=1 skipped=11 no_real_inference=true');
 }finally{await rm(cwd,{recursive:true,force:true});}
});