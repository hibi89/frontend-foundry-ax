/* FID-05: reference geometry -> typed local scene with explicit owner edits.
 * Source pixels/unknown fonts/assets stay unverified; this does not render a page.
 */
const SHA=/^[0-9a-f]{64}$/;
const COLOR=/^#[0-9a-f]{6}$/i;
const ROLES=new Set(['section','panel','navbar','hero','card','sidebar','content','footer','image','text','button','form','table','chart','decorative']);
const clone=x=>structuredClone(x);
function validBox(b,width,height){
 return b&&[b.x,b.y,b.width,b.height].every(Number.isInteger)&&
  b.x>=0&&b.y>=0&&b.width>=1&&b.height>=1&&
  b.x+b.width<=width&&b.y+b.height<=height;
}
function contains(a,b){
 return b.x>=a.x&&b.y>=a.y&&b.x+b.width<=a.x+a.width&&b.y+b.height<=a.y+a.height;
}
function validate(scene){
 if(scene?.schema!=='ffax.fidelity-scene.v1'||!SHA.test(scene.sourceSha256||'')||
    !Number.isInteger(scene.width)||!Number.isInteger(scene.height)||
    scene.width<1||scene.height<1||scene.width*scene.height>32000000||
    !Number.isInteger(scene.revision)||scene.revision<1||
    !Array.isArray(scene.regions)||scene.regions.length<2||scene.regions.length>24)
  throw Error('FIDELITY_SCENE_INVALID');
 const byId=new Map();
 for(const region of scene.regions){
  if(!region||typeof region.id!=='string'||!/^[a-z0-9-]{2,64}$/.test(region.id)||
     byId.has(region.id)||!validBox(region.bounds,scene.width,scene.height)||
     !COLOR.test(region.style?.background||'')||
     !(region.role==='canvas'||ROLES.has(region.role)))
    throw Error('FIDELITY_SCENE_REGION_INVALID');
  byId.set(region.id,region);
 }
 const roots=scene.regions.filter(r=>r.parentId===null);
 if(roots.length!==1||roots[0].id!=='canvas'||roots[0].role!=='canvas')
  throw Error('FIDELITY_SCENE_ROOT_INVALID');
 for(const r of scene.regions){
  if(r.id==='canvas')continue;
  const parent=byId.get(r.parentId);
  if(!parent||!contains(parent.bounds,r.bounds))throw Error('FIDELITY_SCENE_PARENT_INVALID');
  let p=parent,depth=0;
  while(p.parentId!==null){
   if(++depth>24||p.id===r.id)throw Error('FIDELITY_SCENE_CYCLE');
   p=byId.get(p.parentId);
   if(!p)throw Error('FIDELITY_SCENE_PARENT_INVALID');
  }
 }
 return true;
}
export function buildFidelityScene(inventory){
 const g=inventory?.fidelityGeometry;
 if(inventory?.schema!=='ffax.external-reference-inventory.v1'||
    inventory.rightsConfirmed!==true||!SHA.test(inventory.sha256||'')||
    g?.schema!=='ffax.fidelity-geometry.v1'||g.sourceWidth!==inventory.width||
    g.sourceHeight!==inventory.height)
  throw Error('FIDELITY_SCENE_SOURCE_INVALID');
 const result={
  schema:'ffax.fidelity-scene.v1',sourceSha256:inventory.sha256,
  width:inventory.width,height:inventory.height,revision:1,
  provenance:'LOCAL_OBSERVED_APPROXIMATE',rights:'OWNER_ASSERTED_NOT_VERIFIED',
  regions:g.regions.map(r=>({
   id:r.id,parentId:r.parentId,role:r.role,bounds:clone(r.bounds),
   layout:{display:'UNKNOWN',responsive:'UNKNOWN'},
   style:{background:r.colorHint},
   typography:{fontFamily:'UNKNOWN',text:'UNKNOWN_NO_OCR'},
   confidence:{geometry:'OBSERVED_APPROXIMATE',semantics:'UNKNOWN'},
   ownerReviewed:false
  })),unknowns:['exact-font','raster-assets','interactive-behavior','responsive-rules'],
  externalRequests:0,originalMutated:false,visuallyVerified:false
 };
 validate(result);
 return result;
}
export function reviseFidelityRegion(scene,{regionId,role,bounds,approval}={}){
 if(approval!=='APPROVE_LOCAL_FIDELITY_REGION_EDIT')throw Error('FIDELITY_REGION_OWNER_APPROVAL_REQUIRED');
 validate(scene);
 if(typeof regionId!=='string'||regionId==='canvas'||!ROLES.has(role)||
    !validBox(bounds,scene.width,scene.height))
  throw Error('FIDELITY_REGION_EDIT_INVALID');
 const next=clone(scene),region=next.regions.find(r=>r.id===regionId);
 if(!region)throw Error('FIDELITY_REGION_UNKNOWN');
 region.role=role;region.bounds=clone(bounds);region.ownerReviewed=true;
 // A valid restored scene may omit extraction confidence metadata.
 if(!region.confidence||typeof region.confidence!=='object'||Array.isArray(region.confidence))
  region.confidence={geometry:'OWNER_CORRECTED',semantics:'OWNER_REVIEWED'};
 else region.confidence.semantics='OWNER_REVIEWED';
 next.revision++;next.provenance='OWNER_CORRECTED_GEOMETRY_UNVERIFIED';
 validate(next);
 return next;
}
