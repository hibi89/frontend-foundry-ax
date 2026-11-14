"""Real served FFAX Chromium regression: all registered component insertion paths.
Uses synthetic local project only. This is not a customer device UX approval.
"""
import json
import os
import socket
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
TYPES=['Hero','Button','Card','Input','Table','Badge','Alert','Navbar','Stat',
       'Modal','Tabs','Loader','Empty','Sidebar','Form','Chart','Error']
with tempfile.TemporaryDirectory(prefix='ffax-insert-chromium-') as td:
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0))
        port=sock.getsockname()[1]
    origin='http://127.0.0.1:'+str(port)
    proc=subprocess.Popen(['node','src/server.mjs'],cwd=ROOT,env={**os.environ,'PORT':str(port)},
                          stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                with urllib.request.urlopen(origin+'/',timeout=1) as response:
                    if response.status==200: break
            except Exception:
                time.sleep(.1)
        else: raise AssertionError('LOCAL_SERVER_NOT_READY')
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
            context=browser.new_context(accept_downloads=True,viewport={'width':1440,'height':900})
            page=context.new_page()
            errors=[];outside=[]
            page.on('pageerror',lambda e: errors.append(str(e)))
            page.on('request',lambda r: outside.append(r.url) if not r.url.startswith(origin+'/') else None)
            response=page.goto(origin+'/',wait_until='networkidle')
            assert response.status==200
            page.locator('#preview [data-node-id]').first.wait_for()
            assert page.locator('#preview [data-node-id]').count()==13
            assert page.locator('#insert-component-type option').count()==17
            assert page.locator('#insert-component-type').input_value()=='Card'
            initial=page.locator('#preview').inner_text()
            for i,kind in enumerate(TYPES):
                page.locator('#insert-component-type').select_option(kind)
                page.locator('#add-component').click()
                identifier='node-'+str(14+i)
                node=page.locator('#preview [data-node-id="'+identifier+'"]')
                assert node.count()==1, ('MISSING_INSERT',kind,identifier)
                assert node.get_attribute('class').find('ff-'+kind.lower())>=0
                assert page.locator('#preview [data-node-id]').count()==14+i
                assert page.locator('#component-select').input_value()==identifier
                assert (str(14+i)+'/80') in page.locator('#insert-component-status').inner_text()
            assert page.locator('.ff-form').count()==1
            assert page.locator('.ff-chart').count()==1
            assert page.locator('.ff-sidebar').count()==1
            assert page.locator('.ff-error').count()==1
            page.locator('#undo').click()
            assert page.locator('#preview [data-node-id="node-30"]').count()==0
            page.locator('#redo').click()
            assert page.locator('#preview [data-node-id="node-30"]').count()==1
            with page.expect_download() as download:
                page.locator('#export-react').click()
            outfile=Path(td)/'GeneratedScreen.tsx'
            download.value.save_as(str(outfile))
            generated=outfile.read_text('utf8')
            assert 'GeneratedScreen' in generated
            assert '사이드바 탐색' in generated
            assert '예시 막대 차트' in generated
            assert '로컬 다시 시도' in generated
            with page.expect_download() as download_json:
                page.locator('#export-json').click()
            jsonfile=Path(td)/'FFAX-project.json'
            download_json.value.save_as(str(jsonfile))
            exported=json.loads(jsonfile.read_text('utf8'))
            comps=exported['project']['components']
            assert len(comps)==30
            assert [x['type'] for x in comps[-17:]]==TYPES
            assert [x['id'] for x in comps[-17:]]==['node-'+str(i) for i in range(14,31)]
            for width in (375,768,1440):
                page.set_viewport_size({'width':width,'height':900})
                page.wait_for_timeout(120)
                assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+2'), ('OVERFLOW',width)
            assert initial!=page.locator('#preview').inner_text()
            assert not outside, ('UNAPPROVED_NETWORK',outside)
            assert not errors, ('PAGE_ERRORS',errors)
            browser.close()
            print(json.dumps({'case':'FFAX_17_COMPONENT_INSERT_CHROMIUM','status':'PASS',
                'types':len(TYPES),'components':len(comps),'deterministicIds':True,
                'undoRedo':True,'tsxExport':True,'jsonExport':True,
                'responsiveWidths':[375,768,1440],
                'externalRequests':len(outside),'customerFilesModified':0,
                'ownerApproval':False},ensure_ascii=False))
    finally:
        proc.terminate()
        try:proc.wait(timeout=3)
        except subprocess.TimeoutExpired:proc.kill()
