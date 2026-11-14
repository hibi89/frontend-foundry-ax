"""Offline-mocked GitHub API, real served FFAX Chromium audit.
No real GitHub requests, customer source, tokens, writes, PRs or model use.
"""
import base64
import hashlib
import json
import os
import socket
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
COMMIT = 'a' * 40
TREE = 'b' * 40
COMMIT2 = 'c' * 40
TREE2 = 'd' * 40
PREFIX = 'https://api.github.com/repos/testowner/ok-react'

def file(path, content):
    raw = content.encode('utf-8')
    sha = hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
    return {'path': path, 'type': 'blob', 'sha': sha, 'size': len(raw), 'content': base64.b64encode(raw).decode()}

fixtures = [
    file('package.json', json.dumps({'name': 'ok-react', 'dependencies': {'react': '19.2.7'}})),
    file('src/App.tsx', "import React from 'react';const useAuth=()=>true;export default function App(){return <button onClick={()=>fetch('/api/login')}>Hello</button>}"),
    file('src/api.ts', "export const get=()=>fetch('/api/users')"),
    file('.env', 'PRIVATE_KEY_NEVER_REQUESTED'),
]

fixtures2 = [x if x['path'] != 'src/api.ts' else file('src/api.ts', "export const get=()=>fetch('/api/v2/users')") for x in fixtures]

def json_response(url):
    if url == PREFIX + '/':
        return {'full_name': 'testowner/ok-react', 'private': False}
    if url == PREFIX + '/commits/main':
        return {'sha': COMMIT, 'commit': {'tree': {'sha': TREE}}}
    if url == PREFIX + '/commits/compare-ref':
        return {'sha': COMMIT2, 'commit': {'tree': {'sha': TREE2}}}
    if url == PREFIX + '/git/trees/' + TREE + '?recursive=1':
        return {'truncated': False, 'tree': [{k: v for k, v in item.items() if k != 'content'} for item in fixtures]}
    if url == PREFIX + '/git/trees/' + TREE2 + '?recursive=1':
        return {'truncated': False, 'tree': [{k: v for k, v in item.items() if k != 'content'} for item in fixtures2]}
    for item in fixtures + fixtures2:
        if url == PREFIX + '/git/blobs/' + item['sha'] and item['path'] != '.env':
            return {'encoding': 'base64', 'sha': item['sha'], 'size': item['size'], 'content': item['content']}
    raise AssertionError('GITHUB_UNEXPECTED_API_REQUEST: ' + url)

with tempfile.TemporaryDirectory(prefix='ffax-remote-public-browser-') as td:
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0)); port = s.getsockname()[1]
    origin = 'http://127.0.0.1:' + str(port)
    server = subprocess.Popen(['node', 'src/server.mjs'], cwd=ROOT,
                              env={**os.environ, 'PORT': str(port)},
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(60):
            try:
                with urllib.request.urlopen(origin + '/', timeout=1) as response:
                    if response.status == 200: break
            except Exception:
                time.sleep(.1)
        else:
            raise AssertionError('FFAX_PUBLIC_BROWSER_LOCAL_SERVER_NOT_READY')
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
            context = browser.new_context(accept_downloads=True, viewport={'width': 1440, 'height': 900})
            page = context.new_page()
            errors, external = [], []
            page.on('pageerror', lambda e: errors.append(str(e)))
            def route_api(route):
                external.append({'url': route.request.url, 'method': route.request.method})
                route.fulfill(status=200, content_type='application/json',
                              headers={'Access-Control-Allow-Origin': '*'},
                              body=json.dumps(json_response(route.request.url)))
            page.route('https://api.github.com/**', route_api)
            response = page.goto(origin + '/', wait_until='networkidle')
            assert response.status == 200
            page.locator('#preview [data-node-id]').first.wait_for(timeout=10000)
            canvas_before = page.locator('#preview').inner_text()
            page.locator('#github-repo').fill('testowner/ok-react')
            page.locator('#analyze-github').click()
            page.wait_for_function("() => document.querySelector('#github-analysis-status').textContent.includes('CONSENT_REQUIRED')", timeout=10000)
            assert not external, 'EXTERNAL_REQUEST_BEFORE_CONSENT'
            page.locator('#github-public-consent').check()
            page.locator('#analyze-github').click()
            page.wait_for_function("() => document.querySelector('#github-analysis-status').textContent.includes('PUBLIC READ-ONLY PASS')", timeout=15000)
            status = page.locator('#github-analysis-status').inner_text()
            assert COMMIT in status and 'API 2' in status and '인증 1' in status, status
            assert 'PRIVATE_KEY' not in status
            assert not page.locator('#github-public-consent').is_checked()
            assert canvas_before == page.locator('#preview').inner_text(), 'REMOTE_AUDIT_MUTATED_CANVAS'
            with page.expect_download() as download:
                page.locator('#export-github-audit').click()
            dest = Path(td) / 'FFAX-github-readonly-audit.json'
            download.value.save_as(str(dest))
            audit = json.loads(dest.read_text(encoding='utf8'))
            assert audit['gitRemoteConnected'] is True and audit['publicOnly'] is True
            assert audit['readOnly'] is True and audit['sourceChanged'] is False
            assert audit['sourceGitSha'] == COMMIT and audit['sourceTreeSha'] == TREE
            assert audit['fileCount'] == 3 and audit['sampled'] is False
            assert audit['remoteRequests'] == 6 and len(external) == 6
            assert len(audit['sha256']) == 64
            assert all(req['method'] == 'GET' for req in external)
            assert all(req['url'].startswith(PREFIX + '/') and '.env' not in req['url'] for req in external)
            assert 'PRIVATE_KEY' not in dest.read_text(encoding='utf8')
            assert page.locator('#export-github-diff').is_disabled()
            page.locator('#github-ref').fill('compare-ref')
            page.locator('#github-public-consent').check()
            page.locator('#analyze-github').click()
            page.wait_for_function("() => document.querySelector('#github-analysis-status').textContent.includes('이전 조회 대비 해시 변경')", timeout=15000)
            assert COMMIT2 in page.locator('#github-analysis-status').inner_text()
            assert page.locator('#export-github-diff').is_enabled()
            assert not page.locator('#github-public-consent').is_checked()
            with page.expect_download() as download_diff:
                page.locator('#export-github-diff').click()
            diffpath = Path(td) / 'FFAX-public-github-commit-comparison.json'
            download_diff.value.save_as(str(diffpath))
            comparison = json.loads(diffpath.read_text(encoding='utf8'))
            assert comparison['previousCommit'] == COMMIT and comparison['currentCommit'] == COMMIT2
            assert comparison['changed'] == 1 and comparison['protectedFlowChanges'] == 1
            assert comparison['changes'][0]['path'] == 'src/api.ts'
            assert comparison['approvalEligible'] is False and comparison['prCreated'] is False
            assert comparison['remoteRequests'] == 0 and comparison['sourceWrites'] == 0
            assert canvas_before == page.locator('#preview').inner_text(), 'COMPARISON_MUTATED_CANVAS'
            assert all(req['method'] == 'GET' for req in external)
            assert len(external) == 12 and 'PRIVATE_KEY' not in diffpath.read_text(encoding='utf8')
            assert not errors, errors
            browser.close()
            print(json.dumps({'test': 'FFAX_GITHUB_PUBLIC_CHROMIUM', 'status': 'PASS',
                              'remoteMockGETs': len(external), 'sourceFiles': audit['fileCount'], 'comparisonChanges': comparison['changed'],
                              'postOrWrite': 0, 'realRemoteGitHub': False, 'ownerApproved': False}, ensure_ascii=False))
    finally:
        server.terminate()
        try: server.wait(timeout=3)
        except subprocess.TimeoutExpired: server.kill()
