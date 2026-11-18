import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve,dirname,basename } from 'node:path';
import { symlink,stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { compareReference } from '../scripts/ffax_reference_fidelity.mjs';

const tiny = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');
const larger = Buffer.from(tiny);larger.writeUInt32BE(2,16);
async function fixture(t) {
  const dir=await mkdtemp(join(tmpdir(),'ffax-fidelity-'));
  const fs=await import('node:fs/promises');t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const reference=join(dir,'reference.png'),render=join(dir,'render.png'),engineEntry=join(dir,'mock-engine.mjs'),out=join(dir,'results');
  await Promise.all([writeFile(reference,tiny),writeFile(render,tiny),writeFile(engineEntry,`import {writeFileSync} from 'node:fs';if(process.argv[2]==='compare'){writeFileSync('heatmap.png',Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64'));console.log(JSON.stringify({summary:{mismatchRatio:0},pixelDifference:0,issues:[]}));}else if(process.argv[2]==='suggest-fixes'){console.log(JSON.stringify({cssSuggestions:[]}));}else{process.exit(17);}`)]);
  return {reference,render,out,engineEntry};
}
test('reference comparison creates local JSON and diff evidence', async t=>{
  const f=await fixture(t);const result=await compareReference({...f,suggest:true});
  const receipt=JSON.parse(await readFile(join(f.out,'report.json'),'utf8'));
  assert.equal(receipt.schema,'ffax.reference-fidelity.v1');assert.equal(receipt.status,'MEASURED_NOT_APPROVED');
  assert.equal(receipt.viewport.width,1);assert.equal(receipt.comparison.pixelDifference,0);
  assert.deepEqual(receipt.suggestions,{cssSuggestions:[]});assert.equal(result.report.reference.sha256,result.report.render.sha256);
});
test('mismatched dimensions are rejected before external engine launch',async t=>{
  const f=await fixture(t);await writeFile(f.render,larger);
  await assert.rejects(compareReference(f),{code:'VIEWPORT_MISMATCH'});
});
test('missing engine fails closed; no fallback to npx',async t=>{
  const f=await fixture(t);f.engineEntry=join(f.out,'missing.mjs');
  await assert.rejects(compareReference(f),{code:'ENGINE_MISSING'});
});
test('existing report output is never overwritten',async t=>{
  const f=await fixture(t);await mkdir(f.out);await writeFile(join(f.out,'report.json'),'existing');
  await assert.rejects(compareReference(f),{code:'OUTPUT_NOT_EMPTY'});
  assert.equal(await readFile(join(f.out,'report.json'),'utf8'),'existing');
});

test('P2: real reference compare refuses creating reports in FFAX source tree',async t=>{
 const f=await fixture(t);
 const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..');
 const output=join(repo,'src','_ffax-report-should-not-exist-'+basename(dirname(f.out)));
 await assert.rejects(compareReference({...f,out:output}),{code:'OUTPUT_SOURCE_FORBIDDEN'});
 await assert.rejects(stat(output),{code:'ENOENT'});
});
test('P2: report destination symlink cannot redirect upstream heatmap write',async t=>{
 const f=await fixture(t);
 const real=join(dirname(f.out),'empty');await mkdir(real);
 const alias=join(dirname(f.out),'alias');
 try{await symlink(real,alias,'dir');}catch(err){
  if(['EPERM','EACCES','ENOTSUP'].includes(err?.code)){t.skip('OS does not permit test symlinks');return;}
  throw err;
 }
 await assert.rejects(compareReference({...f,out:alias}),{code:'OUTPUT_UNSAFE'});
 assert.deepEqual(await (await import('node:fs/promises')).readdir(real),[]);
});
test('P2: output parent symlink into repository cannot bypass report protection',async t=>{
 const f=await fixture(t);
 const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..');
 const alias=join(dirname(f.out),'repo-alias');
 try{await symlink(repo,alias,'dir');}catch(err){
  if(['EPERM','EACCES','ENOTSUP'].includes(err?.code)){t.skip('OS does not permit test symlinks');return;}
  throw err;
 }
 await assert.rejects(compareReference({...f,out:join(alias,'src','new-report')}),{code:'OUTPUT_SOURCE_FORBIDDEN'});
});
test('P2: existing truly empty real output directory remains supported',async t=>{
 const f=await fixture(t);await mkdir(f.out);
 const response=await compareReference(f);
 assert.equal(response.report.status,'MEASURED_NOT_APPROVED');
});
