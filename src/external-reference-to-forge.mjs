/* Conservative external screenshot → FFAX typed source, with owner-labeled regions.
 * Flat PNG pixels cannot prove hidden assets, fonts, behavior or text.
 * This explicitly guided reconstruction is the safe fallback when vision/OCR is absent.
 */
import {buildBrief,newDocument,createReference,approveReference,makeComponent,REGISTRY,validateProjectImport,exportReact} from './core.mjs';
import {freezeForgeVariant} from './design-forge.mjs';
const hex=/^#[a-f0-9]{6}$/i;
export function mapReferenceToSource(inventory,annotations,{prompt,approval,rightsConfirmed=false}={}){
 if(approval!=='APPROVE_EXTERNAL_REFERENCE_MAPPING'||rightsConfirmed!==true)throw Error('EXTERNAL_REFERENCE_OWNER_APPROVAL_REQUIRED');
 if(!inventory||inventory.schema!=='ffax.external-reference-inventory.v1'||
    inventory.rightsConfirmed!==true||!/^[a-f0-9]{64}$/.test(inventory.sha256||'')||
    !Number.isInteger(inventory.width)||!Number.isInteger(inventory.height)||
    inventory.width<1||inventory.height<1||inventory.width>10000||inventory.height>10000||
    !Array.isArray(inventory.regions)||inventory.regions.length!==3||
    !Array.isArray(inventory.paletteHints)||inventory.paletteHints.length!==3||
    !inventory.paletteHints.every(x=>typeof x==='string'&&hex.test(x)))throw Error('EXTERNAL_REFERENCE_INVENTORY_INVALID');
 if(typeof prompt!=='string'||prompt.trim().length<8||prompt.length>2000)throw Error('EXTERNAL_REFERENCE_BRIEF_REQUIRED');
 if(!Array.isArray(annotations)||annotations.length<1||annotations.length>12)throw Error('EXTERNAL_REFERENCE_ANNOTATIONS_INVALID');
 const available=new Set(inventory.regions.map(x=>x.id)),components=[];
 for(const entry of annotations){
  if(!entry||typeof entry!=='object'||Object.keys(entry).sort().join(',')!=='regionId,text,type'||
    !available.has(entry.regionId)||!Object.hasOwn(REGISTRY,entry.type)||
    typeof entry.text!=='string'||entry.text.trim().length<1||entry.text.length>180||
    /[\u0000-\u001f\u007f]/.test(entry.text))throw Error('EXTERNAL_REFERENCE_REGION_MAPPING_INVALID');
  components.push(makeComponent(entry.type,'node-'+(components.length+1),entry.text.trim()));
 }
 const brief=buildBrief(prompt);
 const blank=newDocument(brief,'A');
 const named=typeof inventory.name==='string'&&inventory.name.trim()?inventory.name:'external-reference.png';
 let project=createReference(blank,named,true,
    [inventory.paletteHints[0],inventory.paletteHints[2]],'owner-labeled-png',
    {sha256:inventory.sha256,width:inventory.width,height:inventory.height});
 project=approveReference(project,'A');
 project.components=components;
 validateProjectImport(project);
 return {schema:'ffax.design-variant.v1',id:'A',styleId:'editorial',revision:1,parentVariantId:null,
   document:project,brief:{prompt},recommendation:{name:'Owner-labeled external image',rationale:'직접 확인한 영역만 코드로 변환'},
   sourceEvidence:{externalImageSha256:inventory.sha256,regions:annotations.map(x=>({...x})),
     missingAssets:'REQUIRES_OWNER_ASSET_IMPORT',fonts:'UNKNOWN',text:'OWNER_SUPPLIED',
     visualFidelity:'UNASSESSED',network:false,automaticLayerRecovery:false},
   previewStatus:'MANUAL_REGION_SOURCE_READY_VISUAL_UNVERIFIED'};
}
export async function approveMappedReference(inventory,annotations,options){
 const variant=mapReferenceToSource(inventory,annotations,options);
 const bundle=await freezeForgeVariant(variant,{approval:'APPROVE_FORGE_REFERENCE'});
 return {variant,bundle,reactSource:exportReact(variant.document),evidence:variant.sourceEvidence};
}
