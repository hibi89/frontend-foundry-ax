import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewPublicGitHubCommitChanges} from '../src/github-compare-review.mjs';
const A='a'.repeat(40),B='b'.repeat(40),repo='sample/react-ui';
const sample={
 schema:'ffax-public-github-sample-comparison.v1',repository:repo,
 previousCommit:A,currentCommit:B,manualReviewRequired:true,
 approvalEligible:false,gitPush:false,prCreated:false,sourceWrites:0
};
const record=(path,status='modified',previous_filename)=>({
 filename:path,status,previous_filename,additions:3,deletions:1,changes:4,
 patch:'PRIVATE_SOURCE_SHOULD_NEVER_BE_EXPORTED'
});
const payload=(files=[record('src/api.ts'),record('src/App.tsx'),record('src/auth/login.ts')])=>({
 status:'ahead',ahead_by:1,behind_by:0,total_commits:1,
 base_commit:{sha:A},merge_base_commit:{sha:A},
 files,commits:[{sha:B}],diff_url:'PRIVATE_SOURCE_SHOULD_NEVER_BE_EXPORTED'
});
const fake=(data,requests=[])=>async(url,opts)=>{
 requests.push({url,opts});
 return {ok:true,status:200,headers:{get:()=> 'application/json'},
   text:async()=>JSON.stringify(data)};
};
test('public compare is explicitly consent-gated before any external request',async()=>{
 const calls=[];
 await assert.rejects(reviewPublicGitHubCommitChanges({sampleComparison:sample,fetchImpl:fake(payload(),calls)}),
   /GITHUB_COMPARE_EXTERNAL_CONSENT_REQUIRED/);
 assert.equal(calls.length,0);
 await assert.rejects(reviewPublicGitHubCommitChanges({
  sampleComparison:{...sample,repository:'https://github.com/a/b?token=bad'},consent:true,
  fetchImpl:fake(payload(),calls)
 }),/GITHUB_REPO_INVALID/);
 await assert.rejects(reviewPublicGitHubCommitChanges({
  sampleComparison:{...sample,approvalEligible:true},consent:true,fetchImpl:fake(payload(),calls)
 }),/GITHUB_COMPARE_REVIEW_INPUT_INVALID/);
 assert.equal(calls.length,0);
});
test('committed SHA pair metadata lists changes without emitting any code patches',async()=>{
 const calls=[],response=payload([
  record('src/App.tsx'),record('src/api.ts'),record('src/auth/login.ts'),
  record('package-lock.json'),record('.github/workflows/deploy.yml'),
  record('.env.production'),record('src/old.tsx','renamed','src/legacy.tsx')
 ]);
 const result=await reviewPublicGitHubCommitChanges({
  sampleComparison:sample,consent:true,fetchImpl:fake(response,calls)
 });
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://api.github.com/repos/sample/react-ui/compare/'+A+'...'+B);
 assert.equal(calls[0].opts.method,'GET');
 assert.equal(calls[0].opts.credentials,'omit');
 assert.equal(calls[0].opts.redirect,'error');
 assert.equal(result.schema,'ffax-public-github-commit-review.v1');
 assert.equal(result.changedFilesListed,7);
 assert.equal(result.protectedCount,4);
 assert.equal(result.restrictedCount,1);
 assert.equal(result.files.find(x=>x.path==='src/old.tsx').previousPath,'src/legacy.tsx');
 assert.equal(result.approvalEligible,false);
 assert.equal(result.sourceWrites,0);
 assert.equal(result.gitPush,false);assert.equal(result.prCreated,false);
 assert.equal(result.sourceContentIncluded,false);
 assert.equal(result.externalRequests,1);
 assert.ok(!JSON.stringify(result).includes('PRIVATE_SOURCE_SHOULD_NEVER_BE_EXPORTED'));
 assert.equal(result.possiblyTruncated,false);
});
test('changed-file API cap and many commits must be signaled as incomplete',async()=>{
 const files=Array.from({length:300},(_,i)=>record('src/component'+i+'.tsx'));
 const response={...payload(files),total_commits:251};
 const result=await reviewPublicGitHubCommitChanges({
  sampleComparison:sample,consent:true,fetchImpl:fake(response)
 });
 assert.equal(result.changedFilesListed,300);
 assert.equal(result.possiblyTruncated,true);
 assert.equal(result.approvalEligible,false);
 assert.match(result.warning,/전체 diff라고 주장할 수 없습니다/);
});
test('untrusted API metadata, duplicate or traversal paths are fail-closed',async()=>{
 for(const bad of [
  {...payload(),base_commit:{sha:B}},
  {...payload(),files:[record('src/../secret.ts')]},
  {...payload(),files:[record('src/alpha.ts'),record('src/alpha.ts')]},
  {...payload(),files:[record('src/unsafe.ts','UNKNOWN')]},
  {...payload(),files:[{...record('src/ok.ts'),additions:-1}]},
  {...payload(),status:'identical'},
  {...payload(),files:null}
 ]){
  await assert.rejects(reviewPublicGitHubCommitChanges({
   sampleComparison:sample,consent:true,fetchImpl:fake(bad)
  }),/GITHUB_COMPARE_/);
 }
});
test('bad MIME, HTTP 403 and HTTP 404 never claim completed comparison',async()=>{
 const args={sampleComparison:sample,consent:true};
 await assert.rejects(reviewPublicGitHubCommitChanges({...args,fetchImpl:async()=>({
  ok:true,headers:{get:()=> 'text/html'},text:async()=>'<html/>'
 })}),/GITHUB_COMPARE_CONTENT_TYPE_INVALID/);
 for(const [status,error] of [[403,/RATE_LIMIT_OR_FORBIDDEN/],[404,/PUBLIC_REFS_NOT_FOUND/]]){
  await assert.rejects(reviewPublicGitHubCommitChanges({
   ...args,fetchImpl:async()=>({ok:false,status})
  }),error);
 }
});
test('oversized compare JSON and invalid transport refuse without fallback writes',async()=>{
 const args={sampleComparison:sample,consent:true};
 await assert.rejects(reviewPublicGitHubCommitChanges({
  ...args,fetchImpl:fake({...payload(),large:'X'.repeat(2100000)})
 }),/GITHUB_COMPARE_BODY_TOO_LARGE/);
 await assert.rejects(reviewPublicGitHubCommitChanges({...args,timeoutMs:99999}),
  /GITHUB_COMPARE_TRANSPORT_INVALID/);
 await assert.rejects(reviewPublicGitHubCommitChanges({...args,fetchImpl:async()=>({
   ok:true,headers:{get:()=> 'application/json'},text:async()=>'{invalid'
 })}),/GITHUB_COMPARE_RESPONSE_INVALID/);
});
