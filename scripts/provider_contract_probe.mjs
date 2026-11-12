/** Contract rehearsal across twelve frozen sample prompts with an in-memory fake.
 * NO genuine LLM or external provider requests are made; cannot score AC04.
 */
import assert from 'node:assert/strict';
import { makeApprovedChatAdapter } from '../src/provider-adapter.mjs';
import { makeApprovedPlan, AILedger, executeApprovedPrompt } from '../src/ai-gate.mjs';
import { parseModelDesign, makeLocalFixtureDesign } from '../src/ai-structured-output.mjs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const require=createRequire(import.meta.url);
const prompts=[
 '금융 투자 대시보드 차트와 고객 검색 화면 만들기',
 'AI 마켓플레이스 상품 검색 프로필 화면 디자인',
 'RAG 문서 검색 업로드 인용 대시보드 제작',
 '관리자 CRM 목록과 필터 화면을 만들어줘',
 '예약 서비스 일정표와 결제 검토 UI를 만들어줘',
 '교육 콘텐츠 강좌 목록 및 학습 UI를 만들어줘',
 '프로젝트 작업 흐름과 카드형 정보 화면을 만들어줘',
 '포트폴리오 프로젝트 소개와 연락처 화면 제작',
 '여행 일정 검색과 날짜별 목록 화면 디자인',
 '병원 의료 일정 관리 대시보드 화면 제작',
 '부동산 매물 검색과 상담 화면 제작',
 '매출 데이터 통계 요약과 테이블 UX 생성하기'
];
let received=0, approved=0, screens=0;const ledger=new AILedger({maxSessionUsd:.1});
const ts=require('typescript');
for(const [i,prompt] of prompts.entries()){
 const owner=makeApprovedPlan({prompt,consent:'APPROVE_EXTERNAL_AI_PROMPT_ONLY',provider:'fixture',model:'offline-v1',estimatedInputTokens:150,maxOutputTokens:800,usdPerMillionInputTokens:1,usdPerMillionOutputTokens:1,maxJobUsd:.01,jobId:'probeffax2026'+String(i).padStart(4,'0')});
 const adapter=makeApprovedChatAdapter({endpoint:'https://fixture.example.com/v1/chat/completions',allowedOrigins:['https://fixture.example.com'],apiKey:'not-real-fixture-key',model:'offline-v1',provider:'fixture',fetchImpl:async(url,request)=>{
  received++; assert.equal(new URL(url).host,'fixture.example.com');
  const body=JSON.parse(request.body);assert.equal(body.messages[1].content,prompt);
  return {ok:true,status:200,headers:{get:()=> 'application/json'},json:async()=>({choices:[{message:{content:makeLocalFixtureDesign(i,prompt)}}],usage:{prompt_tokens:150,completion_tokens:180}})};
 }});
 const result=await executeApprovedPrompt({plan:owner,ledger,adapter});assert.equal(result.receipt.status,'succeeded');
 const design=parseModelDesign(result.output,{ownerBrief:prompt,approval:'APPROVE_DESIGN_PREVIEW'});approved++;
 const compiled=ts.transpileModule(design.reactSource,{fileName:'Screen.tsx',compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020},reportDiagnostics:true});
 assert.equal((compiled.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0);screens++;
}
assert.equal(received,12);assert.equal(approved,12);assert.equal(screens,12);
console.log(JSON.stringify({schema:'ffax-provider-contract.v1',fakeTransportCalls:received,strictDesigns:approved,transpiledScreens:screens,realProviderCalls:0,externalNetwork:false,completionScoreAdded:0},null,2));
