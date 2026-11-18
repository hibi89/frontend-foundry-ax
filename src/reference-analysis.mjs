/* Browser-only image inventory for external references. This does NOT infer hidden layers or fonts. */
const MAX_FILE=4*1024*1024;
const TYPES=new Set(['image/png','image/jpeg','image/webp']);
export async function analyzeUserReference(file,{rightsConfirmed=false}={}){
 if(!rightsConfirmed)throw Error('REFERENCE_RIGHTS_REQUIRED');
 if(!file||!TYPES.has(file.type)||!Number.isInteger(file.size)||file.size<33||file.size>MAX_FILE)throw Error('REFERENCE_FILE_INVALID');
 if(!globalThis.crypto?.subtle||typeof createImageBitmap!=='function')throw Error('REFERENCE_BROWSER_CAPABILITY_MISSING');
 const bytes=await file.arrayBuffer();
 const sha=await crypto.subtle.digest('SHA-256',bytes);
 const sha256=[...new Uint8Array(sha)].map(x=>x.toString(16).padStart(2,'0')).join('');
 let bitmap;
 try{
  bitmap=await createImageBitmap(file);
  const width=bitmap.width,height=bitmap.height;
  if(width<1||height<1||width>10000||height>10000||width*height>32000000)throw Error('REFERENCE_DIMENSIONS_INVALID');
  const c=document.createElement('canvas');c.width=60;c.height=48;
  const context=c.getContext('2d',{willReadFrequently:true});
  if(!context)throw Error('REFERENCE_CANVAS_UNAVAILABLE');
  context.drawImage(bitmap,0,0,c.width,c.height);
  const rgba=context.getImageData(0,0,c.width,c.height).data;
  const regions=[];
  for(let i=0;i<3;i++){
   const minY=i*16,maxY=(i+1)*16;let r=0,g=0,b=0,total=0;
   for(let y=minY;y<maxY;y++)for(let x=0;x<60;x++){
    const at=(y*60+x)*4;if(rgba[at+3]<128)continue;
    r+=rgba[at];g+=rgba[at+1];b+=rgba[at+2];total++;
   }
   const rgb=total?[r,g,b].map(x=>Math.round(x/total).toString(16).padStart(2,'0')).join(''):'64748b';
   regions.push({id:'band-'+(i+1),bounds:{x:0,y:Math.floor(height*i/3),width,height:Math.ceil(height/3)},colorHint:'#'+rgb,geometry:'OBSERVED_APPROXIMATE',semantic:'UNKNOWN_REQUIRES_HUMAN_REVIEW'});
  }
  return {schema:'ffax.external-reference-inventory.v1',name:file.name.slice(0,120),mime:file.type,sha256,width,height,bytes:file.size,rightsConfirmed:true,regions,paletteHints:regions.map(x=>x.colorHint),fonts:{status:'UNKNOWN'},textLayers:{status:'UNKNOWN_NO_OCR'},artwork:{status:'UNKNOWN_BEHIND_TEXT'},assetManifest:{status:'NOT_READY_REQUIRES_OWNER_REVIEW'},externalRequests:0,sourceMutated:false};
 }finally{bitmap?.close();}
}
