import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {assessProbe,strictDiagnostics,PROBE_TOTAL} from '../src/probe-policy.mjs';
const require=createRequire(import.meta.url),ts=require('typescript');
const outcomes=(passes,failures=12-passes)=>[
 ...Array.from({length:passes},()=>({pass:true,strictTypeChecked:true,react19Rendered:true})),
 ...Array.from({length:failures},()=>({pass:false,error:'TYPESCRIPT_INVALID'}))
];
test('real model threshold is >=10 independent complete end-to-end passes',()=>{
 const ten=assessProbe(outcomes(10),{live:true});
 assert.equal(ten.attempted,12);assert.equal(ten.passed,10);assert.equal(ten.failed,2);
 assert.equal(ten.threshold,10);assert.equal(ten.success,true);assert.equal(ten.stage,'COMPLETED');
 const nine=assessProbe(outcomes(9),{live:true});
 assert.equal(nine.success,false);assert.equal(nine.reason,'LOCAL_PASS_THRESHOLD_UNREACHABLE');
 assert.equal(assessProbe(outcomes(11),{live:true}).success,true);
});
test('synthetic fixture threshold remains 12/12 and cannot prove model completion',()=>{
 assert.equal(assessProbe(outcomes(10),{live:false}).success,false);
 assert.equal(assessProbe(outcomes(12),{live:false}).success,true);
});
test('actual model success forbidden for incomplete, aborted, or type-unsafe accepted cases',()=>{
 assert.equal(assessProbe(outcomes(10,0),{live:true}).success,false);
 const truncated=assessProbe(outcomes(9,3),{live:true,haltReason:'LOCAL_MODEL_TIMEOUT'});
 assert.equal(truncated.success,false);assert.equal(truncated.stage,'HALTED');
 assert.equal(assessProbe(outcomes(12),{live:true,acceptedTypeErrors:1}).success,false);
 const unreachable=assessProbe(outcomes(0,3),{live:true});
 assert.equal(unreachable.skipped,9);assert.equal(unreachable.stage,'HALTED');
 assert.equal(unreachable.reason,'LOCAL_PASS_THRESHOLD_UNREACHABLE');
});
test('actual strict TypeScript compiler detects invalid TSX per case without penalizing a valid separate file',async()=>{
 // Keep fixtures under the repository so TypeScript resolves installed React types.
 const dir=await mkdtemp(join(fileURLToPath(new URL('../',import.meta.url)),'.ffax-probe-strict-'));
 try{
  const good=join(dir,'Good.tsx'),bad=join(dir,'Bad.tsx');
  await writeFile(good,"import * as React from 'react';export default function Good(){return <section>ok</section>;}");
  await writeFile(bad,"import * as React from 'react';export default function Bad(){return <section>{missingIdentifier}</section>;}");
  const fine=strictDiagnostics(ts,good),broken=strictDiagnostics(ts,bad);
  assert.equal(fine.length,0,JSON.stringify(fine));
  assert.ok(broken.some(d=>d.code===2304),JSON.stringify(broken));
  assert.equal(assessProbe(outcomes(10),{live:true}).success,true);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('policy rejects malformed proof arrays and arbitrary TSX inputs',()=>{
 for(const x of [null,{},Array(13).fill({pass:true}),[{pass:'yes'}]])assert.throws(()=>assessProbe(x,{live:true}),/PROBE_EVIDENCE_INVALID/);
 assert.throws(()=>strictDiagnostics(ts,'/tmp/file.js'),/PROBE_TYPECHECK_INPUT_INVALID/);
 assert.equal(PROBE_TOTAL,12);
});
