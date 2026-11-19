/* FID-03: local owner text-box observations and explicit unknown OCR/font state.
 * Manual fallback is a working pipeline; this module does NOT run OCR or infer fonts.
 */
const shaPattern=/^[a-f0-9]{64}$/;
function boxValid(b,width,height){
 return !!b&&[b.x,b.y,b.width,b.height].every(Number.isInteger)&&b.x>=0&&b.y>=0&&
  b.width>=1&&b.height>=1&&b.x+b.width<=width&&b.y+b.height<=height;
}
function inside(parent,b){
 return b.x>=parent.x&&b.y>=parent.y&&b.x+b.width<=parent.x+parent.width&&
  b.y+b.height<=parent.y+parent.height;
}
export function createTypographyDraft(scene){
 if(scene?.schema!=='ffax.fidelity-scene.v1'||!shaPattern.test(scene.sourceSha256||'')||
    !Number.isInteger(scene.revision)||scene.revision<1||
    !Number.isInteger(scene.width)||!Number.isInteger(scene.height)||
    !Array.isArray(scene.regions)||!scene.regions.some(r=>r.id==='canvas'))
  throw Error('FIDELITY_TYPOGRAPHY_SCENE_INVALID');
 return {schema:'ffax.fidelity-typography.v1',referenceSha256:scene.sourceSha256,
  sceneRevision:scene.revision,viewport:{width:scene.width,height:scene.height},
  ocr:{status:'NOT_RUN_NO_LOCAL_ENGINE',recognizedText:false},fontFamily:'UNKNOWN',
  textBoxes:[],sourceBytesModified:false,remoteRequests:0};
}
export function addOwnerTextBox(draft,scene,{regionId,text,bounds,approval}={}){
 if(approval!=='APPROVE_FIDELITY_LOCAL_TEXT_LABEL')throw Error('FIDELITY_TEXT_OWNER_APPROVAL_REQUIRED');
 if(draft?.schema!=='ffax.fidelity-typography.v1'||draft.referenceSha256!==scene?.sourceSha256||
    draft.sceneRevision!==scene?.revision||draft.ocr?.status!=='NOT_RUN_NO_LOCAL_ENGINE'||
    !Array.isArray(draft.textBoxes)||draft.textBoxes.length>=32)
  throw Error('FIDELITY_TEXT_DRAFT_STALE_OR_INVALID');
 const region=scene.regions?.find(x=>x.id===regionId&&x.id!=='canvas');
 const clean=typeof text==='string'?text.trim().normalize('NFC'):'';
 if(!region||!boxValid(bounds,scene.width,scene.height)||
    !inside(region.bounds,bounds)||!clean||clean.length>200||
    /[\u0000-\u001f\u007f<>]/u.test(clean))
  throw Error('FIDELITY_TEXT_BOX_INVALID');
 const next=structuredClone(draft);
 next.textBoxes.push({id:'text-'+String(next.textBoxes.length+1),regionId,
  bounds:{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height},
  text:clean,confidence:'OWNER_SUPPLIED_NOT_OCR',fontFamily:'UNKNOWN',fontWeight:'UNKNOWN',
  lineHeight:'UNKNOWN',rights:'OWNER_ASSERTED_REFERENCE_ONLY'});
 return next;
}
