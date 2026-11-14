"""Real served localhost Chromium test for opt-in browser-device project recovery.
No external requests, cloud storage, customer files, provider calls, Git writes or production.
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
KEY='ffax.device-checkpoint.v1'

def must(condition,message):
    if not condition:
        raise AssertionError(message)

with tempfile.TemporaryDirectory(prefix='ffax-device-checkpoint-') as td:
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0))
        port=sock.getsockname()[1]
    origin=f'http://127.0.0.1:{port}'
    proc=subprocess.Popen(['node','src/server.mjs'],cwd=ROOT,
        env={**os.environ,'PORT':str(port)},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    try:
        for _ in range(60):
            try:
                with urllib.request.urlopen(origin+'/',timeout=1) as response:
                    if response.status==200: break
            except Exception:
                time.sleep(.1)
        else:
            raise AssertionError('DEVICE_CHECKPOINT_SERVER_NOT_READY')
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
            context=browser.new_context(viewport={'width':1440,'height':900})
            page=context.new_page()
            errors,external=[],[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('request',lambda r:external.append(r.url) if not r.url.startswith(origin+'/') else None)
            page.goto(origin+'/',wait_until='networkidle')
            page.locator('#preview [data-node-id]').first.wait_for()
            must(page.evaluate('localStorage.length')==0,'AUTOSAVE_OCCURRED')
            canvas_initial=page.locator('#preview').inner_text()
            page.locator('#device-checkpoint-save').click()
            must('동의' in page.locator('#device-checkpoint-status').inner_text(),'SAVE_WITHOUT_CONSENT_ACCEPTED')
            must(page.evaluate('localStorage.length')==0,'SAVE_BEFORE_CONSENT')
            page.locator('#component-select').select_option(index=1)
            page.locator('#component-text').fill('중단 복구 전용 샘플 제목')
            page.locator('#component-text').dispatch_event('change')
            canvas_saved=page.locator('#preview').inner_text()
            must('중단 복구 전용 샘플 제목' in canvas_saved,'EDIT_FAILED')
            page.locator('#device-checkpoint-consent').check()
            page.locator('#device-checkpoint-save').click()
            page.wait_for_function("() => document.querySelector('#device-checkpoint-status').textContent.includes('저장 완료')")
            must(not page.locator('#device-checkpoint-consent').is_checked(),'CONSENT_NOT_RESET')
            snapshot=page.evaluate('(key) => localStorage.getItem(key)',KEY)
            parsed=json.loads(snapshot)
            must(parsed['schema']=='ffax-device-checkpoint.v1','INVALID_SCHEMA')
            must('중단 복구 전용 샘플 제목' in parsed['archive'],'SNAPSHOT_MISSING_EDIT')
            must('PRIVATE_KEY' not in snapshot,'SECRET_EXPOSED')
            page.reload(wait_until='networkidle')
            page.locator('#preview [data-node-id]').first.wait_for()
            must('중단 복구 전용 샘플 제목' not in page.locator('#preview').inner_text(),'RESTORED_WITHOUT_APPROVAL')
            page.once('dialog',lambda dialog:dialog.dismiss())
            page.locator('#device-checkpoint-restore').click()
            must('복구 취소' in page.locator('#device-checkpoint-status').inner_text(),'CANCEL_NOT_PRESERVED')
            must('중단 복구 전용 샘플 제목' not in page.locator('#preview').inner_text(),'CANCEL_MUTATED_CANVAS')
            page.once('dialog',lambda dialog:dialog.accept())
            page.locator('#device-checkpoint-restore').click()
            page.wait_for_function("() => document.querySelector('#device-checkpoint-status').textContent.includes('복구 완료')")
            must(page.locator('#preview').inner_text()==canvas_saved,'RESTORED_CANVAS_MISMATCH')
            page.locator('#undo').click()
            must(page.locator('#preview').inner_text()==canvas_initial,'UNDO_DID_NOT_RESTORE_PREVIOUS_CANVAS')
            # Tamper stored data without recalculating its digest; refuse without changing canvas.
            page.evaluate("""(key) => {const obj=JSON.parse(localStorage.getItem(key));
              obj.archive=obj.archive.replace('중단 복구 전용 샘플 제목','고의 변경');
              localStorage.setItem(key,JSON.stringify(obj));}""",KEY)
            before_invalid=page.locator('#preview').inner_text()
            page.once('dialog',lambda dialog:dialog.accept())
            page.locator('#device-checkpoint-restore').click()
            page.wait_for_function("() => document.querySelector('#device-checkpoint-status').textContent.includes('HASH_MISMATCH')")
            must(page.locator('#preview').inner_text()==before_invalid,'CORRUPTED_CHECKPOINT_MUTATED_CANVAS')
            page.once('dialog',lambda dialog:dialog.dismiss())
            page.locator('#device-checkpoint-delete').click()
            must(page.evaluate('(key)=>localStorage.getItem(key)!==null',KEY),'DELETE_CANCEL_LOST_RECORD')
            page.once('dialog',lambda dialog:dialog.accept())
            page.locator('#device-checkpoint-delete').click()
            page.wait_for_function("() => document.querySelector('#device-checkpoint-status').textContent.includes('복구점만 삭제')",timeout=10000)
            must(page.evaluate('(key)=>localStorage.getItem(key)===null',KEY),'EXPLICIT_DELETE_FAILED')
            must(page.locator('#preview').inner_text()==before_invalid,'DELETE_MUTATED_CANVAS')
            must(not external,'EXTERNAL_NETWORK_REQUESTS '+repr(external))
            must(not errors,'PAGE_ERRORS '+repr(errors))
            browser.close()
            print(json.dumps({'case':'FFAX_DEVICE_CHECKPOINT_CHROMIUM','result':'PASS',
              'explicitSave':True,'reloadRequiresRestoreApproval':True,
              'undoAfterRestore':True,'hashTamperRejected':True,
              'explicitDelete':True,'remoteRequests':len(external),
              'providerCalls':0,'sourceWrites':0,'ownerUXApproval':False},ensure_ascii=False))
    finally:
        proc.terminate()
        try:proc.wait(timeout=3)
        except subprocess.TimeoutExpired:proc.kill()
