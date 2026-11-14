/** Compile 12 synthetic structured model proposals to generated React source.
 * This is model interface readiness only, NOT actual AI inference or AC04 PASS.
 */
import {parseModelDesign,makeLocalFixtureDesign} from '../src/ai-structured-output.mjs';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const tscCli=require.resolve('typescript/lib/tsc.js');
const briefs=[
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
const dir=await mkdtemp(join(tmpdir(),'ffax-structured-'));
let checked=0; const errors=[];
try {
 await writeFile(join(dir,'react-shim.d.ts'),"declare module 'react' { const React: { createElement: (...args: any[]) => any }; export default React; }\ndeclare namespace JSX { interface IntrinsicElements { [elemName: string]: any; } }\n");
 for(const [i,brief] of briefs.entries()) {
  const output=parseModelDesign(makeLocalFixtureDesign(i,brief),{ownerBrief:brief,approval:'APPROVE_DESIGN_PREVIEW'});
  if(output.document.components.length!==7 || output.metadata.externalNetwork!==false) throw new Error('CONTRACT_FAILURE');
  await writeFile(join(dir,'Screen'+i+'.tsx'),output.reactSource);checked++;
 }
 const result=execFileSync(process.execPath,[tscCli,'--strict','--noEmit','--skipLibCheck','--jsx','react','--target','es2020','--moduleResolution','node','--esModuleInterop','react-shim.d.ts',...briefs.map((_,i)=>'Screen'+i+'.tsx')],{cwd:dir,encoding:'utf8'});
 if(result.trim())errors.push(result);
 console.log(JSON.stringify({fixtureScreens:checked,typechecked:checked,failures:errors.length,actualAIProviderCalls:0,networkCalls:0,scope:'synthetic structured proposals; not real LLM'},null,2));
}finally{await rm(dir,{recursive:true,force:true});}
if(errors.length || checked!==12)process.exitCode=1;
