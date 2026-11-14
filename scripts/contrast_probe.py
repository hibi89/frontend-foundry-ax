"""Computed text contrast audit across 3 themes x 3 widths (NOT axe-core)."""
import json,pathlib,re,sys
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text(encoding='utf8')
css=(ROOT/'styles.css').read_text(encoding='utf8')
core=re.sub(r'\bexport (?=(?:const|class|function)\b)','',(ROOT/'src/core.mjs').read_text(encoding='utf8'))
demo=re.sub(r'\bexport (?=(?:const|class|function)\b)','',(ROOT/'src/demo-interactions.mjs').read_text(encoding='utf8'))
app=re.sub(r'^import [^;]+;','',(ROOT/'src/app.mjs').read_text(encoding='utf8'),count=2,flags=re.M)
html=re.sub(r'<link rel="stylesheet"[^>]+>','',html)
html=re.sub(r'<script type="module"[^>]+></script>','',html)
module='window.fetch=async()=>({text:async()=>'+json.dumps(css)+'});\n'+core+'\n'+demo+'\n'+app
SCRIPT=r'''() => {
function rgb(s){let m=/rgba?\(([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:[, /]+([\d.]+))?\)/.exec(s||'');if(m)return [+m[1],+m[2],+m[3],m[4]===undefined?1:+m[4]];m=/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/.exec(s||'');return m?[+m[1]*255,+m[2]*255,+m[3]*255,m[4]===undefined?1:+m[4]]:null;}
const mix=(fg,bg)=>[0,1,2].map(i=>fg[i]*fg[3]+bg[i]*(1-fg[3])).concat(1);
function bg(el){const p=[];while(el&&el.nodeType===1){p.unshift(el);el=el.parentElement;}let c=[255,255,255,1];for(const n of p){const t=rgb(getComputedStyle(n).backgroundColor);if(t&&t[3]>0)c=mix(t,c);}return c;}
const lum=c=>{const [r,g,b]=c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*r+.7152*g+.0722*b;};
const fails=[];let count=0;
for(const el of document.querySelectorAll('h1,h2,h3,h4,p,small,label,button,input,textarea,select,a,span,strong,li,td,th')){
const s=getComputedStyle(el),rect=el.getBoundingClientRect();if(el.closest('[hidden],template')||s.display==='none'||s.visibility==='hidden'||rect.width<2||rect.height<2||el.disabled||el.getAttribute('aria-disabled')==='true'||el.classList.contains('logo'))continue;
if(el.matches('input')&&['checkbox','radio','file'].includes(el.type))continue;
const t=(el.matches('input,textarea')?(el.value||el.placeholder):(el.textContent||'')).trim();if(!t||t.length>150)continue;
if(!el.matches('button,select,a,input,textarea')&&[...el.children].some(c=>c.textContent.trim()))continue;
const back=bg(el),front=rgb(s.color);if(!front)continue;const a=lum(mix(front,back)),b=lum(back),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
const font=parseFloat(s.fontSize),weight=parseFloat(s.fontWeight)||400,required=font>=24||(font>=18.66&&weight>=700)?3:4.5;count++;
if(ratio<required)fails.push({tag:el.tagName,text:t.slice(0,48),ratio:+ratio.toFixed(2),required});
}return {count,fails};}'''
variants=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
 page=browser.new_page(viewport={'width':1440,'height':900});page.set_content(html);page.add_style_tag(content=css);page.add_script_tag(content=module,type='module')
 page.locator('#preview [data-node-id]').first.wait_for(timeout=7000)
 for theme in ('midnight','ocean','daylight'):
  page.locator('#theme-select').select_option(theme)
  for width in (375,768,1440):
   page.set_viewport_size({'width':width,'height':900});page.locator('[data-width="%s"]'%width).click()
   variants.append({'theme':theme,'width':width,**page.evaluate(SCRIPT)})
 browser.close()
failures=[{'theme':v['theme'],'width':v['width'],**f} for v in variants for f in v['fails']]
checks=sum(v['count'] for v in variants)
out=ROOT/'artifacts'/'qa'/'contrast.json';out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps({'checks':checks,'variants':variants,'failures':failures,'scope':'computed text only, not axe/WCAG certification'},ensure_ascii=False,indent=2),encoding='utf8')
print('computed text checks',checks,'low-contrast candidates',len(failures),'variants',len(variants))
for entry in failures[:30]:print(entry)
sys.exit(1 if failures else 0)
