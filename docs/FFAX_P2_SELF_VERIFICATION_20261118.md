# FFAX V2.1 — P2 자체 기술 검증·결함 수정 증거 (2026-11-18 KST)

## 1. 권한·상태 경계

- 저장소/브랜치: `hibi89/frontend-foundry-ax@feature/ffax-reference-fidelity-20261118`
- 전체 P2 CI 원본 기능 SHA: `f9c1fcc44beee78950596b34bf5103baec040041` — https://github.com/hibi89/frontend-foundry-ax/actions/runs/44301266661
- **P1 소스 구현 후보: 25/25 SWU = 100%**. 별도 **P2 전체 CI: 4/4 job SUCCESS**. 서로 다른 분모이므로 '제품 전체 검증완료 100%'로 합치지 않는다.
- **P2 SELF_VERIFIED_LOCAL_CI**: 웹 GPT-6 본인 구현·수정·코드/CI 검증. 실제 독립 Codex Sol Max 기술·보안 감사 `NOT_RUN`, Astra UI 감사 `NOT_RUN`, 사용자 최종 수락 `NOT_RUN`.
- **공식 AC-01~12 고정 가중 100점 검증완료율 = UNASSESSED**. 기존 과거 잠정 80/100은 이전 한정 엔지니어링 기록이지 V2.1 최종 인수 점수가 아니다. `RELEASE_HOLD`.
- GitHub feature 브랜치 이외 원본·main·Production·고객 파일·실서비스·자격 증명·유료 외부 모델 변경 `NOT_PERFORMED`.

## 2. 실제 통과한 검증

| 수행 영역 | 실행 근거 | 결과와 한계 |
|---|---|---|
| Ubuntu Node 전체 단위·API·보안·회귀 | [전체 P2 CI](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44301266661) | **209/209 PASS**, React19 실제 SSR/strict TypeScript, 17개 패턴/30개 생성 컴포넌트. 데이터는 합성·로컬 |
| Windows Node + localhost | [전체 P2 CI](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44301266661) | **209/209 PASS**, 자산 HTTP 200·동의 없는 로컬 API 403 |
| Windows 실 Edge + nested Chromium Forge | [전체 P2 CI](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44301266661) | **23/23 PASS**, 편집·Undo/Redo·승인·PNG·SHA·vault 저장/복구·동일 이미지 픽셀 비교. 실제 고객 화면 품질 승인 아님 |
| Linux Chromium 14종 브라우저 회귀 | [전체 P2 CI](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44301266661) | **14/14 script PASS**; 375/768/1440, 콘솔/네트워크, UI 조작, Repo 읽기·원본 불변·버전/복구, 컴포넌트 조작 |
| 접근성·시각 스타일 | [전체 P2 CI](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44301266661) | axe-core 4.14.0 serious/critical **0** at 3 viewports; React19 preview/export computed styles **18/18 MATCH**, 대비 검사 저대비 후보 0. 사람 심미·UI 수락은 별도 |
| 로컬 D1~D5 / Cleanroom | [전체 P2 CI](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44301266661) | **D1~D5 5/5**, 완전 분리 복제 환경 **7/7 steps PASS**, favicon 원본 SHA 보존 |
| Windows unsigned review ZIP | [전체 P2 CI](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44301266661) | 생성·압축해제·source SHA·문법 검사 PASS. 검수 ZIP SHA256 `496D156F093F93E677020BDAE5EF6AB7E5CEA866288FBF064802704591449F9D`. 배포/서명/출시 아님 |
| Windows 압축해제 후 실제 서버 실행 | [별도 검증](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44297153826) | asset URL 200, CSRF 403 PASS. Windows Server CI이지 사용자 Windows 11 노트북 실기기 아님 |
| 공개 npm 생산 의존성 보안 | [보안 감사](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44301022612) | 버전 고정 검사 PASS, `npm audit --omit=dev --audit-level=high` 취약점 **0건**; 감사 실행 이후 package.json 변경 없음. 소스 독립 보안 감사 대체 아님 |

## 3. P2에서 발견하고 실제 수정한 원인

- 실제 Chromium 촬영: offline browser에서 별도 style injection 정지. 주입 제거, Chromium screenshot 애니메이션 비활성화 유지, 보수적 타임아웃 단계 추적. JavaScript 실행·외부 네트워크 금지 유지.
- P2 브라우저 테스트: CSP가 차단하는 blob fetch 및 unsafe-eval 사용을 제거하고 실제 GUI PNG 다운로드→검증→업로드 검사로 교체. 제품 CSP 완화 없음.
- React/Card: 레퍼런스 기본 반경 14px과 내보낸 React 12px 불일치를 공통 14px로 수정. 실제 계산 스타일 18/18 재검증.
- 접근성: 디자인 후보 그룹의 aria-label에 유효한 group 역할 지정. axe serious/critical 3건(3 viewport)→0건.
- 원본 이미지 보관: 보관할 파일 입력란을 전용화, 다른 참조 input으로부터의 모호한 자동 선택 제거, 권리·동의 SHA 확인 유지.
- Cleanroom: 분리된 복사본에 정적 assets가 누락돼 파비콘 404 발생. assets 복사와 파일 SHA 검증, 전체 cleanroom 7/7 PASS로 재검증.
- 완전 P2 CI는 14개 browser probe의 실패를 전수 수집하되 최종 exit는 fail-closed로 유지하며, 오래된 ref 검증으로 최신 실행이 차단되지 않도록 개선.

## 4. AC-01~12 제한사항 및 미실행 게이트

- AC-01/02/03/06의 브리프·테마·컴포넌트·에디터·복제는 합성/로컬 기능 증거 있음. 실고객 인수 증거와 구분.
- AC-04: 12개 합성 모델 계약/React 컴파일은 확인. 사용자의 실제 Qwen3 4B 연결·응답 품질·GPU/CPU 성능은 `NOT_RUN`.
- AC-05/08/09: 권리 확인과 PNG 캡처·차분·반응형·axe는 수행했으나 외부 실제 참고 이미지의 one-shot-ui 가동/실제 픽셀 재현 수락·사용자 시각 심사는 `NOT_RUN`.
- AC-07/10: 합성 React 앱/정적 API/rollback·Draft PR 계획 근거는 있으나 실제 고객 저장소 인증·라우팅·API 동선 및 새 PR 생성·승인 반영은 `NOT_RUN` (권한·owner GO 필요).
- AC-11/12: API/CSRF/안전·중단·Cleanroom/Windows CI는 PASS지만 실제 Windows 11 GTX1050Ti·RAM16GB 로컬 사용자의 설치·성능/복구, 실제 외부 공급자 연결은 `NOT_RUN`.
- RG-01/02/03: 로컬 합성 CI 증거는 확보. RG-04 Production `NOT_APPLICABLE` (배포하지 않은 로컬 미출시 빌드), RG-05 SHA·증거/인계 갱신, RG-06 사용자 최종 수락 `NOT_RUN`; **RELEASE_HOLD**.
- 독립 기술·보안 감사, 독립 UI/UX 검수, 사용자 승인 없는 범위/권한/원본 변경, 크몽 실제 등록 `NOT_RUN`.

## 5. 다음 안전한 작업

실기기·실고객·실참조 및 독립 신뢰 주체 검증은 명시된 사용자 권한과 실행환경에서 수행해야 한다. 자체 CI PASS를 독립 감사나 출시 승인으로 대체하지 않는다. 새로운 문제 발생 시 본 문서의 기능 SHA/CI 링크로 재현·수정·재검증하고 원본·백업·RELEASE HOLD를 보존한다.

## 6. 2026-11-18 21:43 KST — 추가 P2 결함 수정·재검증

- **코드 기준 SHA:** `8515c30413d499c69c7e0066d458f5addf52131f` (브랜치: `feature/ffax-reference-fidelity-20261118`).
- **결함 1:** `scripts/forge_capture.mjs`가 보호 경로를 문자열 `root+'/src/'`로 비교하여 Windows의 `\\` 경로 구분자 및 부모 심볼릭 링크를 놓칠 수 있었음. 수정: OS 구분자와 `realpath`로 source subtree 안의 새 캡처 출력 폴더 생성 거부. [수정 커밋](https://github.com/hibi89/frontend-foundry-ax/commit/25b6db44078353c21ac5fd23903635967949e699).
- **결함 2:** `scripts/forge_converge.mjs`가 격리 출력 폴더의 겉보기 경로만 검사하여 외부 부모 심볼릭 링크의 저장소 내부 지향을 탐지하지 못할 수 있었음. 수정: 출력 부모 실제 경로 검사 및 저장소 전체 내부 출력 거부. [수정 커밋](https://github.com/hibi89/frontend-foundry-ax/commit/8515c30413d499c69c7e0066d458f5addf52131f).
- **관련 테스트:** `tests/forge-capture-readiness.test.mjs`, `tests/forge-convergence.test.mjs`에 신규 P2 경로 방어 2건 추가.
- **재검증:** [P2 Actions #44306309787](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44306309787) `completed/success`, **4/4 job SUCCESS**. Ubuntu `211/211 PASS, 0 FAIL`, Windows `211/211 PASS, 0 FAIL`. 신규 두 테스트는 양 OS에서 PASS. 동 실행에서 Chromium 브라우저 23/23, axe serious/critical 0, 로컬 D1~D5, cleanroom 및 Windows 검수용 패키지 워크플로 통과. 별도 [source smoke #44306309887](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44306309887), [Windows review ZIP #44306309723](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44306309723), [blueprint evidence #44306310296](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44306310296) `success`.
- **보존:** 원본/source/client files, main, Production, 외부 업로드, 권한·유료 API, 릴리스 변경 없음. 이 코드는 사용자 장비에서의 실기기 재검증도, 별도 Codex/Astra 독립 감사도 아님.
- **완료율/게이트:** P1 코드 SWU 25/25 (100% 후보); 고정 AC-01..12 공식 검증완료율 **UNASSESSED**; 실제 Windows11/GTX1050Ti/Ollama·권리 있는 외부 참고 이미지/one-shot-ui·실고객 인증/라우팅/API·독립 기술/보안·UI 감사·사용자 최종 수락 **NOT_RUN**. RG-06 미충족, **RELEASE HOLD**.

## 7. 2026-11-18 KST — 한국어 청크 분할 UTF-8 입력 오류 수정과 전체 재검증

- **기능 SHA:** `01eed9e05343fd269711abb956dee9e4f43c2758` (`feature/ffax-reference-fidelity-20261118`).
- **원인:** Node의 `Buffer#toString('utf8')`을 HTTP 요청 청크별로 호출해 3바이트 한국어 글자 중간에 청크 경계가 생기면 `U+FFFD`로 대체됨. `/api/design/brief|variants|refine|...`과 `/api/local-model`의 텍스트 의미·민감정보 거부 정확성에 영향을 줄 수 있었음.
- **수정:** `src/http-body.mjs`의 bounded `TextDecoder('utf-8',{fatal:true})` 스트리밍 디코드 경로를 `src/forge-api.mjs`, `src/server.mjs`에 함께 연결. 요청 원본을 로깅하지 않고, 원래 본문 상한과 local Origin/CSRF·동의/민감정보 차단을 보존함. UTF-8 손상은 즉시 거부. `FORGE_UTF8_INVALID` 진단 코드가 `[A-Z_]` 정규식에 막히던 오류 응답 계약은 `[A-Z0-9_]`로 바로 수정.
- **테스트:** `tests/forge-api.test.mjs`, `tests/server-security.test.mjs`에 한국어 3바이트 청크 분할+원문 유지, invalid UTF-8/초과 요청 거부, 기존 주민등록번호 민감 문자열 거부 확인(실 Ollama 호출 0).
- **실패·원인·수정 이력 보존:** 최초 코드 [`db0ea733`](https://github.com/hibi89/frontend-foundry-ax/commit/db0ea733a998e286ecda6ba18c5a0342391caa7b)에서 source smoke [#44321935789](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44321935789) **FAIL 47/48**: 제품의 의도한 안전 거부는 작동했으나 오류코드 `FORGE_UTF8_INVALID`가 `FORGE_OPERATION_FAILED`로 변환. 오류 응답 필터 수정 [`01eed9e05343fd269711abb956dee9e4f43c2758`](https://github.com/hibi89/frontend-foundry-ax/commit/01eed9e05343fd269711abb956dee9e4f43c2758) 이후 PASS. 실패를 지우거나 처음부터 성공한 것으로 취급하지 않음.
- **수정 후 실제 검증:** [P2 전체 Actions #44322075360](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44322075360) `completed/success`, **4/4 job SUCCESS**. Ubuntu/Windows Node **각 214/214 PASS, 0 FAIL**. Chromium UX·컴포넌트·접근성(axe serious/critical=0)·D1~D5/cleanroom 및 Windows review ZIP 회귀 통과. [별도 Forge 브라우저 #44322075363](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44322075363), [소스 스모크 #44322075354](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44322075354), [Windows review package #44322075357](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44322075357), [blueprint gate #44322076199](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44322076199) 모두 SUCCESS.
- **P2 남은 필수 게이트:** 사용자 실제 Windows 11 GTX1050 Ti·RAM16GB/Ollama 라이브 요청(OWNER 환경), 권리 확인된 외부 이미지+실 one-shot-ui 충실도 수락, 실고객 React auth/API/routes/적용·rollback, Codex 기술·보안/독립 Astra UI UX 감사, 사용자 최종 디자인·기능 GO **NOT_RUN**. 독립 감사나 실사용을 자체 CI로 대체하지 않음.
- **공식 진척/보존:** 25/25 P1 SWU 소스 구현 후보 =100%; 고정 12 AC 총 100 가중치 공식 P2 검증완료율 = **UNASSESSED**. `RELEASE HOLD`, main/Production/고객 원본/비밀/유료/권한/상품 등록 변경 없음.

## 8. 2026-11-18 — one-shot-ui 실제 upstream CLI 합성 환경 통합 검증

- **작업 기준 코드 SHA:** `a1c17cbb9a42a532464e3fe915e18781aba375ed` on `feature/ffax-reference-fidelity-20261118`. [커밋](https://github.com/hibi89/frontend-foundry-ax/commit/a1c17cbb9a42a532464e3fe915e18781aba375ed).
- **P2 미검증 게이트 일부 해소:** 선택형 외부 이미지 비교 모듈 `scripts/ffax_reference_fidelity.mjs`을 upstream `TN0123/one-shot-ui` **정확한 npm 버전 0.12.0**으로 실제 실행. 엔진 명칭·버전·MIT 라이선스·CLI binary contract를 runner에서 검사. upstream 소스는 제품에 vendoring/런타임 필수 설치하지 않음.
- **실제 실행 증거:** [FFAX P2 real one-shot-ui #44324629302](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44324629302) **completed/success**. `compare --json --no-ocr --heatmap heatmap.png` 및 `suggest-fixes --json --no-ocr` 수행. 96×64 자체 생성 합성 PNG 2장에 **mismatchRatio 0.08072916666666667, issues 2**, heatmap PNG SHA `1786a242de5543dbaef0c563043f3e145df255337859266f3e725d4931fd4fef`. 참조 SHA `beda94d41cff5f93da56ae0f488843fe7bb93cdbf1685b4fc5562f37e5a6f095`; 구현 SHA `d7efac9aed762c599918a3e263cb6d03d9536d049bab3c6541b70a273a14dac0`. JSON ratio/issues, 96×64 실제 히트맵 PNG, SHA 불변을 검사. **검증 대상: upstream CLI의 실행 가능성과 FFAX 호출 계약뿐**.
- **실제 수정:** 무검증 arbitrary JSON/없는 히트맵도 통과 가능했던 adapter를 보강해 실제 summary·issues·PNG 매직/크기 검증, 실패시 fail-closed; upstream 이미지 분석에 `--no-ocr` 적용해 불필요한 OCR 모델 실행/다운로드 경로 방지. 독립 runner npm package 설치는 `--ignore-scripts`, runner temp, repo `contents:read`, `persist-credentials:false`, 버전 exact pin. 고객 이미지·권리 확인 필요 참고자료/고객 앱/운영 원본은 사용하지 않았음.
- **기존 코드 회귀:** [소스 smoke #44324629188](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44324629188) SUCCESS; [Windows 검수용 package #44324629046](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44324629046) SUCCESS. 전체 P2 CI 실행 [#44324629104](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44324629104)은 별도 상태 확인을 요함; 성공 증거 없이 PASS로 선기재하지 않음.
- **여전히 NOT_RUN:** 사용자 실 Windows11 Qwen3 4B 성능·호출, 사용권 확인된 실제 외부 이미지/one-shot-ui 재현 수락, 실제 고객 React 인증·라우팅·API 시나리오, Codex 독립 보안·코드 감사, Astra 독립 UI/UX 감사, 최종 사용자 GO. **25/25 P1 source candidate (100%) / 공식 AC 검증완료율 UNASSESSED / RELEASE HOLD**.

