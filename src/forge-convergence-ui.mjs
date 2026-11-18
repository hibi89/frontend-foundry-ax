/* FFAX GUI controlled real compare→typed trial→re-capture→best-candidate workflow. */
import {getApprovedForgeBundleForComparison,getForgeSessionToken,postForgeReview} from './design-forge-ui.mjs';
import {getOwnerVisualReviewReceipt} from './forge-compare-ui.mjs';
import {verifyForgeBundle} from './design-forge.mjs';
import {validateProjectImport} from './core.mjs';
const $=id=>document.getElementById(id);
const write=(message,bad=false)=>{const status=$('forge-convergence-status');status.textContent=message;status.dataset.failed=String(bad);};
let finished=null,runActive=false;
const vaultStatus=(message)=>{$('forge-vault-status').textContent=message;};
async function registerVaultReference(file,token){
 const res=await fetch('/api/design/runner/reference',{method:'POST',body:file,
  cache:'no-store',credentials:'omit',redirect:'error',
  headers:{'content-type':'image/png','x-ffax-csrf':token,
    'x-ffax-owner-consent':'APPROVE_LOCAL_PNG_ANALYSIS'}});
 const data=await res.json();
 if(!res.ok||data.schema!=='ffax.runner-reference.v1')throw Error(data.error||'FORGE_VAULT_REGISTER_FAILED');
 return data;
}
$('forge-vault-save').addEventListener('click',async()=>{
 const button=$('forge-vault-save');
 try{
  const file=$('forge-compare-reference').files?.[0];
  if(!$('forge-vault-consent').checked)throw Error('FORGE_VAULT_EXPLICIT_CONSENT_REQUIRED');
  if(!file||file.type!=='image/png'||file.size<33||file.size>6*1024*1024)
   throw Error('FORGE_VAULT_PNG_REQUIRED');
  button.disabled=true;
  const token=await getForgeSessionToken();
  const registered=await registerVaultReference(file,token);
  const saved=await postForgeReview('runner/archive',{referenceId:registered.id,
    sha256:registered.sha256,rightsConfirmed:true,approval:'APPROVE_LOCAL_REFERENCE_VAULT'});
  if(saved.schema!=='ffax.runner-archive-receipt.v1'||
     saved.receipt?.sha256!==registered.sha256)throw Error('FORGE_VAULT_RECEIPT_MISMATCH');
  $('forge-vault-sha').value=saved.receipt.sha256;
  vaultStatus('로컬 불변 보관 완료 · SHA256 '+saved.receipt.sha256+
   ' · 권리 판단은 사용자 확인 주장, 자동 라이선스 검증이 아닙니다.');
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
  if(restored.schema!=='ffax.runner-reference.v1'||restored.sha256!==sha)throw Error('FORGE_VAULT_RESTORE_MISMATCH');
  const res=await fetch('/api/design/runner/archive/png/'+sha,{method:'GET',cache:'no-store',
    credentials:'omit',redirect:'error',headers:{'x-ffax-csrf':token}});
  if(!res.ok||res.headers.get('content-type')!=='image/png')throw Error('FORGE_VAULT_FILE_UNAVAILABLE');
  const blob=await res.blob();
  const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))]
    .map(v=>v.toString(16).padStart(2,'0')).join('');
  if(digest!==sha)throw Error('FORGE_VAULT_BROWSER_HASH_MISMATCH');
  const transfer=new DataTransfer();
  transfer.items.add(new File([blob],'FFAX-verified-reference.png',{type:'image/png'}));
  $('forge-compare-reference').files=transfer.files;
  $('forge-compare-reference').dispatchEvent(new Event('change',{bubbles:true}));
  vaultStatus('로컬 PNG 원본 SHA 검증 및 선택 완료 · '+sha);
 }catch(e){vaultStatus('로컬 복구 실패: '+(e?.message||'FORGE_VAULT_RESTORE_FAILED'));}
 finally{button.disabled=false;}
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
