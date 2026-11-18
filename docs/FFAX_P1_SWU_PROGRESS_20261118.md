> **[2026-11-18 · FFAX V2.1 P1 source candidate 100% | code SHA 780b4cc416dedb6013470e1b11b7f8105e644978]** 25개 관리용 SWU 전부 `SOURCE_COMPLETE_P2_PENDING`: **25/25 = 100.0% SWU P1 소스 구현 후보율**. 이는 실제 P1 BE/FE/API/CLI 호출 경로+기본 거부 조건/국소 코드 검사를 관리하는 동등 SWU 건수이며 기존 **AC-01..12 고정 100점 공식 최종완성률과 다르다**. 공식 최종설계 가중 구현률=UNASSESSED, 공식 P2 검증률=UNASSESSED, P2 전체/독립/Windows/실고객·실브라우저 E2E=NOT_RUN, RELEASE HOLD. 마지막 기능: DF-05 capture 폰트·자산·DPR 경고; RF-01 PNG/JPEG/WebP 승인형 불변 로컬 vault; RF-02 필수 이미지 자산 차단/명시 대체 승인; RF-03 owner typed fallback→SHA React/TSX; DF-04 자유문구/브랜드 텍스트·레이아웃·폰트/색채/장식 타입 편집+Undo/Redo; RF-08 원본 SHA 무변조 audit, 동적 import 차단, 소유자 별도 승인형 Draft PR plan, 안전 rollback; 로컬 서버 신규 스타일 모듈 200 HTTP 로딩 결함 수정. **GitHub P1 source+real localhost HTTP smoke [#44292749024](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44292749024): 43/43 PASS, 0 FAIL**; [최종설계 증거 게이트 #44292749760](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44292749760) SUCCESS. 브라우저 실제 시각/기능·고객 auth/API/routes 동작 또는 실제 PR 생성/배포를 PASS로 오인하지 않는다. **원본 고객 파일·main·Production·외부 전송·유료·권한 변경 0; RELEASE HOLD.** 다음은 P2 전체 CI/빌드/통합/복구/보안/Chrome·Edge/Windows 검증, Codex 독립 감사·Astra UI 감사와 사용자 GO 이후 출시 판단. SWU 매핑/복잡도·exact SHA·P2 HOLD는 `docs/FFAX_P1_SWU_REGISTER_20261118.json` 참고.

# FFAX V2.1 — P1 실제 SWU 구현 후보 추적 (2026-11-18 KST)

**제품:** `hibi89/frontend-foundry-ax@feature/ffax-reference-fidelity-20261118`
**코드 증거 HEAD:** `938495a4b5b0efc4fe405581341134e0d5871dde`.
**SWU 새 작업 원장:** `docs/FFAX_P1_SWU_REGISTER_20261118.json` (기존에 공식 SWU 원장은 없었음).
**정본 보존:** v1 REQ-01..12, 12AC/100점, Design Forge DF-01..07, Reference Fidelity RF-01..08. SWU는 새 기능 요구가 아니라 P1 코딩 작업 경계다.

## 진행 계산

- **SWU 소스 구현 완료 후보: 19/25 = 76.0%**. 실 기능 caller→callee와 주요 거부 경로가 소스에 존재하고 관련 국소 검사 증거가 있는 경우만 1로 인정.
- **부분 구현: 6/25 = 24.0%**. 부분 소스는 완료 분자 0. 누적 가중치/수락점수와 무관하다.
- **공식 전체 최종설계 구현률: UNASSESSED.** SWU 동등 가중치와 사용자 정본 AC100점 가중치는 다른 지표다. 임의 100점 환산 금지.
- **공식 P2 검증률: UNASSESSED / P2 NOT_RUN, 출시 HOLD.**
- **Legacy 10개**는 기존 FFAX V1 코드의 관찰 가능한 독립 기능(읽기/복구/컴포넌트/브리프/편집/React 내보내기/모델 게이트/GitHub 검토/QA/격리 패치)을 별도 표시한 것이다. 단지 파일·테스트를 늘려 기존 DF/RF 구현 점수를 부풀린 것이 아니다.
- **추가 V2.1 15개 경로:** 신규 분모 유지, DF-02는 pinned MIT 오프라인 스타일 선택 실행 경로 구현 후 후보 전환; DF-04/05 및 RF-01/02/03/08 여전히 PARTIAL.
- **측정 도구:** `node scripts/ffax_swu_progress.mjs` → 소스 후보/전체/부분 명시. 원장의 status만 집계하며 테스트/커밋 수로 점수 부여하지 않는다.
- **국소 검사:** [P1 smoke #44288465949](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44288465949) 실제 성공; [설계 게이트 #44288466332](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44288466332) 성공. 이전 V1 샘플 소스 점검은 당시 범위에 한정; 최종 고객/Windows/P2 자동 승격 금지.
- **SWU 크기:** 각 항목 S/C/I/D/U(0~2) 점수, deps, allowed_paths, 정상/주요 거부 경로 단위 수용조건, 남은 P2와 권한 HOLD를 JSON으로 고정. 위험 D=2는 코드-only/사전 안전 검수 대상으로 취급. 외부 권리/원본 작성/PR/배포는 별도 GO.

## 남은 부분 구현 SWU

| SWU | 현재 간극 | READY/게이트 |
|---|---|---|
| DF-04 | 선택 영역 자연어 재배치·브랜드 로고/자산 혼합과 변경 의도 세밀화 | 안전한 타입 변환 READY |
| DF-05 | 캡처 과정 실제 폰트/자산 실패 경고·반응형 capture receipt 연결 | READY |
| RF-01 | 현재 PNG 불변 보관은 동작 후보. JPEG/WebP·권리 provenance·불변 원본 공통 계약 미완 | READY |
| RF-02 | 색상/사용자 영역 라벨 외 레이어/원본 자산 실추출·권리 manifest 연결 | READY, 원본 없는 asset 복원 금지 |
| RF-03 | 사용자가 지정한 타입 매핑 외 실제 외부 이미지 기반 생성 어댑터 및 실패 안전 계약 부족 | RF-02 후 READY |
| RF-08 | 격리 TSX 삽입/실 diff/rollback은 구현. 기존 앱 auth/API/routes/data/events 보존 검사와 최종 PR 제안 경로 미연결 | 안전 read-only 검토 READY, 실제 PR/고객원본 쓰기는 GO HOLD |

## 정확한 진전과 한계

이번 `ㄱ`에서 원본 SHA-검증 로컬 PNG vault, 소유자 opt-in GUI 및 불변 복구, 독립 엔진이 없는 오프라인 업종/접근성 추천, 실제 UI UX Pro Max 저장소 pinned styles.csv 스타일 행 1/7/8 메타데이터를 소스에 연결했다. 해당 부분 기능의 구현은 실제 진전이지만 RF-01 전체를 SOURCE_COMPLETE로 허위 상향하지 않았다.

기존 자료의 8/15는 **신규 DF/RF 경로의 당시 소스 후보 수**였지 FFAX 전체 SWU 공식률이 아니었다. 새 25개 기반 76.0%는 **P1 관리용 SWU 소스 후보율**로 명시하며, 사용자 최종설계 가중치 공식률은 재판정 전 UNASSESSED다.

원본/비밀/고객/Production/main 변경0, 상용 출시/크몽 미승인 유지.
