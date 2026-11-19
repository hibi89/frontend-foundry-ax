/* FFAX GUI controlled real compare→typed trial→re-capture→best-candidate workflow. */
import {getApprovedForgeBundleForComparison,getForgeSessionToken,postForgeReview} from './design-forge-ui.mjs';
import {getOwnerVisualReviewReceipt} from './forge-compare-ui.mjs';
import {verifyForgeBundle} from './design-forge.mjs';
import {validateProjectImport} from './core.mjs';
const $=id=>document.getElementById(id);
const write=(message,bad=false)=>{const status=$('forge-convergence-status');status.textContent=message;status.dataset.failed=String(bad);};
let finished=null,runActive=false;
const vaultStatus=(message)=>{$('forge-vault-status').textContent=message;};
async function safeDecodeReference(file){
 if(!['image/png','image/jpeg','image/webp'].includes(file?.type)||
    !Number.isInteger(file.size)||file.size<33||file.size>6*1024*1024)
  throw Error('FORGE_VAULT_IMAGE_INVALID');
 if(typeof createImageBitmap!=='function')throw Error('FORGE_VAULT_BROWSER_DECODER_UNAVAILABLE');
 const image=await createImageBitmap(file);
 try{
  if(image.width<1||image.height<1||image.width>10000||image.height>10000||
     image.width*image.height>32000000)throw Error('FORGE_VAULT_IMAGE_DIMENSIONS_INVALID');
 }finally{image.close();}
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))]
  .map(v=>v.toString(16).padStart(2,'0')).join('');
}
$('forge-vault-save').addEventListener('click',async()=>{
 const button=$('forge-vault-save');
 try{
  // Do not guess which of two unrelated UI selectors the user intended.
  // Only this explicitly named file is ever stored after owner consent.
  const file=$('forge-vault-source').files?.[0];
  if(!$('forge-vault-consent').checked)throw Error('FORGE_VAULT_EXPLICIT_CONSENT_REQUIRED');
  if(!file)throw Error('FORGE_VAULT_IMAGE_REQUIRED');
  button.disabled=true;
  const sha=await safeDecodeReference(file),token=await getForgeSessionToken();
  const response=await fetch('/api/design/runner/vault-intake',{method:'POST',body:file,
    cache:'no-store',credentials:'omit',redirect:'error',
    headers:{'content-type':file.type,'x-ffax-csrf':token,
      'x-ffax-owner-consent':'APPROVE_LOCAL_REFERENCE_VAULT',
      'x-ffax-rights-confirmed':'OWNER_ASSERTED_RIGHTS',
      'x-ffax-source-sha256':sha}});
  const saved=await response.json();
  if(!response.ok||saved.schema!=='ffax.runner-archive-receipt.v1'||
     saved.receipt?.sha256!==sha||saved.receipt.mime!==file.type)
    throw Error(saved.error||'FORGE_VAULT_RECEIPT_MISMATCH');
  $('forge-vault-sha').value=sha;
  vaultStatus('로컬 이미지 불변 보관 완료 · '+file.type+' · SHA256 '+sha+
   ' · 저작권 자동 검증이 아니며 사용자 지정 참조용으로만 보관합니다.');
 }catch(e){vaultStatus('로컬 보관 실패: '+(e?.message||'FORGE_VAULT_FAILED'));}
 finally{button.disabled=false;$('forge-vault-consent').checked=false;}
});
$('forge-vault-reload').addEventListener('click',async()=>{
 const button=$('forge-vault-reload');
 try{
  const sha=$('forge-vault-sha').value.trim().toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(sha))throw Error('FORGE_VAULT_SHA_INVALID');
  button.disabled=true;
  const token=await getForgeSessionToken();
  const restored=await postForgeReview('runner/restore',{sha256:sha,approval:'APPROVE_LOCAL_REFERENCE_RESTORE'});
  if(!['ffax.runner-reference.v1','ffax.runner-restored-file.v1'].includes(restored.schema))
   throw Error('FORGE_VAULT_RESTORE_INVALID');
  const res=await fetch('/api/design/runner/archive/file/'+sha,{
    method:'GET',cache:'no-store',credentials:'omit',redirect:'error',
    headers:{'x-ffax-csrf':token}});
  const mime=res.headers.get('content-type');
  if(!res.ok||!['image/png','image/jpeg','image/webp'].includes(mime))
   throw Error('FORGE_VAULT_FILE_UNAVAILABLE');
  const blob=await res.blob();
  const ext=mime==='image/png'?'png':mime==='image/jpeg'?'jpg':'webp';
  const file=new File([blob],'FFAX-verified-reference.'+ext,{type:mime});
  if(await safeDecodeReference(file)!==sha)throw Error('FORGE_VAULT_BROWSER_HASH_MISMATCH');
  if(restored.schema==='ffax.runner-restored-file.v1'&&restored.receipt.sha256!==sha)
   throw Error('FORGE_VAULT_RESTORE_MISMATCH');
  const transfer=new DataTransfer();transfer.items.add(file);
  if(mime==='image/png'&&restored.schema==='ffax.runner-reference.v1'){
   $('forge-compare-reference').files=transfer.files;
   $('forge-compare-reference').dispatchEvent(new Event('change',{bubbles:true}));
  }else{
   $('reference-file').files=transfer.files;
   vaultStatus('JPEG/WebP는 기존 이미지 분석에서 별도 권리 확인 후 사용하세요. 보정용 PNG로 자동 변환하지 않습니다.');
  }
  vaultStatus('원본 SHA 재검증 및 로컬 불러오기 완료 · '+mime+' · '+sha+
    (mime==='image/png'?'':' · 권리 체크 후 이미지 분석 버튼을 눌러주세요.'));
 }catch(e){vaultStatus('로컬 복구 실패: '+(e?.message||'FORGE_VAULT_RESTORE_FAILED'));}
 finally{button.disabled=false;}
});

// FID-01: explicit source/rights binding, no new file write or remote request.
$('forge-v3-receipt-create').addEventListener('click',async()=>{
 const status=$('forge-v3-receipt-status'),button=$('forge-v3-receipt-create');
 try{
  if(!$('forge-v3-receipt-consent').checked)throw Error('FORGE_REFERENCE_RECEIPT_APPROVAL_REQUIRED');
  const sha256=$('forge-vault-sha').value.trim().toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(sha256))throw Error('FORGE_REFERENCE_RECEIPT_SOURCE_INVALID');
  button.disabled=true;
  const result=await postForgeReview('reference-receipt',{
   sha256,sourceType:$('forge-v3-source-type').value,
   rightsBasis:$('forge-v3-rights-basis').value,
   dpr:Number($('forge-v3-dpr').value),
   projectLabel:$('forge-v3-project-label').value,
   approval:'APPROVE_LOCAL_REFERENCE_RECEIPT'});
  if(result?.schema!=='ffax.reference-bundle.v3'||result.referenceSha256!==sha256)
   throw Error('FORGE_REFERENCE_RECEIPT_RESPONSE_INVALID');
  const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='FFAX-V3-Reference-Receipt.json';
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
  window.dispatchEvent(new CustomEvent('ffax:v3-reference-receipt',{detail:result}));
    status.textContent='원본 SHA 재확인 · '+result.viewport.cssWidth+'×'+result.viewport.cssHeight+
   ' CSSpx, DPR '+result.viewport.dpr+' · 로컬 분석용 영수증 저장. 법적 사용권/공개 승인 아님.';
 }catch(e){status.textContent='영수증 거부: '+(e?.message||'FORGE_REFERENCE_RECEIPT_FAILED');}
 finally{button.disabled=false;$('forge-v3-receipt-consent').checked=false;}
});

const clear=()=>{
 finished=null;$('forge-convergence-report').disabled=true;$('forge-convergence-apply').disabled=true;
 $('forge-convergence-apply-consent').checked=false;
};
$('forge-compare-reference').addEventListener('change',()=>{clear();write('기준 PNG가 변경됐습니다. 보정·승인을 다시 수행해야 합니다.');});
$('forge-convergence-run').addEventListener('click',async()=>{
 const run=$('forge-convergence-run');
 if(runActive){write('이미 로컬 보정 작업이 실행 중입니다.',true);return;}
 let ownerBundle,input;
 try{
  if(!$('forge-convergence-consent').checked)throw Error('FORGE_CONVERGENCE_OWNER_CONSENT_REQUIRED');
  input=$('forge-compare-reference').files?.[0];
  if(!input||input.type!=='image/png'||input.size<33||input.size>6*1024*1024)throw Error('FORGE_CONVERGENCE_PNG_REQUIRED');
  ownerBundle=getApprovedForgeBundleForComparison();
  await verifyForgeBundle(ownerBundle);
  const sourceSha=ownerBundle.sha256,maxPasses=Number($('forge-convergence-budget').value);
  if(!Number.isInteger(maxPasses)||maxPasses<1||maxPasses>5)throw Error('FORGE_CONVERGENCE_BUDGET_INVALID');
  clear();runActive=true;run.disabled=true;
  const token=await getForgeSessionToken();
  write('로컬 원본 PNG를 메모리로 등록한 후, 제한된 수정 후보만 Chromium에서 비교하고 있습니다. 원본 저장소는 수정하지 않습니다.');
  const response=await fetch('/api/design/runner/reference',{method:'POST',body:input,cache:'no-store',
   credentials:'omit',redirect:'error',headers:{'content-type':'image/png','x-ffax-csrf':token,
    'x-ffax-owner-consent':'APPROVE_LOCAL_PNG_ANALYSIS'}});
  const registered=await response.json();
  if(!response.ok||registered.schema!=='ffax.runner-reference.v1'||!/^[a-f0-9]{32}$/.test(registered.id))throw Error(registered.error||'FORGE_REFERENCE_REGISTER_FAILED');
  const result=await postForgeReview('runner/start',{bundle:ownerBundle,referenceId:registered.id,
    maxPasses,approval:'APPROVE_LOCAL_CANDIDATE_CONVERGENCE'});
  if(result.schema!=='ffax.runner-completed.v1'||!/^[a-f0-9]{32}$/.test(result.id))throw Error('FORGE_CONVERGENCE_RESPONSE_INVALID');
  const details=await fetch('/api/design/runner/results/'+result.id,{method:'GET',cache:'no-store',
    credentials:'omit',redirect:'error',headers:{'x-ffax-csrf':token}});
  const reportResult=await details.json();
  if(!details.ok||reportResult.schema!=='ffax.runner-result.v1'||reportResult.id!==result.id)throw Error('FORGE_CONVERGENCE_REPORT_INVALID');
  const report=reportResult.report;
  if(report?.schema!=='ffax.convergence-receipt.v1'||report.referenceSha256!==registered.sha256||
    report.originalBundleSha256!==sourceSha||!report.bestCandidate?.document)throw Error('FORGE_CONVERGENCE_EVIDENCE_MISMATCH');
  validateProjectImport(report.bestCandidate.document);
  const currentBundle=getApprovedForgeBundleForComparison();
  if(currentBundle.sha256!==sourceSha||$('forge-compare-reference').files?.[0]!==input)throw Error('FORGE_CONVERGENCE_INPUT_CHANGED');
  const pngRes=await fetch('/api/design/runner/png/'+result.id,{method:'GET',cache:'no-store',
    credentials:'omit',redirect:'error',headers:{'x-ffax-csrf':token}});
  if(!pngRes.ok||!/^image\/png\b/.test(pngRes.headers.get('content-type')||''))throw Error('FORGE_CONVERGENCE_IMAGE_MISSING');
  const blob=await pngRes.blob();
  if(blob.size>6*1024*1024||blob.size<33)throw Error('FORGE_CONVERGENCE_IMAGE_SIZE');
  const actualHash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('');
  const expected=report.attempts.find(x=>x.pass===report.selectedPass)?.renderSha256;
  if(actualHash!==expected)throw Error('FORGE_CONVERGENCE_IMAGE_SHA_MISMATCH');
  const transfer=new DataTransfer();transfer.items.add(new File([blob],'FFAX-convergence-best.png',{type:'image/png'}));
  $('forge-compare-render').files=transfer.files;
  $('forge-compare-render').dispatchEvent(new Event('change',{bubbles:true}));
  finished={sourceSha,report,referenceSha256:registered.sha256,bestPngSha256:actualHash};
  $('forge-convergence-report').disabled=false;$('forge-convergence-apply').disabled=false;
  write('실측 보정 후보 완료 · '+report.passesTried+'회 시도, 이전 픽셀 평균 오차 '+Number(report.initialScore).toFixed(2)+
   ' → 최선 후보 '+Number(report.bestScore).toFixed(2)+'. 이 점수는 미학/기능 합격률이 아닙니다. 위 비교 버튼을 누른 뒤 소유자 시각 승인을 수행하세요.');
 }catch(err){clear();write('보정 거부·중단: '+(err?.message||'FORGE_CONVERGENCE_FAILED'),true);}
 finally{runActive=false;run.disabled=false;$('forge-convergence-consent').checked=false;}
});
$('forge-convergence-report').addEventListener('click',()=>{
 if(!finished)return;
 const url=URL.createObjectURL(new Blob([JSON.stringify(finished.report,null,2)],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download='FFAX-convergence-evidence.json';document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
});
$('forge-convergence-apply').addEventListener('click',async()=>{
 try{
  if(!finished)throw Error('FORGE_CONVERGENCE_NO_REVIEWED_CANDIDATE');
  if(!$('forge-convergence-apply-consent').checked)throw Error('FORGE_CONVERGENCE_APPLY_APPROVAL_REQUIRED');
  const visual=getOwnerVisualReviewReceipt();
  if(visual?.ownerApproved!==true||visual.reference?.sha256!==finished.referenceSha256||
    visual.render?.sha256!==finished.bestPngSha256)throw Error('FORGE_CONVERGENCE_EXACT_VISUAL_REVIEW_REQUIRED');
  if(getApprovedForgeBundleForComparison().sha256!==finished.sourceSha)throw Error('FORGE_CONVERGENCE_ORIGINAL_CHANGED');
  const saved=await postForgeReview('freeze',{variant:finished.report.bestCandidate,
    approval:'APPROVE_FORGE_REFERENCE',persist:false});
  if(saved.schema!=='ffax.design-freeze-result.v1')throw Error('FORGE_CONVERGENCE_FREEZE_FAILED');
  await verifyForgeBundle(saved.bundle);
  window.dispatchEvent(new CustomEvent('ffax:forge-apply',{detail:{
    document:structuredClone(saved.bundle.manifest.project),
    referenceSha256:saved.bundle.sha256,approval:'APPROVE_FORGE_REFERENCE'}}));
  clear();
  write('소유자 시각 승인과 별도 SHA 재확정을 거친 최선 후보를 FFAX 편집기로 전달했습니다. 실서비스 반영·독립 검수는 별도입니다.');
 }catch(err){write('최선 후보 적용 거부: '+(err?.message||'UNKNOWN'),true);}
 finally{$('forge-convergence-apply-consent').checked=false;}
});
write('실제 레퍼런스 PNG, 확정 FFAX 소스 번들, 명시 동의가 있으면 후보만 제한적으로 자동 보정할 수 있습니다.');
