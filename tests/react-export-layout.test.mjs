import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBrief,newDocument,exportReact,renderMarkup,applyCommand,parseModelDesign,THEME_OPTIONS} from '../src/core.mjs';

const brief=buildBrief('데이터 분석 화면과 검색 테이블을 반응형 대시보드로 구현하기');
test('A and B preview/export preserve distinct approved layouts',()=>{
 const stack=newDocument(brief,'A'),grid=newDocument(brief,'B');
 assert.equal(stack.layout,'stack');assert.equal(grid.layout,'grid');
 assert.match(renderMarkup(stack),/layout-stack/);assert.match(renderMarkup(grid),/layout-grid/);
 const a=exportReact(stack),b=exportReact(grid);
 assert.match(a,/data-layout="stack"/);assert.match(a,/display:'flex',flexDirection:'column'/);
 assert.doesNotMatch(a,/gridTemplateColumns:/);
 assert.match(b,/data-layout="grid"/);assert.match(b,/display:'grid'/);
 assert.match(b,/gridTemplateColumns:'repeat\(auto-fit,minmax\(min\(100%,300px\),1fr\)\)'/);
 assert.match(b,/gridColumn:'1\/-1'/);assert.doesNotMatch(b,/flexDirection:'column'/);
});
test('component edits and theme changes survive React export',()=>{
 let doc=newDocument(brief,'B');
 doc=applyCommand(doc,{kind:'update',id:'node-2',prop:'text',value:'지표 2종과 결과를 함께 표시'});
 const react=exportReact(doc);assert.match(react,/지표 2종과 결과를 함께 표시/);
 assert.match(react,/data-layout="grid"/);
 for(const theme of Object.keys(THEME_OPTIONS)){
  const patched=applyCommand(doc,{kind:'theme',value:theme});
  assert.match(exportReact(patched),new RegExp(`data-theme="${theme}"`));
 }
});
test('an approved model-shaped design exports grid, not a stacked substitute (no AI called)',()=>{
 const raw=JSON.stringify({schema:'ffax-model-design.v1',title:'분석 화면',theme:'ocean',layout:'grid',components:[
  {type:'Hero',text:'검증된 운영 대시보드',color:'accent',spacing:24,align:'center'},
  {type:'Card',text:'가상 매출 수치',color:'neutral',spacing:16,align:'start'},
  {type:'Table',text:'최근 표',color:'neutral',spacing:8,align:'start'}
 ]});
 const parsed=parseModelDesign(raw,{ownerBrief:brief.raw,approval:'APPROVE_DESIGN_PREVIEW'});
 assert.match(parsed.reactSource,/data-layout="grid"/);
 assert.match(parsed.reactSource,/gridTemplateColumns:/);
 assert.match(parsed.reactSource,/gridColumn:'1\/-1'/);
 assert.equal(parsed.metadata.externalNetwork,false);
});
