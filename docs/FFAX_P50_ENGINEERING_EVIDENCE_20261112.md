# FFAX P50 기능 구현·검증 증거 — 2026-11-12 KST

**대상:** `hibi89/frontend-foundry-ax@feature/ffax-workbench-p50-20261112` (Private)  
**실제 테스트한 코드 SHA:** `e2d9355577e20cbe9d70d80f8bbb9a4263f2de08`  
**임시 기술 완성률:** **50/100점 (provisional engineering)** / RELEASE HOLD / Production 미적용.
**변경 전 원본:** `main@191289d19f7eb6203a2a6beb5e8efbcf10bc844d` 보존, 원본 고객 저장소 수정 없음.

## 구현 범위와 점수 (기존 12 AC / 100점 가중치 변경 없음)

| AC | 점수 | 실제 근거 | 검증 한계 |
|---|---:|---|---|
| AC-02 | 8 | 12개 한국어 업종별 자연어 브리프→목적·페이지·공통 안전제약·기능·시안 A/B; 12/12 목적 정확 맵핑 Node 테스트 + Chromium 선택 | **키워드/규칙 기반 분석**이며 실제 LLM은 아직 미연동 |
| AC-03 | 12 | 13종 등록 UI 컴포넌트, 3 테마(Midnight/Ocean/Daylight), 375/768/1440 CSS 반응형 및 실제 Chromium render/capture | 완성된 고객사 2개에 실제 적용 미검증; 샘플 브랜드 변주 |
| AC-05 | 6 | 사용권한 체크 후 사용자 로컬 이미지 Canvas 2색 추출, 두 후보 A(Stack)/B(Grid) 표시, 선택 승인 후 프리뷰 accent/레이아웃 및 React JSX 반영; 잘못된 권한 거부 | 이미지의 구조/타이포/컴포넌트 추출은 아직 미구현, **색상/레이아웃 기반 2개 시안**만 구현 |
| AC-06 | 12 | node ID 기반 select/drag ordering, 텍스트·색상·간격·정렬·유형 변경, 삽입/삭제, undo/redo, 최소한의 React TSX export/preview 동기화, Node/Chromium 테스트 | 등록된 컴포넌트만 편집, 임의 JSX AST 시각 편집/실제 React runtime 미검증 |
| AC-08 | 12 | Chromium 375/768/1440 실제 screenshot 3종, overflow/중첩·선택 개수 DOM 검사, JS exception/console/network failure/external request 0, 의도적 2000px overflow FAIL→복원 PASS, Node HTTP GET 200 | **Chromium에서 localhost URL로 직접 이동하는 건 실행 환경 정책으로 BLOCKED**. 동일 HTML/CSS/JS를 Chromium `set_content`+스크립트 주입으로 검증, 실제 HTTP 페이지 navigation·Win Chrome/Edge 미검증 |
| **합계** | **50** | **Node24 PASS + Chromium 대체30 PASS** | **제품 출시는 HOLD** |

> 이 점수는 v1.0 전체를 완성했다는 뜻이 아니다. 원격 Git SHA와 정확히 일치한 로컬 소스의 제한된 검증 범위에 대한 **내부 milestone**이다. 차후 통합/QA에서 실패가 발견되면 영향을 받는 AC의 점수를 0으로 되돌려야 한다.

## 테스트 명령 및 결과

```bash
node --version # 검증: Node 22.16.0 (Linux)
npm test    # Node test 24 PASS / 0 FAIL / 0 SKIP (TypeScript compiler global fallback)
python scripts/browser_qa.py # Chromium set_content 30 PASS / 0 FAIL / 0 SKIP
```

- Chromium: **Linux** 실제 headless Chromium; 직접 로컬 URL navigation은 `ERR_BLOCKED_BY_ADMINISTRATOR`, 대신 프로덕트의 동일 HTML/CSS/JS를 삽입하여 클릭·상태·다운로드·뷰포트 검증. HTTP 독립 GET 200.
- 스크린샷: 실행 당시 `artifacts/qa/ffax-375.png`, `ffax-768.png`, `ffax-1440.png` 생성. 이 경로는 로컬 산출물이므로 후속 에이전트는 같은 QA 명령으로 재생성한다. 산출물의 지속 보존은 별도 필요.
- Node: 편집 명령의 검증/immutable-history, 색상·간격·정렬·유형, 12개 브리프, TSX **구문 변환** 검증. React/npm 실제 빌드·타입체크·렌더 기능 보장은 아님.
- 코드 원격 SHA 대조: `src/core.mjs` Git blob `a0ea...`은 과거 P50 직전 코드의 SHA다. **현재 소스는 `e2d9355577e20cbe9d70d80f8bbb9a4263f2de08`의 Git tree**를 근거로 `git hash-object`와 교차 비교할 것. (후속 문서 커밋과 코드 커밋 구분)
- 안전: 모델 API 호출·토큰·민감정보 없음, node 서버 `127.0.0.1`만 bind, 입력 HTML escape, 등록 컴포넌트 계약/길이/색상 제한, 외부 request 0. 보안 전체 검증(AC11)은 미통과.
- 사용자 데이터 원본·기존 PayPal/KIC 프로젝트 미수정. Vercel·공개 배포·PR merge 미실행. 원본 `main` 그대로.

## 미완료 50점 및 우선순위
1. **AC-04 (14):** 실제 모델 기반 React 생성 12개 고정 프롬프트, 최소 10개 build/type/render PASS, 비용·모델 어댑터.
2. **AC-07 (12):** 실제 안전한 기존 React 앱 2종 소스 불러오기, API/이벤트 회귀 5가지, 수정금지/rollback 실증.
3. **AC-01 (8):** GitHub 읽기/로컬 복제 및 프로젝트 영속화/원본 SHA 보존.
4. **AC-09 (6):** axe 접근성 검사 및 사용자 시각 최종 승인(현재 미검증).
5. **AC-10 (5):** 안전한 브랜치·PR·승인·롤백 기능 실제 구현(현재 개발 branch를 사람이 만든 것과 구분).
6. **AC-11 (3):** AI 호출 예산/실패/중복/권한/비밀처리 실제 구현 검증.
7. **AC-12 (2):** 클린환경/CI·D1~D5 전체 E2E, 고객 브라우저/인수인계 및 승인.

## 100% 릴리스 게이트
RG-01..RG-06 전부 통과해야만 100%/출시완료. 지금은 **RELEASE HOLD**, Production **미적용**, 브라우저 URL 직접 검수·Windows·실제 GitHub read/write·AI 비용·고객 원본 업무 로직·React runtime 빌드는 **미검증**.

## 수행한 대안 비교
- A: prompt 결과 자유 JSX 전체를 곧바로 자동 수정 — 처음은 빠르지만 임의 JSX visual mapping / 회귀 위험.
- B: **구조화 브리프 + 등록 컴포넌트 + nodeId 속성 patch + 승인** — 재사용/테스트/원본 보호에 유리하여 채택. 아직 모델 어댑터 미연동.

## 회귀/복구
- 이전 원본 main HEAD: `191289d19f7eb6203a2a6beb5e8efbcf10bc844d`, 덮어쓰지 않음.
- 코드는 `feature/ffax-workbench-p50-20261112`에만 저장. 코드를 되돌릴 때 강제 push 금지, 별도 정상 revert/PR로 복원.
- 실패 사례: 초기 Node 테스트에서 fixture 기대값 오류 1건 → 수정. 브라우저 localhost navigation BLOCKED → set_content 변경. 추가 semantic 2 FAIL → broad '검색' RAG 판정 제거 후 24 PASS. 최종 Node/Chromium zero FAIL.
