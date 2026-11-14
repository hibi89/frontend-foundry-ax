import { DEFAULT_PROMPT,THEME_OPTIONS,REGISTRY,COMPONENT_TYPES,buildBrief,newDocument,DocumentHistory,assertDocument,renderMarkup,exportReact,createReference,approveReference,makeManualAIPrompt,parseModelDesign,exportLocalProject,importLocalProject } from './core.mjs';
const el=id=>document.getElementById(id);
const promptEl=el('prompt');promptEl.value=DEFAULT_PROMPT;
let brief=buildBrief(DEFAULT_PROMPT);let history=new DocumentHistory(newDocument(brief,'A'));
let selected=history.present.components[0].id;
let viewport=1440;let dragId=null;
const log=(text,failed=false)=>{el('qa-report').textContent=text;el('qa-report').className='qa-result '+(failed?'failed':'passed');};
const save=(filename,content,mime='text/plain')=>{const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);};

function renderBrief(){
  el('brief-summary').textContent=`목적: ${brief.objective}\n페이지: ${brief.pages.join(' / ')}\n동선: ${brief.features.join(', ')}\n보존: ${brief.constraints.join('; ')}`;
  const options=el('design-options');options.replaceChildren();
  for(const approach of brief.approaches){const b=document.createElement('button');b.className='design-option '+(history.present.approach===approach.id?'selected':'');b.type='button';
    const title=document.createElement('strong');title.textContent=approach.label;
    const desc=document.createElement('span');desc.textContent=approach.description+' · '+THEME_OPTIONS[approach.theme].label;
    b.append(title,desc);b.addEventListener('click',()=>{history=new DocumentHistory(newDocument(brief,approach.id));selected=history.present.components[0].id;updateAll();});options.append(b);
  }
}
function renderReference(){
  const dest=el('reference-choices');dest.replaceChildren();const ref=history.present.reference;
  if(!ref?.rightsConfirmed)return;
  for(const c of ref.candidates){
    const btn=document.createElement('button');btn.type='button';btn.className='reference-candidate'+(ref.approvedCandidate===c.id?' selected':'');
    btn.setAttribute('aria-label',`스타일 ${c.id} 승인`);
    const swatch=document.createElement('span');swatch.className='swatch';swatch.style.backgroundColor=c.color;
    const txt=document.createElement('span');txt.textContent=`${c.id} · ${c.tone} ${c.color}`;
    btn.append(swatch,txt);
    btn.addEventListener('click',()=>{
      try {const next=approveReference(history.present,c.id);history.past.push(history.present);history.present=next;history.future=[];el('reference-result').textContent=`${ref.name}: ${c.id} 색상 스타일 승인됨 · 코드·미리보기에 반영`;updateAll();}
      catch(e){log(e.message,true);}
    });
    dest.append(btn);
  }
}
function renderInspector(){
  const doc=history.present;const current=doc.components.find(c=>c.id===selected)||doc.components[0];
  selected=current?.id||null;
  const picker=el('component-select');picker.replaceChildren();
  for(const c of doc.components){const opt=document.createElement('option');opt.value=c.id;opt.textContent=`${REGISTRY[c.type].label} · ${c.text.slice(0,22)}`;picker.append(opt);}
  if(current){picker.value=current.id;
    el('component-text').value=current.text;el('component-type').value=current.type;el('component-color').value=current.color;el('component-spacing').value=String(current.spacing);el('component-align').value=current.align;
  }
  for(const id of ['component-text','component-type','component-color','component-spacing','component-align','move-up','move-down','remove-component'])el(id).disabled=!current;
  el('undo').disabled=!history.past.length;el('redo').disabled=!history.future.length;
  el('theme-select').value=doc.theme;
  el('source-preview').textContent=exportReact(doc).slice(0,1600)+'\n// […]';
}
function renderCanvas(){
  const doc=history.present;
  el('project-title').textContent=doc.title;
  const max=el('preview').parentElement.clientWidth-32;
  const contentWidth=viewport===1440?Math.max(300,max):Math.min(viewport,Math.max(240,max));
  el('preview').style.width=`${contentWidth}px`;el('preview').innerHTML=renderMarkup(doc);
  for(const node of el('preview').querySelectorAll('[data-node-id]')){
    const nodeId=node.getAttribute('data-node-id');node.setAttribute('draggable','true');node.setAttribute('tabindex','0');if(!node.matches('button,input,select,textarea,a,label') && !node.hasAttribute('role'))node.setAttribute('role','group');
    if(!node.matches('button,input,select,textarea,a,label'))node.setAttribute('aria-label',`편집 컴포넌트 ${REGISTRY[doc.components.find(x=>x.id===nodeId).type].label}`);
    if(nodeId===selected)node.classList.add('selected');
    node.addEventListener('click',e=>{if(e.target.matches('input,button')&&!e.target.closest('.ff-modal')){e.preventDefault();}e.stopPropagation();selected=nodeId;updateAll(false);});
    node.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ') && e.target===node){e.preventDefault();selected=nodeId;updateAll(false);}});
    node.addEventListener('dragstart',e=>{dragId=nodeId;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',nodeId);});
    node.addEventListener('dragover',e=>e.preventDefault());
    node.addEventListener('drop',e=>{e.preventDefault();const id=dragId;dragId=null;const nextIndex=history.present.components.findIndex(n=>n.id===nodeId);if(id&&id!==nodeId&&nextIndex>=0){selected=id;run({kind:'move',id,index:nextIndex});}});
  }
  el('version-info').textContent=`Draft v${doc.version} · ${doc.components.length} components · no remote writes`;
  document.querySelectorAll('[data-width]').forEach(b=>{const active=Number(b.dataset.width)===viewport;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
}
function updateAll(updateBrief=true){if(updateBrief)renderBrief();renderCanvas();renderInspector();renderReference();}
function run(command){try{history.exec(command);updateAll();el('qa-report').textContent='수정 이후 다시 검증해야 합니다.';el('qa-report').className='qa-result';}catch(e){log(e.message,true);}}
function edit(prop,value){if(!selected)return;run({kind:'update',id:selected,prop,value});}
function updateReference(){const f=el('reference-file').files?.[0];if(!f){el('reference-result').textContent='이미지 파일을 선택하세요.';return;}
  if(!el('rights').checked){el('reference-result').textContent='사용 권한 확인이 필요합니다.';return;}
  if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>4*1024*1024){el('reference-result').textContent='PNG/JPEG/WebP, 4MiB 이하만 지원합니다.';return;}
  (async()=>{let bitmap;
    try{bitmap=await createImageBitmap(f);const c=document.createElement('canvas');c.width=40;c.height=20;const cx=c.getContext('2d',{willReadFrequently:true});cx.drawImage(bitmap,0,0,40,20);const pixels=cx.getImageData(0,0,40,20).data;
      const average=(start,end)=>{let r=0,g=0,b=0,cnt=0;for(let y=0;y<20;y++)for(let x=start;x<end;x++){const i=(y*40+x)*4;if(pixels[i+3]<180)continue;r+=pixels[i];g+=pixels[i+1];b+=pixels[i+2];cnt++;}return cnt?[r,g,b].map(c=>Math.round(c/cnt).toString(16).padStart(2,'0')).join(''):'64748b'};
      const colorA='#'+average(0,20),colorB='#'+average(20,40);
      const d=createReference(history.present,f.name,true,[colorA,colorB]);history.past.push(history.present);history.present=d;history.future=[];
      el('reference-result').textContent=`${f.name}: ${colorA} / ${colorB} · 스타일 후보 A/B · 사용자 승인 전`;updateAll();
    }catch(e){el('reference-result').textContent=`참고 이미지 분석 실패: ${e.message}`;}finally{bitmap?.close();}
  })();
}
async function checkQA(){
  const report=[];let failed=false; const priorWidth=viewport;
  for(const width of [375,768,1440]){
    const iframe=document.createElement('iframe');iframe.setAttribute('title',`QA ${width}`);iframe.style.cssText=`position:absolute;left:-9999px;top:0;width:${width}px;height:900px;border:0;visibility:hidden;`;
    const doc=history.present;const canvasCSS=await (await fetch('/styles.css',{cache:'no-store'})).text();
    const fault=new URL(location.href).searchParams.has('qa-fault') || window.__ffaxQAFault === true;
    iframe.srcdoc=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${canvasCSS}</style></head><body style="margin:0;padding:0">${renderMarkup(doc)}${fault?'<div style="width:2000px;height:10px">QA deliberate failure</div>':''}</body></html>`;
    document.body.append(iframe);
    await new Promise(res=>{iframe.onload=res;setTimeout(res,1800);});
    const body=iframe.contentDocument.body;
    const overflow=body.scrollWidth>width+2;
    const components=[...body.querySelectorAll('[data-node-id]')];
    const missing=components.length!==doc.components.length;
    const rects=components.map(e=>e.getBoundingClientRect());
    let overlapping=false;
    for(let a=0;a<rects.length;a++)for(let b=a+1;b<rects.length;b++){
      const r=rects[a],s=rects[b];
      if(Math.min(r.right,s.right)-Math.max(r.left,s.left)>3 && Math.min(r.bottom,s.bottom)-Math.max(r.top,s.top)>3) overlapping=true;
    }
    report.push(`${width}px: ${overflow?'FAIL overflow':'PASS overflow'} · ${overlapping?'FAIL overlap':'PASS overlap'} · ${missing?'FAIL components':'PASS components'}`);
    if(overflow||missing||overlapping)failed=true;
    iframe.remove();
  }
  viewport=priorWidth;renderCanvas();
  log(`${failed?'FAIL':'PASS'} · 인앱 3폭 레이아웃 빠른 검사\n${report.join('\n')}\n※ 실제 Chromium screenshot/console/network/접근성 수락은 scripts/browser_qa.py 별도 실행`,failed);
}
el('analyze').addEventListener('click',()=>{try{brief=buildBrief(promptEl.value);history=new DocumentHistory(newDocument(brief,'A'));selected=history.present.components[0]?.id;updateAll();}catch(e){log(e.message,true);}});
el('component-select').addEventListener('change',e=>{selected=e.target.value;updateAll(false);});
for(const [id,prop,transform] of [['component-text','text',v=>v],['component-type','type',v=>v],['component-color','color',v=>v],['component-spacing','spacing',Number],['component-align','align',v=>v]])el(id).addEventListener('change',e=>edit(prop,transform(e.target.value)));
el('theme-select').addEventListener('change',e=>run({kind:'theme',value:e.target.value}));
el('move-up').addEventListener('click',()=>{const i=history.present.components.findIndex(c=>c.id===selected);if(i>0)run({kind:'move',id:selected,index:i-1});});
el('move-down').addEventListener('click',()=>{const i=history.present.components.findIndex(c=>c.id===selected);if(i>=0&&i<history.present.components.length-1)run({kind:'move',id:selected,index:i+1});});
el('undo').addEventListener('click',()=>{history.undo();updateAll();});el('redo').addEventListener('click',()=>{history.redo();updateAll();});
el('add-component').addEventListener('click',()=>{run({kind:'insert',type:'Card'});selected=history.present.components.at(-1)?.id;updateAll();});
el('remove-component').addEventListener('click',()=>{if(selected)run({kind:'remove',id:selected});});
document.querySelectorAll('[data-width]').forEach(b=>b.addEventListener('click',()=>{viewport=Number(b.dataset.width);renderCanvas();}));
el('run-qa').addEventListener('click',()=>checkQA().catch(e=>log(`QA 오류: ${e.message}`,true)));
el('local-generate').addEventListener('click',async()=>{
  const btn=el('local-generate'),status=el('local-generation-status');
  if(!el('local-model-consent').checked){status.textContent='실행 전 이번 요청의 명시적 동의가 필요합니다.';return;}
  btn.disabled=true;status.textContent='PC 로컬 모델 요청 중. 60초 제한으로 중단할 수 있습니다.';
  try{
    const response=await fetch('/api/local-model',{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({model:el('local-model-name').value,prompt:promptEl.value,consent:'APPROVE_LOCAL_MODEL_PROMPT_ONLY'})});
    const result=await response.json();
    if(!response.ok)throw Error(result.error||'LOCAL_MODEL_UNAVAILABLE');
    el('manual-response').value=result.output;el('manual-design-approval').checked=false;
    status.textContent='모델 응답 수신. 아래 JSON을 검토하고 승인해야 적용됩니다. 자동 배포·코드 실행 없음.';
  }catch(err){status.textContent='로컬 AI 실패: '+(err?.message||'UNKNOWN');}
  finally{btn.disabled=false;el('local-model-consent').checked=false;}
});
el('manual-build-request').addEventListener('click',()=>{
  try {
    el('manual-request').value=makeManualAIPrompt(promptEl.value,{ownerConsent:el('manual-copy-consent').checked});
    el('manual-review-status').textContent='요청서가 로컬에서 만들어졌습니다. 앱이 자동 전송하지 않습니다.';
  }catch(e){el('manual-request').value='';el('manual-review-status').textContent=e.message;}
});
el('manual-apply-response').addEventListener('click',()=>{
  try {
    const out=parseModelDesign(el('manual-response').value,{ownerBrief:promptEl.value,
      approval:el('manual-design-approval').checked?'APPROVE_DESIGN_PREVIEW':''});
    history.past.push(history.present);history.present=out.document;history.future=[];
    selected=out.document.components[0]?.id||null;updateAll();
    el('manual-review-status').textContent=`검증된 ${out.metadata.components}개 컴포넌트가 로컬 미리보기에 적용됨. 자동 배포 없음.`;
  }catch(e){el('manual-review-status').textContent=`거부: ${e.message}`;}
});
el('apply-reference').addEventListener('click',updateReference);
el('export-react').addEventListener('click',()=>save('GeneratedScreen.tsx',exportReact(history.present),'text/plain'));
el('export-json').addEventListener('click',()=>{
  try { save('FFAX-project.json',exportLocalProject(history.present),'application/json'); el('project-import-status').textContent='프로젝트 저장본을 로컬로 내려받았습니다. 자동 클라우드 저장은 하지 않습니다.';}
  catch(e){ el('project-import-status').textContent='저장 거부: '+e.message; }
});
el('import-project').addEventListener('change',async (e)=>{
  const input=e.target, file=input.files?.[0];
  if(!file) return;
  try {
    if(!/\.json$/i.test(file.name) || file.size>262144 || file.size<32) throw new Error('PROJECT_FILE_SIZE_OR_TYPE_INVALID');
    const doc=importLocalProject(await file.text());
    if(!window.confirm('검증된 프로젝트를 현재 캔버스에 불러올까요?\n현재 편집 결과는 Undo로 복구할 수 있습니다.')) {
      el('project-import-status').textContent='프로젝트 불러오기를 취소했습니다. 기존 화면 유지.';return;
    }
    const previous=history.present;
    history.past.push(previous);if(history.past.length>history.max)history.past.shift();
    history.present=doc;history.future=[];brief=doc.brief;
    promptEl.value=(doc.brief.raw?.startsWith('[')?DEFAULT_PROMPT:doc.brief.raw);
    selected=doc.components[0]?.id||null;updateAll();
    el('project-import-status').textContent=`불러오기 완료 · ${doc.components.length}개 컴포넌트 · Undo 가능 · 외부 전송 없음`;
  }catch(err){el('project-import-status').textContent='프로젝트 불러오기 거부: '+err.message;}
  finally{input.value='';}
});
for(const type of COMPONENT_TYPES){const o=document.createElement('option');o.value=type;o.textContent=REGISTRY[type].label;el('component-type').append(o);}
for(const [key,t] of Object.entries(THEME_OPTIONS)){const o=document.createElement('option');o.value=key;o.textContent=t.label;el('theme-select').append(o);}
updateAll();
