#!/usr/bin/env node
/* FFAX Reference Fidelity: locally compare two PNGs using a separately installed
 * one-shot-ui CLI. No upload, package install, CSS modification, or network calls. */
import { createHash } from 'node:crypto';
import { readFile, realpath, stat, mkdir, readdir, writeFile } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAX_PNG_BYTES = 24 * 1024 * 1024;
const MAX_ENGINE_OUTPUT = 5 * 1024 * 1024;
const MAX_ENGINE_MS = 90_000;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

class FidelityError extends Error {
  constructor(code, message) { super(message); this.name = 'FidelityError'; this.code = code; }
}

function parseArgs(argv) {
  if (argv.length === 1 && (argv[0] === '--help' || argv[0] === '-h')) return { help: true };
  if (argv[0] !== 'compare') throw new FidelityError('USAGE', 'Expected: compare --reference FILE.png --render FILE.png --out DIR [--engine-entry PATH] [--suggest]');
  const options = {};
  for (let i = 1; i < argv.length; i++) {
    const name = argv[i];
    if (name === '--suggest') { if (options.suggest) throw new FidelityError('USAGE','Duplicate --suggest'); options.suggest = true; continue; }
    if (!['--reference','--render','--out','--engine-entry'].includes(name) || options[name] || !argv[i + 1] || argv[i+1].startsWith('--')) throw new FidelityError('USAGE', 'Invalid or duplicate argument: ' + name);
    options[name] = argv[++i];
  }
  for (const required of ['--reference','--render','--out']) if (!options[required]) throw new FidelityError('USAGE', 'Missing ' + required);
  return { reference: options['--reference'], render: options['--render'], out: options['--out'], engineEntry: options['--engine-entry'] ?? join(PROJECT_ROOT, 'node_modules/one-shot-ui/dist/cli.mjs'), suggest: !!options.suggest };
}

async function inspectPng(path) {
  let real;
  try { real = await realpath(resolve(path)); } catch { throw new FidelityError('INPUT_NOT_FOUND', 'PNG not found: ' + path); }
  const info = await stat(real);
  if (!info.isFile() || info.size < 33 || info.size > MAX_PNG_BYTES) throw new FidelityError('INPUT_SIZE', 'PNG must be a regular file of 33 bytes to ' + MAX_PNG_BYTES + ' bytes: ' + path);
  const buffer = await readFile(real);
  if (!buffer.subarray(0,8).equals(PNG_SIGNATURE) || buffer.toString('ascii',12,16) !== 'IHDR' || buffer.readUInt32BE(8) !== 13) throw new FidelityError('INVALID_PNG', 'Invalid PNG header: ' + path);
  const width = buffer.readUInt32BE(16), height = buffer.readUInt32BE(20);
  if (!width || !height || width > 10000 || height > 10000 || width * height > 32_000_000) throw new FidelityError('INPUT_DIMENSIONS', 'Unsupported PNG dimensions: ' + width + 'x' + height);
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  return { path: real, sha256, width, height, bytes: info.size };
}

async function invokeEngine(entry, command, args, cwd) {
  let path;
  try { path = await realpath(resolve(entry)); } catch { throw new FidelityError('ENGINE_MISSING', 'one-shot-ui CLI was not found at ' + entry + '. Install the vetted MIT package separately; nothing was downloaded.'); }
  if (!(await stat(path)).isFile() || !path.endsWith('.mjs')) throw new FidelityError('ENGINE_INVALID', 'Engine entry must be an existing .mjs file');
  return await new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, [path,command,...args], { cwd, shell:false, env: { ...process.env, NO_COLOR:'1' }, windowsHide:true, stdio:['ignore','pipe','pipe'] });
    let stdout = '', stderr = '', length = 0, settled = false;
    const finish = (err, result) => { if(settled)return; settled=true; clearTimeout(timer); if(err)reject(err);else resolveResult(result); };
    const timer=setTimeout(()=>{child.kill();finish(new FidelityError('ENGINE_TIMEOUT','one-shot-ui exceeded the 90-second limit'));}, MAX_ENGINE_MS);
    child.stdout.on('data', chunk=>{length+=chunk.length; if(length>MAX_ENGINE_OUTPUT) {child.kill();finish(new FidelityError('ENGINE_OUTPUT_SIZE','Engine output too large'));} else stdout+=chunk.toString('utf8');});
    child.stderr.on('data', chunk=>{if(stderr.length<8192)stderr+=chunk.toString('utf8').slice(0,8192-stderr.length);});
    child.on('error', err=>finish(new FidelityError('ENGINE_SPAWN',err.message)));
    child.on('close', code=>{if(code!==0) return finish(new FidelityError('ENGINE_FAILED','one-shot-ui ' + command + ' exit ' + code + ': ' + stderr.slice(0,500)));let parsed;try{parsed=JSON.parse(stdout.trim());}catch{return finish(new FidelityError('ENGINE_INVALID_JSON','one-shot-ui ' + command + ' did not return valid JSON'));}finish(null, parsed);});
  });
}

export async function compareReference({reference,render,out,engineEntry=join(PROJECT_ROOT,'node_modules/one-shot-ui/dist/cli.mjs'),suggest=false}) {
  const [ref, impl] = await Promise.all([inspectPng(reference),inspectPng(render)]);
  if(ref.width!==impl.width || ref.height!==impl.height) throw new FidelityError('VIEWPORT_MISMATCH', 'Reference ' + ref.width + 'x' + ref.height + ', render ' + impl.width + 'x' + impl.height + ': capture at identical viewport/DPR; never resize screenshots to conceal differences');
  const target=resolve(out);
  if(target===ref.path || target===impl.path) throw new FidelityError('OUTPUT_CONFLICT','Output path conflicts with a PNG input');
  await mkdir(target,{recursive:true});
  const existing=await readdir(target);
  if(existing.length) throw new FidelityError('OUTPUT_NOT_EMPTY','Use an empty, dedicated report directory so previous evidence is not overwritten');
  const comparison = await invokeEngine(engineEntry,'compare',[ref.path,impl.path,'--json','--heatmap','heatmap.png'],target);
  const suggestions = suggest ? await invokeEngine(engineEntry,'suggest-fixes',[ref.path,impl.path,'--json'],target) : null;
  const report = {schema:'ffax.reference-fidelity.v1',status:'MEASURED_NOT_APPROVED',engine:'one-shot-ui',reference:ref,render:impl,viewport:{width:ref.width,height:ref.height},comparison,suggestions,outputs:{heatmap:'heatmap.png'},notes:['Reference and render must match in pixel dimensions and device scale.','Pixel metrics and CSS suggestions do not prove functional correctness or user acceptance.','No source code, remote repository or production deployment was modified by this command.']};
  await writeFile(join(target,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  return {directory:target,report};
}

if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const options=parseArgs(process.argv.slice(2));
    if(options.help) console.log('node scripts/ffax_reference_fidelity.mjs compare --reference FILE.png --render FILE.png --out EMPTY_DIR [--engine-entry ./node_modules/one-shot-ui/dist/cli.mjs] [--suggest]\nNo auto-install, network, CSS modifications or remote uploads.');
    else {const {directory,report}=await compareReference(options);console.log(JSON.stringify({ok:true,output:directory,referenceSha256:report.reference.sha256,renderSha256:report.render.sha256,report:'report.json',heatmap:'heatmap.png'}));}
  } catch (err) { console.error(JSON.stringify({ok:false,code:err.code||'UNEXPECTED',message:err.message}));process.exitCode=1; }
}
