/** Real React 19 server renderer + TypeScript typecheck of SAFE FFAX-generated TSX.
 * Default: synthetic design fixtures (not a model run).
 * --local --approve-local: actual loopback Ollama inference on 12 frozen prompts.
 * No raw prompts/output logged, no automatic product edit or user UX approval.
 */
import {createRequire} from 'node:module';
import {mkdtemp,writeFile,rm,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {buildBrief,parseModelDesign} from '../src/core.mjs';
import {makeLocalFixtureDesign} from '../src/ai-structured-output.mjs';
import {runLocalOllama} from '../src/local-ollama.mjs';
const require=createRequire(import.meta.url);
const ts=require('typescript'),React=require('react'),ReactDOMServer=require('react-dom/server');
const BRIEFS=[
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
const live=process.argv.includes('--local'),consent=process.argv.includes('--approve-local');
const opt=process.argv.find(s=>s.startsWith('--model='));
if(live&&!consent)throw Error('LOCAL_MODEL_OWNER_APPROVAL_REQUIRED');
const model=opt?.slice(8)||'qwen3:4b-instruct';
const tmp=await mkdtemp(join(process.cwd(),'.ffax-tsx-real-'));
const files=[],outcomes=[];
try {
 for(const [i,prompt] of BRIEFS.entries()){
  try{
   const raw=live?(await runLocalOllama({prompt,model,consent:'APPROVE_LOCAL_MODEL_PROMPT_ONLY'})).output:makeLocalFixtureDesign(i,prompt);
   // This is structural validation in an isolated test, NOT final owner UI acceptance.
   const doc=parseModelDesign(raw,{ownerBrief:prompt,approval:'APPROVE_DESIGN_PREVIEW'});
   const source=doc.reactSource,file=join(tmp,'Screen'+i+'.tsx');
   await writeFile(file,source);files.push(file);
   const js=ts.transpileModule(source,{fileName:'Screen.tsx',reportDiagnostics:true,
     compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}});
   if((js.diagnostics||[]).some(d=>d.category===ts.DiagnosticCategory.Error))throw Error('TRANSPILE_INVALID');
   // Executed JS is generated strictly by FFAX allowlisted serializer, NEVER raw model code.
   const mod={exports:{}};
   new Function('require','module','exports',js.outputText)(require,mod,mod.exports);
   const rendered=ReactDOMServer.renderToStaticMarkup(React.createElement(mod.exports.default));
   if(!rendered.includes('<main')||rendered.includes('<script')||rendered.length<200)throw Error('RENDER_INVALID');
   outcomes.push({i,pass:true,components:doc.document.components.length,renderedChars:rendered.length});
  }catch(e){
   outcomes.push({i,pass:false,error:/^[A-Z_]+$/.test(e.message)?e.message:'MODEL_OUTPUT_FAILED'});
  }
 }
 let diagnostics=[];
 if(files.length){
  const opts={strict:true,noEmit:true,skipLibCheck:true,esModuleInterop:true,jsx:ts.JsxEmit.React,
   target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext};
  const program=ts.createProgram(files,opts);
  diagnostics=ts.getPreEmitDiagnostics(program).filter(d=>d.category===ts.DiagnosticCategory.Error).map(d=>({code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,' ').slice(0,140)}));
 }
 const count=outcomes.filter(o=>o.pass).length,threshold=live?10:12;
 const report={schema:'ffax-react19-real-runtime.v1',mode:live?'ACTUAL_LOCAL_OLLAMA':'SYNTHETIC_NOT_AI',
  reactVersion:React.version,briefCount:12,passed:count,failed:12-count,typeErrors:diagnostics.length,
  success:count>=threshold&&diagnostics.length===0,
  autoApplied:false,ownerUxApproved:false,externalNetwork:false,results:outcomes,diagnostics:diagnostics.slice(0,10)};
 console.log(JSON.stringify(report,null,2));
 if(!report.success)process.exitCode=1;
}finally{await rm(tmp,{recursive:true,force:true});}
