# FFAX V2.1 — 형 개입 전 P2 자체검증 인계 (2026-11-18 KST)

- **제품 저장소/브랜치:** `hibi89/frontend-foundry-ax@feature/ffax-reference-fidelity-20261118`
- **검증 기준 코드·CI SHA:** `6f58dfaeac8facdd49f9ecb87124c7a794e631b0`
- **P1 구현 후보:** SWU 25/25 = 100% (공식 고정 AC 가중 구현률과 별개)
- **P2 자체 검증:** [GitHub Actions #44331129465](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44331129465) 4/4 SUCCESS; Ubuntu/Windows Node 각각 **223/223 PASS, 0 FAIL, 0 SKIP**, Chromium/axe/반응형·Cleanroom, Windows 검수 ZIP PASS.
- **실 upstream:** [one-shot-ui@0.12.0 Windows·Ubuntu #44327619821](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44327619821) 2/2 PASS (FFAX 자체 합성 PNG의 실제 compare/suggest/extract/heatmap).
- **통합/원본 보호:** [원본 복제 심볼릭 링크·junction 차단](https://github.com/hibi89/frontend-foundry-ax/commit/65178dcc74d186e5e521af68c77dd966d82055cc), [FFAX 생성 React19 TSX+소유 합성 앱 2종/서비스 동선 10개/권한 거부 2개·원본 SHA·복구 2건](https://github.com/hibi89/frontend-foundry-ax/commit/426d7949c3b2fbaa5b524914cfa8872b326f83a9) PASS. 실제 고객 서버/API 동선이나 독립 감사가 아님.
- **CI 환경 사고 해결:** 2026-11-18 [#44330051335](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44330051335)는 우분투 폰트 apt mirror update 120초 timeout(124), 노드 검사 양 OS PASS. [CI 수정](https://github.com/hibi89/frontend-foundry-ax/commit/6f58dfaeac8facdd49f9ecb87124c7a794e631b0)에서 기존/캐시 한국어 글꼴 우선 확인→없을 때만 제한된 apt 설치·갱신, **필수 CJK 체크 유지**. 최신 4/4 PASS로 종료. 초기 새 P2 React 테스트는 최소 P1 smoke에 TypeScript/React 미설치로 두 번 실패했으나 의존성 있는 P2로 분리 후 [P1 smoke #44330051351](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44330051351) PASS.

## 형이 PC에서 처음 개입할 때 — 최소 순서

1. [P2 Actions #44331129465](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44331129465)의 `ffax-owner-review-unreleased` 아티팩트 (ID **14440220773**)를 다운로드하여 내부 `FFAX-OWNER-REVIEW.zip`도 해제. `SOURCE_SHA.txt`가 **`6f58dfaeac8facdd49f9ecb87124c7a794e631b0`**인지 확인. *비서명·미출시 검수 ZIP*이며 EXE 아님. 아티팩트는 약 **2026-11-26 00:05 KST** 만료될 수 있으므로 필요할 때 확인.
2. Node 20+ (권장 22)로 `START-FFAX.cmd` 실행 → `http://127.0.0.1:4173`. 비민감 요구 입력 → **A/B/C 실제 UI 시안 만들기** → 시안 선택/부분 수정·혼합·Undo/Redo → **선택 레퍼런스 확정 · SHA 잠금** → **확정 시안의 동일 코드를 FFAX 편집기로 전달**. 실제 UX·한글·모바일 판정.
3. Ollama `qwen3:4b-instruct`가 기존 PC에 이미 설치돼 있으면 재설치 불필요. 준비됐을 때 `RUN-LIVE-MODEL-CHECK.cmd` → 고정 12문항 중 10개 이상 **실 Qwen 생성 + strict TypeScript + React19 렌더** PASS 여부/실 GTX1050Ti·RAM16GB 소요·장애·중단을 확인. `FFAX-LIVE-MODEL-RESULT.json`과 `SOURCE_SHA.txt`의 비민감 정보만 검토. 미시행 = NOT_RUN.
4. 본인 사용권이 있는 실제 외부 레퍼런스 PNG/JPEG/WebP가 있을 때만 권리·SHA 확인 후 레퍼런스 비교/375·768·1440 캡처, 화면 수락. 고객 비밀·토큰·권리 미확인 원본은 공개 GitHub나 외부 AI에 업로드 금지.
5. 실제 고객 React 인증/routes/API 변경·원본/Production 병합·PR 생성 등은 **별도 사용자 허가 전 HOLD**. 실제 사용자 최종 디자인 수락 `RG-06`은 별도 `APPROVED` 필요.

## 실제 독립 검수 담당자에게 넘길 내용 — 미실행

- **Codex Sol Max 또는 승인된 독립 코드·보안 검수자**: 위 제품 SHA 고정, `AGENTS.md` → 최종설계 → `ACCEPTANCE_MATRIX.md` → P2 원장 → 실제 코드/CI 확인. `workspace` destination/junction, `forge-safe-integration` 보호·rollback, `forge-api` Host/CSRF, `local-ollama` consent/secret, 외부 CLI/폰트/라이선스·경로, 고객 원본 무변조·고정 12 AC 계약 감사를 독립 진행. 검증 전 `NOT_RUN`, 실제 모델 가용성 `MODEL_UNVERIFIED`. 출시/merge/보안권한 확대 금지.
- **Astra Max 또는 승인된 독립 UI/UX 검수자**: Design Forge A/B/C의 실제 화면·계층·조작·한글·폰트·반응형 375/768/1440·키보드/axe·비교 보드/시안 확정·복구를 독립 검토. 실제 스크린샷/변경 요청·이유, 실행 SHA 보고. 콘셉트 시안을 실구현 PASS로 치환하거나 사용자 대신 최종 APPROVED 금지. `MODEL_UNVERIFIED`.

## 남은 게이트와 안전선

**공식 AC-01~12 고정 가중 P2 검증완료율 `UNASSESSED`.** 본 회차 자체 CI PASS만으로 Codex/Astra 독립 감사 또는 사용자 실제 Windows 11·실 Qwen·권리 있는 원본 레퍼런스·실고객 React 앱·최종 RG-06 수락을 PASS 처리하지 않는다. 각각 **NOT_RUN**. `P1_SWU=25/25 SOURCE_CANDIDATE`, `P2_SELF_VERIFIED=CI_SUCCESS`, `RELEASE_HOLD`, 크몽 미등록, main/Production/원본·유료 API·민감정보·권한 변경 없음. 정확한 증거 [P2 원장](FFAX_P2_SELF_VERIFICATION_20261118.md).
