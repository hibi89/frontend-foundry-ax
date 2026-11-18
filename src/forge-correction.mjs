/* FFAX bounded candidate-only visual patch loop. No arbitrary CSS strings or source writes. */
import {refineForgeVariant} from './design-forge.mjs';
import {exportReact,validateProjectImport} from './core.mjs';

export const MAX_FORGE_CORRECTION_PASSES=5;
export function proposeTypedVisualFixes(issues,variant){
 if(!Array.isArray(issues)||issues.length>80||!variant?.document)throw Error('FORGE_VISUAL_ISSUES_INVALID');
 validateProjectImport(variant.document);
 const available=new Set(variant.document.components.map(n=>n.id));
 const proposals=[],unsupported=[];
 for(const issue of issues){
  if(!issue||typeof issue!=='object'||!['spacing','alignment','color-token','typography','layout','missing-asset'].includes(issue.kind)){unsupported.push('UNKNOWN_ISSUE');continue;}
  if(issue.kind==='spacing' && available.has(issue.componentId)&&[8,16,24,32].includes(issue.suggestedPadding)){
   proposals.push({schema:'ffax.visual-patch.v1',kind:'update',id:issue.componentId,prop:'spacing',value:issue.suggestedPadding});
  }else if(issue.kind==='alignment' && available.has(issue.componentId)&&['start','center','end'].includes(issue.suggestedAlign)){
   proposals.push({schema:'ffax.visual-patch.v1',kind:'update',id:issue.componentId,prop:'align',value:issue.suggestedAlign});
  }else{
   unsupported.push(issue.kind.toUpperCase()+'_MANUAL_REVIEW');
  }
 }
 return {schema:'ffax.visual-patch-plan.v1',proposals:proposals.slice(0,MAX_FORGE_CORRECTION_PASSES),unsupported,action:'LOCAL_CANDIDATE_ONLY',sourceModified:false,needsRealRecapture:true};
}
export function applyBoundedVisualPatches(variant,plan,{approval,maxPasses=MAX_FORGE_CORRECTION_PASSES}={}){
 if(approval!=='APPROVE_CANDIDATE_ONLY_PATCH')throw Error('FORGE_PATCH_OWNER_APPROVAL_REQUIRED');
 if(!plan||plan.schema!=='ffax.visual-patch-plan.v1'||!Array.isArray(plan.proposals)||plan.proposals.length>MAX_FORGE_CORRECTION_PASSES)throw Error('FORGE_PATCH_PLAN_INVALID');
 if(!Number.isInteger(maxPasses)||maxPasses<1||maxPasses>MAX_FORGE_CORRECTION_PASSES)throw Error('FORGE_PATCH_BUDGET_INVALID');
 let current=structuredClone(variant);
 const checkpoints=[{pass:0,document:structuredClone(current.document),reactSource:exportReact(current.document)}];
 const stop=Math.min(maxPasses,plan.proposals.length);
 for(let n=0;n<stop;n++){
  const patch=plan.proposals[n];
  if(patch?.schema!=='ffax.visual-patch.v1'||patch.kind!=='update'||!['spacing','align'].includes(patch.prop)||typeof patch.id!=='string')throw Error('FORGE_PATCH_UNSAFE_PROPERTY');
  current=refineForgeVariant(current,patch);
  checkpoints.push({pass:n+1,document:structuredClone(current.document),reactSource:exportReact(current.document)});
 }
 return {schema:'ffax.visual-patch-result.v1',status:'CANDIDATE_ONLY_RECAPTURE_REQUIRED',candidate:current,passesApplied:stop,checkpoints,rollbackDocument:structuredClone(variant.document),sourceModified:false,ownerProductionApproval:false};
}
