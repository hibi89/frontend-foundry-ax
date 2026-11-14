/**
 * Separate, consent-gated PUBLIC GitHub commit comparison.
 * Reads changed-file metadata only; discards API patches and source contents.
 * This does NOT authorize a pull request, merge, deployment or source modification.
 */
import {parseGitHubPublicRepo} from './github-readonly-intake.mjs';

const SHA=/^[0-9a-f]{40}$/;
const MAX_RESPONSE_BYTES=2097152;
const MAX_FILES=300;
const STATUSES=new Set(['added','removed','modified','renamed','copied','changed','unchanged']);
const RESTRICTED=/(^|\/)(?:\.env(?:\.[^/]*)?|(?:id_[^.\/]+|[^/]+)\.(?:pem|key|p12|pfx)|credentials?(?:\/|[._-])|secrets?(?:\/|[._-]))/i;
const PROTECTED=/(^|\/)(?:(?:api|auth|oauth|login|logout|session|security|middleware|routes?|payment|billing|db|database|prisma|schema|webhooks?)(?:\/|[._-])|(?:package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|vite\.config\.[^/]+|next\.config\.[^/]+)$)|(^|\/)\.github\/workflows\//i;
function validatePath(p){
 return typeof p==='string'&&p.length>=1&&p.length<=500&&!/[\u0000-\u001f\\]/.test(p)&&
  !p.startsWith('/')&&!p.split('/').some(part=>part===''||part==='.'||part==='..');
}
function assertSamplePair(pair){
 if(!pair||typeof pair!=='object'||Array.isArray(pair)||
    pair.schema!=='ffax-public-github-sample-comparison.v1'||
    pair.manualReviewRequired!==true||pair.approvalEligible!==false||
    pair.gitPush!==false||pair.prCreated!==false||pair.sourceWrites!==0||
    !SHA.test(pair.previousCommit||'')||!SHA.test(pair.currentCommit||''))
  throw Error('GITHUB_COMPARE_REVIEW_INPUT_INVALID');
 const repository=parseGitHubPublicRepo(pair.repository);
 return {repository,base:pair.previousCommit,head:pair.currentCommit};
}
async function responseTextLimited(response){
 if(response.body?.getReader){
  const reader=response.body.getReader();
  const chunks=[];let length=0;
  try{
   while(true){
    const {done,value}=await reader.read();
    if(done)break;
    if(!(value instanceof Uint8Array))throw Error('GITHUB_COMPARE_BODY_INVALID');
    length+=value.byteLength;
    if(length>MAX_RESPONSE_BYTES)throw Error('GITHUB_COMPARE_BODY_TOO_LARGE');
    chunks.push(value);
   }
   const full=new Uint8Array(length);let offset=0;
   for(const part of chunks){full.set(part,offset);offset+=part.length;}
   return new TextDecoder('utf-8',{fatal:true}).decode(full);
  }finally{reader.releaseLock();}
 }
 if(typeof response.text!=='function')throw Error('GITHUB_COMPARE_BODY_INVALID');
 const raw=await response.text();
 if(typeof raw!=='string'||new TextEncoder().encode(raw).byteLength>MAX_RESPONSE_BYTES)
  throw Error('GITHUB_COMPARE_BODY_TOO_LARGE');
 return raw;
}
function riskFor(path,previous){
 const names=[path,previous].filter(Boolean);
 if(names.some(p=>RESTRICTED.test(p)))return 'RESTRICTED_PATH_REVIEW';
 if(names.some(p=>PROTECTED.test(p)))return 'PROTECTED_FLOW_REVIEW';
 return 'MANUAL_CODE_REVIEW';
}
function safeStats(file){
 if(!file||!validatePath(file.filename)||!STATUSES.has(file.status)||
    (file.status==='renamed'&&!validatePath(file.previous_filename)))
  throw Error('GITHUB_COMPARE_FILE_INVALID');
 const {additions,deletions,changes}=file;
 if(![additions,deletions,changes].every(n=>Number.isSafeInteger(n)&&n>=0))
  throw Error('GITHUB_COMPARE_STATS_INVALID');
 return {
  path:file.filename,
  status:file.status,
  previousPath:file.status==='renamed'?file.previous_filename:null,
  additions,deletions,changes,
  risk:riskFor(file.filename,file.status==='renamed'?file.previous_filename:null)
 };
}
export async function reviewPublicGitHubCommitChanges({
 sampleComparison,consent=false,fetchImpl=globalThis.fetch,timeoutMs=12000
}={}){
 // Consent and schema checks precede any network call.
 if(consent!==true)throw Error('GITHUB_COMPARE_EXTERNAL_CONSENT_REQUIRED');
 const {repository,base,head}=assertSamplePair(sampleComparison);
 if(typeof fetchImpl!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<100||timeoutMs>30000)
  throw Error('GITHUB_COMPARE_TRANSPORT_INVALID');
 const endpoint='https://api.github.com/repos/'+repository+'/compare/'+base+'...'+head;
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),timeoutMs);
 try{
  const response=await fetchImpl(endpoint,{
   method:'GET',redirect:'error',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',
   signal:ac.signal,headers:{accept:'application/vnd.github+json'}
  });
  if(!response?.ok){
   if(response?.status===403||response?.status===429)throw Error('GITHUB_COMPARE_RATE_LIMIT_OR_FORBIDDEN');
   if(response?.status===404)throw Error('GITHUB_COMPARE_PUBLIC_REFS_NOT_FOUND');
   throw Error('GITHUB_COMPARE_REMOTE_HTTP_FAILURE');
  }
  const contentType=response.headers?.get?.('content-type')||'';
  if(!/^application\/(?:json|[^;\s]+\+json)\b/i.test(contentType))
   throw Error('GITHUB_COMPARE_CONTENT_TYPE_INVALID');
  let body;
  try{body=JSON.parse(await responseTextLimited(response));}
  catch(e){if(/^GITHUB_/.test(e?.message||''))throw e;throw Error('GITHUB_COMPARE_RESPONSE_INVALID');}
  if(!body||typeof body!=='object'||Array.isArray(body)||
     body.base_commit?.sha!==base||
     !['ahead','identical','behind','diverged'].includes(body.status)||
     !Number.isSafeInteger(body.ahead_by)||body.ahead_by<0||
     !Number.isSafeInteger(body.behind_by)||body.behind_by<0||
     !Number.isSafeInteger(body.total_commits)||body.total_commits<0||
     !Array.isArray(body.files)||body.files.length>MAX_FILES||
     (body.status==='identical'&&body.files.length>0))
   throw Error('GITHUB_COMPARE_RESPONSE_INVALID');
  const files=body.files.map(safeStats);
  const seen=new Set();
  for(const f of files){
   if(seen.has(f.path))throw Error('GITHUB_COMPARE_DUPLICATE_FILE');
   seen.add(f.path);
  }
  const possiblyTruncated=files.length===MAX_FILES||body.total_commits>250;
  const protectedCount=files.filter(f=>f.risk==='PROTECTED_FLOW_REVIEW').length;
  const restrictedCount=files.filter(f=>f.risk==='RESTRICTED_PATH_REVIEW').length;
  return Object.freeze({
   schema:'ffax-public-github-commit-review.v1',repository,baseCommit:base,headCommit:head,
   relationship:body.status,aheadBy:body.ahead_by,behindBy:body.behind_by,
   totalCommits:body.total_commits,changedFilesListed:files.length,
   possiblyTruncated,protectedCount,restrictedCount,
   files,externalRequests:1,sourceContentIncluded:false,codeExecuted:false,
   sourceWrites:0,gitPush:false,prCreated:false,approvalEligible:false,
   manualReviewRequired:true,
   warning:possiblyTruncated
    ?'GitHub compare API 표시 한도(변경 파일 300건 또는 커밋 250건)에 걸릴 수 있어 전체 diff라고 주장할 수 없습니다. 적용/PR 승인 불가.'
    :'GitHub 변경 파일 메타데이터(이름·상태·라인 수)만 조회했습니다. 실제 코드 diff/기능·API·인증 보존 검증 아님. 적용/PR 승인 불가.'
  });
 }catch(e){
  if(e?.name==='AbortError')throw Error('GITHUB_COMPARE_TIMEOUT');
  if(/^GITHUB_/.test(e?.message||''))throw e;
  throw Error('GITHUB_COMPARE_NETWORK_OR_RESPONSE_FAILURE');
 }finally{clearTimeout(timer);}
}
