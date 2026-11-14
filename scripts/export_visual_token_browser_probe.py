"""Compare genuine React19 SSR output against FFAX styled preview in real Chromium.
Synthetic design data only: no model, customer repo or production service is touched.
"""
import json
import shutil
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
CSS=(ROOT/'styles.css').read_text(encoding='utf-8')
EXPRESSION=r"""
import {createRequire} from 'node:module';
import {buildBrief,newDocument,renderMarkup,exportReact} from './src/core.mjs';
const require=createRequire(process.cwd()+'/package.json');
const ts=require('typescript'),React=require('react'),ReactDOMServer=require('react-dom/server');
const brief=buildBrief('데이터 분석과 고객 검색 입력과 카드를 갖춘 운영 대시보드');
const results={};
for(const variant of ['A','B']){
 const doc=newDocument(brief,variant);
 const src=exportReact(doc);
 const js=ts.transpileModule(src,{fileName:'GeneratedScreen.tsx',reportDiagnostics:true,
  compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}});
 if((js.diagnostics||[]).some(d=>d.category===ts.DiagnosticCategory.Error))throw Error('EXPORT_TRANSPILE_FAILED');
 const mod={exports:{}};
 new Function('require','module','exports',js.outputText)(require,mod,mod.exports);
 const html=ReactDOMServer.renderToStaticMarkup(React.createElement(mod.exports.default));
 results[variant]={preview:renderMarkup(doc),exported:html,
  indices:Object.fromEntries(doc.components.map((n,i)=>[n.type,i]))};
}
console.log(JSON.stringify(results));
"""
result=subprocess.run(['node','--input-type=module','-e',EXPRESSION],cwd=ROOT,
                      capture_output=True,text=True,check=True,timeout=25)
fixtures=json.loads(result.stdout)
observations=[]
PROPERTIES=['backgroundColor','borderRadius','paddingTop','color']
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,
        executable_path=shutil.which('chromium') or shutil.which('chromium-browser') or p.chromium.executable_path,
        args=['--no-sandbox'])
    try:
        for width in (375,768,1440):
            for variant in ('A','B'):
                fixture=fixtures[variant]
                page=browser.new_page(viewport={'width':width,'height':900})
                errors=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                html='<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+CSS+'</style></head><body><section id="preview-zone">'+fixture['preview']+'</section><section id="export-zone">'+fixture['exported']+'</section></body></html>'
                try:
                    page.set_content(html,wait_until='load')
                    for typ in ('Card','Input','Button'):
                        data=page.evaluate("""({type,index})=>{
                          const a=document.querySelectorAll('#preview-zone .ff-canvas > *')[index];
                          const b=document.querySelectorAll('#export-zone .ff-generated > *')[index];
                          if(!a||!b)throw Error('MISSING_COMPONENT_'+type);
                          const keys=['backgroundColor','borderRadius','paddingTop','color'];
                          const make=el=>{
                            const s=getComputedStyle(el);
                            return Object.fromEntries(keys.map(k=>[k,s[k]]));
                          };
                          const preview=make(a),exported=make(b);
                          let input=null;
                          if(type==='Input'){
                            const nestedA=a.querySelector('input'),nestedB=b.querySelector('input');
                            input={preview:make(nestedA),exported:make(nestedB)};
                          }
                          return {preview,exported,input};
                        }""",{'type':typ,'index':fixture['indices'][typ]})
                        assert data['preview']==data['exported'],(variant,width,typ,data)
                        if data['input']:
                            assert data['input']['preview']==data['input']['exported'],(variant,width,typ,'nested',data)
                        observations.append({'variant':variant,'width':width,'component':typ,'computedStyle':'MATCH'})
                    assert not errors,(variant,width,errors)
                finally:
                    page.close()
    finally:
        browser.close()
assert len(observations)==18,len(observations)
print(json.dumps({'test':'FFAX_REACT19_BROWSER_PREVIEW_EXPORT_STYLES',
                  'status':'PASS','styleMatchedComponents':18,'viewports':[375,768,1440],
                  'variants':['A','B'],'realQwenCalls':0},ensure_ascii=False))
