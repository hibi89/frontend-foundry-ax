> **[2026-11-18 FFAX P1 SWU 원장 신규 확정 | 938495a4b5b0]** 기존 관리 DF/RF 15개는 FFAX 전체 분모가 아님. 실제 V1 caller 기능 10개를 독립 SWU에 매핑하고 기존 DF-01..07/RF-01..08을 보존한 **25개 P1 SWU 관리 원장**을 신규 작성. 실제 소스 후보 19/25=**76.0%(SWU 코드 구현 후보율)**, 부분 6/25=24.0%, **공식 최종설계 가중 구현률 UNASSESSED, 검증률 UNASSESSED**. 단위별 REQ·allowed_paths·deps·S/C/I/D/U·수용조건은 docs/FFAX_P1_SWU_REGISTER_20261118.json 참조. RF-01 로컬 PNG 원본 저장·해시 검증·재조회, DF-02 업종별 오프라인 추천 개선은 코드 실진전. P2/고객앱/실브라우저·독립 감사·Windows는 NOT_RUN, RELEASE HOLD, 원본·main/Production 변경0.

> **[2026-11-18 19:00 KST | FFAX P1 실제 구현 및 국소 CI 증거]**
기능 커밋 c16fa0c (RF-08 안전한 격리 클론 추가·diff/rollback), e43de656 (RF-01/02 외부 이미지 asset manifest→잠금 번들/브라우저 다운로드), 3511a73e (DF-04 컴포넌트 직접 편집·디자인 토큰·선택적 시안 혼합·Undo). 결함 수정 d8d0ed04 (한국어 '표시' 오분류), 62959e5e (합성 이미지 fixture 계약).
실행 증거: GitHub P1 source smoke https://github.com/hibi89/frontend-foundry-ax/actions/runs/44280844367 = 25/25 PASS, Node syntax PASS; blueprint evidence gate https://github.com/hibi89/frontend-foundry-ax/actions/runs/44280844846 = SUCCESS. P2 전체 브라우저/Windows/고객 React auth/API/route 검증/독립 감사 NOT_RUN.
관리용 8/15 SOURCE_CANDIDATE + 7/15 PARTIAL 유지(공식 SWU/REQ 분모 아님). 공식 P1 구현완료율 UNASSESSED, P2 검증완료율 UNASSESSED. 기존 main/Production/실고객 원본/유료/외부 전송 변경 없음; RELEASE HOLD.
남은 READY: RF-01 원본 이미지 바이트 로컬 불변 보존·재조회, RF-02 실제 이미지 자산 크롭·manifest/권리 바인딩, DF-02 오프라인 추천 스타일 데이터 확대, DF-04 자연어 구조 재배치, RF-08 기존 인증·API·라우트·데이터·이벤트 계약 검토형 통합 연결. 고객 원본 수정과 PR/배포는 별도 승인 필요.

# FFAX V2.1 — P1 기능 진행 원장 (2026-11-18 KST)

Repo: hibi89/frontend-foundry-ax
Branch: feature/ffax-reference-fidelity-20261118
Code checkpoint: 7f4b5564646c0f30b20bfee51a75b5515301f7b7 (추가 코드 커밋은 최신 GitHub HEAD 기준)
Canonical: docs/FINAL_BLUEPRINT_FFAX_V2_REFERENCE_FIDELITY_20261118.md §0A, REQ-01~12, 12 AC/100점 불변.

**공식 구현완료율 = UNASSESSED. 공식 검증완료율 = UNASSESSED.**
승인된 전체 최종설계에 대한 고정 기능 가중치와 실행 검사 근거를 재산정하지 않은 상태이므로 백분율을 임의로 부여하지 않는다.

관리용 DF-01..07 + RF-01..08 총 15개 후보 경로 중 **SOURCE_CANDIDATE 8/15, PARTIAL 7/15**. 이는 공식 SWU 분모·구현완료율이 아니다. SOURCE_CANDIDATE는 호출자→피호출자→출력/주요 오류 경로가 소스에 있다는 뜻이며 실제 Node/브라우저/실환경 PASS가 아니다.

| ID | 상태 | 구체 코드와 남은 제약 |
|---|---|---|
| DF-01 | SOURCE_CANDIDATE | design-forge.mjs / forge-api.mjs: 안전 brief/API |
| DF-02 | PARTIAL | 3개 자체 스타일 추천; upstream 전체 오프라인 추천 데이터 미편입 |
| DF-03 | SOURCE_CANDIDATE | A/B/C 구조화 실제 React 후보와 디자인 토큰 |
| DF-04 | PARTIAL | GUI/API에서 타입 제한 컴포넌트 추가·삭제·이동·속성 수정, 폰트·밀도·모서리·장식 토큰 변경, 시안 시각 속성 혼합·Undo 구현. 자유로운 자연어 재설계/미적 검수 미완 |
| DF-05 | PARTIAL | 실제 Playwright 캡처 소스; 폰트/자산/품질 규칙 완전 연결 미완 |
| DF-06 | SOURCE_CANDIDATE | 승인형 source+PNG SHA 번들/부모/복원 |
| DF-07 | SOURCE_CANDIDATE | GUI→루프백 API→확정→기존 FFAX 편집기 동일 소스 handoff |
| RF-01 | PARTIAL | 외부 이미지 권리/SHA/해상도/색상 분석; 불변 원본 보존·권리 manifest 미완 |
| RF-02 | PARTIAL | PNG 색상·영역 힌트 및 사용자 라벨 bounds·타입, 원본 SHA·권리 주장·불확실한 자산을 구분하여 승인 잠금 번들의 manifest에 저장. 실 이미지 자산 추출/폰트 복원 미완 |
| RF-03 | PARTIAL | external-reference-to-forge.mjs 사용자 직접 영역 라벨링→React; 완전 자동 역설계 미완 |
| RF-04 | SOURCE_CANDIDATE | forge_capture.py/.mjs Chromium 실제 PNG/viewport/DPR/영수증 |
| RF-05 | SOURCE_CANDIDATE | ffax_reference_fidelity.mjs 선택형 one-shot-ui 비교/히트맵. 실엔진 미설치·검사 |
| RF-06 | SOURCE_CANDIDATE | forge-convergence.mjs, forge_converge.mjs, forge_pixel_metric.py: 최대5회 후보 보정·실캡처·점수 재측정·개선시 선택/rollback |
| RF-07 | SOURCE_CANDIDATE | forge-runner.mjs + forge-convergence-ui.mjs + forge-compare-ui.mjs: 메모리 전용 PNG, 시각 비교, owner approval |
| RF-08 | PARTIAL | forge_export.mjs 및 forge-safe-integration.mjs/forge_integration_review.mjs: 승인 번들→로컬 React 원본 read-only 스냅샷→격리 복제본에 TSX 신규 추가→실제 unified diff·SHA receipt→충돌 차단/rollback. 기존 앱 API/auth/route 동작 검사·PR은 HOLD |

이번 회차 실제 구현:
- 로컬 Chromium 기반 픽셀 진단과 reference SHA 고정, 최대 5회 타입 제한 보정/재촬영/점수 비교 및 이전 최선본 보존.
- 소유자 명시 동의를 받는 로컬 PNG 업로드/실행 API(Origin, Host, CSRF 검사와 메모리 보관), GUI 비교·수동 승인 후 수정본 재확정.
- 외부 PNG의 사람이 검토한 영역을 FFAX 17종 컴포넌트로 변환해 React 코드·출처 SHA 번들로 전달하는 안전 대안. 자동 OCR/그림 원본 복원으로 가장하지 않음.
- 정상·거부 경로 단위 테스트 소스를 추가하고 좁은 P1 Node syntax/Python compile/test Workflow에 연결.

필수 국소 syntax/type/smoke의 **실제 실행 결과는 확보되지 않음: NOT_VERIFIED**. 전체 CI/실브라우저/Windows 실기기/one-shot-ui 실설치/독립 Codex 기술 감사/Astra UI 감사는 **NOT_RUN**. RELEASE HOLD 유지.

다음 READY: 실제 국소 검사 결과 확보 및 결함 수리, 자동 레이어·자산 manifest와 참조 권리/원본 보존 확장, 기존 고객 React 라우트·인증·API/데이터 보존 diff/PR 제안 기능의 안전한 코드 구현. 승인 없는 원본 수정, main 병합, Production, 외부 전송, 유료 호출 금지.
