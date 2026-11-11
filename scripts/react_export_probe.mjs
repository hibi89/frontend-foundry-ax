/** No LLM is involved. Compiles 12 deterministic FFAX brief outputs against a
 * minimal React ambient type and emits ES5-compatible UMD scripts for local browser QA.
 * This validates only the existing rule-based exporter, NOT AC04 AI generation.
 */
import {buildBrief, newDocument, exportReact} from '../src/core.mjs';
import {mkdtemp, writeFile, mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url);
let ts;
try{ts=require('typescript');}catch{ts=require(execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim()+'/typescript');}
const BRIEFS=[
 '글로벌 마켓플레이스, 검색과 프로필 화면을 만들어 주세요',
 '문서 RAG 워크스페이스, 업로드 채팅과 출처 카드 디자인',
 '금융 투자 대시보드 차트와 테이블, 기존 API 보존',
 '관리자 고객 CRM 현황 대시보드와 검색 UI 만들기',
 '분석 데이터 차트와 통계 지표 홈 화면 디자인',
 '교육 서비스 코스 목록과 학습 화면을 만들어 주세요',
 '예약 서비스 일정표와 예약 검색 UI를 만들어 주세요',
 '부동산 매물 검색과 상세 카드 홈페이지 만들기',
 '의료 병원 일정과 직원 관리 대시보드 설계',
 '프로젝트 관리 보드와 작업 상세 화면 만들기',
 '여행 일정을 기록하는 예약 화면과 여행 카드 만들기',
 '포트폴리오 소개 작업물 연락처 화면 디자인 요청'
];
const work=await mkdtemp(join(tmpdir(),'ffax-react-build-'));
await mkdir(join(work,'dist'));
const ambient=`declare module 'react' { const React: { createElement: (...args: any[]) => any }; export default React; }
declare namespace JSX { interface IntrinsicElements { [elemName: string]: any; } }\n`;
await writeFile(join(work,'react-shim.d.ts'),ambient,'utf8');
const output=[];
for (const [index,prompt] of BRIEFS.entries()){
  const brief=buildBrief(prompt),doc=newDocument(brief,index%2===0?'A':'B');
  const source=exportReact(doc),src=join(work,`GeneratedScreen${index}.tsx`);
  await writeFile(src,source,'utf8');
  const tsfile=source.replace("import React from 'react';",'').replace('export default function GeneratedScreen','function GeneratedScreen');
  const js=ts.transpileModule(tsfile,{fileName:`GeneratedScreen${index}.tsx`,reportDiagnostics:true,
    compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.None,target:ts.ScriptTarget.ES2019}});
  const errors=(js.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
  if(errors.length)throw new Error(`GENERATED_TRANSPILE_${index}:${ts.formatDiagnostics(errors,{
    getCurrentDirectory:()=>work,getCanonicalFileName:x=>x,getNewLine:()=>"\n"})}`);
  output.push({index,objective:brief.objective,prompt,source,compiled:js.outputText});
}
const args=['--noEmit','--strict','--skipLibCheck','--jsx','react','--target','es2020','--moduleResolution','node','--esModuleInterop','react-shim.d.ts',...output.map(x=>`GeneratedScreen${x.index}.tsx`)];
const diagnostics=execFileSync('tsc',args,{cwd:work,encoding:'utf8'});
const report={schema:'ffax-react-batch.v1',tool:'local deterministic exporter; not AI',node:process.version,
  typechecked:output.length,transpiled:output.length,compiled:output.map(x=>({index:x.index,objective:x.objective,js:x.compiled})),
  typecheckDiagnostic:diagnostics.trim()};
const path=join(work,'dist','report.json');
await writeFile(path,JSON.stringify(report,null,2),'utf8');
console.log(JSON.stringify({checked:output.length,transpiled:output.length,work,report:path},null,2));
