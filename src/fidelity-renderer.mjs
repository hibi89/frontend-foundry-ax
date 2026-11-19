/* FID-06: typed, bounded nested scene -> actual React TSX/CSS and same-tree static preview.
 * Input: owner-reviewed geometry + optional manual text. No OCR, artwork synthesis,
 * external assets/JS, customer source writes or fidelity score claims.
 */
const SHA=/^[a-f0-9]{64}$/,RGB=/^#[a-f0-9]{6}$/i;
// Fixed local font stacks only: never interpolate user-provided font/CSS/URL.
const fontStacks=Object.freeze({
 'system-ui':'system-ui,sans-serif',
 'serif':'Georgia,"Times New Roman",serif',
 'korean-serif':'"Nanum Myeongjo","Batang",serif',
 'korean-sans':'"Malgun Gothic","Noto Sans KR",sans-serif',
 'monospace':'ui-monospace,monospace'
});
const textAlignments=new Set(['left','center','right']);
const roles=Object.freeze({
 canvas:'main',section:'section',panel:'div',navbar:'nav',hero:'header',card:'article',
 sidebar:'aside',content:'section',footer:'footer',image:'div',text:'div',
 button:'button',form:'div',table:'div',chart:'figure',decorative:'div'
});
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
 .replaceAll('"','&quot;').replaceAll("'",'&#39;');
const bbox=b=>b&&[b.x,b.y,b.width,b.height].every(Number.isInteger)&&
 b.x>=0&&b.y>=0&&b.width>0&&b.height>0;
const inside=(outer,child)=>child.x>=outer.x&&child.y>=outer.y&&
 child.x+child.width<=outer.x+outer.width&&child.y+child.height<=outer.y+outer.height;
function checked(scene,typography,assets){
 if(scene?.schema!=='ffax.fidelity-scene.v1'||!SHA.test(scene.sourceSha256||'')||
   !Number.isInteger(scene.width)||!Number.isInteger(scene.height)||
   scene.width<1||scene.height<1||scene.width>10000||scene.height>10000||
   scene.width*scene.height>32000000||
   !Number.isInteger(scene.revision)||scene.revision<1||
   !Array.isArray(scene.regions)||scene.regions.length<2||scene.regions.length>24)
  throw Error('FIDELITY_RENDER_SCENE_INVALID');
 const byId=new Map();
 for(const r of scene.regions){
  if(!r||typeof r.id!=='string'||!/^[a-z0-9-]{2,64}$/.test(r.id)||byId.has(r.id)||
   !Object.hasOwn(roles,r.role)||!bbox(r.bounds)||
   r.bounds.x+r.bounds.width>scene.width||r.bounds.y+r.bounds.height>scene.height||
   !RGB.test(r.style?.background||'')||
   (r.style.radius!==undefined&&(!Number.isInteger(r.style.radius)||r.style.radius<0||r.style.radius>48))||
   (r.style.opacity!==undefined&&(!Number.isFinite(r.style.opacity)||r.style.opacity<0||r.style.opacity>1)))
   throw Error('FIDELITY_RENDER_REGION_INVALID');
  byId.set(r.id,r);
 }
 const roots=scene.regions.filter(x=>x.parentId===null);
 if(roots.length!==1||roots[0].id!=='canvas'||roots[0].role!=='canvas'||
   roots[0].bounds.x!==0||roots[0].bounds.y!==0||
   roots[0].bounds.width!==scene.width||roots[0].bounds.height!==scene.height)
  throw Error('FIDELITY_RENDER_ROOT_INVALID');
 for(const r of scene.regions){
  if(r.id==='canvas')continue;
  let p=byId.get(r.parentId),depth=0;
  if(!p||!inside(p.bounds,r.bounds))throw Error('FIDELITY_RENDER_PARENT_INVALID');
  while(p){
   if(++depth>scene.regions.length||p.id===r.id)throw Error('FIDELITY_RENDER_PARENT_CYCLE');
   p=byId.get(p.parentId);
  }
 }
 if(typography!==null){
  if(typography?.schema!=='ffax.fidelity-typography.v1'||
   typography.referenceSha256!==scene.sourceSha256||
   typography.sceneRevision!==scene.revision||
   typography.ocr?.status!=='NOT_RUN_NO_LOCAL_ENGINE'||
   !Array.isArray(typography.textBoxes)||typography.textBoxes.length>32)
   throw Error('FIDELITY_RENDER_TYPOGRAPHY_INVALID');
  for(const t of typography.textBoxes){
   const p=byId.get(t.regionId);
   if(!p||!bbox(t.bounds)||!inside(p.bounds,t.bounds)||
    typeof t.text!=='string'||t.text.length>200||/[\u0000-\u001f\u007f<>]/u.test(t.text)||
    t.confidence!=='OWNER_SUPPLIED_NOT_OCR'||
    (t.fontSize!==undefined&&(!Number.isInteger(t.fontSize)||t.fontSize<8||t.fontSize>96))||
    (t.fontWeight!=='UNKNOWN'&&t.fontWeight!==undefined&&
      (!Number.isInteger(t.fontWeight)||t.fontWeight<100||t.fontWeight>900||t.fontWeight%100!==0))||
    (t.fontColor!==undefined&&!RGB.test(t.fontColor))||
    (t.fontFamily!==undefined&&t.fontFamily!=='UNKNOWN'&&!Object.hasOwn(fontStacks,t.fontFamily))||
    (t.textAlign!==undefined&&!textAlignments.has(t.textAlign))||
    (t.lineHeight!==undefined&&t.lineHeight!=='UNKNOWN'&&(!Number.isFinite(t.lineHeight)||t.lineHeight<.8||t.lineHeight>2.5))||
    (t.letterSpacing!==undefined&&(!Number.isFinite(t.letterSpacing)||t.letterSpacing< -2||t.letterSpacing>8)))
    throw Error('FIDELITY_RENDER_TEXT_INVALID');
  }
 }
 if(assets!==null){
  if(assets?.schema!=='ffax.fidelity-local-assets.v1'||assets.referenceSha256!==scene.sourceSha256||
   !Array.isArray(assets.assets)||!Array.isArray(assets.requiredKinds)||
   !Array.isArray(assets.missingKinds))
   throw Error('FIDELITY_RENDER_ASSETS_INVALID');
  // Manifest hashes alone cannot display bytes; never promise fidelity with missing originals.
  if(assets.requiredKinds.length||assets.missingKinds.length)
   throw Error('FIDELITY_RENDER_REQUIRED_ASSET_BYTES_NOT_IMPORTED');
 }
 return byId;
}
export function createFidelityArtifacts(scene,{typography=null,assets=null,dpr=1,approval}={}){
 if(approval!=='APPROVE_FIDELITY_SCENE_SOURCE_EXPORT')
  throw Error('FIDELITY_RENDER_OWNER_APPROVAL_REQUIRED');
 const byId=checked(scene,typography,assets);
 // Owner reference coordinates use original *physical* image pixels.
 // A 2x screenshot must produce half-size CSS geometry and double-density PNG
 // without modifying the reference Scene itself or widening source authority.
 if(![1,2].includes(dpr)||scene.width%dpr!==0||scene.height%dpr!==0)
  throw Error('FIDELITY_RENDER_DPR_UNSUPPORTED');
 const cssPx=n=>n/dpr;
 const index=new Map(scene.regions.map((r,i)=>[r.id,i]));
 const children=new Map(scene.regions.map(r=>[r.id,[]]));
 for(const r of scene.regions)if(r.parentId!==null)children.get(r.parentId).push(r);
 const texts=typography?.textBoxes||[];
 const textFor=id=>texts.filter(t=>t.regionId===id);
 const css=[
  // The canvas is an actual painted layer; omitting its background changes
  // all uncovered pixels (including the negative space around child regions).
  ".ffax-v3-root { position:relative; box-sizing:border-box; width:"+cssPx(scene.width)+
   "px; height:"+cssPx(scene.height)+"px; overflow:hidden; background-color:"+
   byId.get('canvas').style.background+"; font-family:system-ui,sans-serif; }",
  ".ffax-v3-root * { box-sizing:border-box; }",
  ".ffax-v3-node { position:absolute; margin:0; padding:0; }",
  ".ffax-v3-text { position:absolute; margin:0; white-space:pre-wrap; font:inherit; }"
 ];
 for(const r of scene.regions){
  if(r.id==='canvas')continue;
  const parent=byId.get(r.parentId),at=index.get(r.id),x=r.bounds.x-parent.bounds.x,y=r.bounds.y-parent.bounds.y;
  css.push(".ffax-v3-node-"+at+" { left:"+cssPx(x)+"px; top:"+cssPx(y)+
   "px; width:"+cssPx(r.bounds.width)+"px; height:"+cssPx(r.bounds.height)+
   "px; background-color:"+r.style.background+";"+
   (r.style.radius!==undefined?" border-radius:"+cssPx(r.style.radius)+"px;":"")+
   (r.style.opacity!==undefined?" opacity:"+r.style.opacity+";":"")+" }");
 }
 for(let i=0;i<texts.length;i++){
  const t=texts[i],parent=byId.get(t.regionId);
  css.push(".ffax-v3-text-"+i+" { left:"+cssPx(t.bounds.x-parent.bounds.x)+
   "px; top:"+cssPx(t.bounds.y-parent.bounds.y)+
   "px; width:"+cssPx(t.bounds.width)+"px; height:"+cssPx(t.bounds.height)+"px;"+
   (t.fontSize!==undefined?" font-size:"+cssPx(t.fontSize)+"px;":"")+
   (t.fontWeight!=='UNKNOWN'&&t.fontWeight!==undefined?" font-weight:"+t.fontWeight+";":"")+
   (t.fontColor?" color:"+t.fontColor+";":"")+
   (t.fontFamily!==undefined&&t.fontFamily!=='UNKNOWN'?" font-family:"+fontStacks[t.fontFamily]+";":"")+
   (t.textAlign!==undefined?" text-align:"+t.textAlign+";":"")+
   (t.lineHeight!==undefined&&t.lineHeight!=='UNKNOWN'?" line-height:"+t.lineHeight+";":"")+
   (t.letterSpacing!==undefined?" letter-spacing:"+cssPx(t.letterSpacing)+"px;":"")+" }");
 }
 function node(r,react){
  const root=r.id==='canvas',tag=roles[r.role];
  const klass=root?'ffax-v3-root':'ffax-v3-node ffax-v3-node-'+index.get(r.id);
  const attrs=react?'className='+JSON.stringify(klass):'class="'+esc(klass)+'"';
  const dataAttr=' data-ffax-region='+JSON.stringify(r.id);
  const action=r.role==='button'?
   react?' type="button" onClick={()=>onAction?.('+JSON.stringify(r.id)+')}':' type="button" data-preview-only="true"':'';
  const contents=[];
  for(let i=0;i<texts.length;i++){
   const t=texts[i];if(t.regionId!==r.id)continue;
   const cls='ffax-v3-text ffax-v3-text-'+i;
   if(react)contents.push('<span className='+JSON.stringify(cls)+
    '>{textSlots['+JSON.stringify(t.id)+'] ?? '+JSON.stringify(t.text)+'}</span>');
   else contents.push('<span class="'+esc(cls)+'">'+esc(t.text)+'</span>');
  }
  for(const child of children.get(r.id))contents.push(node(child,react));
  return '<'+tag+' '+attrs+dataAttr+action+'>'+contents.join('')+'</'+tag+'>';
 }
 const markup=node(byId.get('canvas'),false),reactTree=node(byId.get('canvas'),true);
 const cssOutput=css.join('\n')+'\n';
 const tsx='import * as React from "react";\nimport "./FidelityScene.css";\n'+
  'export type FidelitySceneProps = {textSlots?:Record<string,string>;onAction?:(id:string)=>void};\n'+
  'export default function FidelityScene({textSlots={},onAction}:FidelitySceneProps){\n'+
  'return ('+reactTree+');\n}\n';
 const html='<!doctype html><html lang="ko"><head><meta charset="utf-8">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<style>'+cssOutput+'</style></head><body style="margin:0">'+markup+'</body></html>';
 return {schema:'ffax.fidelity-render-artifacts.v1',sourceSha256:scene.sourceSha256,
  sceneRevision:scene.revision,dpr,pixelWidth:scene.width,pixelHeight:scene.height,
  cssWidth:cssPx(scene.width),cssHeight:cssPx(scene.height),
  tsx,css:cssOutput,html,regionCount:scene.regions.length,
  textBoxCount:texts.length,
  status:'STRUCTURAL_CANDIDATE_NOT_VISUALLY_OR_FUNCTIONALLY_VERIFIED',
  warnings:['STATIC_VIEWPORT_ONLY','UNKNOWN_FONTS_AND_RASTER_ASSETS',
   'TEXT_OCR_NOT_RUN','CUSTOMER_APP_BINDINGS_NOT_VALIDATED'],
  externalRequests:0,originalSourceModified:false,canPublish:false};
}
