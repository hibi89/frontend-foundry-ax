# FFAX P85 목표 작업 — 78/100 검증 체크포인트 인수인계 (2026-11-12 KST)

1. **목표·요구·기술:** FFAX AI 기획→디자인→React 소스→시각 편집→브라우저 QA→안전한 Git 통합. 12개 AC 총100점의 최초 스펙 그대로. 현재 Node/JS local-first + TypeScript 기반. 목표는 85이지만 실제 **78/100**만 증명.
2. **완료 기능·결정:** P75 기능 보존. P85 신규 `src/ai-gate.mjs`(명시적 opt-in, 공급자 어댑터 미연동, 데이터/비밀 사전 차단, 가격·토큰·세션 상한, 예상 최대 2회 호출 비용 예약/보수적 소비 처리, 멱등 키, 429 제한 재시도, 취소/타임아웃, 감사 SHA, 중단 후 review_hold), `src/app.mjs` 키보드/ARIA 개선. 무제한 JSX/무단 송신안 대신 격리 컴포넌트+소유자 승인/비용 상한 선택. 12브리프 TSX typecheck·레거시 React 로컬 렌더 검증기는 기술 준비도 측정용.
3. **테스트·성공/실패:** 정확 로컬 코드와 GitHub blob 8/8 동등. Node22 `npm test`: **67 PASS/0 FAIL/0 SKIP**. `python scripts/browser_qa.py`: **30 PASS** (Chromium same-source set_content, localhost HTTP 독립 GET200). `python scripts/accessibility_probe.py`: **12 PASS** (axe 아님). `python scripts/react_runtime_probe.py`: **12/12 실제 설치된 레거시 React UMD 렌더, 36 viewport, 0 JS error**. TypeScript 컴파일은 최소 React ambient shim이라 상용 타입 호환성 보증 불가. 모델 호출/Windows/완전 CI/Production 미실행.
4. **완료/진행/대기/차단:** AC02/03/05/06/08/01/07/10 이전 75(잠정), **AC11 +3 = 78/100**, 나머지 **AC04 0/14, AC09 0/6, AC12 0/2**. 최종 85 미달, **RELEASE HOLD**. Production/Vercel **미적용**.
5. **오류 근거·전환:** 초기 AI 정책 15건 중 1건은 `../secret` model ID 허용을 검증이 발견하여 경로형 ID 차단; 재테스트 15/15. 비용 게이트에서 재시도·순차 호출의 총량 누락을 발견해 worst-case 2회 상한/사용예상 차감을 추가, 이후 18/18. Chromium localhost direct URL은 기존 환경 정책 차단이므로 `set_content` 사용, 동일 방법 반복 실패 금지. axe-core 패키지 로컬 부재/외부 패키지 fetch 실패로 AC09 미통과. 실제 AI 공급자 호출은 사용자 승인 없으므로 수행 안 함.
6. **GitHub 저장소·SHA·경로:** Private `hibi89/frontend-foundry-ax@feature/ffax-workbench-p85-20261112`. 테스트 코드 SHA `3d2d71d1e2887eaf55214acca146eca1b6f11b92`; 문서 SHA는 최종 commit/HEAD 조회. `main@191289d19f7eb6203a2a6beb5e8efbcf10bc844d` 보존, 기존 [P75 Draft PR #1](https://github.com/hibi89/frontend-foundry-ax/pull/1) 변경·머지하지 않음. 주요 파일 `src/ai-gate.mjs`, `tests/ai-gate.test.mjs`, `src/app.mjs`, `scripts/*probe*`, `docs/FFAX_P85_WORKSTREAM_EVIDENCE_20261112.md`.
7. **배포·URL·실행·환경:** Vercel/Production 없음(미적용). `npm start` loopback `127.0.0.1:4173`, `npm test`; Python Playwright/Chromium, Node22, TypeScript5.8 global. 외부 AI provider/인증 환경변수 없음. 소비자 Windows10/11 브라우저 접근은 미검증.
8. **원본·백업·인증:** main, 기존 P75 브랜치, 고객 저장소, Worknova/Kuodra/RAG/DBVORA 데이터, 기존 원본 이미지, 비밀, 결제·권한·환경설정 모두 무변경. 이전 P75 sha `2b58e4cd7e32210d3ad20ee580aa95b694af0769`는 복구 기준. 고객 코드·프롬프트·토큰을 GitHub/Public hub에 업로드 안 함. No force push.
9. **다음 작업·승인·완료 기준:** (a) 실제 LLM/provider+비용·데이터송신 승인 이후 정식 React 빌드/타입체크+12 brief E2E(AC04), (b) axe + 독립 수동 UX 검토(AC09), (c) 깨끗한 신규 환경 CI + D1–D5(AC12), (d) 원격 GitHub 소스/테스트 재검증. 100%는 AC 전체+Release Gates. **85 수치 맞추기 위한 rubric 변경 금지.**
10. **갱신·검증 범위:** 2026-11-12 KST, 로컬 Linux 실제 실행·GitHub 정확 Blob parity·현재 코드 SHA. 배포/실 모델/인간 수락 미검증. 해총 크몽 브랜치 동기화는 별도 최신 HEAD + non-force 커밋 후 확인.

**새 채팅 읽기:** HANDOFF→STATUS→AGENTS→REQUIREMENTS→ACCEPTANCE_MATRIX→P85 증거→실제 소스. 아래의 P75 기록은 당시 기준 역사적 기록.
---

# FFAX P75 — latest 10-point handoff (2026-11-12 KST)

1. **Goal/requirements:** Local-first AI frontend product. Fixed scope `REQUIREMENTS.md` and score matrix `docs/ACCEPTANCE_MATRIX.md`; no scope downgrade.
2. **Implemented/decisions:** On new `feature/ffax-workbench-p75-20261112`, added read-only React/TSX sample inspection, isolated manifest clone, SHA-bound allowlisted CSS-only patch with explicit approval and backup, abort/rollback, two React fixtures, ten service/API and ten JSX callback checks, draft Git PR gate. Chose safety B over unrestricted source rewrite A. Original P50 visual workbench preserved.
3. **Tests and commands:** `npm test` **49 PASS/0 FAIL/0 SKIP** Node22 Linux; `npm run test:browser` Chromium **30 PASS** (same HTML/CSS/JS injected, no direct localhost navigation). Fixture CLI inspect→import→preview→apply→original digest→rollback verified; actual local `git revert` returns byte-exact original. React callbacks use stub, **not real React runtime**; no real buyer Windows, real product API or GitHub remote import E2E.
4. **Completion / blocked:** **75/100 provisional engineering** (AC02 8 + AC03 12 + AC05 6 + AC06 12 + AC08 12 + AC01 8 + AC07 12 + AC10 5); remaining AC04 14, AC09 6, AC11 3, AC12 2. **RELEASE HOLD**.
5. **Errors & pivots:** Initial duplicate-job test found SOURCE_SHA_MISMATCH instead of DUPLICATE → order of guard fixed, 39 PASS. Initial market JSX callback test triggered EMPTY_SEARCH because query wasn't entered → simulated real input/change+rerender, full 49 PASS. Initial npm registry unavailable due DNS; no repeated network install. Chromium navigation blocked, same-source injected DOM retained as limited coverage. No breaking failures left in tested scope.
6. **Repo / branch / SHA:** Private `hibi89/frontend-foundry-ax@feature/ffax-workbench-p75-20261112` tested code `5cdba6922584df3e3824d105d8345307670ea5ca`; main remains `191289d19f7eb6203a2a6beb5e8efbcf10bc844d`, P50 branch `833804a076a3daf79a46773a34bb3b0db5cc2712`. [Draft PR #1](https://github.com/hibi89/frontend-foundry-ax/pull/1) OPEN, DRAFT, not merged. Paths `src/workspace.mjs`, `src/github-review.mjs`, `scripts/workspace_cli.mjs`, `fixtures/react-*`, `tests/*`, `docs/FFAX_P75_ENGINEERING_EVIDENCE_20261112.md`.
7. **Production/environment:** No Vercel/Production URL or deployment; **not applicable**. Local Node>=20 and TypeScript dependency; `npm start` loopback `127.0.0.1:4173`. Browser automation needs Chromium/Playwright separately. Linux Node v22.16/Python3.13 measured; Windows native unverified.
8. **Original / backups / privacy:** All work on new private feature branch, main and other program repos unchanged; only synthetic fixture data; no secrets or customer data/GitHub private source transferred to models. UI patch backup+SHA verified, Git branch revert in isolated temp repo passed; no force push or deploy.
9. **Next steps / approvals:** Prioritize true LLM provider abstraction/controlled cost, React build+render on 12 frozen prompts (AC04), axe+human accessibility(AC09), model failure/privacy budget(AC11), real clean-install CI + D1–D5(AC12). Access private customer repos, paid API, auth/security or production needs separate explicit approval. Completion requires 100+all release gates.
10. **Time / check range:** 2026-11-12 KST, tested files byte-identical with GitHub blobs at `5cdba6922584df3e3824d105d8345307670ea5ca`; current document commit SHA must be re-fetched after writing. Local tests 49/49, injected Chromium 30/30, real Draft PR, no complete React runtime/Windows/CI/Production validation.

New chat read order: `HANDOFF.md` → `STATUS.md` → `AGENTS.md` → `REQUIREMENTS.md` → `docs/ACCEPTANCE_MATRIX.md` → [P75 evidence](docs/FFAX_P75_ENGINEERING_EVIDENCE_20261112.md) → actual source.

---

# FFAX P50 — latest handoff (2026-11-12 KST)

1. **Goal/requirements/tech:** FFAX local-first frontend workshop, eventual AI prompt→design→React→visual editor→QA→reviewed integration. v1 rubric `docs/ACCEPTANCE_MATRIX.md` and detailed `REQUIREMENTS.md`, `docs/PRODUCT_SPEC_V1.md`.
2. **Implemented/decision:** Chose B structured components/typed commands over A freeform JSX editing. Added `index.html`, `styles.css`, `src/core.mjs`, `src/app.mjs`, `src/server.mjs`, tests, QA script. Brief classifier is rule-based, not actual LLM. 13 UI components/3 themes, reference image 2 variant approvals, editor + TSX export + QA.
3. **Tests:** `npm test` Node22 Linux **24 PASS/0 FAIL/0 SKIP**; `python scripts/browser_qa.py` Linux Chromium same-source set_content **30 PASS/0 FAIL**. Real localhost HTTP GET200 independent. Image-rights negative, XSS guard, edits/undo, 3 width screenshots, deliberate overflow FAIL→PASS, console error0/network failure0. Actual browser navigation blocked by ERR_BLOCKED_BY_ADMINISTRATOR; Chromium URL/Win/real React build unverified.
4. **Status:** provisional milestone **50/100** AC02 8, AC03 12, AC05 6, AC06 12, AC08 12; all other AC0. RELEASE HOLD. This does not imply finished v1/sale/production.
5. **Failure/pivot:** Node fixture initially 1 FAIL expectation mistake fixed; 2 intent-classification FAIL from broad '검색' → regex narrowed and full node24 pass; localhost Chromium navigation blocked by environment policy → stop same retry, load same HTML/CSS/JS into actual Chromium set_content and mark limited. Do not misrepresent as live URL/Windows.
6. **GitHub:** `hibi89/frontend-foundry-ax@feature/ffax-workbench-p50-20261112`; code HEAD `e2d9355577e20cbe9d70d80f8bbb9a4263f2de08`, main baseline `191289d19f7eb6203a2a6beb5e8efbcf10bc844d` untouched. After this docs commit recheck feature HEAD. Key files: `src/*`, `tests/core.test.mjs`, `scripts/browser_qa.py`, `docs/FFAX_P50_ENGINEERING_EVIDENCE_20261112.md`. Poster asset blob SHA `01d42b4e74eed25a3b23ec6966f77b6bd7b22e54`.
7. **Production/env:** no Vercel project/Production, **미적용**; local Node>=20 `npm install --ignore-scripts && npm start` -> `http://127.0.0.1:4173`. Linux Node22+Chromium via Python Playwright probe, not Windows.
8. **Original/backup/security:** main baseline preserved, original PNG source in conversation/local download, GitHub contains generated WebP vision visual. No secrets, keys, customer data, paid calls, third-party source import or existing WORKNOVA/KUODRA/RAG/DBVORA modifications. No force-push or public source disclosure. Generated React code is prototype, not audited.
9. **Next and approval:** implement AC01 safe GitHub read/project stores; AC04 model adapter and actual React build, cost & external data transfer **approval required**; AC07 real 2 sample app regression & rollback; AC09 axe/manual, AC10 Git PR approval, AC11 budgets/security/failure, AC12 clean install+CI+D1–D5. Do not raise 50 without exact AC evidence; if failures invalidate an AC, deduct.
10. **KST/source-of-truth:** 2026-11-12 KST, verified code SHA `e2d9355577e20cbe9d70d80f8bbb9a4263f2de08`; current docs SHA re-fetch. Node24/Chromium30 limited, CI/Production not run. Hub records FFAX as **incubation** separately from active16.

Read next time: `HANDOFF.md` → `STATUS.md` → `AGENTS.md` → `REQUIREMENTS.md` → `docs/ACCEPTANCE_MATRIX.md` → source. Legacy sections below are historical, not current.

---

# HANDOFF.md — FFAX 인수인계

**갱신:** 2026-11-12 KST  
**목표:** 새로운 채팅/에이전트가 추측 없이 개발을 재개하도록 현재 상태를 정확히 전달.

1. **목표·기술·확정 요구:** FRONTEND FOUNDRY AX는 여러 React 제품의 UI를 AI로 설계·생성·시각 편집·브라우저 검증하고 승인된 GitHub PR로 적용하는 프론트엔드 플랫폼. 상세 범위는 `REQUIREMENTS.md`; 현재 스택은 `docs/ARCHITECTURE_DECISIONS.md`의 잠정안.
2. **완료 기능·변경·결정 근거:** 신설 GitHub 저장소와 설계 문서. 사용자와 논의한 실용 기능 7종·생산성 가설·수익화 경로를 `docs/USE_CASES_AND_IMPLEMENTATION_V1.md`, 비교 검증 계획을 `docs/PRODUCTIVITY_BENCHMARK_PLAN.md`에 추가. ② 자연어→구조화 브리프→2시안→컴포넌트/React 생성→QA, ③ 컴포넌트 nodeId→선택/이동→구조화 props→React 렌더→코드 diff/undo라는 방식을 v1 방향으로 명시. 추천 아키텍처는 컴포넌트·토큰·안전한 diff 중심. **아직 실제 제품 기능 구현 없음.**
3. **테스트 명령·결과:** 테스트 가능한 애플리케이션 소스 없음. PASS 0 / FAIL 0 / SKIP 0; 브라우저·CI 미적용. 문서/커밋 존재만 확인.
4. **완료/진행/대기/차단:** 문서·요구사항 기준선 작성, 기준 완성률 0/100; 코딩과 자동 검증 착수 대기. GitHub 이미지 원본 업로드/README 표시 미검증.
5. **실패 증거·원인·시도·대안:** 신규 저장소 첫 조회가 409/404로 나타난 이유는 **빈 저장소**였기 때문. README 초기화로 해결. 이미지 업로드 경로는 별도 확인 필요. 실패한 무의미한 API 호출 반복 금지.
6. **저장소·브랜치·SHA·경로:** `hibi89/frontend-foundry-ax`, `main`. 초기 문서 커밋 `f1a4d4169e4104fba31792625ab1eb1f8e7dfc2b`. 반드시 다음 작업 시작 시 실시간 최신 HEAD를 다시 조회. 주요 문서: `README.md`, `AGENTS.md`, `REQUIREMENTS.md`, `STATUS.md`, `HANDOFF.md`, `docs/*`.
7. **Production·프로젝트·환경:** Vercel 프로젝트/Production URL **미적용**. 실행 명령/환경 미정(아직 제품 코드 없음). 설계상 React/TS/Playwright/Node/SQLite/AI 어댑터 검토.
8. **원본 위치·백업·인증·수정금지:** FFAX 이미지 콘셉트 원본은 이전 채팅 생성물. 기존 WORKNOVA/KUODRA/RAG/DBVORA는 **참고 프로젝트일 뿐 이 저장소에서 임의 수정 금지**. 인증키/토큰/기존 서비스 데이터 GitHub 기록 금지. GitHub 변경 전 브랜치·이전 SHA와 되돌리기 절차 확보.
9. **다음 우선순위·완료 기준·승인:** 자산 원본 업로드 성공 확인 → 구조/보안/모델 예산·비주얼 편집 범위 승인 → 12 고정 테스트 brief/2 샘플 앱 준비 → 설계·코드·QA 단계별 실구현. 실용성은 사용자 개입·재작업·총 소요·품질·API 비용으로 비교 측정. 100% 기준은 `docs/ACCEPTANCE_MATRIX.md` AC 12개 전항목 + release gates.
10. **갱신 시점·검증 범위·문서 기준 커밋:** 2026-11-12 KST, 최신 문서 반영 전 확인한 원격 main SHA: `e548bdecabbb828541d3cc499958f8fdb367ee37`; 이번 문서 커밋 SHA는 완료 후 GitHub에서 확인. 검증은 원격 파일·Git 데이터까지이며 실제 앱/CI/Production은 미적용. 설계 문서가 제품 완료를 의미하지 않음.

**새 채팅 읽기 순서:** `HANDOFF.md` → `STATUS.md` → `AGENTS.md` → `REQUIREMENTS.md` → `docs/PRODUCT_SPEC_V1.md` → `docs/ACCEPTANCE_MATRIX.md` → 실제 소스.

**상태 레이블:** 기획·요구사항 기준선 수립 / v1 구현 0% / RELEASE HOLD.
