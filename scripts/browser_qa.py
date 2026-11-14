"""Browser probe via injected assets because Chromium localhost navigation is admin-blocked.
HTTP server separately tested by Python urllib; injected document exercises actual UI source.
"""
from __future__ import annotations
import json, os, pathlib, re, subprocess, time
from urllib.request import urlopen
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'qa';OUT.mkdir(parents=True,exist_ok=True)
PORT=4173;BASE=f'http://127.0.0.1:{PORT}'
checks=[];exceptions=[];external=[];console_errors=[];network_errors=[]
def check(label,ok,detail=''):
    checks.append({'name':label,'passed':bool(ok),'detail':str(detail)})
    print(('PASS' if ok else 'FAIL'),label,detail if not ok else '')
def load_fixture(page,html,css,module):
    page.set_content(html,wait_until='load')
    page.add_style_tag(content=css)
    page.add_script_tag(content=module,type='module')
    page.locator('#preview [data-node-id]').first.wait_for(timeout=8000)
server=subprocess.Popen(['node','src/server.mjs'],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env={**os.environ,'PORT':str(PORT)})
try:
    http_ok=False
    for _ in range(40):
        try:
            with urlopen(BASE,timeout=.3) as r:
                http_ok=r.status==200 and 'FFAX' in r.read().decode('utf-8')
                break
        except Exception:time.sleep(.1)
    check('real local Node HTTP serves app',http_ok)
    html=(ROOT/'index.html').read_text(encoding='utf-8')
    css=(ROOT/'styles.css').read_text(encoding='utf-8')
    core=(ROOT/'src/core.mjs').read_text(encoding='utf-8')
    app=(ROOT/'src/app.mjs').read_text(encoding='utf-8')
    demo=(ROOT/'src/demo-interactions.mjs').read_text(encoding='utf-8')
    html=re.sub(r'<link rel="stylesheet"[^>]+>','',html)
    html=re.sub(r'<script type="module"[^>]+></script>','',html)
    core=re.sub(r'\bexport (?=(?:const|class|function)\b)','',core)
    demo=re.sub(r'\bexport (?=(?:const|class|function)\b)','',demo)
    # The injected test concatenates core+demo+app, so strip both static imports on independent lines.
    app=re.sub(r'^import [^;]+;','',app,count=2,flags=re.M)
    module=('const __injectedCSS = '+json.dumps(css)+';\n'
            'window.fetch=async()=>({text:async()=>__injectedCSS});\n'+core+'\n'+demo+'\n'+app)
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
        ctx=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True)
        page=ctx.new_page()
        page.on('pageerror',lambda e: exceptions.append(str(e)))
        page.on('console',lambda msg:console_errors.append(msg.text) if msg.type=='error' else None)
        page.on('requestfailed',lambda req:network_errors.append(str(req.url)))
        page.on('request',lambda r:external.append(r.url) if not r.url.startswith(BASE) else None)
        load_fixture(page,html,css,module)
        check('actual UI components rendered in Chromium set_content',page.locator('#preview [data-node-id]').count()==13)
        check('document title',page.title()=='FFAX — Frontend Foundry AX')
        for width in (375,768,1440):
            page.set_viewport_size({'width':width,'height':900})
            page.screenshot(path=str(OUT/f'ffax-{width}.png'),full_page=True)
            metrics=page.evaluate('({scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth})')
            check(f'Chromium {width}px no page overflow',metrics['scrollWidth']<=width+2,metrics)
            check(f'Chromium {width}px hero visible',page.locator('.ff-hero h1').count()==1)
        page.set_viewport_size({'width':1440,'height':900})
        page.locator('#prompt').fill('금융 분석 대시보드 관리자 화면. 차트와 데이터 테이블을 만들고 API는 유지해줘')
        page.locator('#analyze').click()
        check('brief + 2 proposed designs','금융' in page.locator('#brief-summary').inner_text() and page.locator('.design-option').count()==2)
        page.locator('.design-option').nth(1).click()
        check('select design B -> grid',page.locator('#preview .layout-grid').count()==1)
        page.locator('#component-select').select_option(index=1)
        page.locator('#component-text').fill('매출 분석 보드')
        page.locator('#component-text').dispatch_event('change')
        check('text edit mirrored in preview and generated JSX','매출 분석 보드' in page.locator('#preview').inner_text() and '매출 분석 보드' in page.locator('#source-preview').inner_text())
        page.locator('#component-align').select_option('end')
        check('alignment changed',page.locator('#preview [data-node-id]').nth(1).evaluate('e=>e.style.alignSelf')=='end')
        page.locator('#undo').click()
        check('undo restores alignment',page.locator('#preview [data-node-id]').nth(1).evaluate('e=>e.style.alignSelf')=='start',page.locator('#preview [data-node-id]').nth(1).evaluate('e=>e.getAttribute("style")'))
        page.locator('#redo').click()
        check('redo restores change',page.locator('#preview [data-node-id]').nth(1).evaluate('e=>e.style.alignSelf')=='end')
        page.locator('#component-color').select_option('neutral')
        check('palette edit', 'neutral' in page.locator('#preview [data-node-id]').nth(1).get_attribute('class'))
        page.locator('#theme-select').select_option('ocean')
        check('switch project theme',page.locator('#preview .theme-ocean').count()==1)
        page.locator('#add-component').click()
        check('add component',page.locator('#preview [data-node-id]').count()==14)
        page.locator('#move-up').click()
        page.locator('#remove-component').click()
        check('remove component',page.locator('#preview [data-node-id]').count()==13)
        page.locator('#run-qa').click()
        page.locator('#qa-report.passed').wait_for(timeout=8000)
        report=page.locator('#qa-report').inner_text()
        check('three-width interactive DOM QA','375px: PASS' in report and '768px: PASS' in report and '1440px: PASS' in report)
        with page.expect_download() as dl:page.locator('#export-react').click()
        dl.value.save_as(str(OUT/'GeneratedScreen.tsx'))
        code=(OUT/'GeneratedScreen.tsx').read_text(encoding='utf-8')
        check('download React TSX source','export default function GeneratedScreen' in code and '매출 분석 보드' in code)
        file=OUT/'reference-fixture.png'
        im=Image.new('RGB',(80,40),'#c43f71');ImageDraw.Draw(im).rectangle((40,0,79,39),fill='#327ebc');im.save(file)
        page.locator('#reference-file').set_input_files(str(file))
        page.locator('#apply-reference').click()
        check('image reference requires consent','사용 권한 확인' in page.locator('#reference-result').inner_text())
        page.locator('#rights').check()
        page.locator('#apply-reference').click()
        page.wait_for_timeout(400)
        check('image palette two design hints','스타일 후보 A/B' in page.locator('#reference-result').inner_text() and page.locator('.reference-candidate').count()==2)
        page.locator('.reference-candidate').nth(1).click()
        check('explicit image style approved and applied', '스타일 승인됨' in page.locator('#reference-result').inner_text() and page.locator('.reference-candidate.selected').count()==1)
        page.evaluate('window.__ffaxQAFault = true')
        page.locator('#run-qa').click()
        page.locator('#qa-report.failed').wait_for(timeout=8000)
        check('intentional 2000px overflow flagged', 'FAIL overflow' in page.locator('#qa-report').inner_text())
        page.evaluate('window.__ffaxQAFault = false')
        page.locator('#run-qa').click()
        page.locator('#qa-report.passed').wait_for(timeout=8000)
        check('QA recovers after correction', 'PASS overflow' in page.locator('#qa-report').inner_text())
        check('no Chromium JS exceptions',not exceptions,exceptions)
        check('no Chromium console errors',not console_errors,console_errors)
        check('no network request failures',not network_errors,network_errors)
        check('no external network requests in synthetic DOM',not external,external)
        browser.close()
finally:
    server.terminate()
    try:server.communicate(timeout=2)
    except subprocess.TimeoutExpired:server.kill();server.communicate()

fails=[x for x in checks if not x['passed']]
result={'passed':len(checks)-len(fails),'failed':len(fails),'checks':checks,'environment':{'node_http':'real localhost GET','chromium':'set_content injected same sources (navigation blocked)','os':'Linux','console_js_exceptions':len(exceptions),'external_network_requests':len(external),'console_errors':len(console_errors),'request_failures':len(network_errors)}}
(OUT/'qa-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print('RESULT',result['passed'],'PASS /',result['failed'],'FAIL')
raise SystemExit(1 if fails else 0)
