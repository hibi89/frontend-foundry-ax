/* FFAX local screenshot review UI. Pixel diagnostics are NOT visual/functional acceptance. */
const byId=id=>document.getElementById(id);
const MAX_PNG=14*1024*1024;
const SHA_RE=/^[a-f0-9]{64}$/;
const setStatus=(text,failed=false)=>{const target=byId('forge-compare-status');target.textContent=text;target.dataset.failed=String(failed);};
let current=null,urls=[];
function clearPreview(){for(const url of urls)URL.revokeObjectURL(url);urls=[];byId('forge-compare-approval').checked=false;byId('forge-compare-approve').disabled=true;byId('forge-compare-download').disabled=true;}
async function loadPng(file){
 if(!file||file.type!=='image/png'||file.size<33||file.size>MAX_PNG)throw Error('FORGE_COMPARE_PNG_REQUIRED');
 const buffer=await file.arrayBuffer(),bitmap=await createImageBitmap(file);
 const hash=await crypto.subtle.digest('SHA-256',buffer);
 const sha256=[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
 if(bitmap.width<1||bitmap.height<1||bitmap.width>2560||bitmap.height>2200||bitmap.width*bitmap.height>5500000){bitmap.close();throw Error('FORGE_COMPARE_DIMENSIONS_UNSUPPORTED');}
 return {bitmap,sha256,width:bitmap.width,height:bitmap.height,name:file.name.slice(0,120)};
}
function pixelData(bitmap,width,height){
 const c=document.createElement('canvas');c.width=width;c.height=height;
 const ctx=c.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('FORGE_COMPARE_CANVAS_UNAVAILABLE');
 ctx.drawImage(bitmap,0,0);return ctx.getImageData(0,0,width,height);
}
async function compare(){
 const files=[byId('forge-compare-reference').files?.[0],byId('forge-compare-render').files?.[0]];
 if(files.some(x=>!x))throw Error('FORGE_COMPARE_BOTH_FILES_REQUIRED');
 let a,b;
 try{
  a=await loadPng(files[0]);b=await loadPng(files[1]);
  if(a.width!==b.width||a.height!==b.height)throw Error('FORGE_COMPARE_VIEWPORT_MISMATCH');
  const width=a.width,height=a.height,ref=pixelData(a.bitmap,width,height),img=pixelData(b.bitmap,width,height);
  const heat=document.createElement('canvas');heat.width=width;heat.height=height;
  const hc=heat.getContext('2d',{willReadFrequently:true});const result=hc.createImageData(width,height);
  const regions=Array.from({length:9},(_,i)=>({id:'r'+(i+1),cells:0,diffPixels:0,totalDifference:0}));
  let different=0,accumulated=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const k=(y*width+x)*4;
   const delta=(Math.abs(ref.data[k]-img.data[k])+Math.abs(ref.data[k+1]-img.data[k+1])+Math.abs(ref.data[k+2]-img.data[k+2]))/3;
   const changed=delta>20;const idx=Math.min(2,Math.floor(y*3/height))*3+Math.min(2,Math.floor(x*3/width));
   regions[idx].cells++;regions[idx].totalDifference+=delta;
   if(changed){different++;regions[idx].diffPixels++;}
   accumulated+=delta;
   result.data[k]=Math.round(delta);result.data[k+1]=0;result.data[k+2]=0;result.data[k+3]=220;
  }
  hc.putImageData(result,0,0);
  const blob=await new Promise(ok=>heat.toBlob(ok,'image/png'));if(!blob)throw Error('FORGE_COMPARE_HEATMAP_FAILED');
  clearPreview();const imageUrls=[URL.createObjectURL(files[0]),URL.createObjectURL(files[1]),URL.createObjectURL(blob)];urls=imageUrls;
  for(const [i,id] of ['forge-reference-image','forge-render-image','forge-heat-image'].entries())byId(id).src=imageUrls[i];
  current={schema:'ffax.visual-comparison.v1',reference:{sha256:a.sha256,width,height,name:a.name},render:{sha256:b.sha256,width,height,name:b.name},diagnostic:{differentPixels:different,totalPixels:width*height,thresholdPerChannel:20,meanAbsoluteChannelError:Number((accumulated/(width*height)).toFixed(3)),regions:regions.map(r=>({...r,meanDifference:Number((r.totalDifference/r.cells).toFixed(3))}))},status:'MEASURED_NOT_APPROVED',ownerApproved:false,networkRequests:0,sourceChanged:false};
  byId('forge-compare-download').disabled=false;byId('forge-compare-approve').disabled=false;
  setStatus('픽셀 비교 완료 · 불일치 기준 픽셀 '+different+'/'+(width*height)+'개 · 평균 RGB 차이 '+current.diagnostic.meanAbsoluteChannelError+'. 텍스트·레이아웃·기능·권리는 별도 검토하십시오.');
 }finally{a?.bitmap.close();b?.bitmap.close();}
}
// A file change invalidates the previous pixel evidence and any owner's approval.
for(const key of ['forge-compare-reference','forge-compare-render']){
 byId(key).addEventListener('change',()=>{
  clearPreview();current=null;
  for(const id of ['forge-reference-image','forge-render-image','forge-heat-image'])byId(id).removeAttribute('src');
  setStatus('비교 입력이 변경되어 이전 시각 승인·점수는 무효입니다. 다시 계산하세요.');
 });
}
byId('forge-compare-run').addEventListener('click',()=>compare().catch(e=>{clearPreview();current=null;setStatus('비교 실패: '+e.message,true);}));
byId('forge-compare-download').addEventListener('click',()=>{
 if(!current)return;
 const file=new Blob([JSON.stringify(current,null,2)],{type:'application/json'}),url=URL.createObjectURL(file);
 const a=document.createElement('a');a.href=url;a.download='FFAX-visual-comparison.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
});
byId('forge-compare-approve').addEventListener('click',()=>{
 if(!current||!byId('forge-compare-approval').checked){setStatus('레퍼런스·실화면을 직접 검토하고 승인 체크가 필요합니다.',true);return;}
 current.status='OWNER_VISUAL_REVIEW_ACCEPTED_NOT_INDEPENDENTLY_VERIFIED';current.ownerApproved=true;
 byId('forge-compare-approval').checked=false;
 setStatus('소유자 시각 검토 승인 기록. 실제 기능·보안·독립 검수나 Production 배포 승인은 별개입니다.');
});
setStatus('레퍼런스 PNG와 실제 Chromium 캡처 PNG를 선택하면 로컬에서 비교합니다. 서버 업로드 없음.');
