"""Lightweight FFAX keyboard/label/focus audit, NOT axe-core or user UX signoff.
No network is requested; the same HTML/CSS/JS is loaded as an isolated injected DOM.
"""
import json, pathlib, re
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text(encoding='utf8')
css=(ROOT/'styles.css').read_text(encoding='utf8')
core=(ROOT/'src/core.mjs').read_text(encoding='utf8')
app=(ROOT/'src/app.mjs').read_text(encoding='utf8')
html=re.sub(r'<link rel="stylesheet"[^>]+>','',html)
html=re.sub(r'<script type="module"[^>]+></script>','',html)
core=re.sub(r'\bexport (?=(?:const|class|function)\b)','',core)
app=re.sub(r'^import [^;]+;','',app,count=1)
module='const __injectedCSS = '+json.dumps(css)+';\nwindow.fetch=async()=>({text:async()=>__injectedCSS});\n'+core+'\n'+app
checklist=[]
def check(name,passed,detail=''):
 checklist.append({'name':name,'passed':bool(passed),'detail':detail})
 print(('PASS' if passed else 'FAIL'),name, detail if not passed else '')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu'])
 page=browser.new_page(viewport={'width':1440,'height':900})
 page.set_content(html)
 page.add_style_tag(content=css)
 page.add_script_tag(content=module,type='module')
 page.locator('#preview [data-node-id]').first.wait_for(timeout=7000)
 check('document lang Korean',page.locator('html').get_attribute('lang')=='ko')
 check('named page title',bool(page.title().strip()))
 check('one primary page heading',page.locator('body > .heading h1').count()==1)
 missing=page.evaluate("""() => [...document.querySelectorAll('input,select,textarea')].filter(el => {
   const id=el.getAttribute('id');
   return !(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') ||
     (id && document.querySelector('label[for="'+CSS.escape(id)+'"]')) || el.closest('label'));
 }).map(x=>x.outerHTML.slice(0,90))""")
 check('every interactive form control has label',not missing,str(missing))
 missing=page.evaluate("""() => [...document.querySelectorAll('button')].filter(el =>
   !(el.textContent.trim() || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'))
 ).map(x=>x.outerHTML.slice(0,90))""")
 check('buttons accessible names',not missing,str(missing))
 duplicates=page.evaluate("""() => {const ids=[...document.querySelectorAll('[id]')].map(x=>x.id);return ids.filter((x,i)=>ids.indexOf(x)!==i)}""")
 check('unique ids',not duplicates,str(duplicates))
 invalid=page.evaluate("""() => [...document.querySelectorAll('button[role=group]')].map(x=>x.outerHTML.slice(0,80))""")
 check('no button role override',not invalid,str(invalid))
 pressed=page.locator('[data-width="1440"]').get_attribute('aria-pressed')
 check('active viewport aria-pressed',pressed=='true')
 page.locator('[data-width="375"]').click()
 check('responsive viewport press switches',page.locator('[data-width="375"]').get_attribute('aria-pressed')=='true')
 page.locator('#prompt').focus()
 outline=page.locator('#prompt').evaluate("e=>({style:getComputedStyle(e).outlineStyle,width:getComputedStyle(e).outlineWidth})")
 check('keyboard focus visible',outline['style']!='none' and outline['width']!='0px',str(outline))
 # Entry point is reachable with keyboard; avoid relying on computed focus state of iframe.
 page.keyboard.press('Tab')
 focused=page.evaluate("document.activeElement && document.activeElement.tagName")
 check('keyboard navigation reaches next control',focused in ('BUTTON','INPUT','TEXTAREA','SELECT','A'),str(focused))
 page.locator('[data-width="1440"]').click()
 page.locator('#preview [data-node-id]').nth(1).focus()
 page.keyboard.press('Enter')
 check('keyboard selects component',page.locator('#preview [data-node-id]').nth(1).get_attribute('class').find('selected')!=-1)
 browser.close()
result={'checks':checklist,'passed':sum(x['passed'] for x in checklist),'failed':sum(not x['passed'] for x in checklist),
 'scope':'self-contained Chromium injected DOM, keyboard/label semantics only; NOT axe-core, NOT human UX approval',
 'axe':'not executed: no locally available licensed axe-core distribution','reviewer':'automated FFAX engineering test; owner approval pending'}
out=ROOT/'artifacts'/'qa'/'accessibility-results.json'
out.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
print('RESULT',result['passed'],'PASS /',result['failed'],'FAIL')
raise SystemExit(1 if result['failed'] else 0)
