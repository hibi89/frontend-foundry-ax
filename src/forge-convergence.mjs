/* FFAX P1 bounded compare→patch→recapture loop.
 * Only typed, previously reviewed component edits in a disposable candidate.
 * Improvement is measured on actual PNGs by an injected local renderer/scorer;
 * no assumptions about external one-shot-ui JSON metrics are made.
 */
import {refineForgeVariant} from './design-forge.mjs';
import {validateProjectImport} from './core.mjs';
const MAX_PASSES=5;
const ACCEPTABLE_COLORS=new Set(['accent','neutral']);
function assertPatch(patch,document){
 if(!patch||Object.keys(patch).sort().join(',')!=='id,kind,prop,schema,value'||
   patch.schema!=='ffax.visual-patch.v1'||patch.kind!=='update'||
   typeof patch.id!=='string'||!document.components.some(n=>n.id===patch.id))throw Error('FORGE_LOOP_PATCH_INVALID');
 if(patch.prop==='spacing'&&[8,16,24,32].includes(patch.value))return true;
 if(patch.prop==='align'&&['start','center','end'].includes(patch.value))return true;
 if(patch.prop==='color'&&ACCEPTABLE_COLORS.has(patch.value))return true;
 throw Error('FORGE_LOOP_PROPERTY_FORBIDDEN');
}
function safeScore(result){
 const n=result?.meanAbsoluteChannelError;
 if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>255||
   typeof result?.referenceSha256!=='string'||!/^[a-f0-9]{64}$/.test(result.referenceSha256)||
   typeof result?.renderSha256!=='string'||!/^[a-f0-9]{64}$/.test(result.renderSha256))throw Error('FORGE_LOOP_METRIC_UNTRUSTED');
 return n;
}
/**
 * @param {object} opts - approved candidate and typed patch plan
 * @param {(variant:object, pass:number)=>Promise<{meanAbsoluteChannelError:number,referenceSha256:string,renderSha256:string,receipt?:object}>} opts.measure
 */
export async function runBoundedConvergence({variant,plan,measure,approval,maxPasses=5,minImprovement=0.01}={}){
 if(approval!=='APPROVE_LOCAL_CANDIDATE_CONVERGENCE')throw Error('FORGE_LOOP_APPROVAL_REQUIRED');
 if(typeof measure!=='function')throw Error('FORGE_LOOP_RENDERER_REQUIRED');
 if(!variant||typeof variant!=='object')throw Error('FORGE_LOOP_VARIANT_INVALID');
 validateProjectImport(variant.document);
 if(!plan||plan.schema!=='ffax.visual-patch-plan.v1'||!Array.isArray(plan.proposals)||
   plan.proposals.length>MAX_PASSES)throw Error('FORGE_LOOP_PLAN_INVALID');
 if(!Number.isInteger(maxPasses)||maxPasses<1||maxPasses>MAX_PASSES||
   typeof minImprovement!=='number'||!Number.isFinite(minImprovement)||minImprovement<0||minImprovement>10)throw Error('FORGE_LOOP_BUDGET_INVALID');
 const base=structuredClone(variant);
 const all=plan.proposals.slice(0,maxPasses);
 for(const p of all)assertPatch(p,base.document);
 const records=[];
 const baseline=await measure(structuredClone(base),0);
 let bestScore=safeScore(baseline),best=structuredClone(base),referenceSha=baseline.referenceSha256,nonImproving=0;
 records.push({pass:0,accepted:true,score:bestScore,referenceSha256:referenceSha,renderSha256:baseline.renderSha256,receipt:baseline.receipt??null});
 for(let i=0;i<all.length;i++){
  const patch=all[i];
  // Trial patch is applied to the best known candidate, not the customer's source.
  let trial=refineForgeVariant(best,{kind:'update',id:patch.id,prop:patch.prop,value:patch.value});
  const measured=await measure(structuredClone(trial),i+1);
  const score=safeScore(measured);
  if(measured.referenceSha256!==referenceSha)throw Error('FORGE_LOOP_REFERENCE_CHANGED');
  const improve=bestScore-score>minImprovement;
  records.push({pass:i+1,patch,accepted:improve,score,referenceSha256:referenceSha,renderSha256:measured.renderSha256,receipt:measured.receipt??null});
  if(improve){best=trial;bestScore=score;nonImproving=0;}
  else nonImproving++;
  if(bestScore<=minImprovement || nonImproving>=2)break;
 }
 return {schema:'ffax.bounded-convergence.v1',status:'CANDIDATE_ONLY_OWNER_VISUAL_REVIEW_REQUIRED',
   bestVariant:best,baselineScore:records[0].score,bestScore,referenceSha256:referenceSha,
   records,passesTried:records.length-1,rollbackDocument:structuredClone(base.document),
   originalSourceModified:false,commercialReleaseApproved:false,qualityClaim:'PIXEL_DIAGNOSTIC_ONLY'};
}
