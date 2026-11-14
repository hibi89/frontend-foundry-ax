import { DEFAULT_PROMPT,THEME_OPTIONS,REGISTRY,COMPONENT_TYPES,buildBrief,newDocument,DocumentHistory,assertDocument,renderMarkup,exportReact,createReference,approveReference,makeManualAIPrompt,parseModelDesign,exportLocalProject,importLocalProject } from './core.mjs';
import {bindPreviewActions} from './demo-interactions.mjs';
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
  el('add-component').disabled=doc.components.length>=80;
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
    node.addEventListener('click',e=>{
      if(e.target.closest('[data-demo-action], [data-demo-field]')){e.stopPropagation();return;}
      if(e.target.matches('input,button')&&!e.target.closest('.ff-modal'))e.preventDefault();
      e.stopPropagation();selected=nodeId;updateAll(false);
    });
    node.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ') && e.target===node){e.preventDefault();selected=nodeId;updateAll(false);}});
    node.addEventListener('dragstart',e=>{dragId=nodeId;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',nodeId);});
    node.addEventListener('dragover',e=>e.preventDefault());
    node.addEventListener('drop',e=>{e.preventDefault();const id=dragId;dragId=null;const nextIndex=history.present.components.findIndex(n=>n.id===nodeId);if(id&&id!==nodeId&&nextIndex>=0){selected=id;run({kind:'move',id,index:nextIndex});}});
  }
  bindPreviewActions(el('preview'));
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
// Real selected-folder scan occurs in the browser only, after two explicit user actions.
let latestRepoAudit=null;
el('analyze-repo').addEventListener('click',async()=>{
 const button=el('analyze-repo'),display=el('repo-analysis-status');
 button.disabled=true;el('export-repo-audit').disabled=true;latestRepoAudit=null;
 display.textContent='로컬 폴더의 허용 파일을 읽기 전용으로 검사 중입니다.';
 try{
  // Deferred loading preserves the no-network startup path and classic-script browser QA harness.
  const {auditLocalReactFolder}=await import('./local-repo-intake.mjs');
  const result=await auditLocalReactFolder(el('repo-folder').files);
  latestRepoAudit=result;
  const hints=result.indicators;
  display.textContent='READ-ONLY PASS · '+result.fileCount+' files / '+result.bytes+' bytes\n'+
   'SHA256 '+result.sha256+'\n'+
   'API 참조 '+hints.api+' · 라우트 '+hints.route+' · 인증 '+hints.auth+' · 이벤트 '+hints.events+'\n'+
   '안전하게 제외한 파일 '+result.skippedEntries+'개 · 변경/전송 0건\n'+result.warning;
  el('export-repo-audit').disabled=false;
 }catch(err){
  display.textContent='READ-ONLY FAIL: '+(err?.message||'UNKNOWN')+'\n원본 변경·전송 0건. node_modules 등을 제외한 안전한 복사본 폴더를 선택하세요.';
 }finally{button.disabled=false;}
});
el('export-repo-audit').addEventListener('click',()=>{
 if(!latestRepoAudit)return;
 save('FFAX-readonly-react-audit.json',JSON.stringify(latestRepoAudit,null,2),'application/json');
});

// Remote-public audit never runs without distinct owner approval; no credentials accepted.
let latestGithubAudit=null,latestGithubComparison=null,latestGithubCommitReview=null;
el('analyze-github').addEventListener('click',async()=>{
 const button=el('analyze-github'),display=el('github-analysis-status');
 const previous=latestGithubAudit;
 button.disabled=true;el('export-github-audit').disabled=true;
 el('export-github-diff').disabled=true;latestGithubComparison=null;
 el('github-compare-run').disabled=true;el('export-github-compare').disabled=true;
 el('github-compare-consent').checked=false;latestGithubCommitReview=null;
 el('github-compare-status').textContent='새 공개 커밋 조회 후 별도 동의를 받아 변경 목록을 검사할 수 있습니다.';
 display.textContent='GitHub 공개 API 읽기 전용 검사 요청 중 (코드 실행·쓰기 없음)...';
 try{
  const {auditPublicGitHubReactRepo,comparePublicGitHubAudits}=await import('./github-readonly-intake.mjs');
  const result=await auditPublicGitHubReactRepo({
   repository:el('github-repo').value,ref:el('github-ref').value,
   consent:el('github-public-consent').checked
  });
  // Only compare two snapshots of the same repository; no further API calls.
  const comparison=previous?.root.toLowerCase()===result.root.toLowerCase()
   ?comparePublicGitHubAudits(previous,result):null;
  latestGithubAudit=result;latestGithubComparison=comparison;
  display.textContent='PUBLIC READ-ONLY PASS · '+result.root+'\nCommit '+result.sourceGitSha+
   '\nSHA256 '+result.sha256+'\n'+result.fileCount+'/'+result.sourceFilesEligible+
   '개 허용 소스 표본 · API '+result.indicators.api+' · 라우트 '+result.indicators.route+
   ' · 인증 '+result.indicators.auth+' · 이벤트 '+result.indicators.events+
   '\n외부 GET '+result.remoteRequests+'회 · 원본 변경 0 · PR 0\n'+result.warning;
  if(comparison){
   display.textContent+='\n\n이전 조회 대비 해시 변경 '+comparison.changed+'건 · 보존 파일 '+comparison.unchanged+
    '건 · 인증/API 검토 대상 '+comparison.protectedFlowChanges+'건'+
    '\n'+(comparison.sampleIncomplete?'표본 일부만 비교: 전체 diff 아님':'허용된 표본 해시만 비교: 실행/동작 검증 아님')+
    '\nPR/자동 적용 불가 · 검토 JSON을 다운로드해 변경 파일을 확인하세요.';
   el('export-github-diff').disabled=false;
   el('github-compare-run').disabled=false;
  }else if(previous){
   display.textContent+='\n서로 다른 저장소를 조회했습니다. 이전 결과와 비교하지 않습니다.';
  }else{
   display.textContent+='\n같은 저장소를 다른 ref로 다시 조회하면 표본 해시 변경을 비교합니다.';
  }
  el('export-github-audit').disabled=false;
 }catch(err){
  display.textContent='PUBLIC READ-ONLY FAIL: '+(err?.message||'UNKNOWN')+
   '\n이전 성공 결과는 보존됩니다. 새 결과는 적용하지 않았고 원본 수정·PR도 수행하지 않았습니다.';
  el('export-github-audit').disabled=!latestGithubAudit;
 }finally{button.disabled=false;el('github-public-consent').checked=false;}
});
el('export-github-audit').addEventListener('click',()=>{
 if(!latestGithubAudit)return;
 save('FFAX-github-readonly-audit.json',JSON.stringify(latestGithubAudit,null,2),'application/json');
});
el('export-github-diff').addEventListener('click',()=>{
 if(!latestGithubComparison)return;
 save('FFAX-public-github-commit-comparison.json',JSON.stringify(latestGithubComparison,null,2),'application/json');
});

// This is a separate external GET after explicit consent, never an automatic follow-up.
el('github-compare-run').addEventListener('click',async()=>{
 const btn=el('github-compare-run'),status=el('github-compare-status');
 const consent=el('github-compare-consent');
 if(!latestGithubComparison){
  status.textContent='커밋 두 개가 동일 공개 저장소에서 성공적으로 조회되어야 합니다.';return;
 }
 btn.disabled=true;el('export-github-compare').disabled=true;
 latestGithubCommitReview=null;
 status.textContent='공개 GitHub 변경 파일 메타데이터를 한 번 읽는 중입니다. 원본 변경 없음.';
 try{
  const {reviewPublicGitHubCommitChanges}=await import('./github-compare-review.mjs');
  const result=await reviewPublicGitHubCommitChanges({
   sampleComparison:latestGithubComparison,consent:consent.checked
  });
  latestGithubCommitReview=result;
  const risk=result.files.filter(f=>f.risk!=='MANUAL_CODE_REVIEW').slice(0,8)
   .map(f=>f.risk+' · '+f.path).join('\n');
  status.textContent='READ-ONLY COMMIT REVIEW PASS · '+result.repository+
   '\n'+result.baseCommit.slice(0,12)+' → '+result.headCommit.slice(0,12)+
   ' · '+result.relationship+
   '\n파일 '+result.changedFilesListed+'건 · 인증/API/설정 주의 '+result.protectedCount+
   '건 · 민감 파일 경로 '+result.restrictedCount+'건'+
   '\n추가 공개 GET '+result.externalRequests+'회 · 코드 패치 비포함 · Git 쓰기/PR 0건'+
   '\n'+result.warning+(risk?'\n검토 우선 경로 (최대 8건):\n'+risk:'');
  el('export-github-compare').disabled=false;
 }catch(err){
  status.textContent='READ-ONLY COMMIT REVIEW FAIL: '+(err?.message||'UNKNOWN')+
   '\n검증되지 않은 결과는 저장/적용할 수 없습니다. 원본 수정 0건.';
 }finally{
  btn.disabled=!latestGithubComparison;
  consent.checked=false;
 }
});
el('export-github-compare').addEventListener('click',()=>{
 if(!latestGithubCommitReview)return;
 save('FFAX-public-commit-file-review.json',JSON.stringify(latestGithubCommitReview,null,2),'application/json');
});

el('analyze').addEventListener('click',()=>{try{brief=buildBrief(promptEl.value);history=new DocumentHistory(newDocument(brief,'A'));selected=history.present.components[0]?.id;updateAll();}catch(e){log(e.message,true);}});
el('component-select').addEventListener('change',e=>{selected=e.target.value;updateAll(false);});
for(const [id,prop,transform] of [['component-text','text',v=>v],['component-type','type',v=>v],['component-color','color',v=>v],['component-spacing','spacing',Number],['component-align','align',v=>v]])el(id).addEventListener('change',e=>edit(prop,transform(e.target.value)));
el('theme-select').addEventListener('change',e=>run({kind:'theme',value:e.target.value}));
el('move-up').addEventListener('click',()=>{const i=history.present.components.findIndex(c=>c.id===selected);if(i>0)run({kind:'move',id:selected,index:i-1});});
el('move-down').addEventListener('click',()=>{const i=history.present.components.findIndex(c=>c.id===selected);if(i>=0&&i<history.present.components.length-1)run({kind:'move',id:selected,index:i+1});});
el('undo').addEventListener('click',()=>{history.undo();updateAll();});el('redo').addEventListener('click',()=>{history.redo();updateAll();});
el('add-component').addEventListener('click',()=>{
  const type=el('insert-component-type').value,before=history.present.components.length;
  run({kind:'insert',type});
  if(history.present.components.length===before+1){
    selected=history.present.components.at(-1)?.id||null;
    updateAll();
    el('insert-component-status').textContent=REGISTRY[type].label+' 추가됨 · '+history.present.components.length+'/80 · Undo로 복구 가능';
  }else{
    el('insert-component-status').textContent='추가되지 않았습니다. 최대 80개 또는 타입 검증 오류를 확인하세요.';
  }
});
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

// Device-local checkpoint is never auto-written or auto-restored. The browser stores
// plaintext only after explicit informed consent. Loading does not fetch or execute code.
el('device-checkpoint-save').addEventListener('click',async()=>{
 const status=el('device-checkpoint-status'),check=el('device-checkpoint-consent');
 if(!check.checked){status.textContent='저장 거부: 암호화되지 않은 기기 저장에 대한 명시적 동의가 필요합니다.';return;}
 try{
  const {saveDeviceCheckpoint}=await import('./device-checkpoint.mjs');
  const result=await saveDeviceCheckpoint(history.present,{
   storage:window.localStorage,consent:'APPROVE_PLAINTEXT_DEVICE_SAVE'
  });
  status.textContent='기기 복구점 저장 완료 · '+new Date(result.savedAt).toLocaleString('ko-KR')+
   ' · SHA256 '+result.sha256.slice(0,16)+'… · 평문/이 브라우저 전용 · 외부 전송 없음';
 }catch(err){status.textContent='기기 저장 실패: '+(err?.message||'UNKNOWN')+' · 현재 작업 유지';}
 finally{check.checked=false;}
});
el('device-checkpoint-restore').addEventListener('click',async()=>{
 const status=el('device-checkpoint-status');
 if(!window.confirm('이 기기에 저장된 프로젝트를 현재 편집 화면으로 복구하시겠습니까?\n현재 화면은 Undo로 다시 가져올 수 있습니다.')) {
  status.textContent='복구 취소 · 기존 편집 화면 유지';return;
 }
 try{
  const {loadDeviceCheckpoint}=await import('./device-checkpoint.mjs');
  const result=await loadDeviceCheckpoint({storage:window.localStorage,approval:'APPROVE_RESTORE_DEVICE_CHECKPOINT'});
  const previous=history.present;
  history.past.push(previous);if(history.past.length>history.max)history.past.shift();
  history.present=result.document;history.future=[];
  brief=result.document.brief;
  promptEl.value=brief.raw?.startsWith('[')?DEFAULT_PROMPT:brief.raw;
  selected=result.document.components[0]?.id||null;
  updateAll();
  status.textContent='복구 완료 · '+new Date(result.savedAt).toLocaleString('ko-KR')+
   ' · SHA256 확인 PASS · Undo로 이전 화면 복원 가능 · 외부 전송 없음';
 }catch(err){status.textContent='복구 거부: '+(err?.message||'UNKNOWN')+' · 기존 편집 화면 유지';}
});
el('device-checkpoint-delete').addEventListener('click',async()=>{
 const status=el('device-checkpoint-status');
 if(!window.confirm('이 브라우저의 FFAX 작업 복구점을 삭제하시겠습니까?\n현재 편집 화면은 지워지지 않습니다.')) {
  status.textContent='기기 복구점 삭제 취소';return;
 }
 try{
  const {deleteDeviceCheckpoint}=await import('./device-checkpoint.mjs');
  deleteDeviceCheckpoint({storage:window.localStorage,approval:'APPROVE_DELETE_DEVICE_CHECKPOINT'});
  status.textContent='이 브라우저의 FFAX 복구점만 삭제했습니다. 현재 편집 화면 유지';
 }catch(err){status.textContent='기기 복구점 삭제 실패: '+(err?.message||'UNKNOWN');}
});

for(const type of COMPONENT_TYPES){const o=document.createElement('option');o.value=type;o.textContent=REGISTRY[type].label;el('component-type').append(o);}
for(const type of COMPONENT_TYPES){const o=document.createElement('option');o.value=type;o.textContent=REGISTRY[type].label;el('insert-component-type').append(o);}
el('insert-component-type').value='Card';
for(const [key,t] of Object.entries(THEME_OPTIONS)){const o=document.createElement('option');o.value=key;o.textContent=t.label;el('theme-select').append(o);}
updateAll();
