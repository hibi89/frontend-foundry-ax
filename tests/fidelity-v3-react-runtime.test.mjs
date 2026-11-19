import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {inspectReactProject} from '../src/workspace.mjs';
import {prepareV3FidelityIntegration,auditV3FidelityIntegration,rollbackV3FidelityIntegration} from '../src/forge-safe-integration.mjs';

const require=createRequire(import.meta.url);
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const sha='a'.repeat(64);
const scene={schema:'ffax.fidelity-scene.v1',sourceSha256:sha,width:640,height:400,revision:1,
 regions:[
  {id:'canvas',role:'canvas',parentId:null,bounds:{x:0,y:0,width:640,height:400},style:{background:'#ffffff'}},
  {id:'button-one',role:'button',parentId:'canvas',bounds:{x:50,y:40,width:200,height:80},style:{background:'#112233'}}
 ]};
const typography={schema:'ffax.fidelity-typography.v1',referenceSha256:sha,sceneRevision:1,
 ocr:{status:'NOT_RUN_NO_LOCAL_ENGINE'},textBoxes:[
  {id:'text-1',regionId:'button-one',bounds:{x:60,y:50,width:160,height:35},
   text:'기본 문구',confidence:'OWNER_SUPPLIED_NOT_OCR'}
 ]};

function transpileTrustedGenerated(source,fileName,moduleResolver){
 const result=ts.transpileModule(source,{fileName,reportDiagnostics:true,
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,
   jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}});
 const errors=(result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
 assert.deepEqual(errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[]);
 const loaded={exports:{}};
 new Function('require','module','exports',result.outputText)(moduleResolver,loaded,loaded.exports);
 return loaded.exports;
}
function buttonIn(node){
 if(!React.isValidElement(node))return null;
 if(node.type==='button')return node;
 for(const child of React.Children.toArray(node.props.children)){
  const found=buttonIn(child);
  if(found)return found;
 }
 return null;
}
test('P2-04 real React19 SSR, strict TSX and intent callback preserve synthetic owner source',async()=>{
 // CI-only disposable fixture under the test checkout so React type resolution
 // uses the installed pinned dependencies. No customer files or network input.
 const root=await mkdtemp(join(process.cwd(),'.ffax-v3-p2-react-'));
 const source=join(root,'customer'),dest=join(root,'review');
 try{
  await mkdir(join(source,'src'),{recursive:true});
  await mkdir(dest);
  await writeFile(join(source,'package.json'),JSON.stringify({
   name:'ffax-p2-synthetic-react',private:true,type:'module',
   dependencies:{react:'19.2.7'}
  }));
  const original='import * as React from "react";\nexport function App(){return <main>Protected Sign In</main>}\n';
  await writeFile(join(source,'src','App.tsx'),original);
  await writeFile(join(source,'src','auth.ts'),'export const session=()=>"synthetic";\n');
  await writeFile(join(source,'src','api.ts'),'export const fetchKpi=()=>17;\n');
  await writeFile(join(source,'src','routes.ts'),'export const route="/local";\n');
  const initial=await inspectReactProject(source);
  const contract={schema:'ffax.v3.app-binding-contract.v1',sourceDigest:initial.digest,
   textBindings:[{slotId:'text-1',dataKey:'headline'}],
   intentBindings:[{regionId:'button-one',intent:'openPanel'}],
   boundaries:{auth:'OWNER_APPLICATION_ONLY',api:'OWNER_APPLICATION_ONLY',routes:'OWNER_APPLICATION_ONLY'}};
  const prepared=await prepareV3FidelityIntegration({source,dest,jobId:'react-p2-001',
   scene,typography,contract,approval:'APPROVE_LOCAL_V3_INTEGRATION_REVIEW'});
  const f=join(prepared.sourceDir,'src','ffax');
  const sceneFile=join(f,'FidelityScene.tsx');
  const bindingFile=join(f,'FidelityBindings.tsx');
  const opts={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,
   moduleResolution:ts.ModuleResolutionKind.NodeNext,jsx:ts.JsxEmit.ReactJSX,
   noEmit:true,strict:true,skipLibCheck:true,types:['react']};
  const compiler=ts.createProgram([sceneFile,bindingFile],opts);
  const failures=ts.getPreEmitDiagnostics(compiler)
   .filter(d=>d.category===ts.DiagnosticCategory.Error)
   .map(d=>ts.flattenDiagnosticMessageText(d.messageText,' '));
  assert.deepEqual(failures,[],'Generated React TSX must pass strict real TypeScript checker');
  const sceneSource=await readFile(sceneFile,'utf8');
  const bindingSource=await readFile(bindingFile,'utf8');
  const compiledScene=transpileTrustedGenerated(sceneSource,'FidelityScene.tsx',(name)=>{
   if(name==='./FidelityScene.css')return {};
   return require(name);
  });
  const compiledBindings=transpileTrustedGenerated(bindingSource,'FidelityBindings.tsx',(name)=>{
   if(name==='./FidelityScene.js')return compiledScene;
   return require(name);
  });
  const Bindings=compiledBindings.default,Scene=compiledScene.default;
  assert.equal(typeof Bindings,'function');
  const live=renderToStaticMarkup(React.createElement(Bindings,{
   data:{headline:'LIVE_KPI_17'},onIntent:()=>{}
  }));
  assert.match(live,/LIVE_KPI_17/);
  assert.doesNotMatch(live,/기본 문구/);
  for(const data of [null,undefined,{},[],7,Object.create({headline:'FORGED_INHERITED'})]){
   const safe=renderToStaticMarkup(React.createElement(Bindings,{data}));
   assert.match(safe,/기본 문구/);
   assert.doesNotMatch(safe,/FORGED_INHERITED/);
  }
  const xss=renderToStaticMarkup(React.createElement(Bindings,{
   data:{headline:'<img src=x onerror=alert(1)>'}
  }));
  assert.match(xss,/&lt;img/);
  assert.doesNotMatch(xss,/<img/);
  const fired=[];
  const element=Bindings({data:{headline:'CONTROLLED'},onIntent:(intent)=>fired.push(intent)});
  const tree=Scene(element.props);
  const button=buttonIn(tree);
  assert.ok(button);
  button.props.onClick();
  assert.deepEqual(fired,['openPanel']);
  const audit=await auditV3FidelityIntegration({workDir:prepared.workDir,
   approval:'APPROVE_LOCAL_V3_INTEGRATION_AUDIT'});
  assert.equal(audit.generatedFiles,3);
  assert.equal(audit.customerAuthRuntimeVerified,false);
  assert.equal((await inspectReactProject(source)).digest,initial.digest);
  assert.equal(await readFile(join(source,'src','App.tsx'),'utf8'),original);
  const rollback=await rollbackV3FidelityIntegration({workDir:prepared.workDir,
   approval:'APPROVE_LOCAL_V3_INTEGRATION_ROLLBACK'});
  assert.equal(rollback.originalUnchanged,true);
  assert.equal((await inspectReactProject(source)).digest,initial.digest);
 }finally{await rm(root,{recursive:true,force:true});}
});
