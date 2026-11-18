import test from 'node:test';
import assert from 'node:assert/strict';
import {makeForgeBrief,recommendForgeStyles,generateForgeVariants,refineForgeVariant,mixForgeVariants,freezeForgeVariant,finalizeForgeBundleWithCapture,verifyForgeBundle} from '../src/design-forge.mjs';
import {exportReact,renderMarkup,validateProjectImport} from '../src/core.mjs';

test('DF-01/02/03: real three distinct local React source variants',()=>{
 const brief=makeForgeBrief({prompt:'역학달력을 고급스럽게 만들고 날짜 선택과 생년월일시 입력 폼을 넣어줘',mood:'한국적 현대 미니멀',mustHave:'날짜 검색, 사주팔자'});
 const recommendations=recommendForgeStyles(brief);
 assert.equal(recommendations.length,3);assert.equal(new Set(recommendations.map(x=>x.styleId)).size,3);
 const variants=generateForgeVariants(brief);assert.deepEqual(variants.map(x=>x.id),['A','B','C']);
 assert.equal(new Set(variants.map(v=>v.document.theme)).size,3);
 for(const item of variants){assert.equal(validateProjectImport(item.document),true);assert.ok(exportReact(item.document).includes('React'));assert.ok(item.document.components.length>=8);}
});
test('DF-02: a request to display a date is not mistaken for a data table',()=>{
 const brief=makeForgeBrief({prompt:'전통 역학달력을 현대적으로 만들고 오늘의 날짜를 표시해줘'});
 assert.equal(recommendForgeStyles(brief)[0].styleId,'expressive');
 assert.ok(generateForgeVariants(brief)[0].document.components.some(x=>x.type==='Hero'));
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
  if(item.document.components.some(node=>node.type==='Hero'))assert.ok(exportReact(item.document).includes('backgroundImage'));
 }
 const invalid=structuredClone(variants[0].document);invalid.designSystem.fontStack='url(https://evil.example/font)';
 assert.throws(()=>validateProjectImport(invalid),/DESIGN_SYSTEM_INVALID/);
});


test('DF-06/RF: freeze real local capture SHA in child bundle; mismatch/replay refused',async()=>{
 const [candidate]=generateForgeVariants(makeForgeBrief({prompt:'역학달력 오늘 날짜와 생년월일시를 보여주는 화면을 만들어줘'}));
 const original=await freezeForgeVariant(candidate,{approval:'APPROVE_FORGE_REFERENCE'});
 const receipt={schema:'ffax.capture.v1',engine:'playwright-chromium',bundleSha256:original.sha256,
  sha256:'1'.repeat(64),width:1440,height:900,dpr:1,browserVersion:'local-chromium'};
 await assert.rejects(finalizeForgeBundleWithCapture(original,receipt,{approval:'NO'}),/FORGE_FINAL_IMAGE_APPROVAL_REQUIRED/);
 const final=await finalizeForgeBundleWithCapture(original,receipt,{approval:'APPROVE_FINAL_REFERENCE_PNG'});
 assert.notEqual(final.sha256,original.sha256);
 assert.equal(final.manifest.parentBundleSha256,original.sha256);
 assert.equal(final.manifest.referencePng.sha256,receipt.sha256);
 assert.deepEqual(await verifyForgeBundle(final),candidate.document);
 await assert.rejects(finalizeForgeBundleWithCapture(final,receipt,{approval:'APPROVE_FINAL_REFERENCE_PNG'}),/FORGE_REFERENCE_IMAGE_ALREADY_LOCKED/);
 await assert.rejects(finalizeForgeBundleWithCapture(original,{...receipt,bundleSha256:'0'.repeat(64)},{approval:'APPROVE_FINAL_REFERENCE_PNG'}),/FORGE_CAPTURE_RECEIPT_INVALID/);
});

test('DF-04: owner typed editing of fonts, components and selective visual mixing preserves text and history',()=>{
 const [a,b]=generateForgeVariants(makeForgeBrief({prompt:'역학달력 사용자 메뉴와 헤더를 표시해줘'}));
 const start=JSON.stringify(a),node=a.document.components[0];
 const withFont=refineForgeVariant(a,{kind:'token',prop:'fontStack',value:'Arial, sans-serif'});
 assert.equal(withFont.document.designSystem.fontStack,'Arial, sans-serif');
 const added=refineForgeVariant(withFont,{kind:'insert',value:'Button'});
 assert.ok(added.document.components.length===a.document.components.length+1);
 const moved=refineForgeVariant(added,{kind:'move',id:node.id,value:1});
 assert.equal(moved.document.components[1].id,node.id);
 const merged=mixForgeVariants(moved,b,{takeTheme:false,takeTypography:true,takeDecorations:true,takeComponentStyles:true});
 assert.equal(merged.document.designSystem.fontStack,b.document.designSystem.fontStack);
 assert.equal(merged.document.designSystem.heroArt,b.document.designSystem.heroArt);
 assert.equal(merged.document.components.find(x=>x.id===node.id).text,node.text);
 assert.equal(JSON.stringify(a),start);
 assert.equal(validateProjectImport(merged.document),true);
 assert.throws(()=>refineForgeVariant(a,{kind:'token',prop:'fontStack',value:'url(https://bad.example/font)'}),/FORGE_TOKEN_VALUE_UNSUPPORTED/);
});

test('DF-02: offline industry recommendations respect user constraints with provenance',()=>{
 const analytics=makeForgeBrief({prompt:'금융 데이터 대시보드와 거래 통계 테이블을 디자인해줘'});
 const first=recommendForgeStyles(analytics);
 assert.equal(first[0].styleId,'structured');
 assert.ok(first[0].matchingRules.length>0);
 assert.equal(first[0].source.offlineRules.noRemoteRequests,true);
 assert.deepEqual(recommendForgeStyles(analytics),first);
 const culture=makeForgeBrief({prompt:'역학 달력 전통 문화 페이지를 제작해줘'});
 assert.equal(recommendForgeStyles(culture)[0].styleId,'expressive');
 const editorial=makeForgeBrief({prompt:'미니멀 독립 매거진과 기사 아카이브를 제작해줘',avoid:'화려한 장식'});
 assert.equal(recommendForgeStyles(editorial)[0].styleId,'editorial');
 const otherwise=makeForgeBrief({prompt:'오늘의 날짜를 표시해줘'});
 assert.equal(recommendForgeStyles(otherwise).length,3);
 assert.ok(recommendForgeStyles(otherwise).every(s=>s.quality==='RULE_BASED_NOT_AESTHETICALLY_VERIFIED'));
});

test('DF-02: pinned upstream CSV subset informs accessibility/night recommendations with no runtime fetch',()=>{
 const p=makeForgeBrief({prompt:'고령층 접근성 키보드 내비게이션 교육 사이트 제작'});
 const options=recommendForgeStyles(p);
 assert.ok(options.some(x=>x.matchingRules.some(rule=>rule.category==='pinned-style-row-8')));
 assert.equal(options[0].source.offlineRules.research.stylesBlobSha,'7ed18d6ef06557b9a6f2285b87b458fd71e4722f');
 const night=makeForgeBrief({prompt:'야간 코딩 인터페이스와 개발자 화면을 만들어줘'});
 assert.ok(recommendForgeStyles(night).some(x=>x.matchingRules.some(rule=>rule.category==='pinned-style-row-7')));
});
