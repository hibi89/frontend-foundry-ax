/** One active model inference maximum. Fail closed; never queue duplicate clicks.
 * The gate does not call an AI provider, store prompts, retry or create timers.
 */
export function createLocalInferenceGate(){
 let active=false;
 return Object.freeze({
  get busy(){return active;},
  async run(job){
   if(typeof job!=='function')throw Error('LOCAL_MODEL_JOB_INVALID');
   if(active)throw Error('LOCAL_MODEL_BUSY');
   active=true;
   try{return await job();}
   finally{active=false;}
  }
 });
}
