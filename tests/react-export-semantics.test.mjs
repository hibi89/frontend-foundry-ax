import test from 'node:test';
import assert from 'node:assert/strict';
import {newDocument,buildBrief,exportReact,REGISTRY,applyCommand,parseModelDesign} from '../src/core.mjs';
const doc=newDocument(buildBrief('데이터 분석 및 검색 입력을 갖춘 운영 화면'));
test('all 13 allowlisted UI types keep their semantic markup in exported React TSX',()=>{
 const code=exportReact(doc);assert.equal(doc.components.length,Object.keys(REGISTRY).length);
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
 assert.equal(out.document.components.length,13);
 assert.ok(out.reactSource.includes('data-layout="grid"'));
 assert.ok(out.reactSource.includes('aria-label="섹션 탭"'));
 assert.ok(out.reactSource.includes('role="region"'));
 assert.equal(out.metadata.externalNetwork,false);
});
