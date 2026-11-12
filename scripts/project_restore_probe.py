"""Local browser project round-trip and safe rollback; injected same-source limitation applies."""
import json, pathlib, re, sys
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'qa';OUT.mkdir(parents=True,exist_ok=True)
html=(ROOT/'index.html').read_text(encoding='utf8')
css=(ROOT/'styles.css').read_text(encoding='utf8')
core=re.sub(r'\bexport (?=(?:const|class|function)\b)','',(ROOT/'src/core.mjs').read_text(encoding='utf8'))
app=re.sub(r'^import [^;]+;','',(ROOT/'src/app.mjs').read_text(encoding='utf8'),count=1)
html=re.sub(r'<link rel="stylesheet"[^>]+>','',html)
html=re.sub(r'<script type="module"[^>]+></script>','',html)
module='window.fetch=async()=>({text:async()=>'+json.dumps(css)+'});\n'+core+'\n'+app
checks=[]; errors=[]
def check(n,ok):
 checks.append(bool(ok));print(('PASS ' if ok else 'FAIL ')+n)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu'])
 ctx=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True)
 page=ctx.new_page()
 page.on('pageerror',lambda e: errors.append(str(e)))
 page.set_content(html);page.add_style_tag(content=css);page.add_script_tag(content=module)
 page.locator('#preview [data-node-id]').first.wait_for(timeout=8000)
 initial=page.locator('#project-title').inner_text()
 page.locator('#component-select').select_option(index=1)
 page.locator('#component-text').fill('안전한 저장본 텍스트');page.locator('#component-text').dispatch_event('change')
 with page.expect_download() as dl:page.locator('#export-json').click()
 download=dl.value;target=OUT/'ffax-roundtrip.json';download.save_as(str(target))
 archive=json.loads(target.read_text('utf8'))
 check('project export schema correct',archive.get('schema')=='ffax-local-project.v1')
 check('project export captures edit',archive['project']['components'][1]['text']=='안전한 저장본 텍스트')
 page.locator('#component-text').fill('작업 중인 다른 편집');page.locator('#component-text').dispatch_event('change')
 current=page.locator('#preview').inner_text()
 bad=json.loads(target.read_text('utf8'))
 bad['project']['reference']={'selectedColor':'url(javascript:alert(1))'}
 page.locator('#import-project').set_input_files({'name':'tampered.json','mimeType':'application/json','buffer':json.dumps(bad).encode()})
 page.wait_for_timeout(300)
 check('malicious JSON blocked', '불러오기 거부' in page.locator('#project-import-status').inner_text())
 check('malicious import preserves canvas',page.locator('#preview').inner_text()==current)
 dialog_decisions=['dismiss','accept']
 def handle(dialog):
  decision=dialog_decisions.pop(0)
  if decision=='dismiss':dialog.dismiss()
  else:dialog.accept()
 page.on('dialog',handle)
 page.locator('#import-project').set_input_files(str(target))
 page.wait_for_timeout(300)
 check('user canceled import preserves canvas','취소' in page.locator('#project-import-status').inner_text() and page.locator('#preview').inner_text()==current)
 page.locator('#import-project').set_input_files(str(target))
 page.wait_for_timeout(300)
 check('user accepted project restored','안전한 저장본 텍스트' in page.locator('#preview').inner_text() and '불러오기 완료' in page.locator('#project-import-status').inner_text())
 page.locator('#undo').click()
 check('undo recovers edit before import','작업 중인 다른 편집' in page.locator('#preview').inner_text())
 check('local project import did not change page origin',page.url=='about:blank')
 check('no javascript errors',not errors)
 page.screenshot(path=str(OUT/'ffax-project-restore.png'),full_page=True)
 browser.close()
print('RESULT',sum(checks),'PASS /',len(checks)-sum(checks),'FAIL')
if errors:print('ERRORS',errors)
sys.exit(1 if errors or not all(checks) else 0)
