"""Optional genuine React UMD render for all 12 deterministic FFAX source exports.
No external network/AI and no installed React shipped with this project.
Provide REACT_UMD and REACT_DOM_UMD environment paths for production-grade CI later.
Local nbclassic React runtime is an explicitly limited compatibility probe.
"""
from __future__ import annotations
import json, os, pathlib, subprocess, sys
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'artifacts'/'qa'
OUTPUT.mkdir(parents=True,exist_ok=True)
REACT=pathlib.Path(os.getenv('REACT_UMD','/opt/pyvenv/lib/python3.13/site-packages/nbclassic/static/components/react/umd/react.production.min.js'))
REACT_DOM=pathlib.Path(os.getenv('REACT_DOM_UMD','/opt/pyvenv/lib/python3.13/site-packages/nbclassic/static/components/react-dom/umd/react-dom.production.min.js'))
if not REACT.is_file() or not REACT_DOM.is_file():
    print('SKIP: owner-approved local React UMD assets are unavailable. Not passing AC04.')
    sys.exit(2)
res=subprocess.run(['node','scripts/react_export_probe.mjs'],cwd=ROOT,capture_output=True,text=True,check=True)
manifest=json.loads(res.stdout)
items=json.loads(pathlib.Path(manifest['report']).read_text(encoding='utf8'))['compiled']
counts={'rendered':0,'typechecked':len(items),'viewport_checks':0,'failures':[],'js_errors':[]}
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
    ctx=browser.new_context(viewport={'width':1440,'height':900})
    page=ctx.new_page()
    page.on('pageerror',lambda e:counts['js_errors'].append(str(e)))
    for item in items:
        try:
            page.set_content('<!doctype html><html lang="ko"><head><meta charset="utf-8" /></head><body><div id="root"></div></body></html>')
            page.add_script_tag(content=REACT.read_text(encoding='utf8'))
            page.add_script_tag(content=REACT_DOM.read_text(encoding='utf8'))
            page.add_script_tag(content=item['js']+'\nwindow.GeneratedScreen = GeneratedScreen;')
            page.evaluate("ReactDOM.render(React.createElement(GeneratedScreen), document.querySelector('#root'))")
            heading=page.locator('#root [data-theme]').first
            if heading.count()!=1:raise RuntimeError('missing rendered React root')
            if page.locator('button').count()==0 or page.locator('table').count()==0:raise RuntimeError('missing components')
            counts['rendered']+=1
            for width in (375,768,1440):
                page.set_viewport_size({'width':width,'height':900})
                metric=page.evaluate('({sw:document.documentElement.scrollWidth, vw:innerWidth})')
                if metric['sw']>metric['vw']+2:raise RuntimeError(f'horizontal overflow {item["index"]}/{width}: {metric}')
                counts['viewport_checks']+=1
            if item['index']==0:
                page.screenshot(path=str(OUTPUT/'react-generated-runtime.png'),full_page=True)
        except Exception as e:
            counts['failures'].append({'index':item['index'],'error':str(e)})
    browser.close()
(OUTPUT/'react-runtime-results.json').write_text(json.dumps(counts,ensure_ascii=False,indent=2),encoding='utf8')
print(f"React genuine UMD runtime: {counts['rendered']}/{len(items)} rendered, {counts['viewport_checks']} viewport checks; errors={counts['js_errors']}; failures={counts['failures']}")
sys.exit(1 if counts['failures'] or counts['js_errors'] else 0)
