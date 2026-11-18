#!/usr/bin/env node
/* FFAX local read-only P1 SWU source candidate meter. Not the 100-point AC score. */
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

export function computeSourceCandidateRate(queue){
 if(queue?.schema!=='ffax.p1.swu.v1'||!Array.isArray(queue.units)||!queue.units.length)
  throw Error('SWU_QUEUE_INVALID');
 const ids=new Set(),statuses=['SOURCE_COMPLETE_P2_PENDING','PARTIAL_SOURCE','BLOCKED_APPROVAL','BLOCKED_CONTRACT'];
 for(const unit of queue.units){
  if(!unit||typeof unit.swu_id!=='string'||ids.has(unit.swu_id)||
    !/^FFAX-SWU-(?:L\d{2}|DF-\d{2}|RF-\d{2})$/.test(unit.swu_id)||
    !statuses.includes(unit.status)||!unit.req_ids?.length||!unit.allowed_paths?.length||
    typeof unit.acceptance!=='string'||unit.acceptance.length<30||
    !Number.isInteger(unit.complexity?.total)||unit.complexity.total<0||unit.complexity.total>10)
   throw Error('SWU_QUEUE_ITEM_INVALID');
  ids.add(unit.swu_id);
 }
 for(const u of queue.units)for(const dep of u.dependency_swu_ids||[])
  if(!ids.has(dep)||dep===u.swu_id)throw Error('SWU_QUEUE_DEPENDENCY_INVALID');
 const done=queue.units.filter(x=>x.status==='SOURCE_COMPLETE_P2_PENDING').length;
 const partial=queue.units.filter(x=>x.status==='PARTIAL_SOURCE').length;
 return {
  schema:'ffax.p1.swu-progress.v1',sourceCandidateCompleted:done,total:ids.size,
  partial,sourceCandidatePercent:Number((100*done/ids.size).toFixed(1)),
  officialFullBlueprintImplementation:'UNASSESSED',
  officialVerification:'UNASSESSED',p2:'NOT_RUN',release:'HOLD',
  metricExplanation:'Only source code candidate units are counted; partials get zero. Not owner acceptance or AC score.'
 };
}
async function main(){
 const path=resolve(fileURLToPath(new URL('../docs/FFAX_P1_SWU_REGISTER_20261118.json',import.meta.url)));
 const queue=JSON.parse(await readFile(path,'utf8'));
 console.log(JSON.stringify(computeSourceCandidateRate(queue),null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){
 main().catch(e=>{console.error(e.message);process.exitCode=1;});
}
