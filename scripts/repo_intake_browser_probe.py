"""A real Chromium selected local React folder intake through the actual FFAX app.
The fixture has NO secrets; no real customer's files, GitHub API or Ollama calls.
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
with tempfile.TemporaryDirectory(prefix='ffax-readonly-browser-') as td:
    project=Path(td)/'fixture-react'
    (project/'src').mkdir(parents=True)
    (project/'node_modules').mkdir()
    (project/'package.json').write_text('{"name":"fixture-react","dependencies":{"react":"19.2.7"}}',encoding='utf8')
    (project/'src'/'App.tsx').write_text("import React from 'react';export default function App(){return <button onClick={()=>fetch('/api/mock')}>Hello</button>}",encoding='utf8')
    (project/'src'/'Api.ts').write_text("export const query=()=>fetch('/api/users')",encoding='utf8')
    (project/'.env').write_text('PRIVATE_TOKEN_NOT_TO_READ',encoding='utf8')
    (project/'node_modules'/'index.js').write_text('not to read',encoding='utf8')
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    origin='http://127.0.0.1:'+str(port)
    server=subprocess.Popen(['node','src/server.mjs'],cwd=ROOT,
      env={**os.environ,'PORT':str(port)},stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    try:
        for _ in range(50):
            try:
                with urllib.request.urlopen(origin+'/',timeout=1) as r:
                    if r.status==200:break
            except Exception:time.sleep(.12)
        else:raise AssertionError('LOCAL_BROWSER_SERVER_NOT_READY')
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
            ctx=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True)
            page=ctx.new_page()
            errors=[];requests=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('request',lambda r:requests.append({'method':r.method,'url':r.url}))
            response=page.goto(origin+'/',wait_until='networkidle')
            assert response.status==200
            page.locator('#preview [data-node-id]').first.wait_for(timeout=8000)
            before=page.locator('#preview').inner_text()
            page.locator('#repo-folder').set_input_files(str(project))
            page.locator('#analyze-repo').click()
            page.wait_for_function("() => document.querySelector('#repo-analysis-status').textContent.includes('READ-ONLY PASS')",timeout=10000)
            message=page.locator('#repo-analysis-status').inner_text()
            assert '3 files' in message,message
            assert '변경/전송 0건' in message,message
            assert 'PRIVATE_TOKEN' not in message,message
            assert before==page.locator('#preview').inner_text(),'SELECTING_FOLDER_MUTATED_CANVAS'
            with page.expect_download() as d:
                page.locator('#export-repo-audit').click()
            path=Path(td)/'FFAX-readonly-react-audit.json'
            d.value.save_as(str(path))
            audit=json.loads(path.read_text('utf8'))
            assert audit['readOnly'] is True and audit['remoteRequests']==0
            assert audit['fileCount']==3 and audit['skippedEntries']==2
            assert len(audit['sha256'])==64 and audit['sourceGitSha'] is None
            assert 'PRIVATE_TOKEN' not in path.read_text('utf8')
            assert not any(x['method']=='POST' for x in requests),requests
            assert all(x['url'].startswith(origin+'/') for x in requests),requests
            assert not errors,errors
            browser.close()
            print(json.dumps({'test':'FFAX_LOCAL_REACT_FOLDER_CHROMIUM',
                'status':'PASS','sourceFiles':audit['fileCount'],
                'skipped':audit['skippedEntries'],'remoteWrites':0,
                'secretsExposed':0,'sourceChanged':False,'actualOwnerRepository':False},ensure_ascii=False))
    finally:
        server.terminate()
        try:server.wait(timeout=3)
        except subprocess.TimeoutExpired:server.kill()
