import test from 'node:test';import assert from 'node:assert/strict';import { createRequire } from 'node:module';import { execFileSync } from 'node:child_process';
const require=createRequire(import.meta.url);
let ts;try{ts=require('typescript');}catch{const dir=execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim();ts=require(dir+'/typescript');}
import {buildBrief,newDocument,DocumentHistory,applyCommand,createReference,approveReference,renderMarkup,renderNode,exportReact,THEME_OPTIONS,REGISTRY,COMPONENT_TYPES,makeComponent,assertDocument} from '../src/core.mjs';
const expectedObjectives=['마켓플레이스','문서 AI 워크스페이스','금융 분석','운영 관리','데이터 분석','교육 서비스','예약 서비스','부동산','의료 업무','프로젝트 관리','여행 계획','포트폴리오'];
const prompts=[
'글로벌 프리랜서 마켓플레이스 검색과 프로필, 협상 화면 만들어줘. 결제 API 유지',
'RAG 문서 검색과 답변 출처 UI를 만들어줘. 데이터 보존',
'증권 금융 투자 분석 대시보드에서 차트 보고 싶어',
'운영 관리자 CRM 고객 목록·설정 앱을 설계해줘',
'데이터 분석 테이블과 통계 차트 시각화 화면 만들어줘',
'교육 서비스 강좌와 학습진도 UI를 구성해줘',
'예약 서비스에서 날짜 검색과 내 예약 화면을 만들어줘',
'부동산 매물 지도 검색과 상세 서비스를 만들어줘',
'병원 의료 업무 일정과 환자 목록을 설계해줘',
'프로젝트 팀 업무 보드와 상세 화면을 만들어줘',
'여행 일정표와 목적지 탐색 UI를 만들어줘',
'개인 포트폴리오 작업물과 소개 페이지 만들어줘'
];
for(const [i,prompt] of prompts.entries())test(`brief fixture ${i+1}: objective + constraints + 2 options`,()=>{
 const b=buildBrief(prompt); assert.equal(b.objective,expectedObjectives[i]); assert.ok(b.pages.length>=3); assert.ok(b.features.includes('반응형 레이아웃'));
 assert.ok(b.constraints.includes('승인 없는 GitHub push·Production 배포 금지'));assert.equal(b.approaches.length,2);assert.notEqual(b.approaches[0].layout,b.approaches[1].layout);
 const a=newDocument(b,'A'),d=newDocument(b,'B');assert.notEqual(a.layout,d.layout);assert.equal(a.components.length,13);
});
test('rejects invalid/short natural language',()=>{assert.throws(()=>buildBrief('안녕'));});
test('three themes and 13 registered, accessible components',()=>{assert.equal(Object.keys(THEME_OPTIONS).length,3);assert.ok(COMPONENT_TYPES.length>=10);let d=newDocument(buildBrief(prompts[0]));for(const t of Object.keys(THEME_OPTIONS)){d={...d,theme:t};assertDocument(d);const html=renderMarkup(d);assert.ok(html.includes(`data-theme="${t}"`));for(const type of COMPONENT_TYPES)assert.ok(html.includes(`ff-${type.toLowerCase()}`));}});
test('React TSX export is syntactically transpileable, preserves 13 components',()=>{let d=newDocument(buildBrief(prompts[0]));let s=exportReact(d);let x=ts.transpileModule(s,{fileName:'GeneratedScreen.tsx',reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,isolatedModules:true}});assert.equal(x.diagnostics?.length||0,0);assert.ok(x.outputText.includes('react/jsx-runtime'));assert.ok(s.includes('export default function GeneratedScreen'));assert.equal(d.components.length,13);});
test('visual editing changes five properties and code/preview',()=>{const h=new DocumentHistory(newDocument());const id=h.present.components[1].id;let changes=[['text','예약하기'],['color','neutral'],['spacing',24],['align','end'],['type','Button']];for(let [prop,value] of changes)h.exec({kind:'update',id,prop,value});let n=h.present.components.find(c=>c.id===id);assert.equal(n.text,'예약하기');assert.equal(n.color,'neutral');assert.equal(n.spacing,24);assert.equal(n.align,'end');assert.equal(n.type,'Button');assert.ok(renderMarkup(h.present).includes('예약하기'));assert.ok(exportReact(h.present).includes('예약하기'));assert.equal(h.past.length,5);for(let i=0;i<5;i++)h.undo();assert.equal(h.present.components[1].text,'새로운 아이디어를 현실로');for(let i=0;i<5;i++)h.redo();assert.equal(h.present.components[1].text,'예약하기');});
test('component move/insert/remove and undo/redo',()=>{const h=new DocumentHistory(newDocument());const start=h.present.components.map(x=>x.id);h.exec({kind:'move',id:start[0],index:3});assert.equal(h.present.components[3].id,start[0]);h.undo();assert.equal(h.present.components[0].id,start[0]);h.redo();assert.equal(h.present.components[3].id,start[0]);h.exec({kind:'insert',type:'Card'});assert.equal(h.present.components.length,14);h.exec({kind:'remove',id:start[0]});assert.equal(h.present.components.length,13);});
test('user-provided image requires rights, records provenance and 2 palette candidates',()=>{const d=newDocument();assert.throws(()=>createReference(d,'reference.png',false,['#aabbcc','#112233']));const out=createReference(d,'user-supplied.png',true,['#123456','#abcdef']);assert.equal(out.reference.origin,'user-provided');assert.equal(out.reference.candidates.length,2);assert.equal(out.reference.rightsConfirmed,true);assert.equal(out.reference.reviewed,false);assert.equal(d.reference,null);});
test('XSS content remains escaped in preview and data in JSX expression',()=>{let d=newDocument();d=applyCommand(d,{kind:'update',id:d.components[0].id,prop:'text',value:'<script>alert(1)</script>'});assert.ok(!renderMarkup(d).includes('<script>'));assert.ok(renderMarkup(d).includes('&lt;script&gt;'));assert.ok(exportReact(d).includes('"<script>alert(1)</script>"'));});
test('invalid edits fail closed; original preserved',()=>{const d=newDocument(),original=JSON.stringify(d);const id=d.components[0].id;for(const command of [{kind:'update',id,prop:'spacing',value:100000},{kind:'update',id,prop:'onClick',value:'evil'},{kind:'update',id,prop:'text',value:'x'.repeat(200)},{kind:'insert',type:'Script'},{kind:'move',id,index:-1}])assert.throws(()=>applyCommand(d,command));assert.equal(JSON.stringify(d),original);});
test('foreign component type is rejected',()=>assert.throws(()=>makeComponent('Script','bad')));

test('explicit image candidate approval changes preview accent and React source',()=>{const d=createReference(newDocument(),'ref.png',true,['#123456','#abcdef']);const approved=approveReference(d,'B');assert.equal(approved.reference.approvedCandidate,'B');assert.equal(approved.reference.selectedColor,'#abcdef');assert.equal(approved.layout,'grid');assert.ok(renderMarkup(approved).includes('--accent:#abcdef'));assert.ok(exportReact(approved).includes('#abcdef'));assert.equal(d.reference.reviewed,false);});
test('React exporter syncs component color, spacing and alignment',()=>{let d=newDocument(),id=d.components[0].id;d=applyCommand(d,{kind:'update',id,prop:'color',value:'neutral'});d=applyCommand(d,{kind:'update',id,prop:'spacing',value:32});d=applyCommand(d,{kind:'update',id,prop:'align',value:'end'});let react=exportReact(d);assert.match(react,/padding: 32/);assert.match(react,/alignSelf: "end"/);assert.match(react,/color: "#f8fafc"/);});

test('image reference option A produces distinct stack alternative',()=>{const d=createReference(newDocument(),'ref.png',true,['#111111','#cccccc']);const a=approveReference(d,'A'),b=approveReference(d,'B');assert.equal(a.layout,'stack');assert.equal(b.layout,'grid');assert.notEqual(renderMarkup(a),renderMarkup(b));});
