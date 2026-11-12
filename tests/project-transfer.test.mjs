import test from 'node:test';
import assert from 'node:assert/strict';
import {newDocument,buildBrief,applyCommand,createReference,approveReference,parseModelDesign,exportLocalProject,importLocalProject,renderMarkup,exportReact} from '../src/core.mjs';
const make=()=>newDocument(buildBrief('글로벌 프리랜서 상품 검색과 프로필 화면 만들고 결제 API는 보존해줘'));
const clone=x=>JSON.parse(JSON.stringify(x));
const wrapped=doc=>JSON.parse(exportLocalProject(doc));
const load=x=>importLocalProject(JSON.stringify(x));
test('owner local project archive: byte-equivalent document round-trip',()=>{
 const doc=applyCommand(make(),{kind:'update',id:'node-1',prop:'text',value:'한국어 프로젝트 제목'});
 const archive=exportLocalProject(doc);const restored=importLocalProject(archive);
 assert.deepEqual(restored,doc);assert.notEqual(restored,doc);
 assert.equal(renderMarkup(restored),renderMarkup(doc));assert.equal(exportReact(restored),exportReact(doc));
});
test('unreviewed and reviewed reference variants preserve rights and selected palette',()=>{
 const unreviewed=createReference(make(),'sample.png',true,['#112233','#abcdef']);
 assert.deepEqual(load(wrapped(unreviewed)),unreviewed);
 const reviewed=approveReference(unreviewed,'B');assert.deepEqual(load(wrapped(reviewed)),reviewed);
});
test('MODEL generated document remains importable without executing model code',()=>{
 const result=parseModelDesign(JSON.stringify({schema:'ffax-model-design.v1',title:'모델 UI',theme:'midnight',layout:'grid',components:[{type:'Card',text:'안전한 테스트'}]}),{ownerBrief:'마켓플레이스 프로젝트의 디자인을 변경해줘',approval:'APPROVE_DESIGN_PREVIEW'});
 const fromFile=load(wrapped(result.document));assert.deepEqual(fromFile,result.document);
});
test('rejects wrong schema, unknown keys and malformed JSON',()=>{
 const archive=wrapped(make()); archive.schema='wrong';assert.throws(()=>load(archive),/PROJECT_SCHEMA_INVALID/);
 const extra=wrapped(make());extra.__proto__='notused';extra.extra='readPrivateKey';assert.throws(()=>load(extra),/PROJECT_SCHEMA_INVALID/);
 assert.throws(()=>importLocalProject('not json '.repeat(12)),/PROJECT_JSON_INVALID/);
 assert.throws(()=>importLocalProject('x'.repeat(262145)),/PROJECT_FILE_SIZE_INVALID/);
});
test('rejects prototype-oriented and unknown component keys',()=>{
 let data=wrapped(make());data.project.theme='constructor';assert.throws(()=>load(data),/PROJECT_HEADER_INVALID/);
 data=wrapped(make());data.project.components[0].__proto__=null;data.project.components[0].onClick='run()';assert.throws(()=>load(data),/PROJECT_COMPONENT_INVALID/);
 data=wrapped(make());data.project.components[0].type='script';assert.throws(()=>load(data),/PROJECT_COMPONENT_INVALID/);
});
test('rejects duplicate IDs, unknown styling and too many components',()=>{
 let data=wrapped(make());data.project.components[1].id=data.project.components[0].id;assert.throws(()=>load(data),/PROJECT_COMPONENT_INVALID/);
 data=wrapped(make());data.project.components[0].spacing=10000;assert.throws(()=>load(data),/PROJECT_COMPONENT_INVALID/);
 data=wrapped(make());data.project.components=Array.from({length:81},(_,i)=>({...make().components[0],id:'node'+i}));assert.throws(()=>load(data),/PROJECT_COMPONENTS_INVALID/);
});
test('rejects malicious reference CSS injection and forged review',()=>{
 let data=wrapped(createReference(make(),'licensed.png',true,['#112233','#abcdef']));
 data.project.reference.selectedColor='red;position:absolute;';assert.throws(()=>load(data),/PROJECT_REFERENCE_UNAPPROVED/);
 data=wrapped(createReference(make(),'licensed.png',true,['#112233','#abcdef']));data.project.reference.candidates[0].color='url(javascript:alert(1))';assert.throws(()=>load(data),/PROJECT_REFERENCE_INVALID/);
 data=wrapped(approveReference(createReference(make(),'licensed.png',true,['#112233','#abcdef']),'A'));
 data.project.reference.selectedColor='#fedcba';assert.throws(()=>load(data),/PROJECT_REFERENCE_APPROVAL_INVALID/);
});
test('rejects malformed brief and raw data that is not a local project',()=>{
 let data=wrapped(make());data.project.brief.pages=[''];assert.throws(()=>load(data),/PROJECT_BRIEF_INVALID/);
 data=wrapped(make());data.project.brief.widthTargets=['375','768','1440'];assert.throws(()=>load(data),/PROJECT_BRIEF_INVALID/);
 data=wrapped(make());data.project.brief.approaches[0].id='C';assert.throws(()=>load(data),/PROJECT_APPROACH_INVALID/);
 data=wrapped(make());delete data.project.brief;assert.throws(()=>load(data),/PROJECT_BRIEF_INVALID/);
});
test('local project archive never contains commands or execution strings',()=>{
 const doc=make();const original=JSON.stringify(doc);const snapshot=exportLocalProject(doc);
 assert.equal(JSON.stringify(doc),original);assert.ok(!snapshot.includes('externalNetwork'));assert.ok(!snapshot.includes('GitHubToken'));
});
