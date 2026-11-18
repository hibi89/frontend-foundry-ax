/* FFAX Design Forge V2.1: deterministic local React variants. No network or model dependency. */
import { buildBrief, newDocument, makeComponent, assertDocument, applyCommand, exportReact, validateProjectImport, THEME_OPTIONS } from './core.mjs';
import {rankOfflineForgeStyles} from './forge-style-intelligence.mjs';

export const FORGE_VARIANT_SCHEMA='ffax.design-variant.v1';
export const FORGE_BUNDLE_SCHEMA='ffax.design-bundle.v1';
// Style-taxonomy research: MIT nextlevelbuilder/ui-ux-pro-max-skill
// pinned repository 7436a6e0b6dc3add7c12d5b6ef1ccd3d410dd7fd; styles.csv blob 7ed18d6ef06557b9a6f2285b87b458fd71e4722f.
// The following authored token values are FFAX adaptations, not copied assets/fonts or an upstream quality certification.
const styles=Object.freeze([
  {id:'editorial',name:'Editorial',rationale:'정보 우선순위와 넓은 여백으로 과한 장식을 줄입니다.',theme:'daylight',layout:'stack',sequence:['Navbar','Hero','Badge','Button','Card','Stat','Form','Tabs','Alert'],origin:'minimalism-and-swiss-style',tokens:{name:'Editorial',surface:'#fafaf9',ink:'#172033',muted:'#475569',accent:'#2563eb',fontStack:'Georgia, serif',radius:12,density:'airy',heroArt:'celestial'}},
  {id:'structured',name:'Structured',rationale:'표·정보 탐색이 많은 서비스에 명확한 카드 그리드를 사용합니다.',theme:'midnight',layout:'grid',sequence:['Navbar','Stat','Card','Table','Chart','Form','Button','Error','Empty'],origin:'minimalism-and-swiss-style',tokens:{name:'Structured',surface:'#0f172a',ink:'#f8fafc',muted:'#94a3b8',accent:'#38bdf8',fontStack:'system-ui, sans-serif',radius:6,density:'compact',heroArt:'grid'}},
  {id:'expressive',name:'Expressive',rationale:'핵심 행동과 브랜드 톤을 강조하되 색상 대비를 우선합니다.',theme:'ocean',layout:'stack',sequence:['Navbar','Hero','Button','Card','Tabs','Stat','Alert','Form','Loader'],origin:'FFAX_ORIGINAL',tokens:{name:'Expressive',surface:'#102a36',ink:'#effaff',muted:'#a5ced7',accent:'#14b8a6',fontStack:"'Malgun Gothic', system-ui, sans-serif",radius:18,density:'balanced',heroArt:'waves'}}
]);
const sensitive=/(?:github_pat_[\w-]{15,}|gh[opusr]_[\w-]{15,}|sk-[\w-]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:password|secret|api[_-]?key|access[_-]?token)\s*[:=]\s*\S+|\.env\b|주민등록번호)/i;
const clean=(v,max=180)=>String(v??'').trim().slice(0,max);
const clone=x=>JSON.parse(JSON.stringify(x));
const isText=(x,max)=>typeof x==='string' && x.length<=max && !/[\u0000-\u001f\u007f]/.test(x);
function requireSafeText(value,max=2000){if(!isText(value,max)||value.trim().length<8||sensitive.test(value))throw Error('FORGE_BRIEF_INVALID_OR_SENSITIVE');return value.trim();}
function checkVariant(variant){if(!variant || variant.schema!==FORGE_VARIANT_SCHEMA || !['A','B','C'].includes(variant.id) || !Number.isInteger(variant.revision)||variant.revision<1||variant.revision>200 || !styles.some(s=>s.id===variant.styleId))throw Error('FORGE_VARIANT_INVALID');validateProjectImport(variant.document);return true;}
function digestHex(buffer){return [...new Uint8Array(buffer)].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function sha256(text){if(!globalThis.crypto?.subtle)throw Error('FORGE_CRYPTO_UNAVAILABLE');return digestHex(await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));}
export function makeForgeBrief({prompt,audience='',mood='',mustHave='',avoid=''}={}){
 const raw=requireSafeText(prompt);
 for(const val of [audience,mood,mustHave,avoid])if(!isText(val,500)||sensitive.test(val))throw Error('FORGE_CONSTRAINT_INVALID');
 const legacy=buildBrief(raw);
 return {schema:'ffax.design-brief.v2',prompt:raw,audience:clean(audience,120)||legacy.users,mood:clean(mood,150)||'균형 잡힌 전문적 디자인',mustHave:clean(mustHave,500),avoid:clean(avoid,500),scope:'LOCAL_PREVIEW_ONLY',rightsConfirmed:false,legacy};
}
export function recommendForgeStyles(brief){
 const offline=rankOfflineForgeStyles(brief);
 return offline.map(item=>{
  const s=styles.find(x=>x.id===item.styleId);
  return {
   styleId:s.id,name:s.name,rationale:item.rationale+' · '+s.rationale,
   rank:item.rank,theme:s.theme,layout:s.layout,
   category:item.matchedCategories,antiPatterns:item.antiPatterns,
   confidence:item.confidence,fallback:item.fallback,matchingRules:item.matchingRules,
   source:s.origin==='FFAX_ORIGINAL'
    ? {provider:'FFAX',kind:'builtin',license:'internal',version:'2.1',offlineRules:item.source}
    : {provider:'UI UX Pro Max',kind:'inspired-style-taxonomy',license:'MIT',
       repo:'nextlevelbuilder/ui-ux-pro-max-skill',
       sha:'7436a6e0b6dc3add7c12d5b6ef1ccd3d410dd7fd',
       styleId:s.origin,offlineRules:item.source,
       notice:'Rule pack authored in FFAX; no upstream fonts/assets or quality certification.'},
   quality:'RULE_BASED_NOT_AESTHETICALLY_VERIFIED'
  };
 });
}
export function generateForgeVariants(brief){
 const recommendations=recommendForgeStyles(brief);
 return recommendations.map((rec,index)=>{
   const style=styles.find(s=>s.id===rec.styleId);
   const doc=newDocument(brief.legacy,style.layout==='grid'?'B':'A');
   doc.title=clean(brief.legacy.objective,120);
   doc.theme=style.theme;doc.layout=style.layout;doc.designSystem=clone(style.tokens);
   doc.components=style.sequence.map((type,i)=>{
     const subject=type==='Hero'?brief.legacy.objective:type==='Navbar'?(brief.legacy.pages.slice(0,3).join(' · ')||brief.legacy.objective):type==='Card'?(brief.mustHave||brief.legacy.features.slice(0,2).join(' · ')||'서비스 개요'):undefined;
     return makeComponent(type,'node-'+(i+1),subject);
   });
   assertDocument(doc);validateProjectImport(doc);
   return {schema:FORGE_VARIANT_SCHEMA,id:['A','B','C'][index],styleId:style.id,revision:1,parentVariantId:null,brief:{prompt:brief.prompt,audience:brief.audience,mood:brief.mood,mustHave:brief.mustHave,avoid:brief.avoid},document:doc,recommendation:rec,previewStatus:'SOURCE_READY_RENDER_NOT_VERIFIED'};
 });
}
export function refineForgeVariant(variant,{kind,id,prop,value}={}){
 checkVariant(variant);
 let command;
 if(kind==='theme' && typeof value==='string' && Object.hasOwn(THEME_OPTIONS,value))command={kind:'theme',value};
 else if(kind==='update' && typeof id==='string' && ['text','spacing','align','color','type'].includes(prop))command={kind,id,prop,value};
 else if(kind==='move' && typeof id==='string' && Number.isInteger(value))command={kind:'move',id,index:value};
 else if(kind==='insert' && typeof value==='string')command={kind:'insert',type:value};
 else if(kind==='remove' && typeof id==='string')command={kind:'remove',id};
 else if(kind==='token' && typeof prop==='string' && typeof value!=='undefined'){
  const valid={
   radius:[6,12,18,24],density:['airy','balanced','compact'],
   fontStack:['system-ui, sans-serif','Georgia, serif','Arial, sans-serif',"'Malgun Gothic', system-ui, sans-serif"],
   heroArt:['none','celestial','grid','waves']
  };
  if(!Object.hasOwn(valid,prop)||!valid[prop].includes(value))throw Error('FORGE_TOKEN_VALUE_UNSUPPORTED');
  command={kind:'token',prop,value};
 }else throw Error('FORGE_REFINEMENT_UNSUPPORTED');
 const result=clone(variant);
 if(command.kind==='theme' && variant.document.designSystem){
   const previous=variant.document.designSystem;
   const palette=THEME_OPTIONS[command.value];
   result.document=clone(variant.document);
   result.document.theme=command.value;
   result.document.designSystem={...previous,
     surface:palette.surface,accent:palette.accent,ink:palette.ink,muted:palette.muted};
   result.document.version++;
 }else if(command.kind==='token'){
   if(!variant.document.designSystem)throw Error('FORGE_TOKEN_SYSTEM_MISSING');
   result.document=clone(variant.document);
   result.document.designSystem[command.prop]=command.value;
   result.document.version++;
 }else result.document=applyCommand(variant.document,command);
 result.parentVariantId=variant.id+':'+variant.revision;result.revision++;
 result.previewStatus='SOURCE_READY_RENDER_NOT_VERIFIED';checkVariant(result);return result;
}
export function mixForgeVariants(primary,secondary,{takeTheme=true,takeLayout=false,takeTypography=false,takeDecorations=false,takeComponentStyles=false}={}){
 checkVariant(primary);checkVariant(secondary);
 const next=clone(primary);next.parentVariantId=primary.id+':'+primary.revision;next.revision++;
 const tokens=next.document.designSystem,other=secondary.document.designSystem;
 if(takeTheme){
  next.document.theme=secondary.document.theme;
  if(tokens&&other){for(const color of ['surface','accent','ink','muted'])tokens[color]=other[color];}
 }
 if(takeLayout)next.document.layout=secondary.document.layout;
 if(takeTypography&&tokens&&other){tokens.fontStack=other.fontStack;tokens.density=other.density;}
 if(takeDecorations&&tokens&&other){tokens.radius=other.radius;tokens.heroArt=other.heroArt;}
 if(takeComponentStyles){
  const firstByType=new Map();
  for(const node of secondary.document.components)if(!firstByType.has(node.type))firstByType.set(node.type,node);
  next.document.components=next.document.components.map(node=>{
   const candidate=firstByType.get(node.type);
   // Only visual properties: retain original text, type, ids, and action contracts.
   return candidate?{...node,spacing:candidate.spacing,align:candidate.align,color:candidate.color}:node;
  });
 }
 next.document.version++;next.previewStatus='SOURCE_READY_RENDER_NOT_VERIFIED';checkVariant(next);return next;
}
export function adoptLocalModelDesign(variant,document,{approval,model,sha256:outputSha256}={}){
 checkVariant(variant);
 if(approval!=='APPROVE_LOCAL_DESIGN_VARIANT')throw Error('FORGE_MODEL_APPROVAL_REQUIRED');
 if(model!=='qwen3:4b-instruct'||!/^[a-f0-9]{64}$/.test(outputSha256||''))throw Error('FORGE_MODEL_RECEIPT_INVALID');
 validateProjectImport(document);
 const next=clone(variant);next.parentVariantId=variant.id+':'+variant.revision;next.revision++;
 next.document=clone(document);
 // Preserve the approved FFAX design tokens and local style ownership; only replace typed component structure.
 next.document.designSystem=clone(variant.document.designSystem);
 next.document.theme=variant.document.theme;
 next.modelReceipt={model,sha256:outputSha256,origin:'LOCAL_OWNER_APPROVED_TEXT_JSON',external:false};
 next.previewStatus='SOURCE_READY_RENDER_NOT_VERIFIED';
 checkVariant(next);
 return next;
}
export async function freezeForgeVariant(variant,{approval,referencePng=null}={}){
 checkVariant(variant);
 if(approval!=='APPROVE_FORGE_REFERENCE')throw Error('FORGE_OWNER_APPROVAL_REQUIRED');
 const source=exportReact(variant.document);
 const project=clone(variant.document);
 const manifest={schema:FORGE_BUNDLE_SCHEMA,source:'FFAX_FORGE_NATIVE',variantId:variant.id,revision:variant.revision,styleId:variant.styleId,project,reactSource:source,assets:[],designTokens:{theme:project.theme,layout:project.layout},referencePng};
 if(variant.sourceEvidence?.assetManifest?.schema==='ffax.external-asset-manifest.v1'){
  // Hash provenance and explicit unknowns with the owner-approved React source; no raster bytes embedded.
  if(variant.sourceEvidence.assetManifest.reference.sha256!==variant.sourceEvidence.externalImageSha256)
   throw Error('FORGE_EXTERNAL_ASSET_REFERENCE_MISMATCH');
  manifest.externalAssetManifest=clone(variant.sourceEvidence.assetManifest);
 }
 const receipt=await sha256(JSON.stringify(manifest));
 return {schema:FORGE_BUNDLE_SCHEMA,manifest,sha256:receipt,approval:'OWNER_APPROVED_THIS_VARIANT',renderProof:referencePng?'SUPPLIED_NOT_INDEPENDENTLY_VERIFIED':'PENDING_PLAYWRIGHT_CAPTURE',handoff:'SAME_SOURCE_REACT_NOT_SCREENSHOT_RECONSTRUCTION'};
}
export async function finalizeForgeBundleWithCapture(bundle,captureReceipt,{approval}={}){
 if(approval!=='APPROVE_FINAL_REFERENCE_PNG')throw Error('FORGE_FINAL_IMAGE_APPROVAL_REQUIRED');
 await verifyForgeBundle(bundle);
 if(bundle.manifest.referencePng!==null)throw Error('FORGE_REFERENCE_IMAGE_ALREADY_LOCKED');
 if(captureReceipt?.schema!=='ffax.capture.v1'||captureReceipt.engine!=='playwright-chromium'||
    captureReceipt.bundleSha256!==bundle.sha256 || !/^[a-f0-9]{64}$/.test(captureReceipt.sha256||'') ||
    !Number.isInteger(captureReceipt.width)||!Number.isInteger(captureReceipt.height)||
    captureReceipt.width<320||captureReceipt.height<320||captureReceipt.width>2560||captureReceipt.height>2200||
    ![1,2].includes(captureReceipt.dpr))throw Error('FORGE_CAPTURE_RECEIPT_INVALID');
 const next=clone(bundle);
 next.manifest.parentBundleSha256=bundle.sha256;
 next.manifest.referencePng={sha256:captureReceipt.sha256,width:captureReceipt.width,height:captureReceipt.height,dpr:captureReceipt.dpr,engine:'playwright-chromium',browserVersion:captureReceipt.browserVersion};
 next.sha256=await sha256(JSON.stringify(next.manifest));
 next.renderProof='OWNER_APPROVED_PNG_SHA_WITH_PLAYWRIGHT_RECEIPT';
 next.handoff='SOURCE_AND_RENDER_PNG_HASH_LOCKED';
 await verifyForgeBundle(next);
 return next;
}
export async function verifyForgeBundle(bundle){
 if(bundle?.schema!==FORGE_BUNDLE_SCHEMA||!bundle.manifest||typeof bundle.sha256!=='string'||!/^[a-f0-9]{64}$/.test(bundle.sha256))throw Error('FORGE_BUNDLE_INVALID');
 validateProjectImport(bundle.manifest.project);
 if(bundle.manifest.reactSource!==exportReact(bundle.manifest.project))throw Error('FORGE_BUNDLE_SOURCE_MISMATCH');
 if(await sha256(JSON.stringify(bundle.manifest))!==bundle.sha256)throw Error('FORGE_BUNDLE_HASH_MISMATCH');
 return clone(bundle.manifest.project);
}
