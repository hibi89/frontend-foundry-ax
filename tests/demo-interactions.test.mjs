import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDemoValue,bindPreviewActions} from '../src/demo-interactions.mjs';
import {buildBrief,newDocument,applyCommand,renderMarkup,exportReact,makeComponent} from '../src/core.mjs';

test('demo validation accepts short-to-80 characters without retaining or sending data',()=>{
 assert.match(validateDemoValue(''),/2~80/);
 assert.match(validateDemoValue(' a '),/2~80/);
 assert.match(validateDemoValue(' a b '),/PASS/);
 assert.match(validateDemoValue('가'.repeat(80)),/PASS/);
 assert.match(validateDemoValue('가'.repeat(81)),/2~80/);
 assert.match(validateDemoValue(null),/2~80/);
});
test('demo render markup is semantic, escaped, and contains no external wiring',()=>{
 const brief=buildBrief('관리자 프로젝트 탐색과 차트 데이터 표시를 구현해주세요');
 let doc=newDocument(brief);
 for(const type of ['Form','Sidebar','Chart','Error'])doc=applyCommand(doc,{kind:'insert',type});
 const markup=renderMarkup(doc);
 for(const value of ['data-demo-action="validate-form"','data-demo-action="navigate"',
  'data-demo-action="retry"','aria-live="polite"','차트 예시 수치','<td>68</td>'])assert.ok(markup.includes(value),value);
 assert.equal(markup.includes('disabled>미연결 미리보기'),false);
 assert.equal(markup.includes('다시 시도 (미연결)'),false);
 assert.ok(!markup.includes('fetch('));assert.ok(!markup.includes('localStorage'));
 const generated=exportReact(doc);
 for(const value of ['React.useState<Record<string,string>>','로컬 입력 검증 PASS',
  '로컬 재시도 시연 완료','차트 예시 수치','aria-current='])assert.ok(generated.includes(value),value);
 assert.ok(!generated.includes('fetch('));
 assert.ok(!generated.includes('XMLHttpRequest'));
 assert.ok(!generated.includes('localStorage'));
});
test('untrusted component labels are escaped in local preview and preserved as JSX data',()=>{
 const doc=newDocument();
 const bad='<img src=x onerror=alert(1)>';
 const item=makeComponent('Form','demo',bad);
 const node={...doc,components:[item]};
 const preview=renderMarkup(node),source=exportReact(node);
 assert.ok(!preview.includes('<img'));
 assert.ok(preview.includes('&lt;img'));
 assert.ok(source.includes('"'+bad+'"'));
});
test('demo binder refuses roots with non-functions',()=>{
 assert.throws(()=>bindPreviewActions(null),/DEMO_ROOT_INVALID/);
 assert.throws(()=>bindPreviewActions({querySelectorAll:null}),/DEMO_ROOT_INVALID/);
});
test('demo binder registers no network calls or storage writes for empty local preview',()=>{
 const receipt=bindPreviewActions({querySelectorAll:()=>[]});
 assert.deepEqual(receipt,{boundActions:0,externalRequests:0,storageWrites:0});
});
