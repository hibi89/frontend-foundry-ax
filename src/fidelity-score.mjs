/* FID-08: region-level offline raster diagnostics. Not a calibrated F95 score:
 * absent font/artwork/provenance and owner visual review MUST remain unassessed.
 */
const SHA=/^[a-f0-9]{64}$/;
const AXES=Object.freeze({geometry:35,typography:20,assets:18,colors:12,effects:15});
const clamp=n=>Math.max(0,Math.min(100,n));
const round=n=>Number(n.toFixed(3));
function validRaster(r){
 return r&&Number.isInteger(r.width)&&Number.isInteger(r.height)&&
  r.width>=1&&r.height>=1&&r.width<=2560&&r.height<=2200&&
  r.width*r.height<=2560*2200&&r.data instanceof Uint8ClampedArray&&
  r.data.length===r.width*r.height*4;
}
function blended(r,x,y,c){
 const i=(y*r.width+x)*4,alpha=r.data[i+3]/255;
 return r.data[i+c]*alpha+(1-alpha)*255;
}
function diffRGB(a,b,x,y){
 let sum=0;for(let c=0;c<3;c++)sum+=Math.abs(blended(a,x,y,c)-blended(b,x,y,c));
 return sum/3;
}
function light(r,x,y){
 return 0.2126*blended(r,x,y,0)+0.7152*blended(r,x,y,1)+0.0722*blended(r,x,y,2);
}
function gradientDiff(a,b,x,y){
 const ax=Math.abs(light(a,x+1,y)-light(a,x,y)),
  ay=Math.abs(light(a,x,y+1)-light(a,x,y));
 const bx=Math.abs(light(b,x+1,y)-light(b,x,y)),
  by=Math.abs(light(b,x,y+1)-light(b,x,y));
 return (Math.abs(ax-bx)+Math.abs(ay-by))/2;
}
function regionMetrics(a,b,bounds){
 const step=Math.max(1,Math.ceil(Math.sqrt(bounds.width*bounds.height/4096)));
 let n=0,color=0,edge=0,changed=0;
 for(let y=bounds.y;y<bounds.y+bounds.height;y+=step){
  for(let x=bounds.x;x<bounds.x+bounds.width;x+=step){
   const delta=diffRGB(a,b,x,y);color+=delta;if(delta>20)changed++;
   edge+=gradientDiff(a,b,Math.min(a.width-2,x),Math.min(a.height-2,y));
   n++;
  }
 }
 return {samples:n,meanRgbError:round(color/n),meanEdgeError:round(edge/n),
  changedSampleRatio:round(changed/n),
  colorHeuristic:round(clamp(100*(1-color/n/255))),
  edgeHeuristic:round(clamp(100*(1-edge/n/255)))};
}
export function measureV3RegionDiagnostics({reference,render,scene,typography=null,assets=null,
 referenceSha256,renderSha256,viewport}={}){
 if(!SHA.test(referenceSha256||'')||!SHA.test(renderSha256||'')||
    referenceSha256===renderSha256)throw Error('FIDELITY_SCORE_SELF_COMPARISON_FORBIDDEN');
 if(!validRaster(reference)||!validRaster(render)||reference.width!==render.width||
    reference.height!==render.height||reference.width<2||reference.height<2||
    viewport?.width!==reference.width||viewport?.height!==reference.height||viewport?.dpr!==1)
  throw Error('FIDELITY_SCORE_VIEWPORT_OR_RASTER_INVALID');
 if(scene?.schema!=='ffax.fidelity-scene.v1'||scene.sourceSha256!==referenceSha256||
    scene.width!==reference.width||scene.height!==reference.height||
    !Array.isArray(scene.regions)||scene.regions.length<2||scene.regions.length>24)
  throw Error('FIDELITY_SCORE_SCENE_MISMATCH');
 const measured=[];
 for(const r of scene.regions){
  if(r.id==='canvas')continue;
  const b=r.bounds;
  if(!b||![b.x,b.y,b.width,b.height].every(Number.isInteger)||
     b.x<0||b.y<0||b.width<1||b.height<1||
     b.x+b.width>reference.width||b.y+b.height>reference.height)
   throw Error('FIDELITY_SCORE_REGION_INVALID');
  measured.push({regionId:r.id,role:r.role,requiredVisualReview:!r.ownerReviewed,
   ...regionMetrics(reference,render,b)});
 }
 if(!measured.length)throw Error('FIDELITY_SCORE_NO_REGIONS');
 const mean=(key)=>round(measured.reduce((s,r)=>s+r[key],0)/measured.length);
 const hasText=typography?.schema==='ffax.fidelity-typography.v1'&&
  typography.referenceSha256===referenceSha256&&
  typography.sceneRevision===scene.revision&&
  Array.isArray(typography.textBoxes)&&typography.textBoxes.length>0;
 const hasAssets=assets?.schema==='ffax.fidelity-local-assets.v1'&&
  assets.referenceSha256===referenceSha256&&assets.assets?.length>0;
 const measuredAxes={
  geometry:{weight:AXES.geometry,status:'APPROXIMATE_EDGE_COMPARISON',
   diagnosticScore:mean('edgeHeuristic')},
  typography:{weight:AXES.typography,status:hasText?'TEXT_BOXES_OWNER_LABELED_FONT_UNKNOWN':'OCR_AND_FONTS_NOT_VERIFIED',
   diagnosticScore:null},
  assets:{weight:AXES.assets,status:hasAssets?'ASSET_SHA_ONLY_BYTES_NOT_RENDERED':'SOURCE_ASSETS_UNAVAILABLE',
   diagnosticScore:null},
  colors:{weight:AXES.colors,status:'APPROXIMATE_RGB_RASTER_COMPARISON',
   diagnosticScore:mean('colorHeuristic')},
  effects:{weight:AXES.effects,status:'APPROXIMATE_PIXEL_EDGE_ONLY',
   diagnosticScore:mean('edgeHeuristic')}
 };
 const critical=measured.filter(r=>['navbar','hero','button','form'].includes(r.role)||
  r.requiredVisualReview).sort((a,b)=>b.meanRgbError-a.meanRgbError).slice(0,8)
  .map(r=>({regionId:r.regionId,role:r.role,rgbError:r.meanRgbError,
   issue:'VISUAL_DIFFERENCE_OWNER_REVIEW_REQUIRED'}));
 return {schema:'ffax.f95-region-diagnostics.v1',metricsVersion:'V3_RGB_EDGE_HEURISTIC_20261119',
  referenceSha256,renderSha256,viewport:{...viewport},axes:measuredAxes,
  regions:measured,criticalIssues:critical,
  status:'F95_UNASSESSED',weightedF95Score:null,passed95:false,
  blockingReasons:['FONT_NOT_VERIFIED','ORIGINAL_ASSETS_NOT_RENDERED',
   'OWNER_VISUAL_ACCEPTANCE_NOT_RUN','F95_CALIBRATION_NOT_DONE',
   'RESPONSIVE_AND_FUNCTIONAL_P2_NOT_RUN'],
  visualFidelityClaim:'DIAGNOSTIC_ONLY',remoteRequests:0,
  ownerSourceModified:false};
}
