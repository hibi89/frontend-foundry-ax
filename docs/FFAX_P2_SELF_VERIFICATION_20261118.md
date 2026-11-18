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
