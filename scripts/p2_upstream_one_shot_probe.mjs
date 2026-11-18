#!/usr/bin/env node
/* P2: genuine pinned one-shot-ui comparison, only self-generated synthetic images. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {mkdtemp,writeFile,readFile,stat,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {compareReference} from './ffax_reference_fidelity.mjs';
const sig=Buffer.from([137,80,78,71,13,10,26,10]);
const sha=x=>createHash('sha256').update(x).digest('hex');
function crc32(x){let c=0xffffffff;for(const v of x){c^=v;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function chunk(n,x){const t=Buffer.from(n,'ascii'),l=Buffer.alloc(4),crc=Buffer.alloc(4);l.writeUInt32BE(x.length);crc.writeUInt32BE(crc32(Buffer.concat([t,x])));return Buffer.concat([l,t,x,crc]);}
function png(shift){
 const w=96,h=64,raw=Buffer.alloc(h*(1+w*4));
 for(let y=0;y<h;y++){let row=y*(1+w*4);raw[row]=0;for(let x=0;x<w;x++){let i=row+1+4*x,p=x>=16+shift&&x<60+shift&&y>=14&&y<45;raw[i]=p?24:245;raw[i+1]=p?150:245;raw[i+2]=p?218:245;raw[i+3]=255;}}
 const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=6;
 return Buffer.concat([sig,chunk('IHDR',ih),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
const entry=process.env.FFAX_ONE_SHOT_CLI;
if(typeof entry!=='string'||!entry.endsWith('/dist/cli.mjs'))throw Error('P2_PINNED_CLI_REQUIRED');
const dir=await mkdtemp(join(tmpdir(),'ffax-p2-real-one-shot-'));
try{
 const ref=join(dir,'reference.png'),render=join(dir,'render.png'),out=join(dir,'result');
 const r=png(0),i=png(8);
 await Promise.all([writeFile(ref,r,{flag:'wx'}),writeFile(render,i,{flag:'wx'})]);
 const response=await compareReference({reference:ref,render,out,engineEntry:resolve(entry),suggest:true});
 const receipt=JSON.parse(await readFile(join(out,'report.json'),'utf8'));
 const heat=await readFile(join(out,'heatmap.png'));
 assert.equal(receipt.schema,'ffax.reference-fidelity.v1');
 assert.equal(receipt.status,'MEASURED_NOT_APPROVED');
 assert.equal(receipt.reference.sha256,sha(r));
 assert.equal(receipt.render.sha256,sha(i));
 assert.ok(receipt.comparison.summary.mismatchRatio>0);
 assert.ok(Array.isArray(receipt.comparison.issues));
 assert.equal(typeof receipt.suggestions,'object');
 assert.ok(heat.subarray(0,8).equals(sig));
 assert.equal(heat.readUInt32BE(16),96);assert.equal(heat.readUInt32BE(20),64);
 assert.equal(response.report.comparison.summary.mismatchRatio,receipt.comparison.summary.mismatchRatio);
 assert.ok((await stat(join(out,'heatmap.png'))).size>33);
 console.log(JSON.stringify({test:'FFAX_P2_REAL_UPSTREAM_0_12_0',status:'PASS',
  referenceSha256:sha(r),renderSha256:sha(i),heatmapSha256:sha(heat),
  mismatchRatio:receipt.comparison.summary.mismatchRatio,issues:receipt.comparison.issues.length,
  synthetic:true,externalUploads:0,sourceWrites:0,ownerVisualApproval:false}));
}finally{await rm(dir,{recursive:true,force:true});}
