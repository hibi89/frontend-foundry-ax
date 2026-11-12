import test from 'node:test';
import assert from 'node:assert/strict';
import {makeManualAIPrompt,parseModelDesign,exportReact} from '../src/core.mjs';
import {makeLocalFixtureDesign} from '../src/ai-structured-output.mjs';
const brief='고객 구매자 검색 프로필 대시보드 화면과 결제는 건드리지 말아줘';
test('manual workflow requires explicit copy consent',()=>{
  assert.throws(()=>makeManualAIPrompt(brief),/CONSENT/);
  const packet=makeManualAIPrompt(brief,{ownerConsent:true});
  assert.match(packet,/ffax-model-design.v1/);assert.match(packet,/고객정보/);
});
test('manual exporter refuses secrets and personal contact',()=>{
  for(const input of ['서버 api_key=super_secret_value 로 로그인 구성', '내 이메일 test@example.com 으로 화면 제작', '비공개 소스 .env 넣어서 디자인']){
    assert.throws(()=>makeManualAIPrompt(input,{ownerConsent:true}),/SENSITIVE_INPUT_REFUSED/);
  }
});
test('manual import requires design approval and registered components',()=>{
  const model=makeLocalFixtureDesign(0,brief);
  assert.throws(()=>parseModelDesign(model,{ownerBrief:brief}),/APPROVAL_REQUIRED/);
  const parsed=parseModelDesign(model,{ownerBrief:brief,approval:'APPROVE_DESIGN_PREVIEW'});
  assert.equal(parsed.document.components.length,7);
  assert.match(exportReact(parsed.document),/GeneratedScreen/);
});
test('reject arbitrary script and unknown component on model paste',()=>{
  const input=JSON.parse(makeLocalFixtureDesign(0,brief));
  input.components[0].type='script';
  assert.throws(()=>parseModelDesign(JSON.stringify(input),{ownerBrief:brief,approval:'APPROVE_DESIGN_PREVIEW'}),/MODEL_COMPONENT_INVALID/);
  input.components[0].type='Hero';input.inject='fetch("example.com")';
  assert.throws(()=>parseModelDesign(JSON.stringify(input),{ownerBrief:brief,approval:'APPROVE_DESIGN_PREVIEW'}),/MODEL_SCHEMA_INVALID/);
});

test('model paste refuses apparent secret and email outputs',()=>{
  const input=JSON.parse(makeLocalFixtureDesign(0,brief));
  input.components[0].text='sk-abcdefghijklmnopqrstuvwxyz12345';
  assert.throws(()=>parseModelDesign(JSON.stringify(input),{ownerBrief:brief,approval:'APPROVE_DESIGN_PREVIEW'}),/SENSITIVE_MODEL_CONTENT_REFUSED/);
  input.components[0].text='contact operator@example.org';
  assert.throws(()=>parseModelDesign(JSON.stringify(input),{ownerBrief:brief,approval:'APPROVE_DESIGN_PREVIEW'}),/SENSITIVE_MODEL_CONTENT_REFUSED/);
});
