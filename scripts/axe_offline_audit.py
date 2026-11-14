"""Official axe-core browser audit. Fails closed if axe-core is not installed.

This is NOT a user UX approval. Requires approved local dependency:
  npm install --ignore-scripts
  python scripts/axe_offline_audit.py
The model/production/Windows acceptance gates remain separate.
"""
import json, pathlib, re, sys
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
AXE=ROOT/'node_modules'/'axe-core'/'axe.min.js'
OUT=ROOT/'artifacts'/'qa'/'axe-offline-report.json'
if not AXE.is_file():
    print('NOT VERIFIED: axe-core 4.14.0 is not installed locally; no axe audit was performed.')
    sys.exit(2)
html=(ROOT/'index.html').read_text(encoding='utf8')
css=(ROOT/'styles.css').read_text(encoding='utf8')
core=re.sub(r'\bexport (?=(?:const|class|function)\b)','',(ROOT/'src/core.mjs').read_text(encoding='utf8'))
app=re.sub(r'^import [^;]+;','',(ROOT/'src/app.mjs').read_text(encoding='utf8'),count=1)
html=re.sub(r'<link rel="stylesheet"[^>]+>','',html)
html=re.sub(r'<script type="module"[^>]+></script>','',html)
script='window.fetch=async()=>({text:async()=>'+json.dumps(css)+'});\n'+core+'\n'+app
record={'schema':'ffax-axe-audit.v1','dependency':'axe-core 4.14.0','injectedSource':True,'directBrowserUrl':False,'userUxApproval':False,'viewports':[]}
with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
  page=browser.new_page(viewport={'width':1440,'height':900})
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html)
  page.add_style_tag(content=css)
  page.add_script_tag(content=script)
  page.add_script_tag(path=str(AXE))
  page.locator('#preview [data-node-id]').first.wait_for(timeout=10000)
  for width in (375,768,1440):
    page.set_viewport_size({'width':width,'height':900})
    result=page.evaluate('''async ()=> {
      const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});
      return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length,targets:v.nodes.map(n=>n.target).slice(0,3)})),
              passes:r.passes.length,incomplete:r.incomplete.length};
    }''')
    serious=[v for v in result['violations'] if v['impact'] in ('critical','serious')]
    record['viewports'].append({'width':width,'seriousOrCritical':len(serious),**result})
  record['jsErrors']=errors
  browser.close()
OUT.parent.mkdir(parents=True,exist_ok=True)
OUT.write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf8')
# Diagnostic identifiers and target selectors only; never print owner prompts or private data.
for viewport in record['viewports']:
  for violation in viewport['violations']:
    if violation['impact'] in ('critical','serious'):
      print(json.dumps({'width':viewport['width'],'id':violation['id'],'impact':violation['impact'],'nodes':violation['nodes'],'targets':violation['targets']},ensure_ascii=False))
num=sum(x['seriousOrCritical'] for x in record['viewports'])
print(json.dumps({'axeVersion':'4.14.0','viewports':len(record['viewports']),'seriousOrCriticalViolations':num,'jsErrors':len(record['jsErrors']),'report':str(OUT),'userApproval':'PENDING'},ensure_ascii=False))
sys.exit(1 if num or record['jsErrors'] else 0)
