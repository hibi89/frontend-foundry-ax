import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {auditPublicGitHubReactRepo,parseGitHubPublicRepo,GITHUB_AUDIT_MAX_FILES,comparePublicGitHubAudits} from '../src/github-readonly-intake.mjs';
const commitSha='a'.repeat(40),treeSha='b'.repeat(40);
function fixture(path,content){
 const bytes=Buffer.from(content,'utf8');
 return {path,size:bytes.length,type:'blob',sha:createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'),content:bytes.toString('base64')};
}
const app=fixture('src/App.tsx',"import React from 'react';const useAuth=()=>true;export default function App(){return <button onClick={()=>fetch('/api/login')}>Log in</button>}");
const pkg=fixture('package.json',JSON.stringify({dependencies:{react:'19.2.7'}}));
const secret=fixture('.env','GITHUB_TOKEN=SHOULD_NEVER_BE_READ');
const other=fixture('src/api.ts',"export const get =()=>fetch('/api/users')");
const blobs=[app,pkg,secret,other];
function mockGithub({items=blobs,publicRepo=true,failStatus=null,tamper=false}={}){
 const requests=[];
 const fetchImpl=async(url,init)=>{
  requests.push({url,init});
  assert.equal(init.method,'GET');assert.equal(init.credentials,'omit');assert.equal(init.redirect,'error');
  if(failStatus)return {ok:false,status:failStatus};
  let body;
  if(url.endsWith('/'))body={private:!publicRepo,full_name:'testowner/ok-react'};
  else if(url.includes('/commits/'))body={sha:commitSha,commit:{tree:{sha:treeSha}}};
  else if(url.includes('/git/trees/'))body={truncated:false,tree:items.map(({content,...m})=>m)};
  else {const hit=items.find(x=>url.endsWith('/git/blobs/'+x.sha));
   if(!hit)throw Error('UNEXPECTED_URL');body={encoding:'base64',sha:hit.sha,size:hit.size,content:tamper?'YQ==':hit.content};}
  return {ok:true,status:200,json:async()=>body};
 };
 return {fetchImpl,requests};
}
test('rejects absent consent and malformed URL or refs before external transfer',async()=>{
 for(const bad of ['https://evil.example/x/y','https://github.com/x/y?token=abc','https://github.com/x/y/blob/main','../../x','hi//repo','owner/.git']){
  assert.throws(()=>parseGitHubPublicRepo(bad),/GITHUB_REPO_INVALID/);
 }
 assert.equal(parseGitHubPublicRepo('https://github.com/testowner/ok-react.git'),'testowner/ok-react');
 const mock=mockGithub();
 await assert.rejects(auditPublicGitHubReactRepo({repository:'testowner/ok-react',fetchImpl:mock.fetchImpl}),/GITHUB_EXTERNAL_REQUEST_CONSENT_REQUIRED/);
 await assert.rejects(auditPublicGitHubReactRepo({repository:'testowner/ok-react',consent:true,ref:'../secrets',fetchImpl:mock.fetchImpl}),/GITHUB_REF_INVALID/);
 assert.equal(mock.requests.length,0);
});
test('public GitHub snapshot records exact SHA and bounded hash evidence without secret text or writes',async()=>{
 const mock=mockGithub();
 const r=await auditPublicGitHubReactRepo({repository:'https://github.com/testowner/ok-react',ref:'main',consent:true,fetchImpl:mock.fetchImpl});
 assert.equal(r.schema,'ffax-readonly-github-audit.v1');assert.equal(r.readOnly,true);
 assert.equal(r.sourceGitSha,commitSha);assert.equal(r.sourceTreeSha,treeSha);assert.equal(r.gitRemoteConnected,true);
 assert.equal(r.fileCount,3);assert.equal(r.indicators.api,2);assert.equal(r.indicators.auth,1);
 assert.equal(r.sampled,false);assert.equal(r.sourceChanged,false);
 assert.equal(r.remoteRequests,6);assert.equal(mock.requests.length,6);
 assert.match(r.sha256,/^[a-f0-9]{64}$/);
 assert.ok(!JSON.stringify(r).includes('SHOULD_NEVER_BE_READ'));
 assert.ok(!JSON.stringify(r).includes("fetch('/api/login')"));
 assert.ok(mock.requests.every(x=>x.url.startsWith('https://api.github.com/repos/testowner/ok-react/')));
 assert.ok(mock.requests.every(x=>!x.url.includes('SHOULD_NEVER_BE_READ')&&!x.url.includes('.env')));
});
test('denies private repositories, truncated tree, forged blob and rate-limit without successful audit',async()=>{
 await assert.rejects(auditPublicGitHubReactRepo({repository:'testowner/ok-react',consent:true,fetchImpl:mockGithub({publicRepo:false}).fetchImpl}),/GITHUB_PUBLIC_REPO_REQUIRED/);
 const badTree=mockGithub();const wrapped=async(u,o)=>{
  const r=await badTree.fetchImpl(u,o);if(u.includes('/git/trees/'))return {...r,json:async()=>({truncated:true,tree:[]})};return r;
 };
 await assert.rejects(auditPublicGitHubReactRepo({repository:'testowner/ok-react',consent:true,fetchImpl:wrapped}),/GITHUB_TREE_INCOMPLETE/);
 await assert.rejects(auditPublicGitHubReactRepo({repository:'testowner/ok-react',consent:true,fetchImpl:mockGithub({tamper:true}).fetchImpl}),/GITHUB_BLOB_SIZE_MISMATCH|GITHUB_BLOB_SHA_MISMATCH/);
 await assert.rejects(auditPublicGitHubReactRepo({repository:'testowner/ok-react',consent:true,fetchImpl:mockGithub({failStatus:403}).fetchImpl}),/GITHUB_RATE_LIMIT_OR_FORBIDDEN/);
});
test('high-file repositories sample limited source files with explicit incomplete flag',async()=>{
 const extra=Array.from({length:30},(_,i)=>fixture(`src/views/Page${i}.tsx`, `export default function Page${i}(){return <main>${i}</main>}`));
 const mock=mockGithub({items:[...blobs,...extra]});
 const r=await auditPublicGitHubReactRepo({repository:'testowner/ok-react',consent:true,fetchImpl:mock.fetchImpl});
 assert.equal(r.fileCount,GITHUB_AUDIT_MAX_FILES);assert.equal(r.sampled,true);
 assert.equal(r.sourceFilesEligible,extra.length+3);
 assert.equal(r.remoteRequests,3+GITHUB_AUDIT_MAX_FILES);
 assert.ok(r.files.some(f=>f.path==='src/App.tsx'));
});


test('two public commit audits yield a bounded review-only hash comparison with no extra requests',async()=>{
 const mock=mockGithub();
 const before=await auditPublicGitHubReactRepo({repository:'testowner/ok-react',consent:true,fetchImpl:mock.fetchImpl});
 const changedFiles=before.files.map(f=>f.path==='src/api.ts'
  ? {...f,sha256:'c'.repeat(64)}:f);
 const after={...before,sourceGitSha:'c'.repeat(40),sourceTreeSha:'d'.repeat(40),
  files:[...changedFiles,{path:'src/NewPanel.tsx',size:20,sha256:'e'.repeat(64)}],
  fileCount:changedFiles.length+1};
 const reqCount=mock.requests.length;
 const diff=comparePublicGitHubAudits(before,after);
 assert.equal(mock.requests.length,reqCount);
 assert.equal(diff.schema,'ffax-public-github-sample-comparison.v1');
 assert.equal(diff.changed,2);assert.equal(diff.protectedFlowChanges,1);
 assert.equal(diff.unchanged,2);assert.equal(diff.sampleIncomplete,false);
 assert.equal(diff.changes.find(x=>x.path==='src/api.ts').kind,'modified');
 assert.equal(diff.changes.find(x=>x.path==='src/NewPanel.tsx').kind,'only-in-current-sample');
 assert.equal(diff.approvalEligible,false);assert.equal(diff.prCreated,false);assert.equal(diff.sourceWrites,0);
 assert.equal(diff.remoteRequests,0);assert.ok(!JSON.stringify(diff).includes("fetch('/api/users')"));
 const same=comparePublicGitHubAudits(before,before);
 assert.equal(same.changed,0);assert.equal(same.sameCommit,true);
});
test('sample comparison explicitly refuses full-diff or safe-to-merge claims',async()=>{
 const mock=mockGithub();
 const before=await auditPublicGitHubReactRepo({repository:'testowner/ok-react',consent:true,fetchImpl:mock.fetchImpl});
 const after={...before,sampled:true,sourceGitSha:'c'.repeat(40),files:before.files.filter(x=>x.path!=='src/api.ts'),fileCount:2};
 const diff=comparePublicGitHubAudits(before,after);
 assert.equal(diff.sampleIncomplete,true);
 assert.equal(diff.changes[0].kind,'only-in-previous-sample');
 assert.equal(diff.approvalEligible,false);
 assert.match(diff.warning,/표본/);
 assert.throws(()=>comparePublicGitHubAudits(before,{...after,root:'other/repository'}),/GITHUB_COMPARE_REPOSITORY_MISMATCH/);
 assert.throws(()=>comparePublicGitHubAudits(before,{...after,fileCount:3}),/GITHUB_COMPARE_SNAPSHOT_INVALID/);
 assert.throws(()=>comparePublicGitHubAudits(before,{...after,files:[...after.files,after.files[0]],fileCount:3}),/GITHUB_COMPARE_FILE_MANIFEST_INVALID/);
 assert.throws(()=>comparePublicGitHubAudits(before,{...after,files:[{path:'.env',sha256:'f'.repeat(64),size:4}],fileCount:1}),/GITHUB_COMPARE_FILE_MANIFEST_INVALID/);
});
