/** FFAX live benchmark acceptance math — never infers model success from synthetic fixtures.
 * 12 fixed cases, 10 minimum real-model end-to-end passes; each pass must have
 * independently passed strict TSX typecheck, transpilation and React 19 SSR.
 */
export const PROBE_TOTAL=12;
export function assessProbe(outcomes,{live=false,haltReason=null,acceptedTypeErrors=0}={}){
 if(!Array.isArray(outcomes)||outcomes.length>PROBE_TOTAL||
    !outcomes.every(x=>x&&typeof x.pass==='boolean')||
    !Number.isSafeInteger(acceptedTypeErrors)||acceptedTypeErrors<0)throw Error('PROBE_EVIDENCE_INVALID');
 const attempted=outcomes.length,passed=outcomes.filter(x=>x.pass).length;
 const threshold=live?10:PROBE_TOTAL;
 const reason=haltReason || (live&&passed+PROBE_TOTAL-attempted<threshold?'LOCAL_PASS_THRESHOLD_UNREACHABLE':null);
 return {attempted,passed,failed:attempted-passed,skipped:PROBE_TOTAL-attempted,
   threshold,stage:reason?'HALTED':'COMPLETED',reason,
   acceptedTypeErrors,success:!reason&&attempted===PROBE_TOTAL&&passed>=threshold&&acceptedTypeErrors===0};
}
export function strictDiagnostics(ts,file){
 if(!ts||typeof ts.createProgram!=='function'||typeof file!=='string'||!file.endsWith('.tsx'))throw Error('PROBE_TYPECHECK_INPUT_INVALID');
 const options={strict:true,noEmit:true,skipLibCheck:true,esModuleInterop:true,jsx:ts.JsxEmit.React,
  target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext};
 const prog=ts.createProgram([file],options);
 return ts.getPreEmitDiagnostics(prog).filter(d=>d.category===ts.DiagnosticCategory.Error).map(d=>({
  code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,' ').slice(0,140)
 }));
}
