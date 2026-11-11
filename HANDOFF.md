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
