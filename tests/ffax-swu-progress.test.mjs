import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {computeSourceCandidateRate} from '../scripts/ffax_swu_progress.mjs';
const path=new URL('../docs/FFAX_P1_SWU_REGISTER_20261118.json',import.meta.url);
test('SWU: full FFAX legacy + DF + RF source candidate denominator and P2 separation',async()=>{
 const queue=JSON.parse(await readFile(path,'utf8'));
 const result=computeSourceCandidateRate(queue);
 assert.equal(result.total,25);
 assert.equal(result.sourceCandidateCompleted,19);
 assert.equal(result.partial,6);
 assert.equal(result.sourceCandidatePercent,76);
 assert.equal(result.officialFullBlueprintImplementation,'UNASSESSED');
 assert.equal(result.officialVerification,'UNASSESSED');
 const req=new Set(queue.units.flatMap(x=>x.req_ids));
 assert.deepEqual([...req].sort(),Array.from({length:12},(_,i)=>'REQ-'+String(i+1).padStart(2,'0')));
});
test('SWU: incomplete and duplicated work never raises source completion',async()=>{
 const queue=JSON.parse(await readFile(path,'utf8'));
 const original=computeSourceCandidateRate(queue);
 const changed=structuredClone(queue);
 changed.units[0].status='PARTIAL_SOURCE';
 assert.equal(computeSourceCandidateRate(changed).sourceCandidateCompleted,original.sourceCandidateCompleted-1);
 changed.units[1].swu_id=changed.units[0].swu_id;
 assert.throws(()=>computeSourceCandidateRate(changed),/SWU_QUEUE_ITEM_INVALID/);
});
