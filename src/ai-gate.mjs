/** FFAX AI consent, budgeting and crash-safe review boundary.
 * No provider/client is instantiated here: the caller must supply an approved adapter.
 * Prompts stay in memory, NEVER persist source code, secrets, tokens or raw outputs.
 */
import { createHash, randomUUID } from 'node:crypto';

const SHA = value => createHash('sha256').update(String(value)).digest('hex');
const JOB_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{7,79}$/;
const TOKEN_HINT = /(?:sk-[A-Za-z0-9_-]{12,}|gh[opusr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|AIza[A-Za-z0-9_-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_-]?key|authorization|access[_-]?token|password|secret)\s*[:=]\s*\S+)/i;
const PRIVATE_HINT = /(?:BEGIN PRIVATE|\.env\b|\b(?:customer[_-]?data|private[_-]?repo|고객 개인정보|비공개 소스)\b)/i;
const EMAIL_HINT = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
export const sha256 = SHA;

function assertTextSafe(prompt) {
  if (typeof prompt !== 'string' || prompt.trim().length < 8 || prompt.length > 2000) throw new Error('PROMPT_LENGTH_INVALID');
  if (TOKEN_HINT.test(prompt) || PRIVATE_HINT.test(prompt) || EMAIL_HINT.test(prompt)) throw new Error('SENSITIVE_INPUT_REFUSED');
  return prompt.trim();
}
function intBetween(x,min,max){return Number.isSafeInteger(x) && x >= min && x <= max;}
function money(x){return typeof x==='number' && Number.isFinite(x) && x > 0 && x <= 100 && Math.round(x*1000000)===x*1000000;}

/** Every provider price is supplied by an owner-approved configuration; we do not invent rates. */
export function makeApprovedPlan({prompt, provider, model, consent, estimatedInputTokens, maxOutputTokens,
  usdPerMillionInputTokens, usdPerMillionOutputTokens, maxJobUsd, jobId = randomUUID().replaceAll('-',''),
  sourceFiles=[], approvedDestination='external-provider'}={}) {
  if(consent !== 'APPROVE_EXTERNAL_AI_PROMPT_ONLY') throw new Error('EXTERNAL_TRANSMISSION_NOT_APPROVED');
  if(!Array.isArray(sourceFiles) || sourceFiles.length !== 0) throw new Error('SOURCE_FILE_UPLOAD_NOT_SUPPORTED');
  if(approvedDestination !== 'external-provider') throw new Error('UNAPPROVED_DESTINATION');
  const clean = assertTextSafe(prompt);
  if(!JOB_ID.test(jobId)) throw new Error('INVALID_JOB_ID');
  if(!/^[a-z][a-z0-9_-]{1,40}$/i.test(provider || '') || !/^[a-z0-9][a-z0-9._:/-]{1,79}$/i.test(model || '') || (model||'').includes('..')) throw new Error('PROVIDER_CONFIG_REQUIRED');
  if(!intBetween(estimatedInputTokens,1,8192) || !intBetween(maxOutputTokens,1,8192)) throw new Error('TOKEN_LIMIT_REQUIRED');
  if(!money(usdPerMillionInputTokens) || !money(usdPerMillionOutputTokens) || !money(maxJobUsd)) throw new Error('OWNER_PRICE_AND_BUDGET_REQUIRED');
  const estimatedUsd = (estimatedInputTokens * usdPerMillionInputTokens + maxOutputTokens * usdPerMillionOutputTokens) / 1_000_000;
  if(estimatedUsd * 2 > maxJobUsd) throw new Error('JOB_BUDGET_EXCEEDED');
  const policy={jobId,provider,model,requestSha256:SHA(clean),estimatedInputTokens,maxOutputTokens,
    estimatedUsd:Number(estimatedUsd.toFixed(8)),worstCaseUsd:Number((estimatedUsd*2).toFixed(8)),maxJobUsd,createdAt:new Date().toISOString(),
    sourceFilesAllowed:false, externalConsent:true, externalDataClass:'prompt-only', maxAttempts:2};
  return {policy, prompt:clean}; // caller MUST NOT persist `prompt` or log this wrapper
}

function assertResult(result, plan){
  if(!result || typeof result!=='object' || typeof result.output!=='string' || result.output.length>80_000) throw new Error('MODEL_RESPONSE_INVALID');
  if(!Number.isSafeInteger(result.inputTokens) || !Number.isSafeInteger(result.outputTokens) || result.inputTokens<0 || result.outputTokens<0 || result.outputTokens > plan.maxOutputTokens) throw new Error('TOKEN_USAGE_INVALID');
  if(TOKEN_HINT.test(result.output) || PRIVATE_HINT.test(result.output) || EMAIL_HINT.test(result.output)) throw new Error('SENSITIVE_OUTPUT_REFUSED');
  return result;
}

/** Ledger stores only hashes, costs, states, and non-sensitive errors, never prompts/results. */
export class AILedger {
  constructor({maxSessionUsd=1}={}) {if(!money(maxSessionUsd)) throw new Error('SESSION_BUDGET_INVALID');this.maxSessionUsd=maxSessionUsd;this.jobs=new Map();this.reservedUsd=0;this.consumedCeilingUsd=0;}
  reserve(plan){
    if(!plan?.jobId || this.jobs.has(plan.jobId)) throw new Error('DUPLICATE_JOB_ID');
    if(this.reservedUsd + this.consumedCeilingUsd + plan.worstCaseUsd > this.maxSessionUsd + 1e-9) throw new Error('SESSION_BUDGET_EXCEEDED');
    const record={jobId:plan.jobId,provider:plan.provider,model:plan.model,requestSha256:plan.requestSha256,
      estimatedUsd:plan.estimatedUsd,worstCaseUsd:plan.worstCaseUsd,status:'running',attempts:0,createdAt:plan.createdAt};
    this.reservedUsd+=plan.worstCaseUsd;this.jobs.set(plan.jobId,record);
    return {...record};
  }
  finish(jobId,status,detail={}){
    if(!['succeeded','failed','canceled'].includes(status)) throw new Error('INVALID_FINAL_STATUS');
    const record=this.jobs.get(jobId);
    if(!record || record.status!=='running') throw new Error('JOB_NOT_RUNNING');
    this.reservedUsd=Math.max(0,this.reservedUsd-record.worstCaseUsd);
    // Conservative cost ceiling for every attempt which may already have been billed.
    this.consumedCeilingUsd += record.estimatedUsd * Math.min(detail.attempts||0,2);
    const updated={...record,status,completedAt:new Date().toISOString(),attempts:detail.attempts??record.attempts,
      outputSha256:detail.outputSha256 ?? null,errorCode:detail.errorCode??null};
    this.jobs.set(jobId,updated);return {...updated};
  }
  snapshot(){return {schema:'ffax-ai-ledger.v1',maxSessionUsd:this.maxSessionUsd,reservedUsd:this.reservedUsd,consumedCeilingUsd:this.consumedCeilingUsd,
    jobs:[...this.jobs.values()].map(x=>({...x}))};}
  /** Restore only terminal records. Interrupted (running) jobs become REVIEW_HOLD, never auto replay. */
  static restore(data){
    if(!data || data.schema!=='ffax-ai-ledger.v1' || !Array.isArray(data.jobs)) throw new Error('LEDGER_INVALID');
    const ledger=new AILedger({maxSessionUsd:data.maxSessionUsd});
    if(typeof data.consumedCeilingUsd!=='number' || !Number.isFinite(data.consumedCeilingUsd) || data.consumedCeilingUsd<0)throw new Error('LEDGER_INVALID');
    ledger.consumedCeilingUsd=data.consumedCeilingUsd;
    for (const item of data.jobs){
      if(!JOB_ID.test(item?.jobId||'') || ledger.jobs.has(item.jobId) || !['succeeded','failed','canceled','running'].includes(item.status)) throw new Error('LEDGER_INVALID');
      ledger.jobs.set(item.jobId,{jobId:item.jobId,provider:item.provider,model:item.model,requestSha256:item.requestSha256,
        estimatedUsd:item.estimatedUsd,worstCaseUsd:item.worstCaseUsd,status:item.status==='running'?'review_hold':item.status,
        attempts:item.attempts,createdAt:item.createdAt,completedAt:item.completedAt||null,
        errorCode:item.status==='running'?'INTERRUPTED_REQUIRES_OWNER_REVIEW':item.errorCode||null});
      if(item.status==='running')ledger.consumedCeilingUsd += item.worstCaseUsd; // unknown completed calls: fail closed
    }
    if(ledger.consumedCeilingUsd > ledger.maxSessionUsd + 1e-9)throw new Error('LEDGER_BUDGET_CONFLICT');
    return ledger;
  }
}

const transient = err => [429,502,503,504].includes(Number(err?.status)) || err?.code==='TRANSIENT_PROVIDER_UNAVAILABLE';
/** Adapter must be injected by an authorized host; this module has no network/API client or API key. */
export async function executeApprovedPrompt({plan,ledger,adapter,signal,timeoutMs=5000}={}){
  if(!plan?.policy || typeof plan.prompt!=='string') throw new Error('APPROVED_PLAN_REQUIRED');
  if(!(ledger instanceof AILedger) || typeof adapter?.generate!=='function') throw new Error('APPROVED_ADAPTER_REQUIRED');
  if(!intBetween(timeoutMs,10,60000)) throw new Error('BOUNDED_TIMEOUT_REQUIRED');
  if(SHA(assertTextSafe(plan.prompt))!==plan.policy.requestSha256 || !plan.policy.externalConsent || plan.policy.sourceFilesAllowed) throw new Error('PROMPT_POLICY_MISMATCH');
  ledger.reserve(plan.policy);
  let attempt=0; let status='failed';let output=null;let errorCode='PROVIDER_FAILED';
  try {
    for(attempt=1;attempt<=plan.policy.maxAttempts;attempt++){
      if(signal?.aborted) {status='canceled';errorCode='CANCELED';break;}
      const ac=new AbortController();
      const cancel=()=>ac.abort();signal?.addEventListener('abort',cancel,{once:true});
      let timer;
      try{
        const answer=await Promise.race([
          Promise.resolve().then(()=>adapter.generate({provider:plan.policy.provider,model:plan.policy.model,
            prompt:plan.prompt,maxOutputTokens:plan.policy.maxOutputTokens,idempotencyKey:plan.policy.jobId,signal:ac.signal})),
          new Promise((_,rej)=>{timer=setTimeout(()=>{ac.abort();const e=new Error('PROVIDER_TIMEOUT');e.code='PROVIDER_TIMEOUT';rej(e)},timeoutMs)})
        ]);
        const result=assertResult(answer,plan.policy);
        output=result.output;status='succeeded';errorCode=null;break;
      }catch(err){
        errorCode=transient(err)?'TRANSIENT_PROVIDER_FAILURE':err?.code==='PROVIDER_TIMEOUT'?'PROVIDER_TIMEOUT':err?.message==='SENSITIVE_OUTPUT_REFUSED'?'SENSITIVE_OUTPUT_REFUSED':'PROVIDER_REJECTED';
        if(signal?.aborted){status='canceled';errorCode='CANCELED';break;}
        if(!transient(err) || attempt>=plan.policy.maxAttempts) break;
      }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
    }
  }finally{
    const receipt=ledger.finish(plan.policy.jobId,status,{attempts:Math.min(attempt,plan.policy.maxAttempts),errorCode,outputSha256:output?SHA(output):null});
    if(status==='succeeded')return {receipt,output};
    return {receipt,output:null};
  }
}
