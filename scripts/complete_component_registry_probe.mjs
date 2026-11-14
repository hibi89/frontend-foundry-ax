/** 17-registry TSX strict compile and React19 SSR.
 * Not an actual LLM inference or approval to integrate a customer backend.
 */
import {createRequire} from 'node:module';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {buildBrief,newDocument,applyCommand,COMPONENT_TYPES,exportReact} from '../src/core.mjs';
import {strictDiagnostics} from '../src/probe-policy.mjs';
const require=createRequire(import.meta.url);
const ts=require('typescript'),React=require('react'),ReactDOMServer=require('react-dom/server');
const root=process.cwd();
const tmp=await mkdtemp(join(root,'.ffax-registry-real-'));
try{
 const brief=buildBrief('관리자 데이터 분석 차트와 검색 화면을 만들어줘. 기존 로그인 API는 보존');
 let doc=newDocument(brief);
 const types=COMPONENT_TYPES.slice();
 if(types.length!==17)throw Error('REGISTRY_TYPE_COUNT_CHANGED');
 for(const type of types)doc=applyCommand(doc,{kind:'insert',type});
 const source=exportReact(doc);
 const file=join(tmp,'AllPatterns.tsx');
 await writeFile(file,source,'utf8');
 const errors=strictDiagnostics(ts,file);
 if(errors.length)throw Error('REGISTRY_STRICT_TYPESCRIPT_FAILED '+JSON.stringify(errors));
 const result=ts.transpileModule(source,{fileName:'AllPatterns.tsx',reportDiagnostics:true,
  compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,
   target:ts.ScriptTarget.ES2022,esModuleInterop:true}});
 if((result.diagnostics||[]).some(x=>x.category===ts.DiagnosticCategory.Error))
  throw Error('REGISTRY_JSX_TRANSPILE_FAILED');
 const mod={exports:{}};
 new Function('require','module','exports',result.outputText)(require,mod,mod.exports);
 const html=ReactDOMServer.renderToStaticMarkup(React.createElement(mod.exports.default));
 if(html.length<600||!html.includes('<main')||html.includes('<script')||
    !html.includes('사이드바 탐색')||!html.includes('예시 막대 차트')||
    !html.includes('다시 시도 (미연결)'))
  throw Error('REGISTRY_REACT19_SSR_FAILED');
 const all=doc.components.slice(-17);
 if(all.some((node,i)=>node.type!==types[i]||node.id!=='node-'+(i+14)))
  throw Error('REGISTRY_INSERT_ID_ORDER_FAILED');
 const report={test:'FFAX_17_REGISTRY_REACT19',status:'PASS',patterns:types.length,
   generatedComponents:doc.components.length,strictTypeErrors:errors.length,react19SSR:true,
   codeSha256:createHash('sha256').update(source).digest('hex'),
   syntheticOnly:true,realModelCalls:0,gitWrites:0,customerApiCalls:0};
 console.log(JSON.stringify(report));
}finally{await rm(tmp,{recursive:true,force:true});}
