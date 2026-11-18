/* FFAX external-image asset ledger. All annotations are owner claims, never OCR,
 * hidden-layer recovery or a license audit. Image bytes stay in the browser.
 */
const SHA=/^[0-9a-f]{64}$/;
const RGB=/^#[0-9a-f]{6}$/i;
const MIME=new Set(['image/png','image/jpeg','image/webp']);
const TYPES=new Set(['Navbar','Hero','Button','Input','Form','Card','Stat','Badge','Table','Tabs','Modal','Alert','Chart','Sidebar','Loader','Error','Empty']);
const safe=x=>typeof x==='string'&&x.length<=180&&!/[\u0000-\u001f\u007f]/.test(x);
export function createReferenceAssetManifest(inventory,annotations,{approval,rightsBasis='OWNER_ASSERTED_RIGHTS'}={}){
 if(approval!=='APPROVE_EXTERNAL_REFERENCE_MAPPING')throw Error('REFERENCE_ASSET_OWNER_REVIEW_REQUIRED');
 if(!inventory||inventory.schema!=='ffax.external-reference-inventory.v1'||
    inventory.rightsConfirmed!==true||!SHA.test(inventory.sha256||'')||
    !MIME.has(inventory.mime)||!Number.isInteger(inventory.bytes)||inventory.bytes<33||
    inventory.bytes>4*1024*1024||
    !Number.isInteger(inventory.width)||!Number.isInteger(inventory.height)||
    inventory.width<1||inventory.height<1||inventory.width*inventory.height>32000000||
    !Array.isArray(inventory.regions)||inventory.regions.length!==3||
    !Array.isArray(inventory.paletteHints)||inventory.paletteHints.length!==3||
    !inventory.paletteHints.every(color=>RGB.test(color||''))||
    !safe(inventory.name||''))throw Error('REFERENCE_ASSET_INVENTORY_INVALID');
 if(!['OWNER_ASSERTED_RIGHTS','LICENSED_OWNER_ASSERTION'].includes(rightsBasis))throw Error('REFERENCE_ASSET_RIGHTS_BASIS_INVALID');
 if(!Array.isArray(annotations)||annotations.length<1||annotations.length>12)throw Error('REFERENCE_ASSET_ANNOTATIONS_REQUIRED');
 const regions=new Map();
 for(const r of inventory.regions){
  const b=r?.bounds;
  if(!r||typeof r.id!=='string'||!/^[a-z0-9-]{2,40}$/.test(r.id)||regions.has(r.id)||
    !b||![b.x,b.y,b.width,b.height].every(Number.isInteger)||
    b.x<0||b.y<0||b.width<1||b.height<1||b.x+b.width>inventory.width||
    b.y+b.height>inventory.height||!RGB.test(r.colorHint||''))throw Error('REFERENCE_ASSET_REGION_INVALID');
  regions.set(r.id,r);
 }
 const mapped=annotations.map((a,index)=>{
  if(!a||Object.keys(a).sort().join(',')!=='regionId,text,type'||
     !regions.has(a.regionId)||!TYPES.has(a.type)||!safe(a.text)||!a.text.trim())
    throw Error('REFERENCE_ASSET_ANNOTATION_INVALID');
  const region=regions.get(a.regionId);
  return {id:'owner-label-'+(index+1),regionId:a.regionId,componentType:a.type,
   text:a.text.trim(),evidence:'OWNER_SUPPLIED_NOT_OCR',bounds:{...region.bounds}};
 });
 return {
  schema:'ffax.external-asset-manifest.v1',
  reference:{sha256:inventory.sha256,mime:inventory.mime,width:inventory.width,height:inventory.height,
    bytes:inventory.bytes,name:inventory.name,bytesPersisted:false},
  rights:{status:'OWNER_ASSERTED_UNVERIFIED',basis:rightsBasis,publicRedistributionAllowed:false},
  observed:inventory.regions.map(r=>({regionId:r.id,bounds:{...r.bounds},approximateColor:r.colorHint,confidence:'OBSERVED_APPROXIMATE'})),
  ownerLabels:mapped,
  assets:[{id:'source-raster',role:'ORIGINAL_REFERENCE_ONLY',sha256:inventory.sha256,
    status:'BYTES_NOT_STORED_IN_BUNDLE',mayUseAsFullScreenBackground:false}],
  unresolved:[{kind:'font',status:'UNKNOWN_FROM_PIXELS'},
    {kind:'illustration-and-icon-layers',status:'UNEXTRACTED'},
    {kind:'responsive-behavior',status:'NOT_OBSERVABLE'},
    {kind:'interaction-and-api',status:'NOT_OBSERVABLE'}],
  state:'STRUCTURE_OWNER_REVIEWED_ASSETS_INCOMPLETE',
  visualVerified:false,sourceBytesChanged:false,remoteRequests:0,
  publishGate:'VERIFY_ORIGINAL_RIGHTS_AND_IMPORT_REQUIRED_ASSETS'
 };
}
