import test from 'node:test';
import assert from 'node:assert/strict';
import {makeForgeBrief,generateForgeVariants} from '../src/design-forge.mjs';
import {planLocalTrials,runBoundedConvergence} from '../src/forge-convergence.mjs';

function original(){return generateForgeVariants(makeForgeBrief({prompt:'역학달력 오늘의 운세를 보여주는 고품질 화면을 디자인해줘'}))[0];}
function measure(reference='a'.repeat(64)){
 return async (candidate,pass)=>{
  const first=candidate.document.components[0];
  const value=first.spacing===24?7:first.align==='center'?8:10;
  return {meanAbsoluteChannelError:value,referenceSha256:reference,renderSha256:(pass+1).toString(16).padStart(64,'0'),receipt:{pass}};
 };
}
test('RF-06: approved bounded loop measures rendered candidates and keeps only improvements',async()=>{
 const candidate=original(),before=JSON.stringify(candidate);
 const plan=planLocalTrials(candidate,{maxPasses:2});
 assert.equal(plan.proposals.length,2);
 const result=await runBoundedConvergence({variant:candidate,plan,measure:measure(),approval:'APPROVE_LOCAL_CANDIDATE_CONVERGENCE',maxPasses:2});
 assert.equal(result.baselineScore,10);
 assert.equal(result.bestScore,7);
 assert.equal(result.passesTried,2);
 assert.equal(result.records[1].accepted,true);
 assert.equal(result.records[2].accepted,false);
 assert.equal(result.bestVariant.document.components[0].spacing,24);
 assert.equal(result.bestVariant.document.components[0].align,'start');
 assert.equal(result.originalSourceModified,false);
 assert.deepEqual(result.rollbackDocument,candidate.document);
 assert.equal(JSON.stringify(candidate),before);
});
test('RF-06: no improvement remains original; forbidden properties fail closed',async()=>{
 const candidate=original();
 const plan=planLocalTrials(candidate,{maxPasses:2});
 const score=async (_,pass)=>({meanAbsoluteChannelError:10+pass,referenceSha256:'a'.repeat(64),renderSha256:'b'.repeat(64)});
 const result=await runBoundedConvergence({variant:candidate,plan,measure:score,approval:'APPROVE_LOCAL_CANDIDATE_CONVERGENCE'});
 assert.deepEqual(result.bestVariant,candidate);assert.equal(result.passesTried,2);
 await assert.rejects(runBoundedConvergence({variant:candidate,plan,measure:score,approval:'WRONG'}),/FORGE_LOOP_APPROVAL_REQUIRED/);
 const malicious={schema:'ffax.visual-patch-plan.v1',proposals:[{schema:'ffax.visual-patch.v1',kind:'update',id:candidate.document.components[0].id,prop:'onClick',value:'fetch(...)'}]};
 await assert.rejects(runBoundedConvergence({variant:candidate,plan:malicious,measure:score,approval:'APPROVE_LOCAL_CANDIDATE_CONVERGENCE'}),/FORGE_LOOP_PROPERTY_FORBIDDEN/);
});
test('RF-06: changed reference SHA or invalid result stops iteration without accepting',async()=>{
 const candidate=original();
 const plan=planLocalTrials(candidate,{maxPasses:1});
 const changed=async(_,pass)=>({meanAbsoluteChannelError:pass===0?10:5,referenceSha256:(pass?'b':'a').repeat(64),renderSha256:'c'.repeat(64)});
 await assert.rejects(runBoundedConvergence({variant:candidate,plan,measure:changed,approval:'APPROVE_LOCAL_CANDIDATE_CONVERGENCE'}),/FORGE_LOOP_REFERENCE_CHANGED/);
 const invalid=async()=>({meanAbsoluteChannelError:NaN,referenceSha256:'a'.repeat(64),renderSha256:'b'.repeat(64)});
 await assert.rejects(runBoundedConvergence({variant:candidate,plan,measure:invalid,approval:'APPROVE_LOCAL_CANDIDATE_CONVERGENCE'}),/FORGE_LOOP_METRIC_UNTRUSTED/);
});
