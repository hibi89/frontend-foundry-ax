"""FFAX V2.1 P2 real localhost Chromium UI+API+PNG+pixel comparison.
This runs synthetic owner's approval clicks ONLY in an isolated CI fixture.
No customer files, production writes, external AI or cloud image uploads.
"""
import hashlib
import json
import os
import re
from pathlib import Path
import socket
import subprocess
import time
import urllib.request
import urllib.error
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'artifacts'/'qa'
ART.mkdir(parents=True,exist_ok=True)
with socket.socket() as sock:
    sock.bind(('127.0.0.1',0))
    PORT=sock.getsockname()[1]
BASE=f'http://127.0.0.1:{PORT}'
REPORT={'schema':'ffax.p2.forge-browser.v1','source':'LOCAL_SYNTHETIC_ONLY',
        'realBrowser':'PLAYWRIGHT_CHROMIUM','model':'NOT_CALLED',
        'customerData':'NOT_USED','production':'NOT_APPLICABLE',
        'checks':[],'errors':[],'requestsExternal':[],'viewports':[]}

def check(name,predicate,detail=''):
    val=bool(predicate)
    REPORT['checks'].append({'name':name,'status':'PASS' if val else 'FAIL','detail':str(detail)[:200]})
    if not val:raise AssertionError(f'{name}: {detail}')

def responsive(page):
    for width in (375,768,1440):
        page.set_viewport_size({'width':width,'height':900})
        page.wait_for_timeout(130)
        metrics=page.evaluate("""() => ({documentWidth:document.documentElement.scrollWidth,
                    windowWidth:window.innerWidth,forgeCards:document.querySelectorAll('.forge-card').length})""")
        out=ART/f'forge-p2-{width}.png'
        page.screenshot(path=str(out),full_page=True,timeout=20000)
        REPORT['viewports'].append({'width':width,'metrics':metrics,'screenshot':out.name})
        check('forge-responsive-'+str(width),metrics['documentWidth']<=width+2,metrics)

proc=subprocess.Popen(['node','src/server.mjs'],cwd=ROOT,
    env={**os.environ,'PORT':str(PORT)},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
    for i in range(65):
        if proc.poll() is not None:raise RuntimeError('FORGE_SERVER_EXITED')
        try:
            with urllib.request.urlopen(BASE+'/',timeout=1) as response:
                if response.status==200:break
        except (urllib.error.URLError,ConnectionError):
            time.sleep(.18)
    else:raise RuntimeError('FORGE_LOCAL_SERVER_START_FAILED')
    for path in ('/src/design-forge-ui.mjs','/src/forge-style-intelligence.mjs',
                 '/src/forge-convergence-ui.mjs','/src/reference-assets.mjs'):
        with urllib.request.urlopen(BASE+path,timeout=3) as response:
            check('forge-esm-module-200-'+path, response.status==200)
    try:
        request=urllib.request.Request(BASE+'/api/design/variants',
            data=b'{}',headers={'Content-Type':'application/json','Origin':BASE},
            method='POST')
        urllib.request.urlopen(request,timeout=3)
        raise AssertionError('FORGE_CSRF_BYPASS')
    except urllib.error.HTTPError as exc:
        check('unauthorized-forge-mutation-blocked',exc.code==403)
    with sync_playwright() as p:
        exe='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None
        launch={'headless':True,'args':['--no-sandbox','--disable-gpu']}
        channel=os.environ.get('FFAX_BROWSER_CHANNEL')
        if channel:
            launch['channel']=channel
        elif exe:
            launch['executable_path']=exe
        browser=p.chromium.launch(**launch)
        ctx=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True)
        page=ctx.new_page()
        page.on('pageerror',lambda err:REPORT['errors'].append('pageerror:'+str(err)[:220]))
        page.on('console',lambda msg:REPORT['errors'].append('console:'+msg.text[:220]) if msg.type=='error' else None)
        page.on('requestfailed',lambda req:REPORT['errors'].append('requestfailed:'+req.url[:220]))
        page.on('request',lambda req:REPORT['requestsExternal'].append(req.url[:220])
                if not (req.url.startswith(BASE+'/') or
                    req.url.startswith('blob:'+BASE+'/') or req.url.startswith('data:')) else None)
        response=page.goto(BASE+'/',wait_until='networkidle',timeout=25000)
        check('forge-served-browser-http',response.status==200)
        page.locator('#forge-brief').fill('현대적인 금융 대시보드, 고객 메뉴와 차트, 검색 버튼을 포함한 새 디자인을 만들어줘')
        page.locator('#forge-generate').click()
        page.locator('.forge-card').first.wait_for(timeout=16000)
        check('forge-abc-real-ui',page.locator('.forge-card').count()==3)
        page.locator('.forge-card > button').first.click()
        page.locator('#forge-instruction').fill('그리드 배치')
        page.locator('#forge-refine').click()
        expect(page.locator('.forge-card h3').first).to_contain_text('v2',timeout=12000)
        check('forge-typed-revision-v2','v2' in page.locator('.forge-card h3').first.inner_text())
        page.locator('#forge-undo').click()
        check('forge-undo-v1','v1' in page.locator('.forge-card h3').first.inner_text())
        page.locator('#forge-redo').click()
        check('forge-redo-v2','v2' in page.locator('.forge-card h3').first.inner_text())
        page.locator('#forge-instruction').fill('로고 파일 교체')
        page.locator('#forge-refine').click()
        check('forge-unapproved-asset-blocked','ORIGINAL_ASSET_IMPORT_REQUIRED' in page.locator('#forge-status').inner_text())
        check('forge-invalid-edit-preserves-revision','v2' in page.locator('.forge-card h3').first.inner_text())
        responsive(page)
        page.locator('#forge-approval').check()
        page.locator('#forge-freeze').click()
        expect(page.locator('#forge-export')).to_be_enabled(timeout=20000)
        check('forge-approved-sha-frozen','SHA256' in page.locator('#forge-status').inner_text())
        page.locator('#forge-capture-width').select_option('375')
        page.locator('#forge-capture-height').fill('600')
        page.locator('#forge-capture-consent').check()
        page.locator('#forge-capture-run').click()
        expect(page.locator('#forge-capture-preview')).to_have_attribute('src',re.compile(r'^blob:'),timeout=100000)
        capture_status=page.locator('#forge-status').inner_text()
        check('forge-real-browser-png',page.locator('#forge-capture-preview').get_attribute('src').startswith('blob:'),
              capture_status)
        evidence=page.evaluate("""async () => {
          const b=await (await fetch(document.querySelector('#forge-capture-preview').src)).blob();
          const raw=await b.arrayBuffer();
          const hex=[...new Uint8Array(await crypto.subtle.digest('SHA-256',raw))]
            .map(x=>x.toString(16).padStart(2,'0')).join('');
          const transfer=new DataTransfer();
          transfer.items.add(new File([b],'owner-synthetic-reference.png',{type:'image/png'}));
          const input=document.querySelector('#forge-compare-reference');
          input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
          const vault=document.querySelector('#forge-vault-source');
          vault.files=transfer.files;vault.dispatchEvent(new Event('change',{bubbles:true}));
          return {mime:b.type,bytes:b.size,sha256:hex};
        }""")
        REPORT['capture']={'sha256':evidence['sha256'],'bytes':evidence['bytes'],'width':375,'height':600}
        check('forge-real-capture-hash',evidence['mime']=='image/png' and evidence['bytes']>1000
              and len(evidence['sha256'])==64)
        page.locator('#forge-vault-consent').check()
        page.locator('#forge-vault-save').click()
        expect(page.locator('#forge-vault-status')).to_contain_text('로컬 이미지 불변 보관 완료',timeout=25000)
        check('forge-explicit-vault-input-only',page.locator('#forge-vault-sha').input_value()==evidence['sha256'])
        page.locator('#forge-vault-reload').click()
        expect(page.locator('#forge-vault-status')).to_contain_text('로컬 불러오기 완료',timeout=25000)
        check('forge-verified-local-restore',page.locator('#forge-compare-reference').input_value()!='' and
             evidence['sha256'] in page.locator('#forge-vault-status').inner_text())
        page.locator('#forge-compare-run').click()
        expect(page.locator('#forge-compare-download')).to_be_enabled(timeout=45000)
        check('forge-byte-identical-local-compare',
              '불일치 기준 픽셀 0/' in page.locator('#forge-compare-status').inner_text(),
              page.locator('#forge-compare-status').inner_text())
        check('no-browser-errors',not REPORT['errors'],REPORT['errors'])
        check('no-external-browser-requests',not REPORT['requestsExternal'],REPORT['requestsExternal'])
        page.screenshot(path=str(ART/'forge-p2-reviewed.png'),full_page=True,timeout=25000)
        browser.close()
    REPORT['status']='PASS'
finally:
    if proc.poll() is None:
        proc.terminate()
        try:proc.wait(timeout=5)
        except subprocess.TimeoutExpired:proc.kill()
    REPORT.setdefault('status','FAIL')
    (ART/'forge-p2-browser-report.json').write_text(
        json.dumps(REPORT,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'schema':REPORT['schema'],'status':REPORT['status'],
    'checks':len(REPORT['checks']),'capture':REPORT.get('capture'),
    'report':'artifacts/qa/forge-p2-browser-report.json'},ensure_ascii=False))
