"""Actual Chromium manual-AI import controls with injected same-source DOM.
No external calls; URL navigation and real LLM deliberately not claimed.
"""
import json, pathlib, re, sys
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text(encoding='utf-8')
css=(ROOT/'styles.css').read_text(encoding='utf-8')
core=re.sub(r'\bexport (?=(?:const|class|function)\b)','',(ROOT/'src/core.mjs').read_text(encoding='utf-8'))
app=re.sub(r'^import [^;]+;','',(ROOT/'src/app.mjs').read_text(encoding='utf-8'),count=1)
html=re.sub(r'<link rel="stylesheet"[^>]+>','',html)
html=re.sub(r'<script type="module"[^>]+></script>','',html)
module='window.fetch=async()=>({text:async()=>'+json.dumps(css)+'});\n'+core+'\n'+app
brief='프리랜서 상품 검색과 고객 프로필 대시보드 UI를 만들고 기존 결제 API는 변경하지 마'
valid=json.dumps({'schema':'ffax-model-design.v1','title':'AI 안전 검토 화면','theme':'ocean','layout':'grid','components':[{'type':'Navbar','text':'프로젝트 탐색'},{'type':'Hero','text':'AI 협업 마켓'},{'type':'Button','text':'프로젝트 시작'}]},ensure_ascii=False)
checks=[];errors=[]
def check(name,ok):
 checks.append((name,bool(ok)));print(('PASS' if ok else 'FAIL')+' '+name)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu'])
 page=browser.new_page(viewport={'width':1440,'height':900})
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html);page.add_style_tag(content=css);page.add_script_tag(content=module)
 page.locator('#preview [data-node-id]').first.wait_for(timeout=8000)
 page.locator('#prompt').fill(brief)
 page.locator('#manual-build-request').click()
 check('manual copy defaults denied',page.locator('#manual-review-status').inner_text().strip()=='MANUAL_COPY_CONSENT_REQUIRED')
 check('no request before consent',page.locator('#manual-request').input_value()=='')
 page.locator('#manual-copy-consent').check();page.locator('#manual-build-request').click()
 check('local prompt packet generated', 'ffax-model-design.v1' in page.locator('#manual-request').input_value())
 page.locator('#manual-response').fill(valid);page.locator('#manual-apply-response').click()
 check('manual response requires design review', 'DESIGN_PREVIEW_APPROVAL_REQUIRED' in page.locator('#manual-review-status').inner_text())
 page.locator('#manual-design-approval').check();page.locator('#manual-apply-response').click()
 check('approved design applied',page.locator('#project-title').inner_text()=='AI 안전 검토 화면')
 check('approved model components rendered',page.locator('#preview [data-node-id]').count()==3)
 check('approved output React code visible','GeneratedScreen' in page.locator('#source-preview').inner_text())
 page.locator('#manual-response').fill('{"schema":"ffax-model-design.v1","title":"bad","theme":"midnight","layout":"stack","components":[{"type":"script","text":"hack"}]}')
 page.locator('#manual-apply-response').click()
 check('script output rejected','MODEL_COMPONENT_INVALID' in page.locator('#manual-review-status').inner_text())
 check('rejected output leaves approved design intact',page.locator('#project-title').inner_text()=='AI 안전 검토 화면' and page.locator('#preview [data-node-id]').count()==3)
 check('no page errors',not errors)
 page.screenshot(path=str(ROOT/'artifacts/qa/manual-ai-1440.png'))
 browser.close()
print('RESULT',sum(ok for _,ok in checks),'PASS /',sum(not ok for _,ok in checks),'FAIL')
sys.exit(1 if errors or not all(ok for _,ok in checks) else 0)
