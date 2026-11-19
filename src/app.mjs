import { DEFAULT_PROMPT,THEME_OPTIONS,REGISTRY,COMPONENT_TYPES,buildBrief,newDocument,DocumentHistory,assertDocument,renderMarkup,exportReact,createReference,approveReference,makeManualAIPrompt,parseModelDesign,exportLocalProject,importLocalProject,validateProjectImport } from './core.mjs';
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
  el('source-preview').textContent=exportReact(doc).slice(0,3200)+'\n// […]';
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
let latestReferenceInventory=null,latestFidelityScene=null,latestTypographyDraft=null,latestAssetManifest=null;
let latestV3ReferenceReceipt=null,latestV3CaptureUrl=null ,latestV3CaptureBlob=null,latestV3CaptureReceipt=null,latestV3ScoreResult=null;
let latestFidelityPatchRollback=null;
let latestV3OwnerReview=null,latestV3ReviewImageUrl=null;
// Epochs invalidate in-flight image decode, capture and score after owner changes.
let referenceEpoch=0,visualEvidenceEpoch=0;
const stillCurrentReference=(epoch,file)=>referenceEpoch===epoch&&
 el('reference-file').files?.[0]===file&&el('rights').checked;
window.addEventListener('ffax:v3-reference-receipt',event=>{
 const receipt=event.detail;
 if(receipt?.schema==='ffax.reference-bundle.v3'&&
    el('rights').checked&&latestReferenceInventory&&
    receipt.referenceSha256===latestReferenceInventory.sha256&&
    el('reference-file').files?.[0]){
  clearV3VisualEvidence('새 원본 권리·DPR 영수증 확인');
  latestV3ReferenceReceipt=receipt;
  el('fidelity-capture-status').textContent='로컬 원본 영수증 연결됨. 분석된 이미지 SHA와 같을 때만 실제 캡처 실행 가능.';
 }
});

function clearV3VisualEvidence(reason){
 visualEvidenceEpoch++;
 latestV3ScoreResult=null;latestV3OwnerReview=null;
 latestV3CaptureBlob=null;latestV3CaptureReceipt=null;latestFidelityPatchRollback=null;
 for(const id of ['fidelity-score-export','fidelity-review-export','fidelity-review-accept',
 'fidelity-review-reject','fidelity-patch-undo'])el(id).disabled=true;
 const regions=el('fidelity-patch-region');regions.replaceChildren();regions.disabled=true;
 for(const id of ['fidelity-capture-image','fidelity-v3-source-view','fidelity-v3-render-view'])el(id).removeAttribute('src');
 if(latestV3CaptureUrl){URL.revokeObjectURL(latestV3CaptureUrl);latestV3CaptureUrl=null;}
 if(latestV3ReviewImageUrl){URL.revokeObjectURL(latestV3ReviewImageUrl);latestV3ReviewImageUrl=null;}
 el('fidelity-review-status').textContent=reason+' · 이전 수락 영수증 무효, 재비교 필요';
 el('fidelity-score-status').textContent='F95=UNASSESSED · 원본/후보 변경으로 이전 비교 무효';
}
function invalidateReferenceSelection(reason){
 referenceEpoch++;
 clearV3VisualEvidence(reason);
 latestReferenceInventory=null;latestFidelityScene=null;latestTypographyDraft=null;latestAssetManifest=null;
 latestV3ReferenceReceipt=null;
 for(const id of ['fidelity-region-apply','export-fidelity-scene','fidelity-text-export',
 'fidelity-asset-export','export-reference-inventory','reference-owner-map'])el(id).disabled=true;
 el('fidelity-region-select').replaceChildren();el('fidelity-region-select').disabled=true;
 el('fidelity-capture-status').textContent='새 기준 이미지 분석·권리 확인·로컬 원본 영수증이 필요합니다.';
}
el('reference-file').addEventListener('change',()=>invalidateReferenceSelection('기준 이미지 파일 변경'));
el('rights').addEventListener('change',()=>{
 if(!el('rights').checked)invalidateReferenceSelection('원본 사용 권한 확인 철회');
});

function updateReference(){
 const file=el('reference-file').files?.[0];
 if(!file){el('reference-result').textContent='이미지 파일을 선택하세요.';return;}
 if(!el('rights').checked){el('reference-result').textContent='사용 권한 확인이 필요합니다.';return;}
 (async()=>{
  const epoch=++referenceEpoch;
  el('export-reference-inventory').disabled=true;el('export-fidelity-scene').disabled=true;latestReferenceInventory=null;latestFidelityScene=null;el('fidelity-region-apply').disabled=true;latestTypographyDraft=null;latestAssetManifest=null;el('fidelity-text-export').disabled=true;latestV3CaptureBlob=null;latestV3CaptureReceipt=null;clearV3VisualEvidence('이미지 재분석');el('fidelity-asset-export').disabled=true;
  try{
   const {analyzeUserReference}=await import('./reference-analysis.mjs');
   const inventory=await analyzeUserReference(file,{rightsConfirmed:true});
   if(!stillCurrentReference(epoch,file))return;
   const {buildFidelityScene}=await import('./fidelity-scene.mjs');
   const scene=buildFidelityScene(inventory);
   const {createTypographyDraft}=await import('./fidelity-typography.mjs');
   const {createFidelityAssetManifest}=await import('./fidelity-assets.mjs');
   if(!stillCurrentReference(epoch,file))return;
   latestTypographyDraft=createTypographyDraft(scene);
   latestAssetManifest=createFidelityAssetManifest(inventory.sha256);
   latestFidelityScene=scene;
   const selector=el('fidelity-region-select');selector.replaceChildren();
   for(const region of scene.regions.filter(x=>x.id!=='canvas')){
    const option=document.createElement('option');option.value=region.id;
    option.textContent=region.id+' ('+region.bounds.x+','+region.bounds.y+')';
    selector.append(option);
   }
   selector.disabled=false;el('fidelity-region-apply').disabled=false;
   el('export-fidelity-scene').disabled=false;
   el('fidelity-region-status').textContent='관측된 영역 '+(scene.regions.length-1)+'개. 수동 정정·내보내기 가능, React 복원은 미검증.';
   const colors=[inventory.paletteHints[0],inventory.paletteHints[2]];
   const next=createReference(history.present,file.name,true,colors,'user-provided',{sha256:inventory.sha256,width:inventory.width,height:inventory.height});
   history.past.push(history.present);history.present=next;history.future=[];latestReferenceInventory=inventory;
   el('export-reference-inventory').disabled=false;
   el('reference-owner-map').disabled=false;
   el('reference-result').textContent=file.name+': '+inventory.width+'×'+inventory.height+' · SHA256 '+inventory.sha256.slice(0,16)+'… · 색상 힌트 '+colors.join('/')+' · 추정 영역 '+inventory.fidelityGeometry.regions.length+'개(위치·색만; OCR/폰트·자산 미복원)';
   updateAll();
  }catch(err){if(stillCurrentReference(epoch,file))
   el('reference-result').textContent='참고 이미지 분석 실패: '+err.message;}
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
el('export-reference-inventory').addEventListener('click',()=>{if(latestReferenceInventory)save('FFAX-external-reference-inventory.json',JSON.stringify(latestReferenceInventory,null,2),'application/json');});

el('export-fidelity-scene').addEventListener('click',()=>{
 if(latestFidelityScene)save('FFAX-Fidelity-Scene.json',JSON.stringify(latestFidelityScene,null,2),'application/json');
});
el('fidelity-region-apply').addEventListener('click',async()=>{
 const status=el('fidelity-region-status');
 try{
  if(!latestFidelityScene)throw Error('FIDELITY_SCENE_NOT_READY');
  if(!el('fidelity-region-consent').checked)throw Error('FIDELITY_REGION_OWNER_APPROVAL_REQUIRED');
  const raw=el('fidelity-region-bounds').value.trim().split(',').map(s=>Number(s.trim()));
  if(raw.length!==4||raw.some(n=>!Number.isInteger(n)))throw Error('FIDELITY_REGION_BOUNDS_INVALID');
  const {reviseFidelityRegion}=await import('./fidelity-scene.mjs');
  latestFidelityScene=reviseFidelityRegion(latestFidelityScene,{
   regionId:el('fidelity-region-select').value,role:el('fidelity-region-role').value,
   bounds:{x:raw[0],y:raw[1],width:raw[2],height:raw[3]},
   approval:'APPROVE_LOCAL_FIDELITY_REGION_EDIT'});
  const {createTypographyDraft}=await import('./fidelity-typography.mjs');
  latestTypographyDraft=createTypographyDraft(latestFidelityScene);
  clearV3VisualEvidence('이미지 영역 수동 정정');
  el('fidelity-text-export').disabled=true;
  el('fidelity-text-status').textContent='영역 좌표 변경으로 이전 텍스트 후보를 초기화했습니다. 다시 입력해야 합니다.';
  status.textContent='영역 정정 저장됨 · revision '+latestFidelityScene.revision+' · 원본 SHA 보존 · 실제 렌더 일치 미검증';
 }catch(e){status.textContent='영역 정정 거부: '+e.message;}
 finally{el('fidelity-region-consent').checked=false;}
});



el('fidelity-text-add').addEventListener('click',async()=>{
 const status=el('fidelity-text-status');
 try{
  if(!latestFidelityScene||!latestTypographyDraft)throw Error('FIDELITY_TEXT_SCENE_REQUIRED');
  if(!el('fidelity-text-consent').checked)throw Error('FIDELITY_TEXT_OWNER_APPROVAL_REQUIRED');
  const raw=el('fidelity-text-bounds').value.split(',').map(s=>Number(s.trim()));
  if(raw.length!==4||raw.some(n=>!Number.isInteger(n)))throw Error('FIDELITY_TEXT_BOUNDS_INVALID');
  const {addOwnerTextBox}=await import('./fidelity-typography.mjs');
  latestTypographyDraft=addOwnerTextBox(latestTypographyDraft,latestFidelityScene,{
   regionId:el('fidelity-region-select').value,text:el('fidelity-text-content').value,
   bounds:{x:raw[0],y:raw[1],width:raw[2],height:raw[3]},
   approval:'APPROVE_FIDELITY_LOCAL_TEXT_LABEL'});
  clearV3VisualEvidence('텍스트 내용·좌표 정정');
  el('fidelity-text-export').disabled=false;
  status.textContent='직접 확인한 텍스트 '+latestTypographyDraft.textBoxes.length+
   '개 기록됨 · OCR/폰트 자동 인식은 미실행, 원본 불변';
 }catch(e){status.textContent='텍스트 위치 거부: '+e.message;}
 finally{el('fidelity-text-consent').checked=false;}
});
el('fidelity-text-export').addEventListener('click',()=>{
 if(latestTypographyDraft?.textBoxes.length)save('FFAX-V3-Text-Boxes.json',
  JSON.stringify(latestTypographyDraft,null,2),'application/json');
});
el('fidelity-asset-add').addEventListener('click',async()=>{
 const status=el('fidelity-asset-status'),button=el('fidelity-asset-add');
 try{
  if(!latestAssetManifest)throw Error('FIDELITY_ASSET_REFERENCE_REQUIRED');
  if(!el('fidelity-asset-consent').checked)throw Error('FIDELITY_ASSET_OWNER_APPROVAL_REQUIRED');
  const file=el('fidelity-asset-file').files?.[0];
  const {addFidelityAssetFile}=await import('./fidelity-assets.mjs');
  button.disabled=true;
  latestAssetManifest=await addFidelityAssetFile(latestAssetManifest,file,{
   kind:el('fidelity-asset-role').value,approval:'APPROVE_LOCAL_FIDELITY_ASSET'});
  clearV3VisualEvidence('참조 로컬 자산 목록 변경');
  el('fidelity-asset-export').disabled=false;
  status.textContent='로컬 자산 SHA 기록 '+latestAssetManifest.assets.length+
   '개 · 원본 파일 bytes 미저장, 최종 사용권·React 자산 연결 미검증';
 }catch(e){status.textContent='자산 기록 거부: '+e.message;}
 finally{button.disabled=false;el('fidelity-asset-consent').checked=false;}
});
el('fidelity-asset-export').addEventListener('click',async()=>{
 const status=el('fidelity-asset-status');
 try{
  if(!latestAssetManifest)throw Error('FIDELITY_ASSET_REFERENCE_REQUIRED');
  const requiredKinds=el('fidelity-asset-required').value.split(',').map(s=>s.trim()).filter(Boolean);
  const {gateFidelityAssets}=await import('./fidelity-assets.mjs');
  latestAssetManifest=gateFidelityAssets(latestAssetManifest,{
   requiredKinds,approval:'APPROVE_FIDELITY_ASSET_REQUIREMENTS'});
  clearV3VisualEvidence('필수 자산 요구조건 변경');
  save('FFAX-V3-Asset-Manifest.json',JSON.stringify(latestAssetManifest,null,2),'application/json');
  status.textContent='자산 점검: '+latestAssetManifest.state+
   ' · 누락 '+latestAssetManifest.missingKinds.join(',')+' · 공개/렌더링 승인 아님';
 }catch(e){status.textContent='자산 요구조건 거부: '+e.message;}
});


el('fidelity-render-create').addEventListener('click',async()=>{
 const status=el('fidelity-render-status'),button=el('fidelity-render-create');
 try{
  if(!latestFidelityScene)throw Error('FIDELITY_RENDER_SCENE_REQUIRED');
  if(!el('fidelity-render-consent').checked)throw Error('FIDELITY_RENDER_OWNER_APPROVAL_REQUIRED');
  const {createFidelityArtifacts}=await import('./fidelity-renderer.mjs');
  button.disabled=true;
  const renderDpr=latestV3ReferenceReceipt?.referenceSha256===latestFidelityScene.sourceSha256
   ?latestV3ReferenceReceipt.viewport?.dpr:1;
  const result=createFidelityArtifacts(latestFidelityScene,{
   typography:latestTypographyDraft,assets:latestAssetManifest,dpr:renderDpr,
   approval:'APPROVE_FIDELITY_SCENE_SOURCE_EXPORT'});
  save('FidelityScene.tsx',result.tsx,'text/plain');
  save('FidelityScene.css',result.css,'text/css');
  save('FidelityScene-evidence.json',JSON.stringify({
   schema:result.schema,sourceSha256:result.sourceSha256,sceneRevision:result.sceneRevision,
   dpr:result.dpr,pixelWidth:result.pixelWidth,pixelHeight:result.pixelHeight,
   cssWidth:result.cssWidth,cssHeight:result.cssHeight,
   regionCount:result.regionCount,textBoxCount:result.textBoxCount,status:result.status,
   warnings:result.warnings,canPublish:false,originalSourceModified:false
  },null,2),'application/json');
  const frame=el('fidelity-render-preview');
  frame.srcdoc=result.html;
  status.textContent='실제 계층 구조 '+result.regionCount+'개 → React TSX/CSS 생성 · 원본 '+result.pixelWidth+'×'+result.pixelHeight+'픽셀 / CSS '+result.cssWidth+'×'+result.cssHeight+' DPR '+result.dpr+'. 실제 앱 데이터·폰트·자산·반응형·95점 일치는 별도 검증.';
 }catch(e){status.textContent='React 후보 생성 거부: '+(e?.message||'FIDELITY_RENDER_FAILED');}
 finally{button.disabled=false;el('fidelity-render-consent').checked=false;}
});


el('fidelity-capture-run').addEventListener('click',async()=>{
 const status=el('fidelity-capture-status'),button=el('fidelity-capture-run');
 try{
  if(!el('fidelity-capture-consent').checked)throw Error('FORGE_V3_CAPTURE_OWNER_APPROVAL_REQUIRED');
  if(!latestReferenceInventory||!latestFidelityScene||!latestV3ReferenceReceipt||
     latestReferenceInventory.sha256!==latestV3ReferenceReceipt.referenceSha256||
     latestFidelityScene.sourceSha256!==latestV3ReferenceReceipt.referenceSha256)
   throw Error('FORGE_V3_CAPTURE_REFERENCE_MISMATCH');
  const {postForgeReview,getForgeSessionToken}=await import('./design-forge-ui.mjs');
  button.disabled=true;
  clearV3VisualEvidence('새 Chromium 캡처 시작');
  status.textContent='Chromium 새 캡처 실행 중 · 이전 완료 화면과 시각 승인은 무효';
  const result=await postForgeReview('v3-capture',{
   scene:latestFidelityScene,typography:latestTypographyDraft,assets:latestAssetManifest,
   referenceReceipt:latestV3ReferenceReceipt,approval:'APPROVE_FIDELITY_LOCAL_CAPTURE'});
  if(result.schema!=='ffax.v3.capture-result.v1'||result.referenceSha256!==latestFidelityScene.sourceSha256)
   throw Error('FORGE_V3_CAPTURE_RESULT_INVALID');
  const token=await getForgeSessionToken();
  const png=await fetch(result.download,{headers:{'x-ffax-csrf':token},
   cache:'no-store',credentials:'omit',redirect:'error'});
  if(!png.ok||png.headers.get('content-type')!=='image/png')
   throw Error('FORGE_V3_CAPTURE_PNG_UNAVAILABLE');
  const blob=await png.blob();
  if(blob.size<33||blob.size>6*1024*1024)throw Error('FORGE_V3_CAPTURE_PNG_INVALID');
  const image=el('fidelity-capture-image');
  if(latestV3CaptureUrl)URL.revokeObjectURL(latestV3CaptureUrl);
  latestV3CaptureUrl=URL.createObjectURL(blob);
  latestV3CaptureBlob=blob;latestV3CaptureReceipt=result.receipt;
  latestV3ScoreResult=null;el('fidelity-score-export').disabled=true;
  image.src=latestV3CaptureUrl;
  save('FFAX-V3-Chromium-Capture-Receipt.json',JSON.stringify(result.receipt,null,2),'application/json');
  status.textContent='Chromium 실제 정지 캡처 완료 · '+result.receipt.width+'×'+result.receipt.height+
   ' DPR '+result.receipt.dpr+' · SHA '+result.receipt.sha256.slice(0,16)+
   '… · 기능/실원본 시각 95점 검증 및 폰트/자산 재현은 미완';
 }catch(e){status.textContent='실캡처 거부/실패: '+(e?.message||'FORGE_V3_CAPTURE_FAILED');}
 finally{button.disabled=false;el('fidelity-capture-consent').checked=false;}
});


el('fidelity-score-run').addEventListener('click',async()=>{
 const status=el('fidelity-score-status'),button=el('fidelity-score-run');
 let source,render;
 try{
  if(!el('fidelity-score-consent').checked)throw Error('FIDELITY_SCORE_OWNER_CONSENT_REQUIRED');
  const file=el('reference-file').files?.[0];
  if(!file||!latestReferenceInventory||!latestFidelityScene||
    !latestV3CaptureBlob||!latestV3CaptureReceipt)
   throw Error('FIDELITY_SCORE_SOURCE_OR_CAPTURE_MISSING');
  button.disabled=true;
  const hashed=async(blob)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))]
   .map(x=>x.toString(16).padStart(2,'0')).join('');
  const [referenceSha256,renderSha256]=await Promise.all([hashed(file),hashed(latestV3CaptureBlob)]);
  if(referenceSha256!==latestReferenceInventory.sha256||
     renderSha256!==latestV3CaptureReceipt.sha256||
     latestV3CaptureReceipt.referenceSha256!==referenceSha256||
     latestV3ReferenceReceipt?.referenceSha256!==referenceSha256||
     latestV3CaptureReceipt.dpr!==latestV3ReferenceReceipt.viewport?.dpr)
   throw Error('FIDELITY_SCORE_SOURCE_SHA_CHANGED');
  source=await createImageBitmap(file);render=await createImageBitmap(latestV3CaptureBlob);
  const pixels=bitmap=>{
   const c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;
   const ctx=c.getContext('2d',{willReadFrequently:true});
   if(!ctx)throw Error('FIDELITY_SCORE_CANVAS_UNAVAILABLE');
   ctx.drawImage(bitmap,0,0);return ctx.getImageData(0,0,c.width,c.height);
  };
  const {measureV3RegionDiagnostics}=await import('./fidelity-score.mjs');
  latestV3ScoreResult=measureV3RegionDiagnostics({
   reference:pixels(source),render:pixels(render),scene:latestFidelityScene,
   typography:latestTypographyDraft,assets:latestAssetManifest,
   referenceSha256,renderSha256,
   viewport:{width:source.width,height:source.height,
    dpr:latestV3CaptureReceipt.dpr}});
  el('fidelity-score-export').disabled=false;
  if(latestV3ReviewImageUrl)URL.revokeObjectURL(latestV3ReviewImageUrl);
  latestV3ReviewImageUrl=URL.createObjectURL(file);
  el('fidelity-v3-source-view').src=latestV3ReviewImageUrl;
  el('fidelity-v3-render-view').src=latestV3CaptureUrl;
  el('fidelity-review-accept').disabled=false;
  el('fidelity-review-reject').disabled=false;
  latestV3OwnerReview=null;el('fidelity-review-export').disabled=true;
  const sel=el('fidelity-patch-region');sel.replaceChildren();
  for(const issue of latestV3ScoreResult.criticalIssues){
   const o=document.createElement('option');o.value=issue.regionId;
   o.textContent=issue.regionId+' · RGB '+issue.rgbError;sel.append(o);
  }
  sel.disabled=sel.options.length===0;
  status.textContent='영역 '+latestV3ScoreResult.regions.length+
   '개 · 색상 진단 '+latestV3ScoreResult.axes.colors.diagnosticScore+
   '/100 · 기하 경계 진단 '+latestV3ScoreResult.axes.geometry.diagnosticScore+
   '/100. 최종 F95=UNASSESSED (글꼴·자산·사용자 수락·실기기 미검증).';
 }catch(e){latestV3ScoreResult=null;el('fidelity-score-export').disabled=true;
  status.textContent='영역별 비교 거부/실패: '+(e?.message||'FIDELITY_SCORE_FAILED');}
 finally{source?.close();render?.close();button.disabled=false;
  el('fidelity-score-consent').checked=false;}
});
el('fidelity-score-export').addEventListener('click',()=>{
 if(latestV3ScoreResult)save('FFAX-V3-Region-Diagnostic.json',
  JSON.stringify(latestV3ScoreResult,null,2),'application/json');
});


el('fidelity-patch-apply').addEventListener('click',async()=>{
 const status=el('fidelity-patch-status');
 try{
  if(!el('fidelity-patch-consent').checked)throw Error('FIDELITY_PATCH_APPROVAL_REQUIRED');
  if(!latestFidelityScene||!latestV3ScoreResult)throw Error('FIDELITY_PATCH_DIAGNOSTIC_REQUIRED');
  const {applyFidelityPatch}=await import('./fidelity-patch.mjs');
  const result=applyFidelityPatch(latestFidelityScene,latestTypographyDraft,latestAssetManifest,
   latestV3ScoreResult,{regionId:el('fidelity-patch-region').value,
    property:el('fidelity-patch-property').value,value:el('fidelity-patch-value').value,
    textId:el('fidelity-patch-text-id').value,approval:'APPROVE_LOCAL_V3_TYPED_PATCH'});
  latestFidelityPatchRollback={scene:result.rollbackScene,typography:result.rollbackTypography};
  latestFidelityScene=result.candidateScene;latestTypographyDraft=result.candidateTypography;
  clearV3VisualEvidence('후보 보정 적용');
  // Keep the validated single-step undo receipt for this specific edit.
  latestFidelityPatchRollback={scene:result.rollbackScene,typography:result.rollbackTypography};
  el('fidelity-patch-undo').disabled=false;
  status.textContent='격리 후보만 수정. 원본 SHA 불변 · 새 브라우저 캡처 필요';
 }catch(e){status.textContent='후보 수정 거부: '+(e?.message||'FIDELITY_PATCH_FAILED');}
 finally{el('fidelity-patch-consent').checked=false;}
});
el('fidelity-patch-undo').addEventListener('click',()=>{
 if(!latestFidelityPatchRollback)return;
 latestFidelityScene=latestFidelityPatchRollback.scene;
 latestTypographyDraft=latestFidelityPatchRollback.typography;
 latestFidelityPatchRollback=null;el('fidelity-patch-undo').disabled=true;
 clearV3VisualEvidence('후보 수정 취소');
 el('fidelity-patch-status').textContent='로컬 Scene 직전 수정 되돌림. 캡처/진단 재실행 필요';
});


for(const [buttonId,decision] of [
 ['fidelity-review-accept','ACCEPT_VISUAL_CANDIDATE'],
 ['fidelity-review-reject','REJECT_VISUAL_CANDIDATE']]){
 el(buttonId).addEventListener('click',async()=>{
  const status=el('fidelity-review-status');
  try{
   if(!el('fidelity-review-consent').checked)throw Error('FIDELITY_REVIEW_OWNER_APPROVAL_REQUIRED');
   if(!latestV3ScoreResult||!latestV3ReferenceReceipt||!latestV3CaptureReceipt)
    throw Error('FIDELITY_REVIEW_EVIDENCE_REQUIRED');
   const {createV3OwnerVisualReview}=await import('./fidelity-review.mjs');
   latestV3OwnerReview=createV3OwnerVisualReview(latestV3ScoreResult,
    latestV3ReferenceReceipt,latestV3CaptureReceipt,
    {decision,approval:'APPROVE_V3_CANDIDATE_VISUAL_REVIEW'});
   el('fidelity-review-export').disabled=false;
   status.textContent=latestV3OwnerReview.status+
    ' · F95=UNASSESSED / 기능·독립 감사 미검증 / 원본 파일 미변경';
  }catch(e){status.textContent='시각 수락 거부: '+e.message;}
  finally{el('fidelity-review-consent').checked=false;}
 });
}
el('fidelity-review-export').addEventListener('click',()=>{
 if(latestV3OwnerReview)save('FFAX-V3-Owner-Visual-Review.json',
  JSON.stringify(latestV3OwnerReview,null,2),'application/json');
});
el('fidelity-snapshot-save').addEventListener('click',async()=>{
 const status=el('fidelity-snapshot-status');
 try{
  if(!latestFidelityScene||!latestReferenceInventory)throw Error('FIDELITY_SNAPSHOT_SCENE_REQUIRED');
  if(!el('fidelity-snapshot-consent').checked)throw Error('FIDELITY_SNAPSHOT_OWNER_APPROVAL_REQUIRED');
  const {createV3LocalWorkSnapshot}=await import('./fidelity-review.mjs');
  const snapshot=createV3LocalWorkSnapshot(latestFidelityScene,latestTypographyDraft,
   latestAssetManifest,{referenceSha256:latestReferenceInventory.sha256,
    approval:'APPROVE_LOCAL_V3_SNAPSHOT_EXPORT'});
  save('FFAX-V3-Local-Work-Snapshot.json',JSON.stringify(snapshot,null,2),'application/json');
  status.textContent='로컬 작업 구조 저장 완료 · 원본 이미지/폰트 바이트는 포함되지 않습니다.';
 }catch(e){status.textContent='작업 저장 거부: '+e.message;}
 finally{el('fidelity-snapshot-consent').checked=false;}
});
el('fidelity-snapshot-restore').addEventListener('click',async()=>{
 const status=el('fidelity-snapshot-status');
 try{
  if(!latestReferenceInventory)throw Error('FIDELITY_RESTORE_REFERENCE_REQUIRED');
  if(!el('fidelity-restore-consent').checked)throw Error('FIDELITY_RESTORE_OWNER_APPROVAL_REQUIRED');
  const file=el('fidelity-snapshot-file').files?.[0];
  if(!file||file.size<60||file.size>200000||!file.name.endsWith('.json'))
   throw Error('FIDELITY_RESTORE_FILE_INVALID');
  const {restoreV3LocalWorkSnapshot}=await import('./fidelity-review.mjs');
  const restored=restoreV3LocalWorkSnapshot(await file.text(),{
   referenceSha256:latestReferenceInventory.sha256,
   referenceWidth:latestReferenceInventory.width,
   referenceHeight:latestReferenceInventory.height,
   approval:'APPROVE_LOCAL_V3_SNAPSHOT_RESTORE'});
  latestFidelityScene=restored.scene;latestTypographyDraft=restored.typography;
  latestAssetManifest=restored.assets;
  clearV3VisualEvidence('로컬 Scene 스냅샷 복구');
  const sel=el('fidelity-region-select');sel.replaceChildren();
  for(const region of latestFidelityScene.regions.filter(x=>x.id!=='canvas')){
   const option=document.createElement('option');option.value=region.id;option.textContent=region.id;
   sel.append(option);
  }
  sel.disabled=false;el('export-fidelity-scene').disabled=false;
  el('fidelity-text-export').disabled=!latestTypographyDraft?.textBoxes?.length;
  el('fidelity-asset-export').disabled=!latestAssetManifest?.assets?.length;
  status.textContent='SHA가 일치하는 로컬 구조 복구 완료 · 재캡처/권리·자산 재확인 필수';
 }catch(e){status.textContent='로컬 작업 복원 거부: '+e.message;}
 finally{el('fidelity-restore-consent').checked=false;
  el('fidelity-snapshot-file').value='';}
});

el('reference-owner-map').addEventListener('click',async()=>{
 const button=el('reference-owner-map'),status=el('reference-owner-map-status');
 try{
  if(!latestReferenceInventory)throw Error('EXTERNAL_REFERENCE_ANALYSIS_REQUIRED');
  if(!el('reference-owner-labels-approval').checked)throw Error('EXTERNAL_REFERENCE_OWNER_APPROVAL_REQUIRED');
  if(!el('rights').checked)throw Error('REFERENCE_RIGHTS_REQUIRED');
  const rows=el('reference-owner-labels').value.trim().split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if(rows.length<1||rows.length>3)throw Error('EXTERNAL_REFERENCE_NEEDS_1_TO_3_REGIONS');
  const annotations=rows.map((row,i)=>{
   const idx=row.indexOf('|');
   if(idx<1||idx===row.length-1)throw Error('EXTERNAL_REFERENCE_USE_TYPE_PIPE_TEXT');
   return {regionId:latestReferenceInventory.regions[i]?.id,type:row.slice(0,idx).trim(),text:row.slice(idx+1).trim()};
  });
  button.disabled=true;
  const {approveMappedReference}=await import('./external-reference-to-forge.mjs');
  const result=await approveMappedReference(latestReferenceInventory,annotations,
   {prompt:promptEl.value,approval:'APPROVE_EXTERNAL_REFERENCE_MAPPING',rightsConfirmed:true,
    assetDecision:el('reference-asset-decision').value,
    fallbackApproval:el('reference-asset-fallback-approval').checked});
  save('FFAX-External-Mapped-Reference.json',JSON.stringify(result.bundle,null,2),'application/json');
  save('FFAX-External-GeneratedScreen.tsx',result.reactSource,'text/plain');
  save('FFAX-External-Region-Evidence.json',JSON.stringify(result.evidence,null,2),'application/json');
  save('FFAX-External-Asset-Manifest.json',JSON.stringify(result.evidence.assetManifest,null,2),'application/json');
  // This is an explicitly reviewed local FFAX type-safe candidate, not an automatic push or deployment.
  window.dispatchEvent(new CustomEvent('ffax:forge-apply',{detail:{
   document:result.variant.document,referenceSha256:result.bundle.sha256,approval:'APPROVE_FORGE_REFERENCE'
  }}));
  status.textContent='영역 '+annotations.length+'개 → 구조화 React 시안 생성 · SHA '+result.bundle.sha256.slice(0,16)+
    '… · FFAX 편집기로 전달. 원본 사진/로고/폰트를 복원하지 않은 대체 시안이며 독립 시각 비교 필요.';
 }catch(err){status.textContent='외부 이미지 시안 생성 거부: '+(err?.message||'UNKNOWN');}
 finally{button.disabled=!latestReferenceInventory;el('reference-owner-labels-approval').checked=false;el('reference-asset-fallback-approval').checked=false;}
});

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
// Design Forge transfers only a SHA-approved native FFAX document, never arbitrary code or imported scripts.
window.addEventListener('ffax:forge-apply',event=>{
 try{
  const detail=event.detail;
  if(detail?.approval!=='APPROVE_FORGE_REFERENCE'||!/^[a-f0-9]{64}$/.test(detail.referenceSha256))throw Error('FORGE_REFERENCE_APPROVAL_INVALID');
  validateProjectImport(detail.document);
  const next=JSON.parse(JSON.stringify(detail.document));
  history.past.push(history.present);if(history.past.length>history.max)history.past.shift();
  history.present=next;history.future=[];selected=next.components[0]?.id||null;
  brief=next.brief;promptEl.value=brief.raw;updateAll();
  log('FORGE SOURCE HANDOFF · 승인된 동일 React 컴포넌트를 편집기에 반영했습니다. 실 브라우저 시각 검증은 별도입니다.');
 }catch(err){log('FORGE HANDOFF FAIL: '+err.message,true);}
});

updateAll();
