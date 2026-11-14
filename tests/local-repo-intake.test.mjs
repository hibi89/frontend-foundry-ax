import test from 'node:test';
import assert from 'node:assert/strict';
import {auditLocalReactFolder,INTAKE_LIMITS} from '../src/local-repo-intake.mjs';
const file=(path,body)=>{
 const bytes=new TextEncoder().encode(body);
 return {webkitRelativePath:'client-demo/'+path,size:bytes.byteLength,
  arrayBuffer:async()=>bytes.slice().buffer};
};
const minimal=[
 file('package.json',JSON.stringify({name:'fixture',dependencies:{react:'19.2.7'}})),
 file('src/App.tsx',"import React from 'react';export default function App(){return <div onClick={()=>fetch('/api/users')}>Safe</div>}"),
 file('src/api.ts',"export const load=()=>fetch('/api/data');"),
 file('.env',"GITHUB_TOKEN=SECRET_NEVER_TO_SCAN"),
 file('node_modules/react/index.js',"SECRET_NOT_READ"),
];
test('real user-selected folder files are analyzed read-only with hash, no source/secret exposure',async()=>{
 const r=await auditLocalReactFolder(minimal);
 assert.equal(r.schema,'ffax-readonly-folder-audit.v1');
 assert.equal(r.fileCount,3);assert.equal(r.skippedEntries,2);
 assert.equal(r.indicators.api,2);assert.equal(r.indicators.events,1);
 assert.equal(r.sourceChanged,false);assert.equal(r.remoteRequests,0);
 assert.equal(r.gitRemoteConnected,false);assert.equal(r.sourceGitSha,null);
 assert.match(r.sha256,/^[a-f0-9]{64}$/);
 assert.equal(JSON.stringify(r).includes('SECRET_NEVER_TO_SCAN'),false);
 assert.equal(JSON.stringify(r).includes('/api/users'),false);
});
test('folder digest is deterministic, irrespective of browser ordering',async()=>{
 const a=await auditLocalReactFolder(minimal),b=await auditLocalReactFolder([...minimal].reverse());
 assert.equal(a.sha256,b.sha256);
 const changed=[...minimal];changed[1]=file('src/App.tsx',"export default function App(){return <main>Changed</main>}");
 const c=await auditLocalReactFolder(changed);assert.notEqual(a.sha256,c.sha256);
});
test('rejects malformed, mixed, secret-bearing or incomplete project selection without uploading',async()=>{
 await assert.rejects(auditLocalReactFolder([]),/LOCAL_REPO_NO_FILES_SELECTED/);
 await assert.rejects(auditLocalReactFolder([file('package.json','{}')]),/LOCAL_REPO_REACT_TSX_REQUIRED/);
 await assert.rejects(auditLocalReactFolder([
  file('package.json',JSON.stringify({dependencies:{react:'19'}})),
  {...file('src/App.tsx','safe'),webkitRelativePath:'other-project/src/App.tsx'}
 ]),/LOCAL_REPO_MULTIPLE_ROOTS_REFUSED/);
 await assert.rejects(auditLocalReactFolder([
  ...minimal,{...file('src/evil.tsx','x'),webkitRelativePath:'client-demo/src/../secret.tsx'}
 ]),/LOCAL_REPO_PATH_INVALID/);
});
test('rejects oversized or truncated files before or during read',async()=>{
 const tooLarge={...file('src/Large.tsx','ok'),size:INTAKE_LIMITS.maxFileBytes+1};
 await assert.rejects(auditLocalReactFolder([...minimal,tooLarge]),/LOCAL_REPO_FILE_TOO_LARGE/);
 await assert.rejects(auditLocalReactFolder([...minimal,{...file('src/broken.tsx','abc'),size:4}]),/LOCAL_REPO_FILE_CHANGED_DURING_READ/);
});
test('incomplete static JavaScript without React package dependency cannot claim React verification',async()=>{
 const files=[file('package.json','{"name":"not-react"}'),file('src/App.tsx','export default ()=>null')];
 await assert.rejects(auditLocalReactFolder(files),/LOCAL_REPO_REACT_DEPENDENCY_REQUIRED/);
});
