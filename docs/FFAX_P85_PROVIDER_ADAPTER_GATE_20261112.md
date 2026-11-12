# FFAX — P85 목표 대비 실제 P78: 승인형 AI 모델 연결 준비·오프라인 검증

**검증일:** 2026-11-12 KST
**코드 기준:** `a206561bd7efef46bb76ecba321280bb5af8f444` (`feature/ffax-workbench-p85-20261112`)
**고정 평가표:** `docs/ACCEPTANCE_MATRIX.md` 변경 없음. **78/100 잠정 유지; 85 미달; RELEASE HOLD.**

## 실제 추가 기능

- `src/provider-adapter.mjs`: OpenAI 호환 HTTPS chat/completions 인터페이스. 호출 전 운영자 승인 `makeApprovedPlan`과 비용·중복·429 복구 `executeApprovedPrompt`에 연결하도록 설계. 실제 외부 공급자 요청은 실행하지 않음.
- **보안 기본값:** HTTPS·공개 호스트·승인된 origin만, 자격 증명/쿼리 URL 금지, redirect 차단, 공급자/모델 불일치 거부, 입력·출력/사용량 제한, 토큰·이메일 출현 거부, 로그 영수증에는 원문/키 미기록. 정규식만으로 모든 개인정보를 판별할 수는 없으므로 외부 송신 전 사람 검토 필수.
- `tests/provider-adapter.test.mjs`: 무네트워크 생성, 출처 차단, 승인 모델·입력, 민감정보 거부, 429 제한 재시도, 비정상 응답·사용량 거부 등 5개 신규 테스트.
- `scripts/provider_contract_probe.mjs`: 12개 고정 시안에 **합성 모델 출력**으로 계약→승인→React TSX 변환을 검증. Mock transport 12회, **실 공급자 0회**.
- `scripts/axe_offline_audit.py`: 로컬 설치된 정식 axe-core 4.14.0이 있으면 Chromium 375/768/1440에서 WCAG 자동검사. 미설치 시 **exit 2 / NOT VERIFIED**, PASS를 만들어내지 않음. `docs/OWNER_UX_REVIEW_V1.md`에 실제 사용자 시각·키보드 수락 항목 분리.
- .github 워크플로는 여전히 **workflow_dispatch 전용**. 실제 GitHub Actions 실행/과금 없음.

## 이번 범위에서 실제 검증된 결과

| 검증 | 결과 | 한계 |
|---|---|---|
| `npm test` | **96 PASS / 0 FAIL / 0 SKIP** | Linux Node22 로컬 |
| `node scripts/provider_contract_probe.mjs` | **12/12 synthetic 응답, TSX transpile** | 실제 LLM 없음 |
| `python scripts/browser_qa.py` | **30 PASS / 0 FAIL** | Chromium injected HTML/CSS/JS, localhost URL 직접 네비게이션 아님 |
| `python scripts/accessibility_probe.py` | **12 PASS / 0 FAIL** | 기본 키보드/레이블, axe 아님 |
| `python scripts/react_runtime_probe.py` | **12/12 React UMD 렌더, 36 폭 검사** | 설치된 레거시 React, 운영번들 아님 |
| `node scripts/cleanroom_gate.mjs` | **7/7 PASS** | preinstalled 도구, npm fresh install/GitHub CI 아님 |
| `node scripts/local_acceptance_gate.mjs` | **D1-D5 5/5 로컬 PASS** | 실제 고객/Production E2E 아님 |
| `python scripts/axe_offline_audit.py` | **NOT VERIFIED (exit 2)** | axe-core 실행환경 미설치 |
| 실제 모델 API·Actions CI·사용자 UX 승인 | **NOT RUN** | 명시 승인/설치·외부 비용 조건 대기 |

새로 수정/추가한 8개 파일의 원격 Git Blob SHA와 로컬 테스트 원본 SHA **8/8 일치**. `main`과 기존 타 제품 저장소, 비밀·원본·Production 변경 없음.

## 고정 기준표 85점까지 남은 증거

- **AC04 14점 미달:** 실제 AI 모델 응답 12 브리프 중 최소 10개에 대해 전체 타입 검사·빌드·실제 React 렌더 성공과 오류 기록 필요. 현재는 합성 응답.
- **AC09 6점 미달:** 정식 axe 심각도 critical/serious 0, 키보드/대비, **사용자 실제 UX 승인** 모두 필요. 승인된 포스터 시안은 실제 앱 UI 수락이 아님.
- **AC12 2점 미달:** 완전 새 의존성 설치 + 실제 GitHub Actions 성공 + D1-D5 반복 + 실행 문서/릴리스 로그 확인 필요. 워크플로 파일이 존재한다는 것만으로 PASS 불가.
- 78+14=92 혹은 78+6+2=86이 가능하지만, **항목 전부 통과 시에만** 점수 인상. 근거 없으면 78 유지.

## 승인 필요 지점

1. 모델 제공자·전송 가능 프롬프트 범위·상한금액·공급자 호스트를 명시 승인해야 실 API E2E 진행.
2. GitHub 비공개 Actions 실행은 사용자 결제/할당량 정책 확인 및 승인 후 진행.
3. 실제 FFAX 화면에 대해 사용자가 UX 승인해야 AC09 및 최종 RG06 진행.

기존 요구사항 축소나 점수 배점 조정, 무단 유료 호출, 권한 변경, PR merge·Production 배포 없음.
