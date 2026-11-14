/** Local FFAX component demo interactions (not customer API clients).
 * Explicitly scoped to the rendered preview DOM. No fetch, storage, navigation, or dynamic source execution.
 */
const ACTIONS=new Set(['validate-form','navigate','retry']);
export function validateDemoValue(value){
 if(typeof value!=='string'||value.trim().length<2||value.trim().length>80)
  return '2~80자의 예시 입력값을 입력하세요.';
 return '로컬 입력 검증 PASS · 서버에 전송하지 않았습니다.';
}
export function bindPreviewActions(root){
 if(!root||typeof root.querySelectorAll!=='function')throw Error('DEMO_ROOT_INVALID');
 let count=0;
 for(const button of root.querySelectorAll('[data-demo-action]')){
  const action=button.getAttribute('data-demo-action');
  if(!ACTIONS.has(action)||button.tagName!=='BUTTON'||button.type!=='button')
   throw Error('DEMO_ACTION_INVALID');
  const node=button.closest('[data-node-id]');
  const status=node?.querySelector('[data-demo-status]');
  if(!node||!status)throw Error('DEMO_STATUS_MISSING');
  button.addEventListener('click',event=>{
   event.preventDefault();
   event.stopPropagation();
   if(action==='validate-form'){
    const input=node.querySelector('[data-demo-field]');
    if(!input||input.tagName!=='INPUT')return;
    const message=validateDemoValue(input.value);
    status.textContent=message;
    input.setAttribute('aria-invalid',String(message!=='로컬 입력 검증 PASS · 서버에 전송하지 않았습니다.'));
   }else if(action==='navigate'){
    const section=button.getAttribute('data-demo-section');
    if(!['개요','프로젝트','설정'].includes(section))return;
    for(const other of node.querySelectorAll('[data-demo-action="navigate"]')){
     if(other===button)other.setAttribute('aria-current','page');
     else other.removeAttribute('aria-current');
    }
    status.textContent=section+' 선택됨 · 페이지 이동/API 요청 없음';
   }else{
    status.textContent='로컬 재시도 시연 완료 · 외부 API 요청 없음';
   }
  });
  count++;
 }
 return {boundActions:count,externalRequests:0,storageWrites:0};
}
