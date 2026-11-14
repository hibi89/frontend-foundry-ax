"""Real Chromium preview/export responsive-grid comparison on three viewports.
This probes safe synthetic UI source only, never a real LLM or owner acceptance.
"""
import json
import shutil
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'src' / 'core.mjs'
CSS = (ROOT / 'styles.css').read_text(encoding='utf-8')
EXPRESSION = '''const {buildBrief,newDocument,renderMarkup,exportReact}=await import(''' + json.dumps(SOURCE.as_uri()) + ''');
const b=buildBrief('데이터 분석 테이블과 통계 시각 화면을 반응형 대시보드로 만들어줘');
const stack=newDocument(b,'A');const grid=newDocument(b,'B');
console.log(JSON.stringify({stack:renderMarkup(stack),grid:renderMarkup(grid),source:exportReact(grid)}));'''
run = subprocess.run(['node', '--input-type=module', '-e', EXPRESSION],
                     cwd=ROOT, capture_output=True, text=True, check=True, timeout=15)
fixture = json.loads(run.stdout)
assert "gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,300px),1fr))'" in fixture['source']
assert 'grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))' in CSS

checks = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True,
       executable_path=shutil.which('chromium') or shutil.which('chromium-browser') or p.chromium.executable_path,
       args=['--no-sandbox'])
    try:
        for width, expected_tracks in ((375, 1), (768, 2), (1440, 4)):
            for variant in ('stack', 'grid'):
                page = browser.new_page(viewport={'width': width, 'height': 900})
                errors = []
                page.on('pageerror', lambda e: errors.append(str(e)))
                html = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + CSS + '</style></head><body>' + fixture[variant] + '</body></html>'
                try:
                    page.set_content(html, wait_until='load')
                    layout = page.evaluate('''() => {
                     const canvas = document.querySelector('main.ff-canvas');
                     const style = getComputedStyle(canvas);
                     return {display:style.display, flexDirection:style.flexDirection,
                      tracks:style.gridTemplateColumns.split(' ').filter(Boolean).length,
                      nodes:canvas.querySelectorAll('[data-node-id]').length,
                      width:document.documentElement.scrollWidth,
                      viewport:window.innerWidth};
                    }''')
                    assert layout['nodes'] == 13, (width, variant, layout)
                    assert layout['width'] <= width + 1, (width, variant, layout)
                    assert not errors, errors
                    if variant == 'grid':
                        assert layout['display'] == 'grid' and layout['tracks'] == expected_tracks, (width, layout)
                    else:
                        assert layout['display'] == 'flex' and layout['flexDirection'] == 'column', (width, layout)
                    checks.append({'variant': variant, 'viewport': width, 'tracks': layout['tracks'] if variant == 'grid' else None, 'nodes': layout['nodes'], 'overflow': False})
                finally:
                    page.close()
    finally:
        browser.close()
print(json.dumps({'test':'FFAX_BROWSER_PREVIEW_EXPORT_GRID_TRACKS', 'status':'PASS',
                  'independentChecks':len(checks), 'actualLocalModelCalls':0, 'observations': checks}, ensure_ascii=False))
