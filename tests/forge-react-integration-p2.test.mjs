/* Actual React/TypeScript 19 synthetic app verification.
 * Deliberately not included in the dependency-free P1 source smoke.
 * Requires the project's pinned React/TypeScript modules under npm install.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {makeForgeBrief,generateForgeVariants,freezeForgeVariant} from '../src/design-forge.mjs';
import {prepareForgeIntegration,rollbackForgeIntegration,auditForgeIntegration} from '../src/forge-safe-integration.mjs';

test('P2 AC07: generated Forge React 19 UI + 10 actual service flows preserve both synthetic apps and rollback',async()=>{
 const require=createRequire(import.meta.url);
 let ts;
 try{ts=require('typescript');}
 catch{const {execFileSync}=await import('node:child_process');
  ts=require(execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim()+'/typescript');}
 const React=require('react'),ReactServer=require('react-dom/server');
 const repoRoot=new URL('../',import.meta.url);
 let checked=0,executedFlows=0;
 for(const kind of ['react-market','react-analytics']){
  // Test fixtures are FFAX-owned and include functioning auth/API service modules.
  // This test does not claim to execute a customer's application or backend.
  const root=await mkdtemp(join(tmpdir(),'ffax-p2-react-integration-'));
  try{
   const {fileURLToPath}=await import('node:url');
   const source=join(fileURLToPath(repoRoot),'fixtures',kind),dest=join(root,'isolated');
   await mkdir(dest);
   const before=await (await import('../src/workspace.mjs')).inspectReactProject(source);
   const brief=makeForgeBrief({prompt:'Build an accessible business operations dashboard with real components'});
   const bundle=await freezeForgeVariant(generateForgeVariants(brief)[kind==='react-market'?0:1],
    {approval:'APPROVE_FORGE_REFERENCE'});
   const localService=await import(pathToFileURL(join(source,'src','service.mjs')).href);
   const runFlows=async(mod)=>{
    const requests=[];
    const transport=async(path,payload)=>{requests.push({path,payload:payload??null});return {ok:true,path}};
    if(kind==='react-market'){
     const client=mod.createMarketService(transport,{userId:'p2-synthetic',approver:true});
     await client.search('design');await client.profile(3);await client.quote(3,150);await client.approve(3);await client.checkout(3);
     const denied=mod.createMarketService(transport,{userId:'p2-synthetic',approver:false});
     await assert.rejects(denied.checkout(3),/APPROVAL_REQUIRED/);
    }else{
     const client=mod.createAnalyticsService(transport,{userId:'p2-synthetic',canExport:true,isAuditor:true});
     await client.load();await client.filter('open');await client.sort('desc');await client.export();await client.audit();
     const denied=mod.createAnalyticsService(transport,{userId:'p2-synthetic',canExport:false,isAuditor:false});
     await assert.rejects(denied.export(),/EXPORT_FORBIDDEN/);
    }
    assert.equal(requests.length,5);
    return requests;
   };
   const originalFlows=await runFlows(localService);
   const staging=await prepareForgeIntegration({source,dest,bundle,
    jobId:'p2-react-'+kind,approval:'APPROVE_LOCAL_INTEGRATION_REVIEW'});
   const cloneService=await import(pathToFileURL(join(staging.sourceDir,'src','service.mjs')).href);
   const actualFlows=await runFlows(cloneService);
   assert.deepEqual(actualFlows,originalFlows);
   const target=join(staging.sourceDir,'src','ffax','GeneratedScreen.tsx');
   const written=await readFile(target,'utf8');
   assert.equal(written,bundle.manifest.reactSource);
   const ast=ts.createSourceFile('GeneratedScreen.tsx',written,ts.ScriptTarget.ES2022,true,ts.ScriptKind.TSX);
   assert.equal(ast.parseDiagnostics.length,0);
   const compiled=ts.transpileModule(written,{fileName:'GeneratedScreen.tsx',reportDiagnostics:true,
    compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022}});
   assert.equal((compiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
   const generatedModule={exports:{}};
   new Function('require','module','exports',compiled.outputText)(require,generatedModule,generatedModule.exports);
   const html=ReactServer.renderToStaticMarkup(React.createElement(generatedModule.exports.default));
   assert.match(html,/<main/);assert.ok(html.length>200);
   const audit=await auditForgeIntegration({workDir:staging.workDir,approval:'APPROVE_LOCAL_INTEGRATION_AUDIT'});
   assert.equal(audit.audit.state,'P1_STATIC_ADDITIVE_REVIEW_READY');
   assert.equal(audit.audit.originalSourceModified,false);
   assert.equal(audit.audit.authRuntimeVerified,false); // synthetic service != customer auth
   assert.equal((await (await import('../src/workspace.mjs')).inspectReactProject(source)).digest,before.digest);
   const rollback=await rollbackForgeIntegration({workDir:staging.workDir,approval:'APPROVE_LOCAL_INTEGRATION_ROLLBACK'});
   assert.equal(rollback.state,'ROLLED_BACK_IN_ISOLATED_COPY');
   assert.equal((await (await import('../src/workspace.mjs')).inspectReactProject(staging.sourceDir)).digest,before.digest);
   assert.deepEqual(await runFlows(cloneService),originalFlows);
   checked++;executedFlows+=actualFlows.length;
  }finally{await rm(root,{recursive:true,force:true});}
 }
 assert.equal(checked,2);assert.equal(executedFlows,10);
 console.log('FFAX_P2_REACT19_SYNTHETIC_INTEGRATION_PASS apps=2 flows=10 generatedSSR=2 authDeny=2 originalSHA=unchanged rollback=2');
});
