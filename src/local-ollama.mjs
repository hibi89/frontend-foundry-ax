/** Free local inference only. No external provider, no secret storage, no auto-apply. */
import {createHash} from 'node:crypto';
const URL_LOCAL='http://127.0.0.1:11434/api/chat';
const SENSITIVE=/(?:github_pat_[\w-]{20,}|gh[opusr]_[\w-]{20,}|sk-[\w-]{12,}|AIza[\w-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\.env\b|(?:password|secret|api[_-]?key|authorization|access[_-]?token)\s*[:=]\s*\S+|주민등록번호|비공개\s*소스)/i;
const INSTRUCTION='Reply ONLY with one JSON object (no Markdown, no code) of schema ffax-model-design.v1: {"schema":"ffax-model-design.v1","title":"Short title","theme":"midnight","layout":"stack","components":[{"type":"Card","text":"Example","color":"accent","spacing":16,"align":"start"}]}. theme midnight/ocean/daylight; layout stack/grid; 5-15 components; allowed types Hero, Button, Card, Input, Table, Badge, Alert, Navbar, Stat, Modal, Tabs, Loader, Empty. Color accent/neutral, spacing 8/16/24/32, alignment start/center/end. Plain text max 180 chars per component. Do not include URLs, sensitive data, or additional keys.';
export function validateLocalRequest({prompt,model,consent}={}){
 if(consent!=='APPROVE_LOCAL_MODEL_PROMPT_ONLY')throw Error('LOCAL_CONSENT_REQUIRED');
 if(typeof model!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{1,79}$/.test(model)||model.includes('..'))throw Error('LOCAL_MODEL_INVALID');
 if(typeof prompt!=='string'||prompt.trim().length<8||prompt.length>2000||SENSITIVE.test(prompt))throw Error('LOCAL_PROMPT_UNSAFE');
 return {prompt:prompt.trim(),model};
}
export async function runLocalOllama({prompt,model,consent,fetchImpl=globalThis.fetch,timeoutMs=60000}={}){
 const p=validateLocalRequest({prompt,model,consent});
 if(typeof fetchImpl!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<100||timeoutMs>120000)throw Error('LOCAL_TRANSPORT_INVALID');
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),timeoutMs);
 try{
  const result=await fetchImpl(URL_LOCAL,{method:'POST',redirect:'error',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:ac.signal,
   headers:{'content-type':'application/json','accept':'application/json'},
   body:JSON.stringify({model:p.model,stream:false,format:'json',options:{temperature:0.2,num_predict:2048},
    messages:[{role:'system',content:INSTRUCTION},{role:'user',content:p.prompt}]})});
  if(!result?.ok)throw Error('LOCAL_MODEL_HTTP_ERROR');
  if(!/^application\/json\b/i.test(result.headers?.get?.('content-type')||''))throw Error('LOCAL_MODEL_CONTENT_TYPE_INVALID');
  const raw=await result.text();if(typeof raw!=='string'||raw.length>80000)throw Error('LOCAL_MODEL_RESPONSE_TOO_LARGE');
  let body;try{body=JSON.parse(raw);}catch{throw Error('LOCAL_MODEL_RESPONSE_INVALID');}
  const output=body?.message?.content;
  if(typeof output!=='string'||output.length<20||output.length>50000||SENSITIVE.test(output))throw Error('LOCAL_MODEL_OUTPUT_UNSAFE');
  return {output,model:p.model,sha256:createHash('sha256').update(output).digest('hex'),externalNetwork:false,autoApplied:false};
 }catch(err){
  if(err?.name==='AbortError')throw Error('LOCAL_MODEL_TIMEOUT');
  if(/^LOCAL_/.test(err?.message||''))throw err;
  throw Error('LOCAL_MODEL_UNAVAILABLE');
 }finally{clearTimeout(timer);}
}
