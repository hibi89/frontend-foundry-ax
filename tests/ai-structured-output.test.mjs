import test from 'node:test';
import assert from 'node:assert/strict';
import { parseModelDesign, makeLocalFixtureDesign } from '../src/ai-structured-output.mjs';
import { assertDocument, renderMarkup } from '../src/core.mjs';
const ownerBrief = '금융 분석 대시보드와 차트를 만들어줘. 기존 API와 고객 정보는 변경하지 마.';
const base = () => makeLocalFixtureDesign(0, ownerBrief);
const parse = (data,extra={}) => parseModelDesign(data,{ownerBrief,approval:'APPROVE_DESIGN_PREVIEW',...extra});
test('AC04 readiness: only approved, bounded structured outputs create typed React source',()=>{
 const result=parse(base());
 assert.equal(result.document.components.length,7);
 assert.equal(result.document.approach,'MODEL');
 assertDocument(result.document);
 assert.match(result.reactSource,/GeneratedScreen/);
 assert.equal(result.metadata.directRepositoryWrite,false);
 assert.doesNotMatch(JSON.stringify(result.document),/고객 정보는 변경하지 마/);
});
test('AC04 readiness: never accept design before owner approval',()=>{
 assert.throws(()=>parse(base(),{approval:''}),/DESIGN_PREVIEW_APPROVAL_REQUIRED/);
});
test('AC04 readiness: reject source-code/Markdown and unsafe formats',()=>{
 for(const s of ["\x60\x60\x60json\n"+base()+"\n\x60\x60\x60",'<script>alert(1)</script>',"export default () => <div />",'{}','[]','']){
  assert.throws(()=>parse(s),/MODEL_JSON_.*|MODEL_SCHEMA_INVALID/);
 }
});
test('AC04 readiness: no HTML/script injection in preview/export',()=>{
 const d=JSON.parse(base());d.components[2].text='<img src=x onerror=alert(1)> & <script>danger</script>';
 const result=parse(JSON.stringify(d));
 assert.doesNotMatch(renderMarkup(result.document),/<script>|<img src=x/);
 assert.match(renderMarkup(result.document),/&lt;script&gt;/);
 assert.match(result.reactSource,/\\u|\{"<img/);
});
test('AC04 readiness: disallow code, URLs, external resources and arbitrary properties',()=>{
 const d=JSON.parse(base()); d.components[0].onClick='fetch("https://example.com")';
 assert.throws(()=>parse(JSON.stringify(d)),/MODEL_COMPONENT_INVALID/);
 d.components[0].onClick=undefined;d.script='fetch("https://example.com")';
 assert.throws(()=>parse(JSON.stringify(d)),/MODEL_SCHEMA_INVALID/);
});
test('AC04 readiness: strict component, theme and layout allowlist',()=>{
 for(const mutation of [d=>d.theme='unknown', d=>d.layout='absolute',d=>d.schema='v2',d=>d.title='',d=>d.components[0].type='CustomScript',d=>d.components[0].color='javascript:bad',d=>d.components[0].spacing=999,d=>d.components[0].align='fixed']){
  const d=JSON.parse(base());mutation(d);assert.throws(()=>parse(JSON.stringify(d)),/MODEL_.*INVALID/);
 }
});
test('AC04 readiness: component count and text length limited',()=>{
 for(const mutation of [d=>d.components=[],d=>d.components=Array(41).fill({type:'Button',text:'Hello'}),d=>d.components[0].text='A'.repeat(181)]){
  const d=JSON.parse(base());mutation(d);assert.throws(()=>parse(JSON.stringify(d)),/MODEL_.*INVALID/);
 }
});
for(let i=0;i<12;i++)test('AC04 readiness: fixture '+(i+1)+'/12 structured contract parses; no LLM invoked',()=>{
 const d=parse(makeLocalFixtureDesign(i, ownerBrief));assertDocument(d.document);assert.equal(d.document.components.length,7);
});
