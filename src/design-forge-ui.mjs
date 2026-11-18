/* FFAX Design Forge interface: local HTML/React-source variants; no remote requests. */
import {renderMarkup,validateProjectImport,parseModelDesign} from './core.mjs';
import {verifyForgeBundle,adoptLocalModelDesign} from './design-forge.mjs';
const $=id=>document.getElementById(id);
const status=$('forge-status');
const report=(message,failed=false)=>{status.textContent=message;status.dataset.failed=String(failed);};
const download=(name,content,type='application/json')=>{
 const url=URL.createObjectURL(new Blob([content],{type}));
 const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
};
let variants=[],selectedId=null,frozen=null,ownerBrief=null,variantHistory=new Map();
let capturedPng=null,captureUrl=null,captureId=null,captureBundleSha=null;

let forgeCsrf=null;
async function forgePost(endpoint,payload){
 if(!forgeCsrf){
  const tokenResponse=await fetch('/api/design/session',{method:'GET',cache:'no-store',credentials:'omit',redirect:'error'});
  if(!tokenResponse.ok)throw Error('FORGE_SESSION_UNAVAILABLE');
  const session=await tokenResponse.json();
  if(session.schema!=='ffax.forge-session.v1'||!/^[a-f0-9]{64}$/.test(session.csrf))throw Error('FORGE_SESSION_INVALID');
  forgeCsrf=session.csrf;
 }
 let res=await fetch('/api/design/'+endpoint,{method:'POST',cache:'no-store',credentials:'omit',redirect:'error',headers:{'content-type':'application/json','x-ffax-csrf':forgeCsrf},body:JSON.stringify(payload)});
 if(res.status===403){
  const failed=await res.json();if(failed.error==='FORGE_CSRF_FORBIDDEN'){
   forgeCsrf=null;throw Error('FORGE_SESSION_EXPIRED_RETRY');
  }
 }
 if(!res.ok){
  let details;try{details=await res.json();}catch{}
  throw Error(details?.error||'FORGE_API_'+res.status);
 }
 return res.json();
}


let stagedLocalModel=null;
$('forge-local-request').addEventListener('click',async()=>{
 const button=$('forge-local-request');
 try{
  if(!$('forge-local-consent').checked)throw Error('FORGE_LOCAL_MODEL_CONSENT_REQUIRED');
  const chosen=active();
  const brief=$('forge-brief').value.trim();
  if(brief.length<8||brief.length>2000)throw Error('FORGE_LOCAL_BRIEF_INVALID');
  button.disabled=true;stagedLocalModel=null;$('forge-local-response').value='';$('forge-local-adopt').disabled=true;
  const result=await fetch('/api/local-model',{method:'POST',credentials:'omit',redirect:'error',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify({model:'qwen3:4b-instruct',prompt:brief,consent:'APPROVE_LOCAL_MODEL_PROMPT_ONLY'})});
  const data=await result.json();
  if(!result.ok)throw Error(data.error||'FORGE_LOCAL_MODEL_UNAVAILABLE');
  const parsed=parseModelDesign(data.output,{ownerBrief:brief,approval:'APPROVE_DESIGN_PREVIEW'});
  validateProjectImport(parsed.document);
  stagedLocalModel={id:chosen.id,revision:chosen.revision,model:data.model,sha256:data.sha256,document:parsed.document,output:data.output};
  $('forge-local-response').value=data.output;$('forge-local-adopt').disabled=false;
  report('로컬 Qwen 구조 JSON을 수신했습니다. 내용을 검토하고 별도 승인한 경우에만 '+chosen.id+' 시안에 반영합니다.');
 }catch(e){report('로컬 Qwen: '+e.message,true);}
 finally{button.disabled=false;$('forge-local-consent').checked=false;}
});
$('forge-local-adopt').addEventListener('click',()=>{
 try{
  if(!$('forge-local-review').checked)throw Error('FORGE_MODEL_REVIEW_APPROVAL_REQUIRED');
  if(!stagedLocalModel||stagedLocalModel.id!==selectedId||stagedLocalModel.revision!==active().revision)throw Error('FORGE_MODEL_PROPOSAL_STALE');
  const updated=adoptLocalModelDesign(active(),stagedLocalModel.document,{model:stagedLocalModel.model,sha256:stagedLocalModel.sha256,approval:'APPROVE_LOCAL_DESIGN_VARIANT'});
  rememberRevision(active());variants=variants.map(v=>v.id===updated.id?updated:v);frozen=null;stagedLocalModel=null;
  $('forge-local-response').value='';$('forge-local-adopt').disabled=true;renderCards();
  report('로컬 모델의 검토된 UI 컴포넌트 제안을 '+updated.id+' v'+updated.revision+'에 반영. 원본 소스/아트워크는 자동 교체하지 않았습니다.');
 }catch(e){report('모델 제안 거부: '+e.message,true);}
 finally{$('forge-local-review').checked=false;}
});

function rememberRevision(variant){
 const prior=variantHistory.get(variant.id)||[];
 prior.push(structuredClone(variant));if(prior.length>30)prior.shift();variantHistory.set(variant.id,prior);
}
function active(){const found=variants.find(v=>v.id===selectedId);if(!found)throw Error('FORGE_SELECT_VARIANT_FIRST');return found;}
function renderCards(){
 const target=$('forge-variants');target.replaceChildren();
 for(const item of variants){
  const card=document.createElement('article');card.className='forge-card'+(item.id===selectedId?' selected':'');
  const title=document.createElement('h3');title.textContent=item.id+' · '+item.recommendation.name+' · v'+item.revision;
  const desc=document.createElement('p');desc.textContent=item.recommendation.rationale;
  const preview=document.createElement('div');preview.className='forge-live-preview';preview.innerHTML=renderMarkup(item.document);
  const choose=document.createElement('button');choose.type='button';choose.textContent='시안 '+item.id+' 선택';choose.setAttribute('aria-pressed',String(item.id===selectedId));
  choose.addEventListener('click',()=>{selectedId=item.id;frozen=null;renderCards();report(item.id+' 시안 선택 · 편집 후 레퍼런스로 확정하세요.');});
  card.append(title,desc,preview,choose);target.append(card);
 }
 $('forge-freeze').disabled=!selectedId;
 $('forge-refine').disabled=!selectedId;
 $('forge-edit-apply').disabled=!selectedId;
 $('forge-token-apply').disabled=!selectedId;
 const chosen=variants.find(v=>v.id===selectedId);
 const targetSelect=$('forge-edit-target'),previousTarget=targetSelect.value;
 targetSelect.replaceChildren();
 if(chosen)for(const node of chosen.document.components){
  const option=document.createElement('option');option.value=node.id;
  option.textContent=node.id+' · '+node.type+' · '+node.text.slice(0,35);
  targetSelect.append(option);
 }
 if(chosen?.document.components.some(x=>x.id===previousTarget))targetSelect.value=previousTarget;
 $('forge-undo').disabled=!selectedId || !(variantHistory.get(selectedId)||[]).length;
 $('forge-mix').disabled=!selectedId;
 $('forge-apply').disabled=!frozen;
 $('forge-export').disabled=!frozen;
 $('forge-capture-run').disabled=!frozen || frozen.manifest?.referencePng!==null;
 $('forge-finalize').disabled=!frozen || !captureId || captureBundleSha!==frozen.sha256 || frozen.manifest?.referencePng!==null;
 if(!frozen){captureId=null;captureBundleSha=null;capturedPng=null;if(captureUrl)URL.revokeObjectURL(captureUrl);captureUrl=null;$('forge-capture-preview').removeAttribute('src');$('forge-capture-download').disabled=true;}
}
$('forge-generate').addEventListener('click',async()=>{
 try{
  const result=await forgePost('variants',{brief:{prompt:$('forge-brief').value,audience:$('forge-audience').value,mood:$('forge-mood').value,mustHave:$('forge-musthave').value,avoid:$('forge-avoid').value}});
  if(result.schema!=='ffax.design-variants-result.v1'||!Array.isArray(result.variants)||result.variants.length!==3)throw Error('FORGE_VARIANTS_INVALID');
  ownerBrief=result.brief;variants=result.variants;variantHistory=new Map();selectedId=null;frozen=null;renderCards();
  report('A/B/C 시안 3개를 실제 FFAX 구조화 코드에서 생성했습니다. 이미지나 모델 호출 없이 로컬 처리합니다. 선택·개선 후 확정하세요.');
 }catch(err){report(err.message,true);}
});
$('forge-undo').addEventListener('click',()=>{
 try{
  const current=active();
  const queue=variantHistory.get(current.id)||[];
  if(!queue.length)throw Error('FORGE_REVISION_HISTORY_EMPTY');
  const previous=queue.pop();
  variants=variants.map(v=>v.id===current.id?previous:v);
  frozen=null;stagedLocalModel=null;$('forge-local-response').value='';$('forge-local-adopt').disabled=true;
  renderCards();report(current.id+' 시안의 직전 소스 버전 v'+previous.revision+'을 복구했습니다. 확정하려면 다시 승인하세요.');
 }catch(err){report('버전 복구 거절: '+err.message,true);}
});
$('forge-refine').addEventListener('click',async()=>{
 try{
  const variant=active(),instruction=$('forge-instruction').value.trim();
  if(instruction.length<2||instruction.length>300)throw Error('FORGE_INSTRUCTION_INVALID');
  let change;
  if(/밝|화이트|라이트|light/i.test(instruction))change={kind:'theme',value:'daylight'};
  else if(/다크|검정|어둡|dark/i.test(instruction))change={kind:'theme',value:'midnight'};
  else if(/청록|오션|블루|cyan/i.test(instruction))change={kind:'theme',value:'ocean'};
  else if(/여백|간격|spacing/i.test(instruction)){
   const node=variant.document.components.find(n=>n.type==='Hero'||n.type==='Card')||variant.document.components[0];
   change={kind:'update',id:node.id,prop:'spacing',value:32};
  } else if(/제목[:：]/.test(instruction)){
   const text=instruction.split(/제목[:：]/)[1]?.trim();if(!text||text.length>180)throw Error('FORGE_TITLE_INVALID');
   const node=variant.document.components.find(n=>n.type==='Hero');if(!node)throw Error('FORGE_HERO_MISSING');change={kind:'update',id:node.id,prop:'text',value:text};
  } else throw Error('FORGE_INSTRUCTION_UNSUPPORTED: 다크/밝게/청록/여백/제목:문구를 지원합니다.');
  const result=await forgePost('refine',{variant,command:change});const updated=result.variant;
  if(result.schema!=='ffax.design-refine-result.v1'||updated?.id!==variant.id)throw Error('FORGE_REFINEMENT_INVALID');
  rememberRevision(variant);variants=variants.map(v=>v.id===updated.id?updated:v);frozen=null;renderCards();
  report(updated.id+' 시안 v'+updated.revision+'에 요청한 부분만 반영. 기존 시안을 덮어쓴 것은 아니며 새 버전입니다.');
 }catch(err){report(err.message,true);}
});
$('forge-edit-apply').addEventListener('click',async()=>{
 try{
  const variant=active(),field=$('forge-edit-field').value,id=$('forge-edit-target').value;
  const raw=$('forge-edit-value').value.trim();
  let command;
  if(field==='insert')command={kind:'insert',value:raw};
  else if(field==='remove')command={kind:'remove',id};
  else if(field==='move')command={kind:'move',id,value:Number(raw)};
  else if(['text','spacing','align','color','type'].includes(field))
   command={kind:'update',id,prop:field,value:field==='spacing'?Number(raw):raw};
  else throw Error('FORGE_DIRECT_EDIT_INVALID');
  if(field!=='remove'&&!raw)throw Error('FORGE_DIRECT_EDIT_VALUE_REQUIRED');
  const response=await forgePost('refine',{variant,command});
  if(response.schema!=='ffax.design-refine-result.v1'||response.variant?.id!==variant.id)
   throw Error('FORGE_DIRECT_EDIT_RESULT_INVALID');
  rememberRevision(variant);variants=variants.map(v=>v.id===variant.id?response.variant:v);frozen=null;renderCards();
  report('컴포넌트 변경을 '+variant.id+' 시안의 새 버전에 반영했습니다. Undo 가능.');
 }catch(err){report('컴포넌트 변경 실패: '+err.message,true);}
});
$('forge-token-apply').addEventListener('click',async()=>{
 try{
  const variant=active(),entry=$('forge-token-choice').value,split=entry.indexOf('|');
  if(split<=0)throw Error('FORGE_TOKEN_SELECTOR_INVALID');
  const prop=entry.slice(0,split),raw=entry.slice(split+1);
  const response=await forgePost('refine',{variant,command:{kind:'token',prop,value:prop==='radius'?Number(raw):raw}});
  if(response.schema!=='ffax.design-refine-result.v1'||response.variant?.id!==variant.id)
   throw Error('FORGE_TOKEN_RESULT_INVALID');
  rememberRevision(variant);variants=variants.map(v=>v.id===variant.id?response.variant:v);frozen=null;renderCards();
  report('타이포·디자인 토큰을 새 버전에 적용했습니다. 소스 내보내기와 프리뷰가 동일 토큰을 사용합니다.');
 }catch(err){report('디자인 토큰 변경 실패: '+err.message,true);}
});
$('forge-mix').addEventListener('click',async()=>{
 try{
  const base=active(),other=variants.find(v=>v.id===$('forge-mix-from').value);
  if(!other||other.id===base.id)throw Error('FORGE_MIX_REQUIRES_DIFFERENT_VARIANT');
  const response=await forgePost('mix',{primary:base,secondary:other,options:{
   takeTheme:true,takeLayout:$('forge-mix-layout').checked,
   takeTypography:$('forge-mix-typography').checked,takeDecorations:$('forge-mix-decoration').checked,
   takeComponentStyles:$('forge-mix-components').checked
  }});
  if(response.schema!=='ffax.design-mix-result.v1'||response.variant?.id!==base.id)throw Error('FORGE_MIX_INVALID');
  const updated=response.variant;
  rememberRevision(base);variants=variants.map(v=>v.id===updated.id?updated:v);frozen=null;renderCards();
  report(base.id+' 시안에 '+other.id+' 시안의 색채'+($('forge-mix-layout').checked?'·배치':'')+'를 반영했습니다.');
 }catch(err){report(err.message,true);}
});
$('forge-freeze').addEventListener('click',async()=>{
 try{
  if(!$('forge-approval').checked)throw Error('FORGE_OWNER_APPROVAL_REQUIRED');
  const result=await forgePost('freeze',{variant:active(),approval:'APPROVE_FORGE_REFERENCE',persist:false});
  if(result.schema!=='ffax.design-freeze-result.v1')throw Error('FORGE_FREEZE_RESPONSE_INVALID');
  frozen=result.bundle;
  await verifyForgeBundle(frozen);renderCards();
  report('레퍼런스 소스 번들 SHA256 확정 '+frozen.sha256.slice(0,20)+'… · React+토큰+구조가 그대로 전달됩니다. 실제 브라우저 PNG/품질 독립 검증은 아직 별도입니다.');
 }catch(err){frozen=null;renderCards();report(err.message,true);}
 finally{$('forge-approval').checked=false;}
});
$('forge-export').addEventListener('click',()=>{
 if(!frozen){report('FORGE_REFERENCE_NOT_APPROVED',true);return;}
 download('FFAX-Design-Forge-'+frozen.manifest.variantId+'.json',JSON.stringify(frozen,null,2));
});

$('forge-capture-run').addEventListener('click',async()=>{
 const button=$('forge-capture-run');
 try{
  if(!frozen)throw Error('FORGE_CAPTURE_REQUIRES_APPROVED_BUNDLE');
  if(frozen.manifest?.referencePng!==null)throw Error('FORGE_REFERENCE_PNG_ALREADY_LOCKED');
  const originalFrozenSha=frozen.sha256;
  if(!$('forge-capture-consent').checked)throw Error('FORGE_CAPTURE_OWNER_CONSENT_REQUIRED');
  const width=Number($('forge-capture-width').value),height=Number($('forge-capture-height').value);
  if(!Number.isInteger(width)||!Number.isInteger(height)||height<320||height>2200)throw Error('FORGE_CAPTURE_VIEWPORT_INVALID');
  button.disabled=true;report('로컬 Chromium 캡처 실행 중. 외부 네트워크·임의 코드 실행은 차단됩니다.');
  const response=await forgePost('capture',{bundle:frozen,width,height,dpr:1,approval:'APPROVE_LOCAL_CAPTURE'});
  if(response.schema!=='ffax.design-capture-result.v1'||!/^\/api\/design\/captures\/[a-f0-9]{32}\.png$/.test(response.download))throw Error('FORGE_CAPTURE_RESPONSE_INVALID');
  const pngResponse=await fetch(response.download,{headers:{'x-ffax-csrf':forgeCsrf},method:'GET',credentials:'omit',cache:'no-store',redirect:'error'});
  if(!pngResponse.ok||!/^image\/png\b/.test(pngResponse.headers.get('content-type')||''))throw Error('FORGE_CAPTURE_PNG_UNAVAILABLE');
  const png=await pngResponse.blob();
  if(png.size<33||png.size>6*1024*1024)throw Error('FORGE_CAPTURE_PNG_SIZE_INVALID');
  const digest=await crypto.subtle.digest('SHA-256',await png.arrayBuffer());
  const check=[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
  if(check!==response.receipt.sha256)throw Error('FORGE_CAPTURE_PNG_SHA_MISMATCH');
  if(response.receipt.preflight?.schema!=='ffax.capture-preflight.v1'||!Array.isArray(response.qualityWarnings))throw Error('FORGE_CAPTURE_QUALITY_RECEIPT_MISSING');
  const captureWarnings=response.qualityWarnings.map(w=>w.code).slice(0,8).join(', ');
  if(!frozen || frozen.sha256!==originalFrozenSha)throw Error('FORGE_CAPTURE_SOURCE_CHANGED');
  if(captureUrl)URL.revokeObjectURL(captureUrl);
  capturedPng=png;captureId=response.id;captureBundleSha=originalFrozenSha;captureUrl=URL.createObjectURL(png);$('forge-capture-preview').src=captureUrl;$('forge-capture-download').disabled=false;$('forge-finalize').disabled=false;
  try{
   const transfer=new DataTransfer();transfer.items.add(new File([png],'FFAX-real-browser.png',{type:'image/png'}));
   $('forge-compare-render').files=transfer.files;
   report('Playwright PNG SHA 확인 · 폰트/자산 경고: '+(captureWarnings||'없음')+'. 비교 패널에서 차이를 검토하고 승인하세요.');
  }catch{report('Playwright PNG 확인 완료 · 폰트/자산 경고: '+(captureWarnings||'없음')+'. 파일을 저장해 비교 패널에 직접 선택하세요.');}
 }catch(err){report('캡처 실패: '+err.message,true);}
 finally{button.disabled=!frozen || frozen.manifest?.referencePng!==null;$('forge-capture-consent').checked=false;}
});
$('forge-finalize').addEventListener('click',async()=>{
 const button=$('forge-finalize');
 try{
  if(!$('forge-finalize-consent').checked)throw Error('FORGE_FINAL_IMAGE_OWNER_APPROVAL_REQUIRED');
  if(!frozen||!captureId||captureBundleSha!==frozen.sha256||!capturedPng)throw Error('FORGE_CAPTURE_RECEIPT_STALE');
  const originalSha=frozen.sha256,actualCaptureId=captureId;
  button.disabled=true;
  const response=await forgePost('finalize',{bundle:frozen,captureId:actualCaptureId,approval:'APPROVE_FINAL_REFERENCE_PNG'});
  if(response.schema!=='ffax.design-finalized-result.v1'||response.parentSha256!==originalSha||
     response.bundle?.manifest?.referencePng?.sha256!==response.pngSha256)throw Error('FORGE_FINAL_IMAGE_RECEIPT_INVALID');
  await verifyForgeBundle(response.bundle);
  if(!frozen||frozen.sha256!==originalSha||captureId!==actualCaptureId)throw Error('FORGE_FINAL_IMAGE_CHANGED_DURING_APPROVAL');
  frozen=response.bundle;captureId=null;captureBundleSha=null;
  renderCards();
  report('소스·자산 사양·실제 Chromium PNG 최종 잠금 PASS · bundle SHA256 '+frozen.sha256.slice(0,20)+'… · PNG SHA256 '+response.pngSha256.slice(0,20)+'… · 시각 품질/기능의 독립 PASS와는 구분됩니다.');
 }catch(err){report('레퍼런스 최종 확정 실패: '+err.message,true);}
 finally{$('forge-finalize-consent').checked=false;button.disabled=!frozen||!captureId||captureBundleSha!==frozen.sha256;}
});
$('forge-capture-download').addEventListener('click',()=>{
 if(!capturedPng)return;
 const url=URL.createObjectURL(capturedPng),a=document.createElement('a');a.href=url;a.download='FFAX-real-browser.png';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
});

$('forge-apply').addEventListener('click',async()=>{
 try{
  if(!frozen)throw Error('FORGE_REFERENCE_NOT_APPROVED');
  const doc=await verifyForgeBundle(frozen);validateProjectImport(doc);
  window.dispatchEvent(new CustomEvent('ffax:forge-apply',{detail:{document:doc,referenceSha256:frozen.sha256,approval:'APPROVE_FORGE_REFERENCE'}}));
  report('확정된 원본 React 구조를 FFAX 편집·구현 캔버스로 전달했습니다. 코드/기능/원본 적용의 최종 검증은 별도입니다.');
 }catch(err){report(err.message,true);}
});
$('forge-import').addEventListener('change',async()=>{
 try{
  const file=$('forge-import').files?.[0];if(!file||file.size>500000)throw Error('FORGE_BUNDLE_FILE_INVALID');
  const raw=await file.text();const parsed=JSON.parse(raw);const doc=await verifyForgeBundle(parsed);
  const recommendation={name:'복구된 확정 시안',rationale:'SHA 검증된 로컬 소스 번들'};
  frozen=parsed;variants=[{schema:'ffax.design-variant.v1',id:parsed.manifest.variantId,styleId:parsed.manifest.styleId,revision:parsed.manifest.revision,parentVariantId:null,brief:{},document:doc,recommendation,previewStatus:'BUNDLE_REOPENED'}];
  selectedId=parsed.manifest.variantId;variantHistory=new Map();renderCards();report('레퍼런스 번들 SHA256 검증 PASS · 로컬에서 복구했습니다.');
 }catch(err){report('복구 거절: '+err.message,true);}finally{$('forge-import').value='';}
});

// Convergence review shares immutable receipts, not internal mutable UI state.
export function getApprovedForgeBundleForComparison(){
 if(!frozen)throw Error('FORGE_REFERENCE_NOT_APPROVED');
 return structuredClone(frozen);
}
export async function postForgeReview(endpoint,payload){return await forgePost(endpoint,payload);}
export async function getForgeSessionToken(){
 if(forgeCsrf)return forgeCsrf;
 const session=await fetch('/api/design/session',{method:'GET',cache:'no-store',credentials:'omit',redirect:'error'});
 if(!session.ok)throw Error('FORGE_SESSION_UNAVAILABLE');
 const result=await session.json();
 if(result.schema!=='ffax.forge-session.v1'||!/^[a-f0-9]{64}$/.test(result.csrf))throw Error('FORGE_SESSION_INVALID');
 forgeCsrf=result.csrf;return forgeCsrf;
}

report('Design Forge 준비 · 무료 오프라인 규칙·기존 FFAX 컴포넌트로 시안을 생성합니다.');
