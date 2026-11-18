> **[2026-11-18 FFAX V2.1 P2 SELF-VERIFIED | SOURCE `f9c1fcc44beee78950596b34bf5103baec040041`]** 전체 [P2 GitHub Actions #44301266661](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44301266661) **4/4 JOB SUCCESS**: Ubuntu·Windows Node 각각 **209/209 PASS**, 실 Edge/Chromium Forge **23/23**, Linux 14종 브라우저 검사 **14/14**, React19 computed-style **18/18**, axe serious/critical **0**(3 viewports), D1~D5 **5/5**, cleanroom **7/7**, unsigned Windows review ZIP SHA/추출 PASS. [npm 생산 의존성 audit #44301022612](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44301022612) **취약점 0건**. *P1 후보율 25/25(100%) 유지*, **P2 자체 로컬/합성 CI 통과**이며 사용자 Windows11·실고객/실 Qwen/실 외부 레퍼런스·별도 독립 코드/보안/UI 감사·사용자 최종 수락 **NOT_RUN**. 기존 AC-01~12 고정 가중 **공식 검증완료율 UNASSESSED**, RELEASE HOLD, main/Production/원본 변경 0. 세부 신규 원장: [docs/FFAX_P2_SELF_VERIFICATION_20261118.md](docs/FFAX_P2_SELF_VERIFICATION_20261118.md). 

> **2026-11-14 현재 업데이트 (아래 2026-11-12 기록은 역사적 증거):** 고정 rubric 변경 없이 AC12 0→2, 4/4 GitHub CI와 7/7 cleanroom, D1-D5 5/5, Windows113/113, Chromium, 공식 axe 0 serious/critical, 검수용 ZIP/가이드/릴리스 로그 확보로 **80/100 잠정**. AC04 실제 모델 0/14, AC09 사용자 최종 화면 승인 0/6. 중앙 최종설계 수용점수 **UNASSESSED**, 릴리스/크몽 **HOLD**. [증거](FFAX_CI_AND_RELEASE_GATE_20261114.md).

> **2026-11-12 fourth pass:** Local project JSON import/export/undo with Node105 + browser9 PASS, **78/100 retained** under unchanged rubric. AC04 0, AC09 0, AC12 0; 85 target missed. [Evidence](FFAX_P85_LOCAL_PROJECT_RESTORE_20261112.md).

> **2026-11-12 provider adapter preparation:** Confirmed 8/8 source blobs; Node96, mocked provider contract12, limited Chromium30, React UMD12, cleanroom7. **AC04 0, AC09 0, AC12 0; total remains 78/100 provisional (85 not reached).** Formal axe binary absent (exit2), live model/CI/owner UI review not run. [Details](FFAX_P85_PROVIDER_ADAPTER_GATE_20261112.md).

> **2026-11-12 P85 third pass:** Verified `78/100` provisional remains unchanged despite successful manual AI JSON import/visual editor and clean-room checks. **No actual model API call, formal axe + user UI approval, or completed GitHub Actions run**, so AC04(14), AC09(6), AC12(2) remain 0. [Third-pass proof](FFAX_P85_MANUAL_BRIDGE_AND_CLEANROOM_20261112.md). **85% not reached, RELEASE HOLD**.

> **2026-11-12 P85 재도전:** 최종 78/100 잠정 유지. 새 안전한 모델 출력 JSON 게이트, 12개 합성 타입 검사, D1-D5 로컬 5/5, 3테마×3뷰포트 텍스트 대비 738건 검사를 추가했다. 실모델/axe/clean CI/사용자 최종승인 미검증이므로 AC04/09/12는 0점. [재도전 상세](FFAX_P85_SECOND_PASS_20261112.md).

# ACCEPTANCE_MATRIX.md — FFAX v1.0 최종완성률 계산 기준

> **최신 2026-11-12 KST:** P85 목표 개발을 진행했으나 고정 rubric 기준 **검증된 78/100점 잠정**만 인정한다. AC11 +3, AC04/09/12 각 0 유지. [실행 범위와 차단 근거](FFAX_P85_WORKSTREAM_EVIDENCE_20261112.md). 이전 P75와 P50 아래 내용은 역사적 기록이며 현재 정본 수치가 아님.

**기준선:** 2026-11-12 KST / v1.0 / 총 100점  
**원칙:** **검증되지 않은 항목은 0점**. 코드량·예상 성공률·화면 시안·주관적 느낌으로 점수 부여 금지. 각 항목은 아래 모든 조건을 통과한 경우에만 가중치 전액을 인정한다(부분 점수 없음). 변경할 경우 사용자 승인과 문서 버전 기록 필수.

## 1. 증거 기반 채점표 (12개 항목, 총 100점)

| ID | 영역 | 점수 | 필요한 검증 증거(모두 충족해야 PASS) | 현재 |
|---|---|---:|---|---|
| AC-01 | 프로젝트/저장소 안전한 가져오기 | 8 | 샘플 신규+기존 React 저장소 2종 입력/복제 성공, 소스 읽기 분리, 원본 SHA 동일성 확인 | 8 / 8 · 로컬 합성 샘플 한정 PASS |
| AC-02 | 자연어 → 구조화 브리프·시안 | 8 | 12개 고정 요구 중 ≥10개에서 목적·제약·화면 범위를 빠짐없이 반영, 2안 비교·선택 기록 | 8 / 8 · 로컬 한정 PASS |
| AC-03 | 디자인 토큰/테마/재사용 | 12 | 2개 서로 다른 브랜드 테마, 최소 10개 UI 컴포넌트, 3 viewport·dark/light 또는 명시 테마 검증 | 12 / 12 · 로컬 한정 PASS |
| AC-04 | AI 화면 코드 생성 | 14 | 고정 브리프 12개 중 ≥10개 생성 코드 빌드·타입체크·기본 렌더 PASS, 나머지 실패 명확 표시 | 0 / 미구현 |
| AC-05 | 참고 이미지 기반 시안 | 6 | 권리 확인된 이미지로 2개 후보 생성, 명시적 승인, 출처·권한 기록, 픽셀 복원 불보장 고지 | 6 / 6 · 로컬 한정 PASS |
| AC-06 | 비주얼 편집/undo/redo | 12 | 최소 5종 속성(텍스트·색·간격·배치·컴포넌트) 변경 및 undo/redo 후 코드/프리뷰 동기화 자동 테스트 | 12 / 12 · 로컬 한정 PASS |
| AC-07 | 기존 앱 로직 보존·diff | 12 | 샘플 기존 앱 5개 동선+API 계약 회귀 PASS, 변경 금지 파일 수정 0, 복구점 검증 | 12 / 12 · 로컬 합성 서비스/TSX stub 한정 PASS |
| AC-08 | 브라우저·반응형 QA | 12 | 375/768/1440px 3종 스크린샷, overflow/중첩/콘솔/Network 검사, 실패 사례 탐지·수정·재검사 | 12 / 12 · Chromium 주입 검증 PASS |
| AC-09 | 접근성·검수 이력 | 6 | 키보드 focus, 레이블/대비, axe 자동 검사에서 critical/serious 0건, 수동 UX 승인 기록 | 0 / 미구현 |
| AC-10 | GitHub 분기·승인·복구 | 5 | 승인 없이 원본/Production 수정 0건, 브랜치·PR 링크·SHA·rollback 실행 증거 | 5 / 5 · GitHub Draft PR + 로컬 git revert PASS |
| AC-11 | API 비용·보안·장애 복구 | 3 | 사용량/한도/중단·중복 실행·실패 복구 테스트, 토큰/민감정보 노출 0건, 동의 전 전송 0건 | **3 / 3 · 로컬 모의 adapter와 fail-closed 정책 검증 PASS (실 공급자 미검증)** |
| AC-12 | 실행·문서·엔드투엔드 시연 | 2 | 깨끗한 환경 설치+CI PASS, D1~D5 반복 가능한 데모, 가이드와 릴리스 로그 | **2 / 2 · GitHub Actions 4/4 SUCCESS, D1~D5 5/5, guide+release log (2026-11-14)** |
| **합계** | | **100** | **모든 증거 필요** | **80 / 100 (엔지니어링 잠정, 중앙 공식 UNASSESSED; RELEASE HOLD)** |

**테스트 픽스처 고정:** 신규 UI 브리프 12개(금융·이커머스·RAG·관리자 등 서로 다른 패턴), **원본 코드가 보존된** 기존 React 샘플 2종, 명시적 사용허가가 있는 이미지 1종. 테스트 데이터와 스냅샷 버전·실행 환경을 고정해 재현 가능하도록 한다. 세부 픽스처는 최초 구현 시 별도 버전 관리하고, 그 후 점수 올리기 위한 사후 변경은 금지한다.

## 2. 릴리스 게이트 (점수와 별개, 전부 필수)

| ID | 게이트 | 판정 규칙 |
|---|---|---|
| RG-01 | 안전 | 비밀/원본 데이터 유출, 승인 없는 원본·Production 변경 0건; 변경 브랜치·복구점 존재 |
| RG-02 | 기능 | 고정 D1~D5 시나리오 끝까지 수행, 기존 앱 핵심 기능 회귀 PASS |
| RG-03 | 품질 | CI·타입체크·실 브라우저/정적 파일/콘솔·Network/반응형·접근성 기준 통과 |
| RG-04 | 실제 서비스(배포 시) | Production URL, 실제 렌더·기능·인증 경계·GitHub SHA vs Vercel Production SHA 검증. 배포하지 않는 로컬판은 **미적용**으로 명시 |
| RG-05 | 인수인계 | README/AGENTS/REQUIREMENTS/STATUS/HANDOFF 최신 일치, 실제 SHA·증거 링크·잔여 문제 기록 |
| RG-06 | 사용자 최종 수락 | 디자인·사용 흐름·변경 결과를 실제 화면에서 승인 |

**릴리스 판정:** `100/100 + RG-01..RG-06(적용 대상) 모두 PASS`일 때만 **v1.0 COMPLETE**. 85점이어도 게이트 하나 실패면 **RELEASE HOLD**다.

## 3. 진척률 산정 방법

- **Verified Completion %** = PASS 처리된 AC 항목의 **가중치 합계** (최대 100).
- 작업 중/코드는 있지만 미테스트/사용자 승인 대기/CI 실패/스크린샷만 있는 경우는 해당 AC **0점**.
- 같은 항목을 여러 번 테스트해도 한 번만 반영(중복 방지).
- 과거 PASS여도 이후 핵심 코드 변경 시 영향을 받는 AC는 **재검증 전 미검증**으로 강등.
- 소스 외의 목업/슬라이드/유튜브 연출/가상 KPI는 진척률 점수에 포함하지 않는다.
- 보고에는 **verified score**, 별도 **예상 작업 진행상황(비점수)**, **게이트 상태**를 분리한다.
- 기존 70/85/95% 같은 추정 수치를 이 프로젝트로 가져오지 않는다.

## 4. 증거 등록 템플릿

```
AC-ID:
기능/시나리오:
GitHub branch / commit SHA:
테스트 환경 / 명령 / CI URL:
PASS / FAIL / SKIP counts:
시각 검증 3 viewport 캡처 위치:
콘솔/네트워크 및 API 결과:
보안/원본 보존 확인:
리뷰 담당 / 확인 일시(KST):
판정 PASS/FAIL/MISVERIFIED:
```

## 5. 2026-11-12 구현 체크포인트

**최신 P75:** `${branch}@${codeSHA}`에서 AC01 +8 (로컬 React fixture 2), AC07 +12 (각 5 API 흐름+TSX callback stub, 승인 CSS patch/rollback), AC10 +5 (실제 Draft [PR #1](https://github.com/hibi89/frontend-foundry-ax/pull/1) 미병합, 별도 temp repo git revert) = **75/100점 잠정 엔지니어링**. [P75 증거](FFAX_P75_ENGINEERING_EVIDENCE_20261112.md). **실 React runtime/실 고객/원격 importer/Windows/CI/Production 미검증, 출시 HOLD**. 본 항목 이후 P50은 역사적 기록.


현재 `feature/ffax-workbench-p50-20261112@e2d9355577e20cbe9d70d80f8bbb9a4263f2de08`의 위 5개 AC 합계 **50/100점 잠정 엔지니어링 마일스톤**. [P50 검증 근거](FFAX_P50_ENGINEERING_EVIDENCE_20261112.md)를 참조한다. Node24 PASS·Chromium set_content30 PASS, 직접 localhost Chrome navigation·Windows·실 React build/LLM·실 고객 PR은 미검증. **RELEASE HOLD**. 이 점수는 제한적인 기능·검증 범위에 대한 판단이며 실패 발생 시 해당 AC를 내린다.

## 6. 최초 기준선
2026-11-12 KST, 저장소는 새로 생성되었고 문서만 작성 중. 실제 제품 구현·테스트 증거 없음. **Verified Completion 0/100, 릴리스 RELEASE HOLD, Production 미적용**. 문서만으로 점수를 올리지 않는다.


## 7. 2026-11-18 FFAX V2 Reference Fidelity 추가 검수 게이트 (기존 점수/가중치 불변)

사용자 승인 [최종설계](FINAL_BLUEPRINT_FFAX_V2_REFERENCE_FIDELITY_20261118.md)에 따라 **기존 AC-01..AC-12의 100점 표를 변경하지 않고 해당 AC 수용 증거를 강화**한다.

- **AC-05 (6점 기존 유지):** 기존 두 후보·권리/승인 외에 잠긴 원본 SHA/DPR, 디자인 레이어·자산 증거, '추정/알 수 없음' 표기를 확인한다. 이미지 한 장에서 숨겨진 레이어 복원 또는 정확한 원본 폰트 식별을 보장하지 않는다.
- **AC-04/06 (14점/12점 유지):** 실제 선택한 생성기→빌드 가능한 React→편집 가능 후보를 만들고, 변경은 격리 복제본에서만. 초안/모의 응답으로 완료 처리 금지.
- **AC-08 (12점 유지):** Playwright 실제 동일 픽셀 크기 렌더·one-shot-ui heatmap/영역별 issue·선택적 CSS 패치 제안·재촬영·최대 5회 종료 조건을 고정 레퍼런스에서 증빙. Pixel diff는 품질 진단이며 기능/권리/시각 PASS와 다르다. 별도 375/768/1440 반응형/콘솔/네트워크 검사 유지.
- **AC-07/10/11 (12/5/3점 유지):** CSS 수정안의 scope 경계, 원본 무변경, SHA·rollback, 외부 프로세스/라이선스/유료·이미지 업로드 차단을 검사한다.
- **AC-09 + RG-06 (6점 및 별도 게이트 유지):** 레퍼런스/실화면 비교 보드, 이미지 자산·텍스트·폰트·레이아웃 차이를 사용자가 확인하여 명시적으로 승인해야 한다.

**미실행/차단:** 실제 upstream engine 설치 검증, 역학달력 원본 참조 이미지 확보, UI 연결, 자동 CSS 보정 루프, 실제 P2 증거는 아직 확보되지 않았으므로 V2 신규 게이트 `NOT_RUN`. 구형 내부 80/100은 역사적 잠정 수치; 공식 구현완료율/검증완료율 **UNASSESSED**, RELEASE HOLD.

## 8. [2026-11-18] V2.1 Design Forge 추가 수용조건 — 기존 AC 12개 가중치 그대로

- **AC-02**: 사용자가 입력한 업종/대상·디자인 개선 요구·금지 요소가 `DesignBriefV2`에 반영되고 실제 추천 2~4안 생성(기본 3안), 각 시안의 추천 근거와 출처·비용·한계 확인.
- **AC-03**: 시안 A/B/C가 단순 다른 컬러 코드가 아니라 레이아웃/타이포/컴포넌트 구성 등 차별화된 소스를 출력하며 선택된 토큰을 편집·혼합하고 반응형 규칙을 재사용.
- **AC-04/06**: 실 React 컴포넌트/HTML/CSS source에서 실제 렌더 PNG 생성, 사용자 부위별 수정/Undo/Redo가 코드/브라우저 캡처에 반영. UI 스텁·Mock JSON·랜더 없는 프롬프트만으로 구현 인정 금지.
- **AC-05/10**: 사용자가 고른 시안의 source/token/assets/spec/PNG와 승인 manifest SHA 잠금, import/reopen hash 일치, 재승인 없이 변경 시 fork+새 버전. 외부 이미지는 역설계, 내부 생성 시안은 원본 코드를 그대로 전달.
- **AC-07/08/09**: 레퍼런스와 구현 캡처는 별도 비교·기능/접근성/반응형 QA와 사람 수락 필요. 자체 생성 화면과 자신을 비교한 수치를 임의 '95% 재현'으로 선언 금지.
- **AC-11/12**: 오프라인 규칙 fallback·선택 Qwen 텍스트 경로·unsupported image asset/paid/cloud/provider 오류, 데이터 출처/폰트·이미지 라이선스, Windows 11 GTX1050 Ti/RAM16GB 상한 및 사용자 원본 보호. 외부·유료·토큰/민감 프롬프트 전송 기본 차단.

기존 12 AC / 100점 고정 루브릭·RG-01..06·사용자 승인·RELEASE HOLD 유지. 이 업데이트는 **P0 설계**이며 `V2.1 DESIGN_FORGE_IMPLEMENTATION=NOT_IMPLEMENTED`, `V2.1_P2=NOT_RUN`. 역사 80/100과 공식 두 완료율 UNASSESSED 별개.
