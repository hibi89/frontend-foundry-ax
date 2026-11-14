/** FFAX local-only read -> snapshot -> review -> explicit approved UI patch pipeline.
 * No project code is executed by this module, no GitHub token or network is used.
 */
import { lstat, readFile, readdir, mkdir, writeFile, rm, stat, open, rename } from 'node:fs/promises';
import { resolve, relative, join, dirname, sep, posix, basename } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

const FILE_LIMIT = 512 * 1024;
const TOTAL_LIMIT = 4 * 1024 * 1024;
const COUNT_LIMIT = 120;
const allowedNames = new Set(['package.json','tsconfig.json','index.html','README.md']);
const allowedSuffixes = /\.(?:tsx|ts|jsx|js|mjs|css|json|html|svg)$/;
const protectedPath = /(^|\/)(?:\.env(?:\..+)?|\.git|node_modules|dist|build|coverage|\.next|secrets?|credentials?|\.npmrc|\.ssh|id_rsa)(?:\/|$)/i;
const validPath = rel => typeof rel === 'string' && !!rel && rel.length <= 240 && !rel.startsWith('/') && !rel.includes('\\') && rel.split('/').every(p => !!p && p !== '.' && p !== '..') && !protectedPath.test(rel);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const projectDigest = files => hash(Buffer.from(files.map(f => `${f.path}\u0000${f.sha256}\u0000${f.size}`).sort().join('\n')));
export const PROJECT_FILE_LIMITS = Object.freeze({ maxFiles: COUNT_LIMIT, maxFileBytes: FILE_LIMIT, maxTotalBytes: TOTAL_LIMIT });

async function collect(dir) {
  const source = resolve(dir);
  const rootStat = await lstat(source);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('SOURCE_NOT_DIRECTORY');
  // Compare reparse/symlink identity at each path component, not its textual realpath.
  // On Windows realpath may canonicalize volume names/aliases even for ordinary directories;
  // a string comparison caused false rejections of every native fixture.
  // This explicitly refuses any symlink/junction ancestor while preserving no-link paths.
  let cursor = source;
  while (true) {
    const info = await lstat(cursor);
    if (info.isSymbolicLink()) throw new Error('SOURCE_SYMLINK_NOT_ALLOWED');
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  const files = []; let bytesCount = 0;
  async function walk(abs, relPrefix = '') {
    const entries = (await readdir(abs, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name));
    for (const ent of entries) {
      const rel = relPrefix ? `${relPrefix}/${ent.name}` : ent.name;
      if (ent.isSymbolicLink()) throw new Error(`SYMLINK_REFUSED:${rel}`);
      if (protectedPath.test(rel)) throw new Error(`SENSITIVE_PATH_REFUSED:${rel}`);
      if (!validPath(rel)) throw new Error(`UNSAFE_PATH:${rel}`);
      if (ent.isDirectory()) { await walk(join(abs, ent.name), rel); continue; }
      if (!ent.isFile()) throw new Error(`SPECIAL_FILE_REFUSED:${rel}`);
      if (!(allowedNames.has(rel) || ((rel.startsWith('src/') || rel.startsWith('public/')) && allowedSuffixes.test(rel)))) throw new Error(`UNEXPECTED_FILE:${rel}`);
      const fs = await lstat(join(abs, ent.name));
      if (!fs.isFile() || fs.nlink > 1 || fs.size > FILE_LIMIT) throw new Error(`UNSAFE_FILE:${rel}`);
      bytesCount += fs.size;
      if (bytesCount > TOTAL_LIMIT || files.length >= COUNT_LIMIT) throw new Error('PROJECT_LIMIT_EXCEEDED');
      const content = await readFile(join(abs, ent.name));
      const after = await lstat(join(abs, ent.name));
      if (after.ino !== fs.ino || after.dev !== fs.dev || after.size !== fs.size || after.mtimeMs !== fs.mtimeMs) throw new Error(`SOURCE_CHANGED_DURING_SCAN:${rel}`);
      files.push({path:rel,sha256:hash(content),size:content.length,content});
    }
  }
  await walk(source);
  if (!files.find(f => f.path === 'package.json') || !files.some(f => f.path.endsWith('.tsx') && f.path.startsWith('src/'))) throw new Error('NOT_REACT_TYPESCRIPT_PROJECT');
  let pkg;
  try {pkg = JSON.parse(files.find(f=>f.path==='package.json').content.toString('utf8'));} catch {throw new Error('INVALID_PACKAGE_JSON');}
  if (!(pkg.dependencies?.react || pkg.devDependencies?.react)) throw new Error('REACT_DEPENDENCY_REQUIRED');
  return {root:source,files:files.sort((a,b)=>a.path.localeCompare(b.path)),digest:projectDigest(files)};
}

/** Read-only scan without creating outputs, does not trust a git checkout or node_modules. */
export async function inspectReactProject(dir) {
  const o=await collect(dir);
  return { source:o.root, files:o.files.map(({content,...meta})=>meta), digest:o.digest, count:o.files.length };
}

export async function importReactProject({ source, dest, id }) {
  if (!id || !/^[A-Za-z0-9-]{3,64}$/.test(id)) throw new Error('INVALID_PROJECT_ID');
  const original=await collect(source);
  const out=resolve(dest);
  if (out === original.root || out.startsWith(original.root + sep) || original.root.startsWith(out+sep)) throw new Error('DESTINATION_MUST_BE_ISOLATED');
  const workDir=join(out,id);
  let created=false;
  try {
    await mkdir(workDir, { recursive:false }); created=true;
    await mkdir(join(workDir,'source'));
    for (const f of original.files) {
      const to=join(workDir,'source',f.path);
      await mkdir(dirname(to),{recursive:true});
      // 'wx' never overwrites existing content; built from read-only snapshot.
      await writeFile(to,f.content,{flag:'wx',mode:0o600});
    }
    const reread=await collect(join(workDir,'source'));
    const after=await collect(original.root);
    if (reread.digest!==original.digest || after.digest!==original.digest) throw new Error('SOURCE_CHANGED_OR_COPY_MISMATCH');
    const manifest={schema:'ffax-project-snapshot.v1',id,source:original.root,createdAt:new Date().toISOString(),digest:original.digest,files:original.files.map(({content,...m})=>m),writePolicy:'read-only source; isolated source copy; UI patches only after approval'};
    await writeFile(join(workDir,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx',mode:0o600});
    return {workDir,sourceDir:join(workDir,'source'),manifest};
  } catch(e) { if (created) await rm(workDir,{recursive:true,force:true}); throw e; }
}

function validatePatch(patch){
  if (!patch || !validPath(patch.path) || !/^src\/ui\/[A-Za-z0-9_-]+\.css$/.test(patch.path)) throw new Error('UI_PATCH_ALLOWLIST_ONLY');
  if (!/^[a-f0-9]{64}$/.test(patch.expectedSha || '')) throw new Error('EXPECTED_SHA_REQUIRED');
  if (typeof patch.content !== 'string' || patch.content.length>FILE_LIMIT) throw new Error('PATCH_CONTENT_LIMIT');
  if (/(?:@import|url\s*\(|expression\s*\(|<script|javascript:)/i.test(patch.content)) throw new Error('UNSAFE_CSS_REFUSED');
  if (patch.content.includes('\0')) throw new Error('INVALID_PATCH_CONTENT');
}
async function safeWorkFile(sourceDir, rel){
  const abs=resolve(sourceDir,rel);
  if (!abs.startsWith(resolve(sourceDir)+sep)) throw new Error('PATH_ESCAPE');
  const s=await lstat(abs);
  if (!s.isFile() || s.isSymbolicLink() || s.nlink>1) throw new Error('UNSAFE_TARGET');
  return abs;
}
export function createUIPatch({ path='src/ui/theme.css', expectedSha, content, reason='Design token update' }) {
  const patch={schema:'ffax-ui-patch.v1',id:randomUUID(),path,expectedSha,content,reason};
  validatePatch(patch);return patch;
}
/** No original code changed. Preview validates exact blob hash and returns diff metadata. */
export async function previewUIPatch({sourceDir,patch}) {
  validatePatch(patch);
  const abs=await safeWorkFile(sourceDir,patch.path), old=await readFile(abs);
  if (hash(old)!==patch.expectedSha) throw new Error('SOURCE_SHA_MISMATCH');
  return {path:patch.path,oldSha:hash(old),newSha:hash(Buffer.from(patch.content)),oldBytes:old.length,newBytes:Buffer.byteLength(patch.content),reason:patch.reason,needsApproval:true,changed:old.toString('utf8')!==patch.content};
}
export async function applyApprovedUIPatch({workDir,patch,approval,jobId}) {
  const dir=resolve(workDir), sourceDir=join(dir,'source');
  if (approval !== 'APPROVE_UI_PATCH' || !jobId || !/^[a-zA-Z0-9-]{4,80}$/.test(jobId)) throw new Error('EXPLICIT_APPROVAL_REQUIRED');
  const reviewDir=join(dir,'reviews');await mkdir(reviewDir,{recursive:true});
  const receiptFile=join(reviewDir,`${jobId}.json`);
  try{await lstat(receiptFile);throw new Error('DUPLICATE_JOB_ID');} catch(e){if(e.code!=='ENOENT')throw e;}
  const preview=await previewUIPatch({sourceDir,patch});
  const manifest=JSON.parse(await readFile(join(dir,'manifest.json'),'utf8'));
  if (manifest.schema!=='ffax-project-snapshot.v1' || !manifest.files.some(f=>f.path===patch.path && f.sha256===patch.expectedSha)) throw new Error('MANIFEST_SHA_MISMATCH');
  const abs=await safeWorkFile(sourceDir,patch.path);
  const old=await readFile(abs);
  const oldSha=hash(old);
  if(oldSha!==patch.expectedSha) throw new Error('PATCH_CONFLICT');
  const newBytes=Buffer.from(patch.content,'utf8');
  const tmp=join(reviewDir,`${jobId}.tmp`);
  // Store original privately as a backup before modifying the isolated clone.
  await writeFile(join(reviewDir,`${jobId}.before`),old,{flag:'wx',mode:0o600});
  try {
    await writeFile(tmp,newBytes,{flag:'wx',mode:0o600});
    await rename(tmp,abs);
    if(hash(await readFile(abs))!==preview.newSha)throw new Error('PATCH_READBACK_MISMATCH');
    const receipt={schema:'ffax-ui-review.v1',jobId,patchId:patch.id,path:patch.path,oldSha,newSha:preview.newSha,approval,sourceDigest:manifest.digest,appliedAt:new Date().toISOString(),state:'applied-in-isolated-copy',gitPush:false,productionDeploy:false};
    await writeFile(receiptFile,JSON.stringify(receipt,null,2),{flag:'wx',mode:0o600});
    return receipt;
  } catch(e) {
    await writeFile(abs,old,{mode:0o600});
    await rm(tmp,{force:true});
    await rm(join(reviewDir,`${jobId}.before`),{force:true});
    throw e;
  }
}
export async function rollbackUIPatch({workDir,jobId,approval}) {
  if(approval!=='APPROVE_ROLLBACK' || !/^[a-zA-Z0-9-]{4,80}$/.test(jobId||''))throw new Error('EXPLICIT_ROLLBACK_APPROVAL_REQUIRED');
  const dir=resolve(workDir), receiptPath=join(dir,'reviews',`${jobId}.json`);
  const receipt=JSON.parse(await readFile(receiptPath,'utf8'));
  if(receipt.jobId!==jobId || receipt.state!=='applied-in-isolated-copy')throw new Error('ROLLBACK_NOT_ALLOWED');
  const abs=await safeWorkFile(join(dir,'source'),receipt.path);
  if(hash(await readFile(abs))!==receipt.newSha)throw new Error('ROLLBACK_CONFLICT');
  const before=await readFile(join(dir,'reviews',`${jobId}.before`));
  if(hash(before)!==receipt.oldSha)throw new Error('BACKUP_MISMATCH');
  const tmp=join(dir,'reviews',`${jobId}.rollback.tmp`);
  await writeFile(tmp,before,{flag:'wx',mode:0o600});await rename(tmp,abs);
  if(hash(await readFile(abs))!==receipt.oldSha)throw new Error('ROLLBACK_VERIFY_FAIL');
  const updated={...receipt,state:'rolled-back',rolledBackAt:new Date().toISOString()};
  await writeFile(receiptPath,JSON.stringify(updated,null,2));
  return updated;
}
export async function verifyOriginalUnchanged({workDir}) {
  const m=JSON.parse(await readFile(join(resolve(workDir),'manifest.json'),'utf8'));
  const original=await inspectReactProject(m.source);
  return {unchanged:original.digest===m.digest,initialDigest:m.digest,currentDigest:original.digest};
}

/** Review-only pull-request metadata; does not request credentials or write to GitHub. */
export function createReviewPlan({repo,branch,base,commit,receipt,checks}) {
  if (!/^[-\w.]+\/[-\w.]+$/.test(repo||'') || !/^feature\/[a-z0-9/_-]{3,100}$/i.test(branch||'') || !/^[-\w./]+$/.test(base||'') || !/^[a-f\d]{40}$/.test(commit||'')) throw new Error('INVALID_GIT_REVIEW_INPUT');
  if (branch===base || !receipt || receipt.state!=='applied-in-isolated-copy' || receipt.gitPush || receipt.productionDeploy || !checks || checks.length<5 || checks.some(x=>x.status!=='pass')) throw new Error('GIT_REVIEW_NOT_READY');
  return {schema:'ffax-git-review-plan.v1',repo,head:branch,base,sourceCommit:commit,reviewRequired:true,mergeAllowed:false,deployAllowed:false,receiptId:receipt.jobId,tests:checks,rollback:`git revert <approved-commit-sha>`,purpose:'human review of isolated UI-only changes; never auto-merge/deploy'};
}
