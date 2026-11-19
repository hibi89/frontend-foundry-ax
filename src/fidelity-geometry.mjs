/* FID-02. Bounded local color-edge segmentation; not OCR or semantic vision. */
const MAX=512*512;
// The visible reference preview is composited onto a white canvas. Raw RGB
// under transparent PNG/WebP pixels is not visible and must not invent edges.
const visibleChannel=(data,i,c)=>Math.round((data[i+c]*data[i+3]+255*(255-data[i+3]))/255);
const dist=(data,a,b)=>{const i=a*4,j=b*4;return (
 Math.abs(visibleChannel(data,i,0)-visibleChannel(data,j,0))+
 Math.abs(visibleChannel(data,i,1)-visibleChannel(data,j,1))+
 Math.abs(visibleChannel(data,i,2)-visibleChannel(data,j,2)))/3;};
function pickCuts(energy,length,limit){
 const max=Math.max(0,...energy),average=energy.reduce((a,b)=>a+b,0)/Math.max(1,length);
 if(max<24)return [];
 const threshold=Math.max(24,2*average,0.38*max);
 const gap=Math.max(4,Math.floor(length*0.12)),ranked=[];
 for(let i=gap;i<length-gap;i++)if(energy[i]>=threshold&&energy[i]>=energy[i-1]&&energy[i]>=energy[i+1])ranked.push(i);
 ranked.sort((a,b)=>energy[b]-energy[a]||a-b);
 const chosen=[];
 for(const n of ranked)if(chosen.every(i=>Math.abs(i-n)>=gap)){chosen.push(n);if(chosen.length===limit)break;}
 return chosen.sort((a,b)=>a-b);
}
function sampleColor(data,width,height,x0,x1,y0,y1){
 const sum=[0,0,0];let valid=0;
 for(const [u,v] of [[.25,.25],[.5,.5],[.75,.75],[.25,.75],[.75,.25]]){
  const x=Math.min(width-1,Math.floor(x0+(x1-x0)*u)),y=Math.min(height-1,Math.floor(y0+(y1-y0)*v));
  const i=(y*width+x)*4;
  for(let k=0;k<3;k++)sum[k]+=visibleChannel(data,i,k);valid++;
 }
 return '#'+(valid?sum.map(n=>Math.round(n/valid).toString(16).padStart(2,'0')).join(''):'64748b');
}
export function segmentReferenceGeometry(image,{sourceWidth,sourceHeight}={}){
 const {width,height,data}=image||{};
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>MAX||
    !(data instanceof Uint8ClampedArray)||data.length!==width*height*4||
    !Number.isInteger(sourceWidth)||!Number.isInteger(sourceHeight)||
    sourceWidth<1||sourceHeight<1||sourceWidth>10000||sourceHeight>10000||
    sourceWidth*sourceHeight>32000000)throw Error('FIDELITY_GEOMETRY_INPUT_INVALID');
 const rows=new Array(height).fill(0);
 for(let y=1;y<height;y++){
  let sum=0;for(let x=0;x<width;x++)sum+=dist(data,y*width+x,(y-1)*width+x);
  rows[y]=sum/width;
 }
 const edges=[0,...pickCuts(rows,height,5),height],regions=[];
 function add(id,parentId,role,x0,x1,y0,y1){
  const x=Math.round(x0*sourceWidth/width),y=Math.round(y0*sourceHeight/height);
  const right=Math.round(x1*sourceWidth/width),bottom=Math.round(y1*sourceHeight/height);
  regions.push({id,parentId,role,bounds:{x,y,width:Math.max(1,right-x),height:Math.max(1,bottom-y)},
   colorHint:sampleColor(data,width,height,x0,x1,y0,y1),
   geometry:'OBSERVED_APPROXIMATE',semantic:'UNKNOWN_REQUIRES_OWNER_REVIEW'});
 }
 add('canvas',null,'canvas',0,width,0,height);
 for(let i=0;i<edges.length-1;i++){
  const y0=edges[i],y1=edges[i+1],section='section-'+(i+1);
  add(section,'canvas','section',0,width,y0,y1);
  const cols=new Array(width).fill(0);
  for(let x=1;x<width;x++){let sum=0;for(let y=y0;y<y1;y++)sum+=dist(data,y*width+x,y*width+x-1);cols[x]=sum/(y1-y0);}
  const cuts=[0,...pickCuts(cols,width,3),width];
  if(cuts.length>2)for(let j=0;j<cuts.length-1;j++)add(section+'-panel-'+(j+1),section,'panel',cuts[j],cuts[j+1],y0,y1);
 }
 return {schema:'ffax.fidelity-geometry.v1',sourceWidth,sourceHeight,sampledWidth:width,sampledHeight:height,
  regions:regions.slice(0,24),confidence:'APPROXIMATE_GEOMETRY_ONLY',ocrPerformed:false,fontRecognition:false,
  assetsRecovered:false,remoteRequests:0,sourceMutated:false};
}
