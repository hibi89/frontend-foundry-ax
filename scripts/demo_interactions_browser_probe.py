"""Real served FFAX Chromium regression of local-only Form/Sidebar/Error demos.
All data is synthetic. No customer API, Git write, real model or network.
"""
import json,os,socket,subprocess,tempfile,time,urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='ffax-demo-qa-') as td:
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    base='http://127.0.0.1:'+str(port)
    process=subprocess.Popen(['node','src/server.mjs'],cwd=ROOT,env={**os.environ,'PORT':str(port)},
      stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    try:
        for _ in range(60):
            try:
                with urllib.request.urlopen(base+'/',timeout=1) as reply:
                    if reply.status==200:break
            except Exception:time.sleep(.1)
        else:raise AssertionError('DEMO_HTTP_NOT_READY')
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
            context=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True)
            page=context.new_page()
            errors=[];remote=[]
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.on('console',lambda msg:errors.append('console:'+msg.text) if msg.type=='error' else None)
            page.on('request',lambda req:remote.append(req.url) if not req.url.startswith(base+'/') else None)
            page.goto(base+'/',wait_until='networkidle')
            page.locator('#preview [data-node-id]').first.wait_for()
            for kind in ['Form','Sidebar','Error','Chart']:
                page.locator('#insert-component-type').select_option(kind)
                page.locator('#add-component').click()
            form=page.locator('#preview .ff-form').last
            sidebar=page.locator('#preview .ff-sidebar').last
            error=page.locator('#preview .ff-error').last
            chart=page.locator('#preview .ff-chart').last
            count=page.locator('#preview [data-node-id]').count()
            form.locator('[data-demo-action="validate-form"]').click()
            assert '2~80자' in form.locator('[data-demo-status]').inner_text()
            assert form.locator('input').get_attribute('aria-invalid')=='true'
            assert page.locator('#preview [data-node-id]').count()==count
            form.locator('[data-demo-field]').fill('가')
            form.locator('[data-demo-action="validate-form"]').click()
            assert '2~80자' in form.locator('[data-demo-status]').inner_text()
            form.locator('[data-demo-field]').fill('비민감 샘플')
            form.locator('[data-demo-action="validate-form"]').click()
            assert '로컬 입력 검증 PASS' in form.locator('[data-demo-status]').inner_text()
            assert form.locator('[data-demo-field]').input_value()=='비민감 샘플'
            assert form.locator('[data-demo-field]').get_attribute('aria-invalid')=='false'
            sidebar.locator('[data-demo-section="설정"]').click()
            assert sidebar.locator('[data-demo-section="설정"]').get_attribute('aria-current')=='page'
            assert sidebar.locator('[data-demo-section="개요"]').get_attribute('aria-current') is None
            assert '설정 선택됨' in sidebar.locator('[data-demo-status]').inner_text()
            sidebar.locator('[data-demo-section="프로젝트"]').focus()
            page.keyboard.press('Enter')
            assert sidebar.locator('[data-demo-section="프로젝트"]').get_attribute('aria-current')=='page'
            assert '프로젝트 선택됨' in sidebar.locator('[data-demo-status]').inner_text()
            error.locator('[data-demo-action="retry"]').click()
            assert '로컬 재시도 시연 완료' in error.locator('[data-demo-status]').inner_text()
            assert chart.locator('table[aria-label="차트 예시 수치"]').count()==1
            assert chart.locator('tbody tr').count()==3
            assert [cell.inner_text() for cell in chart.locator('tbody td:nth-child(2)').all()]==['35','68','52']
            with page.expect_download() as download:
                page.locator('#export-react').click()
            path=Path(td)/'GeneratedScreen.tsx'
            download.value.save_as(str(path))
            output=path.read_text(encoding='utf8')
            for value in ['로컬 입력 검증 PASS','로컬 재시도 시연 완료','설정','차트 예시 수치','React.useState']:
                assert value in output,('EXPORT_MISSING_DEMO',value)
            assert not any(code in output for code in ['fetch(','XMLHttpRequest','localStorage.','window.location='])
            for width in [375,768,1440]:
                page.set_viewport_size({'width':width,'height':900})
                page.wait_for_timeout(100)
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),('OVERFLOW',width)
            assert not remote,('REMOTE_REQUEST',remote)
            assert not errors,('BROWSER_ERROR',errors)
            browser.close()
            print(json.dumps({'case':'FFAX_LOCAL_DEMO_INTERACTIONS_CHROMIUM','status':'PASS',
              'formInvalidAndValid':True,'sidebarKeyboardSelection':True,'retryLocalOnly':True,
              'chartAccessibleTable':True,'reactExportParityMarkers':True,
              'responsive':[375,768,1440],'externalRequests':0,
              'customerWrites':0,'realApiCalls':0,'ownerUxApproved':False},ensure_ascii=False))
    finally:
        process.terminate()
        try:process.wait(timeout=3)
        except subprocess.TimeoutExpired:process.kill()
