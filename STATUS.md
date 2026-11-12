## 2026-11-12 — AI provider adapter + formal audit preparation (P78 retained)
- Local-first production provider adapter contract added, but **no paid/live LLM request**. Node **96/96 PASS**, 12/12 mocked design messages, Chromium 30/30, React UMD 12/12, cleanroom 7/7.
- axe 4.14 audit script added; local binary missing so **NOT VERIFIED**, actual user UX approval pending. CI manual-only, not executed. **78/100 provisional unchanged**, RELEASE HOLD.
- [Detailed evidence](docs/FFAX_P85_PROVIDER_ADAPTER_GATE_20261112.md) · [Owner UX approval checklist](docs/OWNER_UX_REVIEW_V1.md).

## 2026-11-12 KST — FFAX P85 third pass / verified 78/100 retained
- Private product `hibi89/frontend-foundry-ax@feature/ffax-workbench-p85-20261112` **exact code SHA `ffd04a8f452ef3f7523201767b1f18cd3d18fb31`**. Read-back of new UI/parser/test/workflow blobs matched local Git hashes. Previous main remains `191289d19f7eb6203a2a6beb5e8efbcf10bc844d`.
- New UI: owner consented manual request copy → strict JSON model output paste → explicit design review → visual canvas/TSX update. Auto-provider calls, source upload, autonomous GitHub push and deployment: **none**.
- `npm test` **91 PASS/0 FAIL**; Chromium existing 30 PASS + manual AI browser 10 PASS; lightweight accessibility 12 PASS; computed contrast 828 candidates 0 low; synthetic TSX typecheck12, D1-D5 local5; isolated copy `scripts/cleanroom_gate.mjs` 6-step PASS. Actual local URL browser, real LLM, axe, actual GitHub Actions execution, Windows/native customer and Production **unverified**.
- New `.github/workflows/ffax-manual-ci.yml` uses **manual dispatch only**; not run to avoid unapproved private Actions minutes/cost. **78/100 unchanged** AC04(14)/AC09(6)/AC12(2) = 0. **85 goal NOT reached / RELEASE HOLD**.
- [Evidence](docs/FFAX_P85_MANUAL_BRIDGE_AND_CLEANROOM_20261112.md). No changes to other Kmong products. FFAX remains separate candidate, not active 16.

---

## 2026-11-12 KST — FFAX P85 재도전 후 검증 범위 확대 / 현재 78/100 잠정
- **Repo/branch/code SHA:** Private `hibi89/frontend-foundry-ax@feature/ffax-workbench-p85-20261112`; 이번 정확 로컬 원본과 Git Blob SHA를 대조한 기능 코드 9733dbf72810e03d85ca29811f53ae368a8a651a. 기존 `main@191289d19f7eb6203a2a6beb5e8efbcf10bc844d` 및 실제 다른 제품 무변경.
- **기능 변경:** `src/ai-structured-output.mjs` 모델 응답 JSON 스키마/컴포넌트·테마·개수 allowlist, 명시적 preview 승인, HTML/코드 주입 차단. 12개 합성 시안 TypeScript 검사, 로컬 D1–D5 통합 재현, 3개 테마·3개 뷰포트의 텍스트 색 대비 결함 수정. 재사용 13 컴포넌트/기존 편집기·원본 보존 흐름 유지.
- **실행 결과:** Node 86 PASS / 0 FAIL / 0 SKIP; 모델 계약 합성 12/12 TypeScript PASS; 기존 rule generator의 레거시 React UMD 12/12 렌더·36 viewport PASS; Chromium 같은 소스 주입 30/30 PASS; 경량 키보드·레이블 12/12 PASS; Chromium 계산 텍스트 대비 738건/9 조합 미달 후보 0; D1–D5 5/5 로컬 PASS. [세부 범위](docs/FFAX_P85_SECOND_PASS_20261112.md).
- **미검증:** 실제 LLM 공급자 호출/최신 React 배포 빌드, axe-core 정식 접근성/사용자 시각 승인, GitHub Actions clean CI, 직접 localhost Chromium navigation(`ERR_BLOCKED_BY_ADMINISTRATOR`), 실제 고객 Windows/Production. 외부 API 과금·고객 데이터 전송·Production·권한 변경 없음.
- **완성률 판정:** **78/100 잠정 유지** (AC01 8, AC02 8, AC03 12, AC05 6, AC06 12, AC07 12, AC08 12, AC10 5, AC11 3). **AC04 0/14, AC09 0/6, AC12 0/2**. 85 목표 **미달**; 릴리스 **HOLD**. 로컬 테스트 숫자만으로 합격 항목을 늘리지 않음.
- **다음:** 모델/provider·비용·허용 입력 승인 → 실제 AI 생성의 12 브리프 빌드·렌더 → 외부 저작권·고객 데이터 보호. axe-core 공식 검사 + 수동 UX 리뷰, clean CI 실행은 별도 권한·비용 조건 확인 후. 크몽 허브는 활성16종 점수 유지, FFAX 독립 후보.

---

## 2026-11-12 KST — P85 목표 작업 진행 / 검증된 기준 **78/100 잠정**
- **고정 100점 기준 유지:** P75 75점 + **AC11 비용·보안·복구 3점 PASS** = **78점**. 85점은 **아직 미달**이며 타 항목을 부분 테스트만으로 가산하지 않는다.
- **기능 SHA:** `3d2d71d1e2887eaf55214acca146eca1b6f11b92` · `feature/ffax-workbench-p85-20261112` (Private). 로컬 8개 수정 파일과 GitHub Blob SHA **8/8 정확 일치**. 이전 `main@191289d19f7eb6203a2a6beb5e8efbcf10bc844d` 변경 없음.
- **신규 기능:** 명시적 opt-in AI 요청 정책, 사용자 제공 단가·토큰/세션 예산 상한, 보수적 2회 재시도 과금 상한, 429 제한 재시도/멱등 ID, 개인정보·비밀 패턴 거부, 실패·중단 시 안전한 review_hold, 원문/출력 없는 SHA 감사. 실제 모델 어댑터는 연결하지 않았고 외부 송신은 0건.
- **실행 증거:** Linux Node v22.16 `npm test` **67 PASS/0 FAIL/0 SKIP**; Chromium 동일 소스 `set_content` **30 PASS**; 경량 접근성(레이블·키보드·role·focus) **12 PASS**; 기존 12개 규칙 기반 TSX 실제 TypeScript5.8 shim 검사 + 설치된 **레거시 React UMD** 12/12 렌더·3폭36 검증 PASS. **실제 LLM 생성이나 목표 React 최신 런타임/axe/Windows/CI/Production 성공이 아님**.
- **차단:** AC04 14점(실 AI 생성/12 브리프/실환경 미달), AC09 6점(axe + 수동 UX 승인 미달), AC12 2점(clean install + CI + D1–D5 미달). Release **HOLD**. 실 외부 AI 호출/유료 API/고객 코드 전송·배포·권한 변경은 사용자 별도 승인 필요.
- **증거:** [FFAX P85 워크스트림 점검](docs/FFAX_P85_WORKSTREAM_EVIDENCE_20261112.md), [100점 기준](docs/ACCEPTANCE_MATRIX.md). 기존 75점 기능과 다른 서비스 저장소 무변경.

---

# FFAX P75 — 2026-11-12 KST, current branch checkpoint

- **Provisional technical score: 75/100** (P50 50 + AC-01 8 + AC-07 12 + AC-10 5). Fixed v1 requirements/weights unchanged; release **HOLD**.
- **Product:** `hibi89/frontend-foundry-ax@feature/ffax-workbench-p75-20261112`, **tested code SHA `5cdba6922584df3e3824d105d8345307670ea5ca`**. Previous main `191289d19f7eb6203a2a6beb5e8efbcf10bc844d` preserved.
- **Code:** two React fixture imports with read-only SHA manifest/isolated clone; owner-approved CSS-only UI patch and safe rollback; ten service/API flows and transpiled TSX handlers; Git review plan and local real `git revert`.
- **Evidence:** [P75 engineering proof](docs/FFAX_P75_ENGINEERING_EVIDENCE_20261112.md); Node22 Linux **49 PASS/0 FAIL/0 SKIP**, Chromium same-source set_content 30 PASS/0 FAIL, CLI import→approve→rollback SHA exact. Actual [Draft PR #1](https://github.com/hibi89/frontend-foundry-ax/pull/1) OPEN/UNMERGED.
- **Limits:** actual AI model, React runtime/production bundle, remote GitHub project importer, buyer Windows, real service API contract, axe/human, clean CI, Vercel/Production not verified. No paid API or customer source transferred.
- **Kmong sync:** FFAX is separate incubating candidate; active 16 other products are neither silently renumbered nor modified.
- **Next:** AC04 real React build/model adapter & privacy budget approval; AC09 accessibility+owner UI; AC11 failure/budget and AC12 clean CI+end-to-end. Do not promise full 75% customer-ready product.

---

# STATUS.md — FFAX current checkpoint 2026-11-12 KST

- **Repo:** `hibi89/frontend-foundry-ax` Private · branch `feature/ffax-workbench-p50-20261112` · verified tested code SHA `e2d9355577e20cbe9d70d80f8bbb9a4263f2de08`.
- **v1.0 completion rubric:** **50/100 provisional technical milestone** (AC-02 8 + AC-03 12 + AC-05 6 + AC-06 12 + AC-08 12); no other ACs claimed. See [P50 evidence](docs/FFAX_P50_ENGINEERING_EVIDENCE_20261112.md). Original 100-point weights unchanged.
- **Code:** local Node/JS workbench, 12 fixed Korean briefs, 2 design alternatives, 13 components, 3 themes, image-rights gate+2 approved variants, property edits/move/undo/redo, React TSX prototype export, Node localhost server and Playwright QA source.
- **Evidence:** Node v22.16.0 Linux `npm test` **24 PASS/0 FAIL/0 SKIP**; headless Chromium **30 PASS/0 FAIL** with actual same HTML/CSS/JS via `set_content`; Chromium navigation to localhost **BLOCKED by environment**, not claimed PASS. Real Node HTTP GET200. 375/768/1440 captures created locally. XSS guard test and intentional overflow fail→fix pass.
- **Not implemented / not proven:** actual LLM API, production React runtime + typecheck+full render, existing GitHub import/PR/rollback automated flow, API contract regression on customer products, external customer collaboration, axe+human usability acceptance, CI, real Windows browser, Vercel Production.
- **Release:** **RELEASE HOLD**; user final design approval gate pending; no public deployment.
- **Poster:** `assets/concepts/ffax-v1-vision.webp` exact image blob SHA `01d42b4e74eed25a3b23ec6966f77b6bd7b22e54`, encoded from approved visual, original PNG preserved separately.
- **Parent/main preservation:** main `191289d19f7eb6203a2a6beb5e8efbcf10bc844d` unchanged, no outside product changes.
- **Next:** AC-01+04+07 highest priority, 2 sample React apps and frozen fixtures, model API/cost/security approval, actual browser URL/Windows, CI/axe, safe GitHub PR integration; apply strictly measured AC.
- **Central Kmong sync:** separate incubating FFAX entry, **do not silently change established active16 denominator**. Hub sync recorded after exact product commit review.

---
## Historical baseline (before implementation)

# STATUS.md — FFAX 상태판

**최종 기록:** 2026-11-12 KST  
**저장소:** `hibi89/frontend-foundry-ax` (Private)  
**기준 브랜치:** `main`  
**원칙:** 점수는 반드시 [수락 기준](docs/ACCEPTANCE_MATRIX.md) 근거로만 업데이트

## 현재 확인 사항
- GitHub 새 저장소 존재 / push 권한 확인 / README로 초기 커밋 생성 완료.
- 프로젝트 콘셉트: AI 기획→디자인→코드→시각 편집→브라우저 QA→검토 후 GitHub 적용.
- v1.0 요구사항, 품질 기준, 아키텍처 대안, 수락 매트릭스 문서화 완료(설계 기준선).
- 실용 사용 사례 7종, 자연어→React UI 생성(②), 등록 컴포넌트 기반 마우스 시각 편집(③)의 기술 흐름, 기존 앱별 적용 예, 상품화 가설, 생산성 측정 설계를 `docs/USE_CASES_AND_IMPLEMENTATION_V1.md`에 기록.
- `docs/PRODUCTIVITY_BENCHMARK_PLAN.md`: 가상 20시간→6시간 사례를 실제 성과로 오해하지 않도록 비교 실험 계획을 분리. 현재 실측 결과 없음.
- 예시 포스터는 채팅에서 생성한 **미구현 콘셉트 이미지**. 실제 소스/동작 화면 아님.
- **이미지 원본 GitHub 업로드 및 README 임베드: 아직 검증되지 않음.** 성공 시 실제 파일 SHA·경로·README 렌더를 기록해야 한다.

## 검증된 완성률: **0 / 100 (0%)**
| 항목 | 상태 |
|---|---|
| 요구사항 문서 작성 | 진행 — 코드 기능 점수에 포함되지 않음 |
| UI/UX 컴포넌트/디자인 시스템 | 미구현 |
| 자연어 기반 생성·편집 | 미구현 |
| QA 및 기존 앱 통합 | 미구현 |
| 테스트/CI | 미구현 |
| Product Release | **RELEASE HOLD** |
| Vercel / Production | **미적용** |

## 다음 우선순위
1. 개념 이미지 원본 GitHub 자산 경로 확정·업로드·README 표시 확인.
2. v1 범위와 잠정 스택, 비용/보안/권한 정책 승인.
3. 샘플 React 앱 2개 및 12개 고정 브리프, reference 이미지 권한 픽스처 마련.
4. 개발 브랜치에서 프로젝트/테마/컴포넌트 기반 MVP 구축.
5. Playwright 기준 QA, 원본 보존 및 PR 안전 통합을 순차 검증.

## 기준 업데이트 규칙
제품 기능 관련 코드를 처음 작성하기 전까지 `0%` 유지. 매 작업 종료 시 AC별 근거·GitHub SHA·테스트 결과를 추적. 마감 또는 사용자 요청만으로 임의 점수 상승 금지.

