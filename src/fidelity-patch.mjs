/* FID-09: bounded owner-approved typed edits to a disposable scene, never owner source. */
import {createFidelityArtifacts} from './fidelity-renderer.mjs';
const HEX=/^#[a-f0-9]{6}$/i;
const geometry=new Set(['x','y','width','height']);
const visual=new Set(['background','radius','opacity']);
const text=new Set(['fontSize','fontColor','fontWeight','lineHeight','letterSpacing','fontFamily','textAlign']);
const fontPresets=new Set(['system-ui','serif','korean-serif','korean-sans','monospace']);
const textAlignments=new Set(['left','center','right']);
function number(v,min,max,int=false){
 const n=typeof v==='number'?v:Number(v);
 if(v===''||typeof v==='boolean'||typeof v==='object'||!Number.isFinite(n)||n<min||n>max||(int&&!Number.isInteger(n)))
  throw Error('FIDELITY_PATCH_VALUE_INVALID');
 return n;
}
export function planFidelityPatches(diag,scene){
 if(diag?.schema!=='ffax.f95-region-diagnostics.v1'||diag.referenceSha256!==scene?.sourceSha256||
    diag.status!=='F95_UNASSESSED'||!Number.isInteger(scene.revision)||scene.revision<1||
    diag.sceneRevision!==scene.revision||!Array.isArray(diag.regions))
  throw Error('FIDELITY_PATCH_DIAGNOSTIC_INVALID');
 return {schema:'ffax.v3.patch-plan.v1',referenceSha256:scene.sourceSha256,
  options:diag.regions.filter(r=>r.regionId!=='canvas')
   .sort((a,b)=>b.meanRgbError-a.meanRgbError).slice(0,8)
   .map(r=>({regionId:r.regionId,reason:'PIXEL_DIAGNOSTIC_ONLY',priority:r.meanRgbError})),
  proposedValues:'OWNER_MUST_ENTER',ownerSourceWrite:false,maxPasses:5};
}
export function applyFidelityPatch(scene,typography,assets,diag,{regionId,property,value,textId,approval}={}){
 if(approval!=='APPROVE_LOCAL_V3_TYPED_PATCH')throw Error('FIDELITY_PATCH_APPROVAL_REQUIRED');
 const plan=planFidelityPatches(diag,scene);
 if(!plan.options.some(o=>o.regionId===regionId))throw Error('FIDELITY_PATCH_REGION_NOT_DIAGNOSED');
 if(!geometry.has(property)&&!visual.has(property)&&!text.has(property))
  throw Error('FIDELITY_PATCH_PROPERTY_UNSUPPORTED');
 const next=structuredClone(scene),nextText=typography===null?null:structuredClone(typography);
 const region=next.regions.find(r=>r.id===regionId);
 if(!region||region.id==='canvas'||region.lockedProperties?.includes(property))
  throw Error('FIDELITY_PATCH_REGION_LOCKED');
 if(geometry.has(property))
  region.bounds[property]=number(value,['x','y'].includes(property)?0:1,10000,true);
 else if(property==='background'||property==='fontColor'){
  if(typeof value!=='string'||!HEX.test(value))throw Error('FIDELITY_PATCH_VALUE_INVALID');
  if(property==='background')region.style.background=value.toLowerCase();
  else{
   const t=nextText?.textBoxes?.find(x=>x.id===textId&&x.regionId===regionId);
   if(!t)throw Error('FIDELITY_PATCH_TEXT_NOT_FOUND');
   t.fontColor=value.toLowerCase();
  }
 }else if(property==='radius')region.style.radius=number(value,0,48,true);
 else if(property==='opacity')region.style.opacity=number(value,0,1);
 else{
  const t=nextText?.textBoxes?.find(x=>x.id===textId&&x.regionId===regionId);
  if(!t)throw Error('FIDELITY_PATCH_TEXT_NOT_FOUND');
  if(property==='fontFamily'){
   if(typeof value!=='string'||!fontPresets.has(value))throw Error('FIDELITY_PATCH_VALUE_INVALID');
   t.fontFamily=value;
  }
  if(property==='textAlign'){
   if(typeof value!=='string'||!textAlignments.has(value))throw Error('FIDELITY_PATCH_VALUE_INVALID');
   t.textAlign=value;
  }
  if(property==='fontSize')t.fontSize=number(value,8,96,true);
  if(property==='fontWeight'){t.fontWeight=number(value,100,900,true);if(t.fontWeight%100)throw Error('FIDELITY_PATCH_VALUE_INVALID');}
  if(property==='lineHeight')t.lineHeight=number(value,.8,2.5);
  if(property==='letterSpacing')t.letterSpacing=number(value,-2,8);
 }
 next.revision++;
 if(nextText)nextText.sceneRevision=next.revision;
 // Verify geometry, styles, text and missing asset gates before accepting a candidate.
 createFidelityArtifacts(next,{typography:nextText,assets,
  approval:'APPROVE_FIDELITY_SCENE_SOURCE_EXPORT'});
 return {schema:'ffax.v3.typed-patch.v1',candidateScene:next,candidateTypography:nextText,
  rollbackScene:structuredClone(scene),rollbackTypography:typography===null?null:structuredClone(typography),
  status:'CANDIDATE_ONLY_RECAPTURE_REQUIRED',originalSourceModified:false,remoteRequests:0,
  patch:{regionId,property}};
}
