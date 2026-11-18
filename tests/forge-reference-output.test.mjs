import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,stat,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {extractReference} from '../scripts/forge_reference_extract.mjs';
const tiny=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');
test('P2: structural extraction keeps report output outside FFAX source',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'ffax-extract-path-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 const original=join(dir,'original.png');
 await writeFile(original,tiny,{flag:'wx'});
 const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..');
 const output=join(repo,'src','_ffax-extract-should-not-exist-'+basename(dir));
 await assert.rejects(extractReference({reference:original,out:output,engineEntry:join(dir,'missing.mjs')}),/REPORT_OUTPUT_INSIDE_SOURCE/);
 await assert.rejects(stat(output),{code:'ENOENT'});
});
