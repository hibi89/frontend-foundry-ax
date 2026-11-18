import test from 'node:test';
import assert from 'node:assert/strict';
import {makeForgeBrief,generateForgeVariants} from '../src/design-forge.mjs';
import {proposeTypedVisualFixes,applyBoundedVisualPatches} from '../src/forge-correction.mjs';
test('typed visual fix plan applies candidate-only changes with rollback snapshots',()=>{
 const [variant]=generateForgeVariants(makeForgeBrief({prompt:'역학 달력 화면에 카드와 날짜 검색 폼을 보여줘'}));
 const target=variant.document.components[0].id;
 const plan=proposeTypedVisualFixes([{kind:'spacing',componentId:target,suggestedPadding:32},{kind:'missing-asset',componentId:target}],variant);
 assert.equal(plan.proposals.length,1);assert.ok(plan.unsupported.includes('MISSING-ASSET_MANUAL_REVIEW')||plan.unsupported.includes('MISSING-ASSET_MANUAL_REVIEW'.replace('-','-')));
 assert.throws(()=>applyBoundedVisualPatches(variant,plan,{approval:'UNAPPROVED'}),/FORGE_PATCH_OWNER_APPROVAL_REQUIRED/);
 const outcome=applyBoundedVisualPatches(variant,plan,{approval:'APPROVE_CANDIDATE_ONLY_PATCH'});
 assert.equal(outcome.passesApplied,1);assert.equal(outcome.checkpoints.length,2);assert.equal(outcome.sourceModified,false);
 assert.equal(outcome.candidate.document.components[0].spacing,32);
 assert.notEqual(outcome.candidate.document.components[0].spacing,variant.document.components[0].spacing);
 assert.deepEqual(outcome.rollbackDocument,variant.document);
});
test('unsafe patch values fail closed',()=>{
 const [variant]=generateForgeVariants(makeForgeBrief({prompt:'고품질 랜딩페이지 프론트엔드를 구성해줘'}));
 const malicious={schema:'ffax.visual-patch-plan.v1',proposals:[{schema:'ffax.visual-patch.v1',kind:'update',id:variant.document.components[0].id,prop:'script',value:'alert(1)'}]};
 assert.throws(()=>applyBoundedVisualPatches(variant,malicious,{approval:'APPROVE_CANDIDATE_ONLY_PATCH'}),/FORGE_PATCH_UNSAFE_PROPERTY/);
});
