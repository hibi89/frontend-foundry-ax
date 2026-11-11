/** Executes actual JSX-transpiled UI event handlers with a deterministic React API stub.
 * Not a substitute for a browser loaded with the genuine React runtime; that remains AC04. */
import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';import {resolve,dirname,join} from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';import vm from 'node:vm';
const require=createRequire(import.meta.url);let ts;try{ts=require('typescript');}catch{const {execFileSync}=await import('node:child_process');ts=require(execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim()+'/typescript');}
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
for(const name of ['react-market','react-analytics'])test(`AC07 ${name} five real TSX button callbacks invoke original service API contracts`,async()=>{
 const base=join(root,'fixtures',name);
 const app=await readFile(join(base,'src/App.tsx'),'utf8');
 const service=await import(`../fixtures/${name}/src/service.mjs`);
 const exported={};const calls=[];
 const hooks=[];let hookIndex=0;const React={createElement:(type,props,...children)=>({type,props:props||{},children}),useState:v=>{const i=hookIndex++;if(i>=hooks.length)hooks.push(v);return [hooks[i],value=>{hooks[i]=value}];}};
 const compiled=ts.transpileModule(app,{fileName:'App.tsx',compilerOptions:{jsx:ts.JsxEmit.React,esModuleInterop:true,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const map={react:{default:React,useState:React.useState,__esModule:true},'./service.mjs':service,'./ui/theme.css':{}};
 const mod={exports:exported};
 vm.runInNewContext(compiled,{exports:exported,module:mod,require:k=>{if(!Object.hasOwn(map,k))throw Error(`UNEXPECTED_IMPORT:${k}`);return map[k];},console},{timeout:2000,filename:'App.js'});
 const session=name==='react-market'?{userId:'alice',approver:true}:{userId:'alice',canExport:true,isAuditor:true};
 const transport=async(path,body)=>{calls.push({path,body:body??null});return {path};};
 const render=()=>{hookIndex=0;return mod.exports.App({transport,session});};
 let tree=render();
 if(name==='react-market'){const input=tree.children.flat().find(x=>x?.type==='input');assert.ok(input);input.props.onChange({target:{value:'AI design'}});tree=render();}
 const buttons=[];const traverse=v=>{if(Array.isArray(v)){for(const x of v)traverse(x);}else if(v&&typeof v==='object'){if(v.type==='button')buttons.push(v);traverse(v.children);}};traverse(tree);
 assert.equal(buttons.length,5);
 for(const button of buttons)await button.props.onClick();
 assert.equal(calls.length,5);
 assert.deepEqual(calls.map(x=>x.path),name==='react-market'?['/talents','/talents/1','/quotes','/quotes/5/approve','/checkout']:['/metrics','/metrics','/metrics','/export','/audit']);
 if(name==='react-market'){assert.equal(calls[2].body.cents,150);assert.equal(calls[4].body.currency,'USD');}
 else{assert.equal(calls[1].body.status,'open');assert.equal(calls[3].body.format,'csv');}
});
