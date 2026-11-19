"""FFAX V3 P2 Chromium synthetic full UI path and stale evidence regression.
No user/customer images, third-party network requests, GitHub writes, or production changes.
Pass means synthetic browser-path only, never real-world 95/F95 or P2 acceptance.
"""
import hashlib
import json
import os
from pathlib import Path
import socket
import subprocess
import time
import urllib.request
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'artifacts'/'qa'
ART.mkdir(parents=True,exist_ok=True)
with socket.socket() as sock:
    sock.bind(('127.0.0.1',0))
    PORT=sock.getsockname()[1]
BASE=f'http://127.0.0.1:{PORT}'
REPORT={'schema':'ffax.v3.p2-real-chromium-synthetic.v1',
        'status':'RUNNING','fixture':'SYNTHETIC_CREATED_IN_CI_NOT_USER_SOURCE',
        'f95':'UNASSESSED','p2FullAcceptance':'NOT_RUN','checks':[],
        'pageErrors':[],'externalRequests':[],'sourceSha256':None,
        'originalCustomerFiles':0,'cloudImageRequests':0}
def check(label,condition,details=''):
    value=bool(condition)
    REPORT['checks'].append({'name':label,'status':'PASS' if value else 'FAIL',
                             'details':str(details)[:250]})
    if not value:raise AssertionError(label+' '+str(details)[:400])
def image(path,inverted=False):
    im=Image.new('RGB',(640,400),'#12223d' if not inverted else '#fefefe')
    d=ImageDraw.Draw(im)
    d.rectangle((8,8,631,78),fill='#f7d78a' if not inverted else '#060606')
    d.rectangle((30,100,320,355),fill='#2180c8' if not inverted else '#aa0202')
    d.rectangle((345,110,605,330),fill='#c13873' if not inverted else '#20bb88')
    im.save(path)
def wait_for_good(page,selector,term,timeout=45000):
    expect(page.locator(selector)).to_contain_text(term,timeout=timeout)
    text=page.locator(selector).inner_text()
    if '실패' in text or '거부' in text:raise AssertionError(selector+' '+text)
    return text
def download_json(page,button,output):
    with page.expect_download(timeout=18000) as dl:
        page.locator(button).click()
    dl.value.save_as(str(output))
    return json.loads(output.read_text(encoding='utf-8'))
proc=None
browser=None
page=None
try:
    fixture=ART/'v3-p2-synthetic.png'
    changed=ART/'v3-p2-synthetic-changed.png'
    image(fixture);image(changed,True)
    sha=hashlib.sha256(fixture.read_bytes()).hexdigest()
    REPORT['sourceSha256']=sha
    proc=subprocess.Popen(['node','src/server.mjs'],cwd=ROOT,
        env={**os.environ,'PORT':str(PORT)},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    for _ in range(65):
        if proc.poll() is not None:raise RuntimeError('V3_BROWSER_SERVER_EXITED')
        try:
            with urllib.request.urlopen(BASE+'/',timeout=1) as res:
                if res.status==200:break
        except Exception:time.sleep(.15)
    else:raise RuntimeError('V3_BROWSER_SERVER_START_FAILED')
    with sync_playwright() as p:
        exe='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None
        browser=p.chromium.launch(headless=True,executable_path=exe,
            args=['--no-sandbox','--disable-gpu'])
        context=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True)
        page=context.new_page()
        page.on('pageerror',lambda e:REPORT['pageErrors'].append(str(e)[:350]))
        page.on('request',lambda q:REPORT['externalRequests'].append(q.url[:200])
            if not(q.url.startswith(BASE+'/') or q.url.startswith('blob:')
              or q.url.startswith('data:')) else None)
        page.goto(BASE+'/',wait_until='networkidle',timeout=25000)
        for mod in ('fidelity-scene','fidelity-typography','fidelity-assets','fidelity-renderer',
                    'fidelity-score','fidelity-patch','fidelity-review'):
            with urllib.request.urlopen(BASE+'/src/'+mod+'.mjs',timeout=3) as res:
                check('module-public-allowlist-'+mod,res.status==200)
        check('new-review-disabled-before-evidence',
              page.locator('#fidelity-review-accept').is_disabled())
        page.locator('#reference-file').set_input_files(str(fixture))
        page.locator('#apply-reference').click()
        check('rights-required','사용 권한 확인' in page.locator('#reference-result').inner_text())
        page.locator('#rights').check();page.locator('#apply-reference').click()
        expect(page.locator('#export-fidelity-scene')).to_be_enabled(timeout=15000)
        check('source-hash-observed',sha[:16] in page.locator('#reference-result').inner_text())
        scene=download_json(page,'#export-fidelity-scene',ART/'v3-p2-initial-scene.json')
        check('real-observed-scene-has-nesting',scene['schema']=='ffax.fidelity-scene.v1'
              and scene['sourceSha256']==sha and len(scene['regions'])>=2)
        # Test owner edit of a real observed region without inventing its bbox.
        region=max((r for r in scene['regions'] if r['id']!='canvas'),
                   key=lambda x:x['bounds']['width']*x['bounds']['height'])
        bbox=region['bounds']
        page.locator('#fidelity-region-select').select_option(region['id'])
        page.locator('#fidelity-region-role').select_option('button')
        page.locator('#fidelity-region-bounds').fill(','.join(str(bbox[k]) for k in ('x','y','width','height')))
        page.locator('#fidelity-region-consent').check()
        page.locator('#fidelity-region-apply').click()
        wait_for_good(page,'#fidelity-region-status','revision 2')
        check('region-owner-geometry-validated',True)
        # A real text region must fit completely inside its observed parent.
        if bbox['width']>48 and bbox['height']>20:
            textbounds=(bbox['x']+3,bbox['y']+3,min(140,bbox['width']-6),
                        min(28,bbox['height']-6))
            page.locator('#fidelity-text-content').fill('실제 한국어 원본')
            page.locator('#fidelity-text-bounds').fill(','.join(map(str,textbounds)))
            page.locator('#fidelity-text-consent').check()
            page.locator('#fidelity-text-add').click()
            wait_for_good(page,'#fidelity-text-status','직접 확인한 텍스트 1개')
            REPORT['ownerKoreanTextObserved']=True
        else:
            REPORT['ownerKoreanTextObserved']=False
        page.locator('#forge-vault-source').set_input_files(str(fixture))
        page.locator('#forge-vault-consent').check();page.locator('#forge-vault-save').click()
        wait_for_good(page,'#forge-vault-status','로컬 이미지 불변 보관 완료',45000)
        check('vault-sha-matches-reference',page.locator('#forge-vault-sha').input_value()==sha)
        page.locator('#forge-v3-dpr').select_option('1')
        page.locator('#forge-v3-receipt-consent').check()
        receipt=download_json(page,'#forge-v3-receipt-create',ART/'v3-p2-reference-receipt.json')
        wait_for_good(page,'#forge-v3-receipt-status','원본 SHA 재확인')
        check('reference-provenance-is-limited',receipt['referenceSha256']==sha
              and receipt['provenance']['publicRedistributionAllowed'] is False
              and receipt['viewport']['cssWidth']==640
              and receipt['viewport']['cssHeight']==400)
        # It must create actual TSX+CSS rather than a static screenshot background.
        downloads=[]
        page.on('download',lambda d:downloads.append(d))
        page.locator('#fidelity-render-consent').check();page.locator('#fidelity-render-create').click()
        wait_for_good(page,'#fidelity-render-status','React TSX/CSS 생성')
        for _ in range(30):
            if len(downloads)>=3:break
            page.wait_for_timeout(100)
        check('real-react-tsx-and-css-export',any(d.suggested_filename=='FidelityScene.tsx' for d in downloads)
              and any(d.suggested_filename=='FidelityScene.css' for d in downloads),
              [d.suggested_filename for d in downloads])
        for d in downloads:
            if d.suggested_filename=='FidelityScene.tsx':
                path=ART/'v3-p2-FidelityScene.tsx';d.save_as(str(path))
                check('downloaded-react-source-not-background-image',
                      'export default function FidelityScene' in path.read_text(encoding='utf-8'))
        page.locator('#fidelity-capture-consent').check();page.locator('#fidelity-capture-run').click()
        capture_status=wait_for_good(page,'#fidelity-capture-status','Chromium 실제 정지 캡처 완료',75000)
        check('true-chromium-png-shown',(page.locator('#fidelity-capture-image').get_attribute('src') or '').startswith('blob:'))
        page.locator('#fidelity-score-consent').check();page.locator('#fidelity-score-run').click()
        wait_for_good(page,'#fidelity-score-status','F95=UNASSESSED',30000)
        diagnostic=download_json(page,'#fidelity-score-export',ART/'v3-p2-diagnostic.json')
        check('region-differences-without-false-95',diagnostic['weightedF95Score'] is None
              and diagnostic['status']=='F95_UNASSESSED'
              and diagnostic['renderSha256']!=sha
              and len(diagnostic['regions'])>0)
        page.locator('#fidelity-review-consent').check();page.locator('#fidelity-review-accept').click()
        wait_for_good(page,'#fidelity-review-status','OWNER_VISUAL_CANDIDATE_ACCEPTED')
        review=download_json(page,'#fidelity-review-export',ART/'v3-p2-review.json')
        check('owner-visual-review-not-release',review['publishApproved'] is False
              and review['f95']=='UNASSESSED' and review['ownerVisualAccepted'] is True)
        page.locator('#fidelity-patch-property').select_option('background')
        page.locator('#fidelity-patch-value').fill('#102030')
        page.locator('#fidelity-patch-consent').check();page.locator('#fidelity-patch-apply').click()
        wait_for_good(page,'#fidelity-patch-status','격리 후보만 수정')
        check('stale-owner-approval-invalidated-after-typed-patch',
              page.locator('#fidelity-review-export').is_disabled()
              and page.locator('#fidelity-review-accept').is_disabled()
              and page.locator('#fidelity-score-export').is_disabled())
        page.locator('#fidelity-patch-undo').click()
        wait_for_good(page,'#fidelity-patch-status','직전 수정 되돌림')
        page.locator('#fidelity-snapshot-consent').check()
        snapshot=download_json(page,'#fidelity-snapshot-save',ART/'v3-p2-snapshot.json')
        check('snapshot-local-and-reference-bound',snapshot['referenceSha256']==sha
              and snapshot['originalSourceModified'] is False)
        page.locator('#fidelity-snapshot-file').set_input_files(str(ART/'v3-p2-snapshot.json'))
        page.locator('#fidelity-restore-consent').check();page.locator('#fidelity-snapshot-restore').click()
        wait_for_good(page,'#fidelity-snapshot-status','로컬 구조 복구 완료')
        check('snapshot-recovery-invalidates-visual-review',
              page.locator('#fidelity-review-export').is_disabled())
        # New file selection alone (before reanalysis) must revoke the old approval.
        page.locator('#reference-file').set_input_files(str(changed))
        check('source-selection-revokes-stale-review-and-capture',
              page.locator('#fidelity-review-accept').is_disabled()
              and not page.locator('#fidelity-capture-image').get_attribute('src')
              and page.locator('#fidelity-region-select').is_disabled())
        check('browser-no-remote-image-or-model-requests',len(REPORT['externalRequests'])==0,
              REPORT['externalRequests'])
        check('browser-javascript-errors-absent',len(REPORT['pageErrors'])==0,REPORT['pageErrors'])
        page.screenshot(path=str(ART/'v3-p2-final.png'),full_page=False,timeout=20000)
        browser.close();browser=None
    REPORT['status']='PASS_SYNTHETIC_ONLY_NOT_V3_OWNER_ACCEPTANCE'
except Exception as exc:
    REPORT['status']='FAIL'
    REPORT['error']=type(exc).__name__+': '+str(exc)[:750]
    if page:
        try:page.screenshot(path=str(ART/'v3-p2-failure.png'),full_page=False,timeout=7000)
        except Exception:pass
    raise
finally:
    if browser:
        try:browser.close()
        except Exception:pass
    if proc:
        proc.terminate()
        try:proc.wait(timeout=7)
        except Exception:proc.kill()
    (ART/'v3-p2-browser-report.json').write_text(json.dumps(REPORT,indent=2,ensure_ascii=False),encoding='utf-8')
    print(json.dumps({'status':REPORT['status'],'checks':REPORT['checks'],
        'error':REPORT.get('error'),'ownerKoreanTextObserved':REPORT.get('ownerKoreanTextObserved'),
        'externalRequests':len(REPORT['externalRequests']),
        'realOwnerReferenceCount':0,'P2Acceptance':'NOT_VERIFIED'},
        ensure_ascii=False))
