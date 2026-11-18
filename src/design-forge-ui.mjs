/* FFAX Design Forge interface: local HTML/React-source variants; no remote requests. */
import {renderMarkup,validateProjectImport} from './core.mjs';
import {verifyForgeBundle} from './design-forge.mjs';
const $=id=>document.getElementById(id);
const status=$('forge-status');
const report=(message,failed=false)=>{status.textContent=message;status.dataset.failed=String(failed);};
const download=(name,content,type='application/json')=>{
 const url=URL.createObjectURL(new Blob([content],{type}));
 const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
};
let variants=[],selectedId=null,frozen=null,ownerBrief=null;

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
 $('forge-mix').disabled=!selectedId;
 $('forge-apply').disabled=!frozen;
 $('forge-export').disabled=!frozen;
}
$('forge-generate').addEventListener('click',async()=>{
 try{
  const result=await forgePost('variants',{brief:{prompt:$('forge-brief').value,audience:$('forge-audience').value,mood:$('forge-mood').value,mustHave:$('forge-musthave').value,avoid:$('forge-avoid').value}});
  if(result.schema!=='ffax.design-variants-result.v1'||!Array.isArray(result.variants)||result.variants.length!==3)throw Error('FORGE_VARIANTS_INVALID');
  ownerBrief=result.brief;variants=result.variants;selectedId=null;frozen=null;renderCards();
  report('A/B/C 시안 3개를 실제 FFAX 구조화 코드에서 생성했습니다. 이미지나 모델 호출 없이 로컬 처리합니다. 선택·개선 후 확정하세요.');
 }catch(err){report(err.message,true);}
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
  variants=variants.map(v=>v.id===updated.id?updated:v);frozen=null;renderCards();
  report(updated.id+' 시안 v'+updated.revision+'에 요청한 부분만 반영. 기존 시안을 덮어쓴 것은 아니며 새 버전입니다.');
 }catch(err){report(err.message,true);}
});
$('forge-mix').addEventListener('click',async()=>{
 try{
  const base=active(),other=variants.find(v=>v.id===$('forge-mix-from').value);
  if(!other||other.id===base.id)throw Error('FORGE_MIX_REQUIRES_DIFFERENT_VARIANT');
  const response=await forgePost('mix',{primary:base,secondary:other,options:{takeTheme:true,takeLayout:$('forge-mix-layout').checked}});
  if(response.schema!=='ffax.design-mix-result.v1'||response.variant?.id!==base.id)throw Error('FORGE_MIX_INVALID');
  const updated=response.variant;
  variants=variants.map(v=>v.id===updated.id?updated:v);frozen=null;renderCards();
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
  selectedId=parsed.manifest.variantId;renderCards();report('레퍼런스 번들 SHA256 검증 PASS · 로컬에서 복구했습니다.');
 }catch(err){report('복구 거절: '+err.message,true);}finally{$('forge-import').value='';}
});
report('Design Forge 준비 · 무료 오프라인 규칙·기존 FFAX 컴포넌트로 시안을 생성합니다.');
