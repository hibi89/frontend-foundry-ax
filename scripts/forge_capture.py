#!/usr/bin/env python3
"""Capture a trusted FFAX static HTML preview using local Playwright Chromium only."""
from __future__ import annotations
import argparse
import hashlib
import json
import sys
from pathlib import Path

def main() -> int:
    parser=argparse.ArgumentParser()
    parser.add_argument('--html', required=True)
    parser.add_argument('--out', required=True)
    parser.add_argument('--width',type=int,default=1440)
    parser.add_argument('--height',type=int,default=900)
    parser.add_argument('--dpr',type=float,default=1)
    args=parser.parse_args()
    if not (320<=args.width<=2560 and 320<=args.height<=2200 and args.dpr in (1.0,2.0)):
        raise ValueError('FORGE_VIEWPORT_UNSUPPORTED')
    html_file=Path(args.html).resolve(strict=True)
    out_file=Path(args.out).resolve()
    if not html_file.is_file() or html_file.stat().st_size>2000000:
        raise ValueError('FORGE_HTML_INVALID')
    if out_file.exists():
        raise ValueError('FORGE_OUTPUT_EXISTS')
    if out_file.parent != html_file.parent and not out_file.parent.is_dir():
        raise ValueError('FORGE_OUTPUT_DIR_MISSING')
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise RuntimeError('FORGE_PLAYWRIGHT_NOT_INSTALLED') from exc
    markup=html_file.read_text(encoding='utf-8')
    failures=[]
    with sync_playwright() as playwright:
        browser=playwright.chromium.launch(headless=True,args=['--no-first-run','--disable-extensions'])
        context=browser.new_context(viewport={'width':args.width,'height':args.height},device_scale_factor=args.dpr,java_script_enabled=False,offline=True)
        page=context.new_page()
        page.route('**/*',lambda route:route.abort())
        page.on('console',lambda msg:failures.append('console-error') if msg.type=='error' else None)
        page.on('pageerror',lambda exc:failures.append('page-error'))
        page.set_content(markup,wait_until='load',timeout=15000)
        page.add_style_tag(content='*{animation:none!important;transition:none!important;caret-color:transparent!important}')
        page.screenshot(path=str(out_file),full_page=False,animations='disabled',timeout=15000)
        version=browser.version
        page.close();context.close();browser.close()
    if failures: raise RuntimeError('FORGE_BROWSER_ERRORS')
    data=out_file.read_bytes()
    if data[:8]!=bytes([137,80,78,71,13,10,26,10]):raise RuntimeError('FORGE_CAPTURE_NOT_PNG')
    receipt={'schema':'ffax.capture.v1','engine':'playwright-chromium','browserVersion':version,'width':args.width,'height':args.height,'dpr':args.dpr,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'network':'ABORT_ALL','scriptExecution':'DISABLED','source':'FFAX_TYPED_STATIC_PREVIEW'}
    print(json.dumps(receipt,ensure_ascii=False,separators=(',',':')))
    return 0

if __name__=='__main__':
    try:sys.exit(main())
    except Exception as exc:
        print(json.dumps({'ok':False,'error':str(exc)[:160]},ensure_ascii=False),file=sys.stderr)
        sys.exit(1)
