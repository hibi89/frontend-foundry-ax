/** Explicit owner-initiated public GitHub React audit; no tokens, writes, or source execution.
 * GitHub API is contacted only after UI consent and button click. Data is inspected
 * in memory, returning bounded evidence rather than source text or credentials.
 */
import {auditLocalReactFolder,INTAKE_LIMITS} from './local-repo-intake.mjs';

export const GITHUB_AUDIT_MAX_FILES=16;
const ALLOWED_SOURCE=/\.(?:tsx?|jsx?|mjs|css|json|html|svg)$/i;
const SECRET_PATH=/(^|\/)(?:\.git|node_modules|dist|build|coverage|\.next|\.env(?:\..*)?|\.npmrc|\.ssh|secrets?|credentials?|\.vscode|\.idea)(?:\/|$)/i;
const HEX40=/^[a-f0-9]{40}$/;
const VALID_REF=/^(?!\.)(?!.*\.\.)(?!.*\/\/)[A-Za-z0-9_./-]{1,100}$/;

export function parseGitHubPublicRepo(value){
 if(typeof value!=='string'||value.length>230)throw Error('GITHUB_REPO_INVALID');
 let raw=value.trim();
 if(raw.startsWith('https://')){
  let u;try{u=new URL(raw);}catch{throw Error('GITHUB_REPO_INVALID');}
  if(u.protocol!=='https:'||u.hostname!=='github.com'||u.port||u.username||u.password||u.search||u.hash)
   throw Error('GITHUB_REPO_INVALID');
  raw=u.pathname.replace(/^\//,'').replace(/\/$/,'');
 }
 raw=raw.replace(/\.git$/,'');
 if(!/^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9_.-]{1,100}$/.test(raw)||raw.split('/')[1]==='.'||raw.split('/')[1]==='..')
  throw Error('GITHUB_REPO_INVALID');
 return raw;
}
function sourceCandidate(entry){
 const p=entry?.path;
 if(!p||typeof p!=='string'||p.length>300||p.includes('\\')||p.includes('\0')||
   p.split('/').some(x=>!x||x==='.'||x==='..')||SECRET_PATH.test(p))return false;
 if(p==='package.json')return true;
 if(!(p.startsWith('src/')||p.startsWith('public/')))return false;
 return ALLOWED_SOURCE.test(p);
}
function priority(entry){
 const p=entry.path;
 return p==='package.json'?-100:p.toLowerCase().endsWith('app.tsx')?-90:
        /(?:auth|route|api|pages|hooks|components)/i.test(p)?-60:
        p.endsWith('.tsx')?-40:0;
}
async function verifyBlobSha(bytes,expected){
 const prefix=new TextEncoder().encode(`blob ${bytes.byteLength}\0`);
 const input=new Uint8Array(prefix.byteLength+bytes.byteLength);input.set(prefix);input.set(bytes,prefix.byteLength);
 const hash=await globalThis.crypto.subtle.digest('SHA-1',input);
 const actual=[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
 if(actual!==expected)throw Error('GITHUB_BLOB_SHA_MISMATCH');
}
function b64bytes(value){
 if(typeof value!=='string'||value.length>Math.ceil(INTAKE_LIMITS.maxFileBytes*4/3)+5000)
  throw Error('GITHUB_BLOB_TOO_LARGE');
 let raw;try{raw=atob(value.replace(/\s/g,''));}catch{throw Error('GITHUB_BLOB_INVALID');}
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
export async function auditPublicGitHubReactRepo({repository,ref='main',consent=false,fetchImpl=globalThis.fetch}={}){
 if(consent!==true)throw Error('GITHUB_EXTERNAL_REQUEST_CONSENT_REQUIRED');
 const repo=parseGitHubPublicRepo(repository);
 if(typeof ref!=='string'||!VALID_REF.test(ref)||ref.endsWith('/')||ref.includes('@{')||ref.endsWith('.lock'))
  throw Error('GITHUB_REF_INVALID');
 if(typeof fetchImpl!=='function')throw Error('GITHUB_FETCH_UNAVAILABLE');
 const endpoint=`https://api.github.com/repos/${repo}`;
 let requests=0;
 async function query(url){
  if(!url.startsWith(endpoint+'/'))throw Error('GITHUB_ENDPOINT_FORBIDDEN');
  if(requests>=3+GITHUB_AUDIT_MAX_FILES)throw Error('GITHUB_REQUEST_BUDGET_EXCEEDED');
  requests++;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetchImpl(url,{method:'GET',redirect:'error',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal,headers:{Accept:'application/vnd.github+json'}});
   if(!response||!response.ok){
    if(response?.status===403||response?.status===429)throw Error('GITHUB_RATE_LIMIT_OR_FORBIDDEN');
    if(response?.status===404)throw Error('GITHUB_PUBLIC_REPO_OR_REF_NOT_FOUND');
    throw Error('GITHUB_REMOTE_HTTP_FAILURE');
   }
   const body=await response.json();
   if(!body||typeof body!=='object')throw Error('GITHUB_RESPONSE_INVALID');
   return body;
  }catch(err){
   if(String(err?.message||'').startsWith('GITHUB_'))throw err;
   throw Error('GITHUB_NETWORK_OR_RESPONSE_FAILURE');
  }finally{clearTimeout(timer);}
 }
 const metadata=await query(endpoint+'/');
 if(metadata.private!==false||metadata.full_name?.toLowerCase()!==repo.toLowerCase())
  throw Error('GITHUB_PUBLIC_REPO_REQUIRED');
 const commit=await query(endpoint+'/commits/'+encodeURIComponent(ref));
 if(!HEX40.test(commit.sha||'')||!HEX40.test(commit.commit?.tree?.sha||''))throw Error('GITHUB_COMMIT_INVALID');
 const tree=await query(endpoint+'/git/trees/'+commit.commit.tree.sha+'?recursive=1');
 if(tree.truncated||!Array.isArray(tree.tree)||tree.tree.length>20000)throw Error('GITHUB_TREE_INCOMPLETE');
 const eligible=tree.tree.filter(x=>x.type==='blob'&&sourceCandidate(x)&&
   Number.isSafeInteger(x.size)&&x.size>=0&&x.size<=INTAKE_LIMITS.maxFileBytes&&HEX40.test(x.sha||''));
 if(!eligible.some(x=>x.path==='package.json')||!eligible.some(x=>x.path.startsWith('src/')&&x.path.endsWith('.tsx')))
  throw Error('GITHUB_REACT_TSX_REQUIRED');
 const chosen=eligible.sort((a,b)=>priority(a)-priority(b)||a.path.localeCompare(b.path,'en')).slice(0,GITHUB_AUDIT_MAX_FILES);
 if(!chosen.some(x=>x.path==='package.json')||!chosen.some(x=>x.path.startsWith('src/')&&x.path.endsWith('.tsx')))
  throw Error('GITHUB_REACT_TSX_REQUIRED');
 if(chosen.reduce((n,x)=>n+x.size,0)>INTAKE_LIMITS.maxTotalBytes)throw Error('GITHUB_BYTES_LIMIT_EXCEEDED');
 const files=[];
 for(const entry of chosen){
  const blob=await query(endpoint+'/git/blobs/'+entry.sha);
  if(blob.encoding!=='base64'||blob.sha!==entry.sha||blob.size!==entry.size)throw Error('GITHUB_BLOB_METADATA_MISMATCH');
  const bytes=b64bytes(blob.content);
  if(bytes.byteLength!==entry.size)throw Error('GITHUB_BLOB_SIZE_MISMATCH');
  await verifyBlobSha(bytes,entry.sha);
  files.push({webkitRelativePath:'github-public/'+entry.path,size:entry.size,arrayBuffer:async()=>bytes.slice().buffer});
 }
 const inspected=await auditLocalReactFolder(files);
 return Object.freeze({
  ...inspected,schema:'ffax-readonly-github-audit.v1',root:repo,
  sourceGitSha:commit.sha,sourceTreeSha:commit.commit.tree.sha,
  gitRemoteConnected:true,publicOnly:true,sourceChanged:false,codeExecuted:false,
  remoteRequests:requests,sourceFilesEligible:eligible.length,
  sampled:chosen.length<eligible.length,readOnly:true,
  warning:'공개 GitHub API의 고정 커밋에서 최대 16개 허용 파일만 검사한 표본입니다. 인증·실행/API 회귀·diff/PR/원본 변경 검증 아님.'
 });
}
