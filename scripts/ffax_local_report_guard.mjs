/* Shared guard for local report directories. Do not write results inside FFAX
 * source, through output symlinks, or over an existing report. */
import {lstat,realpath,mkdir,readdir} from 'node:fs/promises';
import {resolve,dirname,basename,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const PROJECT_ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const guardError=code=>{throw Error(code);};
function under(path,root){
 const p=process.platform==='win32'?path.toLowerCase():path;
 const r=process.platform==='win32'?root.toLowerCase():root;
 return p===r||p.startsWith(r+sep);
}
export async function reserveLocalReportDirectory(out,{allowEmptyExisting=false}={}){
 if(typeof out!=='string'||!out.trim())guardError('REPORT_OUTPUT_REQUIRED');
 const path=resolve(out);
 let project,parent;
 try{[project,parent]=await Promise.all([realpath(PROJECT_ROOT),realpath(dirname(path))]);}
 catch{guardError('REPORT_OUTPUT_PARENT_UNAVAILABLE');}
 // Parent realpath prevents aliases into src/.github/other protected repository files.
 if(under(resolve(parent,basename(path)),project))guardError('REPORT_OUTPUT_INSIDE_SOURCE');
 let existing;
 try{existing=await lstat(path);}
 catch(e){if(e?.code!=='ENOENT')guardError('REPORT_OUTPUT_UNSAFE');}
 if(existing){
  if(existing.isSymbolicLink()||!existing.isDirectory())guardError('REPORT_OUTPUT_UNSAFE');
  if(!allowEmptyExisting)guardError('REPORT_OUTPUT_EXISTS');
  if((await readdir(path)).length)guardError('REPORT_OUTPUT_NOT_EMPTY');
 }else{
  // A fresh, non-recursive mkdir is exclusive: an intervening symlink fails.
  await mkdir(path,{recursive:false,mode:0o700});
 }
 let finalStat,canonical;
 try{[finalStat,canonical]=await Promise.all([lstat(path),realpath(path)]);}
 catch{guardError('REPORT_OUTPUT_UNSAFE');}
 if(!finalStat.isDirectory()||finalStat.isSymbolicLink()||under(canonical,project))
  guardError('REPORT_OUTPUT_UNSAFE');
 return path;
}
