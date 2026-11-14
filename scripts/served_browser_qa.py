"""Real localhost HTTP+Chromium smoke, not a synthetic DOM injection.
No model calls or production deployments. Screenshots and a machine-readable report.
"""
import json, os, pathlib, socket, subprocess, time, urllib.request, urllib.error
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'qa'
OUT.mkdir(parents=True,exist_ok=True)
with socket.socket() as sock:
    sock.bind(('127.0.0.1',0))
    PORT=sock.getsockname()[1]
base=f'http://127.0.0.1:{PORT}'
proc=subprocess.Popen(['node','src/server.mjs'],cwd=ROOT,env={**os.environ,'PORT':str(PORT)},stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,text=True)
record={'schema':'ffax-served-chromium.v1','urlKind':'127.0.0.1 local HTTP','actualProviderCalls':0,'production':'NOT_APPLICABLE','viewports':[]}
errors=[]
try:
    for n in range(50):
        try:
            with urllib.request.urlopen(base+'/',timeout=1) as r:
                if r.status==200:break
        except (urllib.error.URLError,ConnectionError):
            time.sleep(.15)
    else: raise RuntimeError('LOCAL_SERVER_DID_NOT_START')
    for asset in ['/','/styles.css','/src/app.mjs','/src/core.mjs']:
        with urllib.request.urlopen(base+asset,timeout=3) as response:
            assert response.status==200,(asset,response.status)
    request=urllib.request.Request(base+'/api/local-model',data=b'{}',headers={'Content-Type':'application/json'},method='POST')
    try:urllib.request.urlopen(request,timeout=2);raise AssertionError('CROSS_ORIGIN_MODEL_REQUEST_ALLOWED')
    except urllib.error.HTTPError as err:assert err.code==403,err.code
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
        page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
        page.on('pageerror',lambda e:errors.append('pageerror:'+str(e)))
        page.on('console',lambda m:errors.append('console:'+m.text) if m.type=='error' else None)
        page.on('requestfailed',lambda r:errors.append('requestfailed:'+r.url))
        page.on('request',lambda r:errors.append('external-request:'+r.url) if not r.url.startswith(base+'/') else None)
        response=page.goto(base+'/',wait_until='networkidle',timeout=15000)
        assert response.status==200
        page.locator('#preview [data-node-id]').first.wait_for(timeout=10000)
        page.locator('#analyze').click()
        assert page.locator('.design-option').count()==2
        page.locator('#local-generate').click()
        assert '동의' in page.locator('#local-generation-status').inner_text()
        for width in (375,768,1440):
            page.set_viewport_size({'width':width,'height':900})
            page.wait_for_timeout(200)
            measure=page.evaluate("""() => ({overflow:document.documentElement.scrollWidth>window.innerWidth+2,
              nodes:document.querySelectorAll('#preview [data-node-id]').length,
              localModelFields:!!document.querySelector('#local-model-name')})""")
            path=OUT/f'served-{width}.png'
            page.screenshot(path=str(path),full_page=True)
            record['viewports'].append({'width':width,'screenshot':path.name,**measure})
            assert measure['nodes']>=7,measure
            assert measure['localModelFields'],measure
        browser.close()
    record['errors']=errors
    record['passed']=not errors and all(not x['overflow'] for x in record['viewports'])
    print(json.dumps(record,ensure_ascii=False))
    assert record['passed'], 'SERVED_BROWSER_FAILURE'
finally:
    (OUT/'served-browser-report.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf8')
    proc.terminate()
    try:proc.wait(timeout=3)
    except subprocess.TimeoutExpired:proc.kill()
