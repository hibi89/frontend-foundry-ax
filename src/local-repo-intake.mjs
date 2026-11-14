/** Explicit user-selected LOCAL React folder, read-only:
 * file bytes are hashed/inspected in this browser; no fetch, uploads, execution
 * or modification of the original files; .env and build/tool internals excluded.
 */
export const INTAKE_LIMITS=Object.freeze({maxEntries:20000,maxFiles:120,maxFileBytes:524288,maxTotalBytes:4194304});
const ROOTS=new Set(['package.json','tsconfig.json','index.html','README.md']);
const CONTENT= /\.(?:tsx?|jsx?|mjs|css|json|html|svg)$/i;
const SKIP=/(^|\/)(?:\.git|node_modules|dist|build|coverage|\.next|\.env(?:\..*)?|\.npmrc|\.ssh|secrets?|credentials?|\.vscode|\.idea)(?:\/|$)/i;
const UTF8=new TextDecoder('utf-8',{fatal:true});
function assertPath(name){
 if(typeof name!=='string'||name.length>320||name.includes('\\')||name.includes('\u0000')||
    name.startsWith('/')||name.split('/').some(s=>!s||s==='.'||s==='..'))throw Error('LOCAL_REPO_PATH_INVALID');
 const parts=name.split('/');
 if(parts.length<2)throw Error('LOCAL_REPO_FOLDER_REQUIRED');
 return {root:parts.shift(),rel:parts.join('/')};
}
function hex(bytes){return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function sha(bytes){
 if(!globalThis.crypto?.subtle?.digest)throw Error('LOCAL_REPO_CRYPTO_UNAVAILABLE');
 return hex(await globalThis.crypto.subtle.digest('SHA-256',bytes));
}
function hints(content){
 return {
  api:(content.match(/\b(?:fetch\s*\(|axios\s*\.|useQuery\s*\(|useMutation\s*\()/g)||[]).length,
  route:(content.match(/\b(?:Route|createBrowserRouter|useNavigate|useRouter)\b/g)||[]).length,
  auth:(content.match(/\b(?:useAuth|signIn|signOut|useSession)\b/g)||[]).length,
  events:(content.match(/\b(?:onClick|onSubmit|onChange)\s*=/g)||[]).length
 };
}
export async function auditLocalReactFolder(selection){
 const items=Array.from(selection||[]);
 if(!items.length)throw Error('LOCAL_REPO_NO_FILES_SELECTED');
 if(items.length>INTAKE_LIMITS.maxEntries)throw Error('LOCAL_REPO_TOO_MANY_ENTRIES_CLEAN_COPY_REQUIRED');
 const selected=[], seen=new Set();let root=null,skipped=0;
 for(const item of items){
  const {root:r,rel}=assertPath(item.webkitRelativePath);
  if(root===null)root=r;
  if(root!==r)throw Error('LOCAL_REPO_MULTIPLE_ROOTS_REFUSED');
  if(seen.has(rel))throw Error('LOCAL_REPO_DUPLICATE_PATH');
  seen.add(rel);
  if(SKIP.test(rel)){skipped++;continue;}
  if(!(ROOTS.has(rel)||((rel.startsWith('src/')||rel.startsWith('public/'))&&CONTENT.test(rel)))){
   skipped++;continue;
  }
  if(!Number.isSafeInteger(item.size)||item.size<0||item.size>INTAKE_LIMITS.maxFileBytes)
    throw Error('LOCAL_REPO_FILE_TOO_LARGE');
  if(typeof item.arrayBuffer!=='function')throw Error('LOCAL_REPO_NOT_A_FILE');
  selected.push({file:item,path:rel,size:item.size});
 }
 if(selected.length>INTAKE_LIMITS.maxFiles)throw Error('LOCAL_REPO_TOO_MANY_SOURCE_FILES');
 const total=selected.reduce((n,x)=>n+x.size,0);
 if(total>INTAKE_LIMITS.maxTotalBytes)throw Error('LOCAL_REPO_CONTENT_LIMIT_EXCEEDED');
 if(!selected.some(x=>x.path==='package.json')||!selected.some(x=>x.path.startsWith('src/')&&x.path.endsWith('.tsx')))
  throw Error('LOCAL_REPO_REACT_TSX_REQUIRED');
 const manifest=[],counts={api:0,route:0,auth:0,events:0};
 let pkg=null;
 for(const item of selected.sort((a,b)=>a.path.localeCompare(b.path,'en'))){
  const bytes=await item.file.arrayBuffer();
  if(bytes.byteLength!==item.size)throw Error('LOCAL_REPO_FILE_CHANGED_DURING_READ');
  const content=UTF8.decode(bytes),digest=await sha(bytes);
  manifest.push({path:item.path,size:item.size,sha256:digest});
  if(item.path==='package.json'){
   try{pkg=JSON.parse(content);}catch{throw Error('LOCAL_REPO_PACKAGE_INVALID');}
  }else if(item.path.startsWith('src/')){
   const x=hints(content);
   for(const k of Object.keys(counts))counts[k]+=x[k];
  }
 }
 if(!pkg||typeof pkg!=='object'||Array.isArray(pkg)||!(
  pkg.dependencies?.react||pkg.devDependencies?.react))
  throw Error('LOCAL_REPO_REACT_DEPENDENCY_REQUIRED');
 const fingerprint=await sha(new TextEncoder().encode(manifest.map(x=>x.path+'\u0000'+x.sha256+'\u0000'+x.size).join('\n')));
 return Object.freeze({
  schema:'ffax-readonly-folder-audit.v1',root,readOnly:true,sourceGitSha:null,
  gitRemoteConnected:false,sourceChanged:false,remoteRequests:0,codeExecuted:false,
  fileCount:manifest.length,bytes:total,skippedEntries:skipped,sha256:fingerprint,
  estimatesOnly:true,indicators:counts,files:manifest,
  warning:'안전한 원본 일부만 검사한 로컬 스냅샷입니다. GitHub SHA/고객 인증/API 회귀 보증 아님.'
 });
}
