# FFAX V3 — Reference Fidelity First 최종설계 (2026-11-19)

**설계 ID:** FFAX-V3-FIDELITY-FIRST-20261119  
**제품 원본:** hibi89/frontend-foundry-ax / feature/ffax-reference-fidelity-20261118  
**분석 근거 소스 HEAD:** 3e4229f0358a7213c509c55cd995c1041c2931c7 (실행 때 최신 확인)  
**설계 상태:** P0 FINAL BLUEPRINT / 신규 코드 NOT_IMPLEMENTED / 실제 외부 이미지 95점 NOT_VERIFIED / RELEASE HOLD

**최우선 사용자 목적:** 사용자가 선택한 웹사이트/이미지/영상 디자인을 새로 '좋은 느낌'으로 만드는 것이 아니라, 원본의 **레이아웃·톤·폰트 계층·색상·이미지/배경 자산·효과·조작성**을 실제 React/TSX·CSS로 최대한 충실하게 구현한다. **F95>=95/100은 실증할 제품 목표**이며 모든 임의 화면의 '95% 픽셀 복제' 보장, 과거 제품 검증률, 또는 이미 구현됐다는 주장이 아니다.

**정본·보존:** 이 문서는 기존 [FFAX V2.1 Design Forge/Reference Fidelity 설계](FINAL_BLUEPRINT_FFAX_V2_REFERENCE_FIDELITY_20261118.md)를 외부 레퍼런스 경로에서 구체화하는 최신 우선 목표다. 기존 REQ-01..12, WF-01..07, 12개 AC의 총100점 가중치, 17종 컴포넌트, 기존 P1 25 SWU의 코드/시도 이력·P2 CI 근거·승인·권리·원본·복구·RELEASE HOLD를 삭제하거나 소급 재배점하지 않는다. 코드 구현은 이 설계와 별도.

## 1. 사용자가 실제로 받는 제품

**진입 모드**는 서로 충돌하지 않게 분리한다.

1. **MATCH_REFERENCE (기본/우선):** 사용자가 참조 이미지 1개를 첨부하고 '이 디자인처럼 만들기'를 선택한다. 한 후보에 정확도를 집중하고 모르는 자산/폰트를 명시한다. 목적과 다른 창작 스타일을 기본값으로 덮지 않는다.
2. **CONTROLLED_VARIANT:** 레이아웃·팔레트·타이포·그림/아이콘·애니메이션 중 고정할 요소를 선택하면, 선택한 요소를 보존한 채 나머지만 변형한다. 후보 3~4개 정밀 프리뷰와 변경 이력/Undo·Redo.
3. **DESIGN_FORGE (기존 기능 유지):** 자연어 브리프로 A/B/C 실제 React 디자인을 만들고 혼합·수정·승인. FFAX 내부 시안은 자기 source bundle 그대로 구현하고 스크린샷 역설계하지 않는다.
4. **IAE_dev 라이브러리 연계:** IAE Design Intelligence는 사용자 스크린샷/URL/영상, 프로젝트별 선호도·출처·권리·검색/추천(기본 16개 가벼운 썸네일)을 담당한다. **FFAX만 실제 고충실도 React 생성/렌더·비교·패치를 담당**하며 양쪽 제품을 한 코드베이스로 병합하지 않는다.

**결과:** 실제 React/TSX + 검증 가능한 CSS와 자산 manifest, 재생 가능한 고정 캡처, 레퍼런스-구현 비교·누락/복원불가 설명, 원본/후보 SHA, 허용된 프로젝트에 대한 읽기 우선 diff·rollback 초안. 실제 API/auth/routes·실데이터·핸들러 연결은 소유자의 앱 계약을 보존하며 별도 검증한다. 이미지 자체를 배경으로 통째로 표시한 것을 '구현'으로 계산하지 않는다.

## 2. 입력 난이도별 전략

| 입력 상태 | 구현 방법 | 95점 목표의 한계 |
|---|---|---|
| A. 소유/허가된 원본 HTML·CSS·폰트·이미지·소스 가능 | read-only 구조·자산 추출 / source-native 변형 / 안전한 프로젝트 계약 적응 | 재현에 가장 유리하나 백엔드·보안·브라우저 차이는 검증 필요 |
| B. PNG/JPG/WebP와 일부 실제 자산·폰트 제공 | image segmentation + OCR text bounds + 계층 scene graph + typed React/CSS + 시각 비교 | 높은 유사도 가능성이 있으나 사례별 입증 필요 |
| C. 이미지만 제공 또는 영상/움직임 캡처 | 관측 가능한 구성·색·문자 추출, 미상 효과·자산을 owner-assisted correction | 브랜드 그래픽·특수 글꼴·숨겨진 hover/scroll·3D/모션/반응형 정확 복원 보장 불가 |

다른 백엔드 콘텐츠/문자는 허용하지만, 디자인은 가능한 한 같은 레이아웃·콘텐츠 밀도·타이포 규칙으로 구현한다. **스냅샷 재현 점수와 실제 가변 데이터 화면 기능 검증은 별개**다.

## 3. 최종 사용자/엔진 로직도

~~~mermaid
flowchart TD
  A["사용자 제공 이미지/권리 있는 소스·자산/영상"] --> B["Local ReferenceVault: original SHA·권리·viewport·DPR"]
  B --> C{"source + assets available?"}
  C -->|Yes| D["DOM/CSS/asset manifest read-only 추출"]
  C -->|No| E["다중 구역/경계/색/OCR 위치·타이포 추정"]
  E --> F["observed/inferred/unknown 분리 + 영역 수동 교정 UI"]
  D --> G["FidelityScene: nested layout·type·asset·effect tree"]
  F --> G
  G --> H["FFAX typed React/TSX+CSS 구현/실제 앱 data slots"]
  H --> I["격리 Chromium Playwright 동일 viewport 캡처"]
  I --> J["영역별 geometry/typography/assets/colors/effects 비교"]
  J --> K{"임계 영역·권리·품질/성능 gate"}
  K -->|수정 가능| L["typed 최소 CSS/scene patch · best-pass 보존"]
  L --> I
  K -->|자산/권리/기술 막힘| M["누락/사유 표시·owner 보완/중지"]
  M --> F
  K -->|후보 채택| N["사용자 시각 승인 → source+assets+evidence SHA"]
  N --> O["읽기 위주 앱 통합 diff→P2 기능/보안/반응형→별도 GO"]
~~~

**핵심:** '3개 가로 띠 평균색 추출→17개 컴포넌트 몇 개 생성' 수준은 유사한 디자인 복원에 구조적으로 부족하다. 실제 영역 좌표와 중첩 관계를 추출해야 하고, 기존 17종 컴포넌트는 재사용의 출발점일 뿐 표현 한계가 되면 안 된다.

## 4. 정형 데이터 계약 (설계 제안)

- **ReferenceBundleV3:** jobId, projectId, mode, sourceType, originalBytesSha256, sourceRights/provenance/license/redistributionGate, referenceImages[{viewport,dpr,width,height,sha}], suppliedAssets[{sha,mime,kind,rights}], optionalAuthorizedSource, requiredRegions, lockedProperties, editableProperties, dataSlots, ownerConsent, offlineOnly=true.
- **FidelitySceneV1:** sourceSha, viewport, regionTree[id,parentId,role,bounds{x,y,w,h},zOrder,grid|flex|position constraints, spacing, typography(fontFamilyObserved|Unknown,fontWeight,fontSize,lineHeight,letterSpacing,textBBox), colors, backgroundLayers, border/radius/shadow/filter, assetRefs, textDataSlots, interactionsKnown|Unknown, confidence:OBSERVED|INFERRED|UNKNOWN, required/locked flags], unknowns, provenance.
- **FidelityCandidateV1:** sceneSha, codeSha, CSS/TSX artifact hashes, local asset hashes, previewSha, browser/viewport/font/OS receipts, parentCandidateSha, patchHistory, model/tool versions, rollbackCheckpoint.
- **FidelityEvidenceV1:** originalSha, renderedSha, comparableViewport, metricsVersion, regionScores, issues with coordinates and severity, visualScoreOrUnassessed, criticalBlockingReasons, ownerVisualDecision, functionalP2Status. 이미지 자신과 자신을 비교하는 영수증은 FAIL.
- FFAX/IAE 사이에 버전 고정 로컬 입력 패키지와 읽기 전용 결과·영수증 어댑터를 둔다. **실제 API 경로·필드 네이밍은 최신 소스 계약 검토 후 확정**, 여기의 명칭을 이미 배포된 endpoint라고 간주하지 않는다.

### 4A. 외부 이미지 정밀 분해

1. 이미지 원본/크기·DPR/소유 출처/실자산/권리/해시 보관 후, 색상 통계만이 아니라 경계·연결 성분·텍스트 영역·원근/배경 장식과 섹션/컴포넌트 박스를 **원본 픽셀 좌표**로 추출한다.
2. 로컬 OCR은 한글/영문/숫자 텍스트 위치·글줄 수·confidence의 보조 수단이다. **OCR=정확한 폰트 식별이 아님**. 폰트 파일을 제공받거나 적법한 대체 후보/사용자 수동 확인이 필요하다. 미인식 문자/그래픽은 UNKNOWN.
3. nested regionTree에 원본의 중요한 정보 계층, 정렬·간격·grid/flex·overlap·layer·breakpoints의 관측/추정 구분을 기록한다. 이미지에 없는 모바일/hover/스크롤 상태는 원본 일치라고 주장하지 않는다.
4. 원본 로고/사진/일러스트/아이콘은 별도 자산 사용권 + SHA 확인 후 재사용. 보이는 이미지를 crop했어도 상업적으로 복제할 권리를 얻은 것은 아니다. 브랜드 이미지가 없으면 BLOCKED_ASSET 또는 사용자 명시 선택한 비동등 대체.
5. 사용자 UI에서 bbox 드래그·오분류·글자·폰트/자산 수정, unknown의 사유 확인, 고정 요소/예외 등록. 고급 AI 모델 부재가 프로그램 전체 실패가 되지 않도록 설계한다.

### 4B. 실제 FE 재구성

- structured region tree→React 컴포넌트 계층 + 안전한 CSS 제약으로 매핑. 기존 FFAX 17종 컴포넌트와 Design Forge 렌더러 재사용. 그리드/타이포/질감 표현에 필요한 범위 내에서 검증된 scene-node와 typed CSS subset을 추가한다.
- CSS 품질: font family/size/weight/line-height/letter-spacing, alignment, widths/min/max, grid tracks, flex distribution, spacing, border/radius/shadow, blur/gradient/texture(허용된 자산), responsive constraints. 원본에서 잠근 속성은 무단 변형하지 않는다.
- 임의 생성 JS 실행/외부 CSS URL/import/원격 폰트 자동 fetch/쉘 호출/고객 원본 파일 overwrite 불허. 격리된 신뢰 컴포넌트만 preview 가능; 미신뢰 코드의 호스트 자동 실행은 F18/Owner 승인 게이트 유지.
- **실데이터 슬롯:** 원본 가상 KPI나 문자열을 실제 앱 데이터로 가장하지 않고, 기존 API·인증·라우팅·핸들러를 보존한 상태에서 content/data binding을 분리한다. 구조·색상 일치와 로직 동작은 P2 별도 검증.

### 4C. 실제 촬영·차이 보정

- 기존 Playwright와 pinned one-shot-ui(기존 FFAX CI에 실제 upstream v0.12.0 합성 검증 기록), pixel diff/heatmap은 재사용. 동일 browser/OS·viewport/DPR·폰트 로딩·이미지 decode·애니메이션 시점·scroll position·색상 공간/버전을 영수증에 명시한다.
- geometry/typography/assets/colors/effects와 **필수 영역별** 차이를 분리한다. 화면 전체의 넓은 단색 배경이 높은 점수를 만들어 글꼴·중요 버튼 누락을 숨기지 못하도록 한다.
- 자동 보정은 issue 위치·심각도→typed patch 제안→제약/Owner lock 검사→격리 후보에만 적용→재캡처→전후 개선 확인. spacing/align/color만이 아니라 font, bbox, grid/flex, asset crop/fit, 효과까지 타입 지원 확대. 구조가 잘못됐으면 CSS 수치만 반복하지 않고 scene 분해로 되돌린다.
- 기존 기본값 **최대 5패스/job**. 각 pass의 후보SHA/비교 영수증과 이전 best를 보존. 무개선/회귀/계약 오류/자원 한도/권리 차단 시 즉시 중단. UI에서 원본·후보 overlay/heatmap과 영역별 수동 보정 제공.

## 5. F95 95점 목표의 정의 — 실제 검증 없이 점수 금지

F95는 **한 장의 레퍼런스 이미지를 고정한 조건의 정지 화면 시각 품질 점수**이며, 기존 공식 FFAX 12 AC/100점 검증완료율과 완전히 다르다. 아래 가중치는 **초기 평가 설계 가설**로 P2 실제 사례/사용자 판정 뒤 검정하고 버전 고정한다.

| 시각 평가 축 | 초기 가중(합계100) | 확인 |
|---|---:|---|
| 섹션·박스·정렬·그리드·겹침/정보 계층 | 35 | 레이아웃/geometry |
| 폰트 계열·크기·무게·행간·자간·줄바꿈 | 20 | typography |
| 실제 이미지·아이콘·로고/일러스트 자산 | 18 | assets |
| 표면·색채·대비·배경/그라디언트 | 12 | colors |
| 모서리·테두리·그림자·시각 효과 | 15 | details |

**성공 후보:** 동일 이미지/동일 viewport/DPR의 실제 Chromium 캡처, 필수 영역 존재, 영역별 지표와 가중 산식·버전·입력SHA 기록, 제안 목표 F95>=95/100, critical region 누락 0, 콘텐츠 마스킹 남용 0, 권리/자산 문제 해결, 사용자 실제 시각 승인 PASS. **일부 예제의 95점 성공을 FFAX 모든 이미지 95% 자동 보장으로 홍보 금지.**

**UNASSESSED/HOLD:** 원본과 렌더의 조건 불일치, 누락·불명확한 필수 자산/폰트, 원본 이미지 자기비교, 실제 렌더 미실행, 지표/중요영역 미구현, 권리 불명, 사용자 수락 미실행, 실속성을 숨기는 전체 영역 마스킹. 실데이터 문자가 다르면 기준 정지 콘텐츠 재현 품질과 실화면 구조/기능을 **분리** 평가하고 마스킹한 이유·범위를 명시한다.

**P2 실증:** 사용권 확인 실제 레퍼런스 최소 12장(대시보드/랜딩/타이포 중심/그래픽·효과 중심 각 3장), 각 viewport·원본/렌더/overlay·F95 세부 점수·유저 수정 개입·속도/메모리·실패 원인 보관. responsive 375/768/1440, hover/scroll/video 제공 시 모션, keyboard/a11y, console/network, API/auth/routes·데이터, 실제 Windows11 노트북 설치·복구를 **별도 게이트**로 검증. 95점만으로 기능·배포 PASS가 되지 않는다.

## 6. 무료·로컬 기술 선택 (외부 설치/활성화는 이 설계만으로 승인되지 않음)

- **KEEP:** FFAX core/17종 컴포넌트·Design Forge·Ollama 텍스트 보조(선택), 기존 ReferenceVault, Playwright, one-shot-ui(MIT) 비교/기존 후보 보정 안전 장치. 한 모델로 모든 이미지를 정확 복원한다고 가정하지 않는다.
- **CONDITIONAL:** 브라우저 Canvas/Node의 가벼운 image segmentation 우선 검토, 필요하면 OpenCV(OpenCV.js 포함, Apache-2.0) 영역/윤곽, Tesseract.js(Apache-2.0) + 별도 언어팩 OCR, 각 버전·Windows 설치/메모리/보안/정확도 검증 후 채택. 신규 Python/Native 종속성을 무조건 필수 지정하지 않는다.
- **REFER ONLY:** abi/screenshot-to-code(MIT)는 외부 AI provider 중심인 부분이 있어 제품 필수 엔진으로 채택하지 않음, lenixeduardo/Image-to-code(MIT)는 디자인 분해 절차 참고, nextlevelbuilder/ui-ux-pro-max-skill(MIT)는 미학 추천 자료 참고. GitHub Trending은 후보 탐색이지 라이브 품질 근거/원격 코드 실행 지시가 아님. OSS 라이선스와 타사 사이트 자산의 재배포 권리는 서로 다르다.
- **RESOURCE:** GTX1050Ti·RAM16GB·무료/로컬 우선: 단일 Chromium preview, CPU 이미지 특징 분석, bounded OCR, 순차 후보 보정, 수동 fallback. 대형 diffusion/vision 모델·클라우드 API·Docker/VM·자동 npx 다운로드/원격 실행을 필수 런타임에 포함하지 않는다. 모든 성능·자원/사용량 이득은 UNMEASURED.

## 7. P1 구현 후보 DAG — 신규 SWU 분모/진척 임의 인정 금지

기존 FFAX 소스에는 25/25 관리용 P1 코드 후보 기록이 있으나 **V3 확장분은 미구현**이다. 아래 FID-01..12는 **정식 큐 편입 전 후보**이며 과거 SWU·REQ-ID/수용조건/실패 이력을 덮어쓰지 않는다. 다음 FFAX 실작업자가 최신 HEAD와 실제 source caller→callee 간극을 확인하여 각 단위의 S/C/I/D/U와 의존·allowed_paths·정식 분모를 결정한다. 과대 항목은 공통 SWU 규칙에 따라 재분할.

| 후보 | 선행 | REQ | 수직 기능 목표 (정상/핵심 거부) | 후보 allowed_paths |
|---|---|---|---|---|
| FID-01 ReferenceBundle 수집/권리·원본 잠금 | 없음 | 01/06/10/11 | UI 파일→로컬 불변 SHA/rights receipt, 비정상 파일/권한/경로 거부 | src/reference-vault.mjs, src/forge-api.mjs |
| FID-02 멀티영역/좌표·계층 분해 | 01 | 03/06 | 픽셀→region boxes + confidence, 실패 시 미확인/수동경로 | src/reference-analysis.mjs, src/fidelity-geometry.mjs |
| FID-03 로컬 OCR/타이포 힌트 | 02 | 03/06 | 텍스트/박스/줄바꿈/unknown, 언어팩 부재 시 안전 fallback | src/fidelity-typography.mjs, src/forge-api.mjs |
| FID-04 자산/폰트 출처·필수누락 gate | 01/02 | 06/10/11 | 공급 자산 SHA/사용권·누락·대체 사용자 승인 | src/reference-assets.mjs, src/fidelity-assets.mjs |
| FID-05 nested scene graph + owner 교정 | 02/03/04 | 02/03/06 | 유효한 parent/bbox/style·typed editing, 잘못된 그래프 거부 | src/fidelity-scene.mjs, src/external-reference-to-forge.mjs |
| FID-06 scene→실제 TSX/CSS 생성 | 05 | 03/04/07 | 복잡한 구조 real render·typed asset ref, unsafe code/CSS 거부 | src/core.mjs, src/fidelity-renderer.mjs |
| FID-07 동일 조건 실캡처/receipt | 06 | 09/12 | 브라우저 render PNG/폰트/viewport 영수증, timeout/asset 거부 | src/forge-runner.mjs, scripts/forge_capture.mjs |
| FID-08 region score/문제 위치·F95 | 07 | 05/06/09 | 원본·렌더→5축 점수/오차/UNASSESSED, 자기비교/미지원 판정 거부 | src/fidelity-score.mjs, src/forge-convergence.mjs |
| FID-09 안전한 구조·CSS 보정 | 05/08 | 03/05/09/10 | typed patch→격리 후보/최선 체크포인트, lock/경로 위반 거부 | src/forge-correction.mjs, src/fidelity-patch.mjs |
| FID-10 원본 대비/영역 교정 UI | 05/08/09 | 05/06/10 | 사용자 선택→실제 backend preview/compare/수동교정/승인/재개 | src/design-forge-ui.mjs, src/forge-compare-ui.mjs, src/app.mjs |
| FID-11 기존 앱 contract & safe diff | 06/10 | 04/08/10 | 소유자가 승인한 data/API/route 보존 diff·rollback, 원본 쓰기 거부 | src/forge-safe-integration.mjs, src/github-compare-review.mjs |
| FID-12 IAE_dev versioned adapter (후행) | 01/10 | 01/06/12 | IAE 선택 참조→FFAX job→결과/영수증, 외부 전송·실행권 거부 | src/forge-api.mjs, src/server.mjs |

**우선 임계경로:** 01→02/03/04→05→06→07→08→09→10→11. 기존 3띠 분석/수동 label의 한계를 먼저 해소하지 않으면 CSS 패스 수만 늘려도 재현성이 개선되지 않는다. FID-12는 IAE_dev 준비 시 후행 연결. P1은 BE/FE/API 실제 소스 기능·정상 및 거부 경로와 필수 국소 syntax/type/smoke/즉시 안전검사까지. CI/보안 전수·브라우저 E2E·실기기 등은 P2로 분리하며 기존 필수 CI/보안·권한 게이트는 유지.

## 8. P2/인수·신뢰 경계

1. **P2-01:** 입력·자산 rights/provenance, MIME/크기·SVG/ZIP 위험·symlink/junction·CSRF/Origin·비밀/네트워크·원본 SHA·복구 안전.
2. **P2-02:** 외부 실이미지 12장, OCR CJK·텍스트/폰트 불확실·박스/계층·자산 추출의 관측과 거부·수동 fallback.
3. **P2-03:** 동일 viewport/DPR 실 Chromium screenshot·F95 각 지표/required region·95점 여부/기존 최고 후보/회귀·실제 일치도. 실제 사용자 시각 승인.
4. **P2-04:** React/TSX·CSS 컴파일·인터랙션·인증/API/라우트·실데이터·원본 diff/rollback, 실제 고객 원본 변경 없이 합성 앱 선검증.
5. **P2-05:** 375/768/1440, keyboard·axe·overflow·콘솔/네트워크·원본이 있는 모션/인터랙션 범위 확인.
6. **P2-06:** 사용자 Windows11/GTX1050Ti/16GB 실행·메모리·시간·중단복구 측정, 실제 부하 성능.
7. **P2-07:** 실제 독립 기술/보안·시각 검수와 Owner 최종 GO 분리; 본인 작성 코드 자기 검증은 독립 감사가 아님.
8. **P2-08:** 구매자 독립 로컬 프로젝트/디자인 DB/자산 사용권·백업/이식·상용 배포 별도 승인.

**공식 상태:** 과거 FFAX V2.1 관리용 P1 25/25 소스 후보/합성 CI 4/4 근거는 보존. 이 V3의 **새 필수 기능 P1 구현/ P2 검증 공식률 UNASSESSED**, F95 실외부 이미지 달성 NOT_RUN, 신규 모델/Windows 실기기/권리 확인 원본 고객 검증/독립 감사 NOT_RUN. 유료 API·외부 원본·권한 변경·main merge·Production·크몽 상품화·판매는 Owner 별도 GO. 설계 커밋만으로 허용되지 않는다.

## 9. 이 문서를 재개하는 작업자에게

FFAX 신규 ㄱ/ㄱㄱ는 **FFAX 저장소 최신 HEAD→AGENTS/HANDOFF/STATUS→REQUIREMENTS→본 V3 및 V2.1→현 소스·SWU 큐**를 보고 중복·신규 코드 간극을 분리하여 P1 실제 SWU부터 순서대로 코딩. 기존 25 SWU 이력/REQ/AC 기준과 승인/신뢰 주체·2+2 실패 이력 보존. 해총 단독 ㄱ이나 IAE_dev ㄱ을 FFAX 자동 실행 지시로 오인하지 않는다. 모델 사용 가능 여부/12월 전환은 별도 실제 확인 및 소유자 결정. 전 제품 공통 P1/P2 정책 §0J·§0E 불변.
