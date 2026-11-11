# ARCHITECTURE_DECISIONS.md — 대안 비교와 잠정 권고

**기준:** 2026-11-12 KST. **상태:** 설계 권고, 구현 전 승인 필요.

## A. 구현 전략 비교

| 기준 | A. Prompt-to-code 단일 에이전트 | B. 컴포넌트/디자인 토큰 기반 파이프라인 (**추천**) | C. 기존 외부 AI 빌더 중심 종속 |
|---|---|---|---|
| 초기 속도 | 가장 빠름 | 초기 설계 필요 | 빠름 |
| 디자인 일관성 | 프롬프트에 민감 | **높은 재현성** | 도구에 의존 |
| UX 변경 통제 | 코드 재생성 반복 | **구조화된 수정·diff** | 외부 편집 제약 |
| 기존 기능 보존 | 변형 위험 | **파일/기능 범위 지정** | 종종 어려움 |
| AI 비용 | 재생성 반복으로 증가 가능 | 템플릿·캐시로 절감 가능 | 구독/API 의존 |
| 유지보수 | 불안정 | **중간 복잡도, 장기 유리** | 벤더 종속 위험 |

**권고:** B를 기본 플랫폼으로, A의 자연어 생성 기능과 검증된 GitHub 컴포넌트를 플러그인 형태로 결합한다. GitHub Trending은 발견 경로일 뿐, 스타 수와 코드 품질/상업 이용 허가를 동일시하지 않는다.

## B. 권장 처리 경로

```
사용자 brief / 허가된 reference / 안전하게 clone된 기존 앱
       |
       v
Policy + Scope Check (권한 / 비용 / 출처 / 변경금지)
       |
       v
Structured Requirements / Design Proposal (2안 + 승인)
       |
       v
Design Tokens + Registry Components + AI Code Adapter
       |
       v
Isolated Preview & Editable Component Tree
       |
       v
Build/Type/Lint + Playwright 3 viewports + Accessibility + API Regression
       |
       +-- FAIL -> 검토 가능한 수정안 / 안전 종료 / 재실행 기록
       |
       v
Diff + Human Approval -> Git branch/PR -> Separate Deployment Approval
```

**읽기/쓰기 분리:** 분석기는 read-only clone/스냅샷을 읽고, 생성기는 별도 작업 디렉터리에 패치를 작성한다. 작업마다 idempotency key와 상태(queued/running/review/approved/applied/failed) 보유. 사용자 원본은 기본적으로 건드리지 않는다.

## C. 잠정 스택 (구현 착수 전 확인)
- **Frontend:** React + TypeScript + Tailwind, 재사용 컴포넌트(예: shadcn/ui 계열). 테마 token 중심.
- **Visual editor:** 등록된 React 컴포넌트/구조화 스키마를 편집할 수 있는 컴포넌트형 엔진(예: Puck 기술 검토). 무제한 JSX 편집은 후순위.
- **API/workflow:** Node/TypeScript 서비스(기존 통합에 맞는 대안 평가) + 작업 큐; 작업별 취소/재개.
- **State store:** 초기 로컬 SQLite(프로젝트/버전/메타데이터), Git으로 소스/패치 추적; 다중 사용자 필요 시 PostgreSQL 검토.
- **AI:** 공급자 어댑터 인터페이스, 비밀 삭제/마스킹, JSON 스키마 검증, 비동기 작업·비용 한도.
- **Validation:** TypeScript 빌드, Playwright Chromium, axe/접근성 점검, 코드 diff + API 계약 테스트, 이미지 스냅샷.
- **GitHub:** 최소 권한 API, 브랜치/PR 방식, 사용자 승인 전 쓰기 작업 미실행.
- **Deployment:** v1에서는 선택; Vercel 연동 및 public Production은 별도 승인 후 적용.

## D. 비용·품질·보안 설계
- **API 비용:** 토큰/이미지 입력 과금 모델별 차이가 크므로 고정 단가 가정 금지. 사용자 budget cap 설정, 프롬프트 캐시, 템플릿 우선, max retry, 비용 추정/실측 로그.
- **Rate limits:** 공급자별 429 backoff + jitter + 재시도 횟수 제한 + 중복 생성 방지; 재시도는 기존 작업 ID를 재사용.
- **장애 복구:** 상태/패치 작업 단위 저장, 임시 미리보기 폴더 정리, 재시작 후 중간 상태 회수, 실패 시 이전 브랜치 보존.
- **안전한 코드 실행:** LLM 산출물·타사 프로젝트 실행은 격리된 샌드박스/컨테이너에서 한정 권한, 네트워크 차단/허용목록, 실행 시간·자원 제한. 직접 호스트 실행 금지.
- **공급망:** Dependency pin/업데이트 정책, lockfile, SBOM/보안 스캔, MIT/Apache 등 외부 라이선스 재확인(파일·자산별 별도 의무).
- **프로젝트 접근:** 개인 저장소 최소 권한, 비밀 자료는 공급자에게 무단 전송 불가. 로그와 QA 스냅샷에 개인정보 필터.
- **승인 경계:** 비용 초과/외부 전송/원본 변경/권한 설정/Production 전송에는 사람의 명시적 승인.
- **실제 시각 품질:** 생성 결과를 직접 Chromium으로 렌더링해 평가. 이미지 한 장만으로 완전한 소스 복원 불가능.

## E. 승인 전 결정 항목
1. 단일 사용자 로컬 우선 vs 첫 버전부터 클라우드/멀티 사용자.
2. 모델 공급자·예산 상한 및 허가된 코드/이미지 전송 정책.
3. 비주얼 편집 지원 범위(등록 컴포넌트 전용부터 시작 권고).
4. 기존 GitHub 저장소별 통합 권한/브랜치와 샘플 프로젝트 선정.
5. 최종 UI 콘셉트 채택(참고 이미지), 실제 컬러 토큰·브랜드 로고·제품명 표기 확정.

미승인 상태에서는 문서 설계 및 로컬 기술 타당성 실험만 진행하고 위험한 연결/배포/비용 지출은 하지 않는다.
