/** Explicitly opt-in OpenAI-compatible HTTPS adapter for FFAX.
 * A factory only: does not initiate network calls or load credentials by itself.
 * Only invoke behind makeApprovedPlan + executeApprovedPrompt in ai-gate.mjs.
 */
const SAFE_MODEL = /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{1,79}$/;
const SENSITIVE_HOST = /(^|\.)(localhost|local|internal|test|invalid)$/i;
const PRIVATE_IP = /^(?:127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(?:1[6-9]|2\d|3[01])\.|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|\[?(?:\:\:1|fc[0-9a-f:]+|fd[0-9a-f:]+|fe80[0-9a-f:]+)\]?)/i;
const DENY_CONTENT = /(?:github_pat_[\w-]{20,}|gh[opusr]_[\w-]{20,}|sk-[\w-]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b)/i;
function validateUrl(endpoint, allowedOrigins) {
  if (typeof endpoint !== 'string' || endpoint.length > 280) throw new Error('PROVIDER_ENDPOINT_REQUIRED');
  const u = new URL(endpoint);
  if (u.protocol !== 'https:' || u.username || u.password || u.port || u.search || u.hash || u.pathname !== '/v1/chat/completions') throw new Error('UNAPPROVED_PROVIDER_ENDPOINT');
  if (SENSITIVE_HOST.test(u.hostname) || PRIVATE_IP.test(u.hostname) || !/^[a-z\d.-]+\.[a-z]{2,}$/i.test(u.hostname)) throw new Error('PROVIDER_HOST_NOT_PUBLIC');
  if (!Array.isArray(allowedOrigins) || !allowedOrigins.includes(u.origin)) throw new Error('PROVIDER_ORIGIN_NOT_APPROVED');
  return u;
}
/**
 * Key arrives in volatile memory from owner-approved runtime; never stored here.
 * The approved model is fixed by the caller and cannot be swapped mid-request.
 * Transport injection is reserved for offline tests, NEVER used to bypass policy.
 */
export function makeApprovedChatAdapter({endpoint, allowedOrigins, apiKey, model, provider, fetchImpl = globalThis.fetch}={}) {
  const u=validateUrl(endpoint,allowedOrigins);
  if (typeof apiKey !== 'string' || apiKey.length < 8 || apiKey.length>512 || /[\r\n]/.test(apiKey)) throw new Error('PROVIDER_CREDENTIAL_REQUIRED');
  if (!SAFE_MODEL.test(model||'') || !/^[A-Za-z][\w-]{1,40}$/.test(provider||'')) throw new Error('PROVIDER_MODEL_REQUIRED');
  if (typeof fetchImpl !== 'function') throw new Error('PROVIDER_TRANSPORT_REQUIRED');
  return Object.freeze({
    async generate({provider: requestedProvider, model: requestedModel, prompt, maxOutputTokens, signal, idempotencyKey}={}){
      if(requestedProvider!==provider || requestedModel!==model)throw new Error('PROVIDER_IDENTITY_MISMATCH');
      if(typeof prompt!=='string' || prompt.length<8 || prompt.length>2000 || DENY_CONTENT.test(prompt))throw new Error('SENSITIVE_INPUT_REFUSED');
      if(!Number.isSafeInteger(maxOutputTokens)||maxOutputTokens<1||maxOutputTokens>8192)throw new Error('OUTPUT_TOKEN_LIMIT_REQUIRED');
      if(!/^[a-zA-Z\d][a-zA-Z\d_-]{7,79}$/.test(idempotencyKey||''))throw new Error('JOB_ID_REQUIRED');
      const r=await fetchImpl(u.href,{
        method:'POST',redirect:'error',credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',signal,
        headers:{'authorization':'Bearer '+apiKey,'content-type':'application/json','accept':'application/json','x-ffax-request-id':idempotencyKey},
        body:JSON.stringify({model,temperature:0.2,max_tokens:maxOutputTokens,messages:[
          {role:'system',content:'Return only a JSON object complying with ffax-model-design.v1. Do not return arbitrary code, HTML, secrets or Markdown.'},
          {role:'user',content:prompt}
        ]})
      });
      if(!r || typeof r.status!=='number')throw new Error('PROVIDER_RESPONSE_MALFORMED');
      if(!r.ok){const err=new Error('PROVIDER_HTTP_ERROR');err.status=r.status;throw err;}
      const type=r.headers?.get?.('content-type')||'';
      if(!type.toLowerCase().includes('application/json'))throw new Error('PROVIDER_RESPONSE_NOT_JSON');
      const body=await r.json();
      const output=body?.choices?.[0]?.message?.content;
      if(typeof output!=='string'||output.length>50_000||output.length===0||DENY_CONTENT.test(output))throw new Error('PROVIDER_OUTPUT_REFUSED');
      const inputTokens=body?.usage?.prompt_tokens,outputTokens=body?.usage?.completion_tokens;
      if(!Number.isSafeInteger(inputTokens)||inputTokens<0||!Number.isSafeInteger(outputTokens)||outputTokens<0||outputTokens>maxOutputTokens)throw new Error('PROVIDER_USAGE_INVALID');
      return {output,inputTokens,outputTokens};
    }
  });
}
