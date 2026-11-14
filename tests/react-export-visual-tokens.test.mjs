import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBrief,newDocument,applyCommand,exportReact,THEME_OPTIONS,approveReference,createReference} from '../src/core.mjs';

const brief=buildBrief('매출 분석 테이블과 사용자 검색 UI를 갖춘 관리자 대시보드');
test('standalone React export embeds component visual tokens with zero external CSS dependency',()=>{
 for(const theme of Object.keys(THEME_OPTIONS)){
  let doc=newDocument(brief,'B');
  doc=applyCommand(doc,{kind:'theme',value:theme});
  const src=exportReact(doc),palette=THEME_OPTIONS[theme];
  assert.match(src,/color-mix\(in srgb/);assert.match(src,/backgroundColor:/);
  assert.match(src,/borderRadius:12/);assert.match(src,/boxSizing:'border-box'/);
  assert.match(src,/gap:15,padding:20/);
  assert.match(src,/fontSize:22/);assert.match(src,/fontSize:11/);
  assert.match(src,/borderCollapse:'collapse'/);assert.match(src,/type="search"/);
  assert.ok(src.includes(palette.surface));
  assert.ok(src.includes(palette.ink));
  assert.ok(!/import ['"][^'"]+\.css['"]/.test(src));
  assert.match(src,/repeat\(auto-fit,minmax\(min\(100%,300px\),1fr\)\)/);
 }
});
test('approved reference accent and neutral editing preserve visual tokens and source/preview semantics',()=>{
 const chosen=approveReference(createReference(newDocument(brief,'B'),'authorized.png',true,['#123456','#abcdef']),'B');
 let doc=chosen;
 doc=applyCommand(doc,{kind:'update',id:'node-2',prop:'color',value:'neutral'});
 doc=applyCommand(doc,{kind:'update',id:'node-2',prop:'spacing',value:32});
 const src=exportReact(doc);
 assert.match(src,/#abcdef/);
 assert.match(src,/padding: 32/);
 assert.match(src,/color-mix\(in srgb, #/);
 assert.match(src,/1px solid/);
});
