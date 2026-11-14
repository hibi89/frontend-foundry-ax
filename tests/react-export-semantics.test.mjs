import test from 'node:test';
import assert from 'node:assert/strict';
import {newDocument,buildBrief,exportReact,renderMarkup,makeComponent,REGISTRY,applyCommand,parseModelDesign} from '../src/core.mjs';
const doc=newDocument(buildBrief('데이터 분석 및 검색 입력을 갖춘 운영 화면'));
test('all 13 allowlisted UI types keep their semantic markup in exported React TSX',()=>{
 const code=exportReact(doc);assert.equal(doc.components.length,13);assert.equal(Object.keys(REGISTRY).length,17);
 for(const [fragment,name] of [['AI × Human Interface','Hero'],['<button type="button"','Button'],
 ['<article','Card'],['<input type="search"','Input'],['<table','Table'],['<span','Badge'],
 ['<aside role="status"','Alert'],['<nav','Navbar'],['Example metric','Stat'],
 ['Dialog preview','Modal'],['aria-label="섹션 탭"','Tabs'],['aria-hidden="true"','Loader'],['>◇</span>','Empty']])assert.ok(code.includes(fragment),name);
 for(const type of Object.keys(REGISTRY))assert.ok(!code.includes('{"'+type+'"}: '),'generic fallback '+type);
});
test('component text never becomes raw executable HTML in exported JSX',()=>{
 const input='<img src=x onerror=alert(1)> & <script>alert(2)</script>';
 const changed=applyCommand(doc,{kind:'update',id:'node-1',prop:'text',value:input});
 const tsx=exportReact(changed);
 assert.ok(tsx.includes('{'+JSON.stringify(input)+'}'),'user text is inside a quoted JSX expression');
 assert.ok(!tsx.includes('>'+input+'</'),'never raw HTML child');
 assert.ok(!tsx.includes('dangerouslySetInnerHTML'));
 assert.ok(!tsx.includes('onerror={'));
});
test('structured model JSON preserves approved component semantics, without real model inference',()=>{
 const data={schema:'ffax-model-design.v1',title:'검증 화면',theme:'midnight',layout:'grid',components:
 Object.keys(REGISTRY).map(type=>({type,text:'테스트 '+type,color:'accent',spacing:16,align:'start'}))};
 const out=parseModelDesign(JSON.stringify(data),{ownerBrief:'금융 데이터와 통계를 이용한 UI 생성',approval:'APPROVE_DESIGN_PREVIEW'});
 assert.equal(out.document.components.length,17);
 assert.ok(out.reactSource.includes('data-layout="grid"'));
 assert.ok(out.reactSource.includes('aria-label="섹션 탭"'));
 assert.ok(out.reactSource.includes('role="region"'));
 assert.equal(out.metadata.externalNetwork,false);
});

test('actual React 19 renders all 13 exported components and escapes untrusted text',async()=>{
 const {createRequire}=await import('node:module');
 const require=createRequire(import.meta.url);
 const ts=require('typescript'),React=require('react'),ReactDOMServer=require('react-dom/server');
 const malicious='<img src=x onerror=alert(1)> & <script>alert(2)</script>';
 const safe=applyCommand(doc,{kind:'update',id:'node-1',prop:'text',value:malicious});
 const jsx=exportReact(safe);
 const compiled=ts.transpileModule(jsx,{fileName:'GeneratedScreen.tsx',reportDiagnostics:true,
  compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}});
 assert.equal((compiled.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0);
 // Only FFAX allowlisted serializer output is executed; no raw third-party model source.
 const module={exports:{}};
 new Function('require','module','exports',compiled.outputText)(require,module,module.exports);
 const html=ReactDOMServer.renderToStaticMarkup(React.createElement(module.exports.default));
 assert.match(html,/data-layout="stack"/);
 assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.doesNotMatch(html,/<img src=x|<script>alert\(2\)<\/script>/);
 assert.match(html,/<nav/);assert.match(html,/<table/);assert.match(html,/<input[^>]*type="search"/);
 assert.match(html,/role="region"/);assert.match(html,/role="group"/);
 assert.match(html,/Dialog preview/);assert.match(html,/Example metric/);
 assert.match(html,/◇/);
 assert.ok(html.length>900);
});

test('four optional P0 patterns preserve accessible local-only demo semantics in React19',async()=>{
 const types=['Sidebar','Form','Chart','Error'];
 const extended={...doc,components:[...doc.components,...types.map((t,i)=>makeComponent(t,'pattern-'+i))]};
 const html=renderMarkup(extended),tsx=exportReact(extended);
 assert.equal(extended.components.length,17);
 for(const type of types)assert.match(html,new RegExp('ff-'+type.toLowerCase()));
 for(const fragment of ['aria-label="사이드바 탐색"','data-demo-action="navigate"',
  'data-demo-action="validate-form"','data-demo-action="retry"',
  'role="group"','aria-label="차트 예시 수치"','aria-live="polite"','예시 데이터']){
  assert.ok(html.includes(fragment),'preview '+fragment);
 }
 assert.ok(!html.includes('<form action='));
 assert.ok(!tsx.includes('onSubmit='));
 for(const forbidden of ['fetch(','XMLHttpRequest','localStorage']){
  assert.ok(!tsx.includes(forbidden),'export must not call external IO '+forbidden);
 }
 const {createRequire}=await import('node:module'),require=createRequire(import.meta.url);
 const ts=require('typescript'),React=require('react'),SSR=require('react-dom/server');
 const output=ts.transpileModule(tsx,{fileName:'Screen.tsx',reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}});
 assert.equal((output.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0);
 const module={exports:{}};new Function('require','module','exports',output.outputText)(require,module,module.exports);
 const rendered=SSR.renderToStaticMarkup(React.createElement(module.exports.default));
 for(const fragment of ['aria-label="사이드바 탐색"','aria-label="차트 예시 수치"',
  'role="group"','로컬 입력 검증','로컬 다시 시도','예시 데이터','미제출 · 서버 연결 없음']){
  assert.ok(rendered.includes(fragment),'React19 '+fragment);
 }
 assert.ok(!rendered.includes('<form action='));
});
