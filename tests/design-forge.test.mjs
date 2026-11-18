import test from 'node:test';
import assert from 'node:assert/strict';
import {makeForgeBrief,recommendForgeStyles,generateForgeVariants,refineForgeVariant,mixForgeVariants,freezeForgeVariant,verifyForgeBundle} from '../src/design-forge.mjs';
import {exportReact,renderMarkup,validateProjectImport} from '../src/core.mjs';

test('DF-01/02/03: real three distinct local React source variants',()=>{
 const brief=makeForgeBrief({prompt:'역학달력을 고급스럽게 만들고 날짜 선택과 생년월일시 입력 폼을 넣어줘',mood:'한국적 현대 미니멀',mustHave:'날짜 검색, 사주팔자'});
 const recommendations=recommendForgeStyles(brief);
 assert.equal(recommendations.length,3);assert.equal(new Set(recommendations.map(x=>x.styleId)).size,3);
 const variants=generateForgeVariants(brief);assert.deepEqual(variants.map(x=>x.id),['A','B','C']);
 assert.equal(new Set(variants.map(v=>v.document.theme)).size,3);
 for(const item of variants){assert.equal(validateProjectImport(item.document),true);assert.ok(exportReact(item.document).includes('React'));assert.ok(item.document.components.length>=8);}
});
test('DF-04: targeted refinement and mix only mutate a new revision',()=>{
 const [a,b]=generateForgeVariants(makeForgeBrief({prompt:'전통 역학달력을 현대적으로 만들고 오늘의 날짜를 표시해줘'}));
 const original=JSON.stringify(a);
 const node=a.document.components.find(x=>x.type==='Hero');
 const refined=refineForgeVariant(a,{kind:'update',id:node.id,prop:'text',value:'오늘의 역학달력'});
 assert.equal(refined.revision,2);
 assert.equal(refined.document.components.find(x=>x.id===node.id).text,'오늘의 역학달력');
 assert.equal(JSON.stringify(a),original);
 const mixed=mixForgeVariants(refined,b,{takeTheme:true,takeLayout:true});
 assert.equal(mixed.document.theme,b.document.theme);
 assert.equal(mixed.document.layout,b.document.layout);
 assert.equal(mixed.revision,3);
});
test('DF-06: user approval required, SHA bundle is immutable under verification',async()=>{
 const a=generateForgeVariants(makeForgeBrief({prompt:'실제 동작하는 쇼핑 사이트 프론트엔드를 제작해줘'}))[0];
 await assert.rejects(freezeForgeVariant(a,{approval:'WRONG'}),/FORGE_OWNER_APPROVAL_REQUIRED/);
 const bundle=await freezeForgeVariant(a,{approval:'APPROVE_FORGE_REFERENCE'});
 assert.match(bundle.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(await verifyForgeBundle(bundle),a.document);
 const tampered=structuredClone(bundle);tampered.manifest.project.title='tampered';
 await assert.rejects(verifyForgeBundle(tampered),/FORGE_BUNDLE_SOURCE_MISMATCH|FORGE_BUNDLE_HASH_MISMATCH/);
});
test('Security: invalid/sensitive prompts and unsupported targeted edits fail closed',()=>{
 assert.throws(()=>makeForgeBrief({prompt:'secret=abcdef THIS IS A TEST'}),/FORGE_BRIEF_INVALID_OR_SENSITIVE/);
 assert.throws(()=>makeForgeBrief({prompt:'123'}),/FORGE_BRIEF_INVALID_OR_SENSITIVE/);
 const [a]=generateForgeVariants(makeForgeBrief({prompt:'일반 포트폴리오 사이트 프론트엔드를 만들어줘'}));
 assert.throws(()=>refineForgeVariant(a,{kind:'shell',value:'curl evil'}),/FORGE_REFINEMENT_UNSUPPORTED/);
});


test('Forge design tokens produce distinct preview CSS and exported React source without modifying legacy docs',()=>{
 const variants=generateForgeVariants(makeForgeBrief({prompt:'역학달력 홈페이지 날짜검색을 디자인해줘'}));
 for(const item of variants){
  const token=item.document.designSystem;
  assert.equal(validateProjectImport(item.document),true);
  assert.ok(renderMarkup(item.document).includes('--ff-hero-art:'));
  assert.ok(renderMarkup(item.document).includes(token.accent));
  assert.ok(exportReact(item.document).includes(token.fontStack));
  assert.ok(exportReact(item.document).includes('backgroundImage'));
 }
 const invalid=structuredClone(variants[0].document);invalid.designSystem.fontStack='url(https://evil.example/font)';
 assert.throws(()=>validateProjectImport(invalid),/DESIGN_SYSTEM_INVALID/);
});
