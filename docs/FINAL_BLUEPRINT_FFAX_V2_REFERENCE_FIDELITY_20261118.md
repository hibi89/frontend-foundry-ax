# FFAX V2.0 — Reference Fidelity Mode 최종설계 정본

> **[2026-11-18 KST · OWNER-SELECTED V2.1 DESIGN FORGE CANONICAL ADDITION]** 사용자는 **레퍼런스를 확정하기 전 디자인 추천·개선·다중 시안·사용자 지시 반영**까지 FFAX 내부화하도록 지시했다. 이 §0A는 아래 기존 §1의 '레퍼런스 이미지가 이미 존재한다'는 묵시적 전제를 대체한다. **신규 Design Forge 경로**와 **기존 외부 이미지 역설계 경로**를 명확히 나누며 나머지 보존·인증·비밀/원본·P1/P2·출시 게이트는 그대로다. 본문은 **확정 설계**이지 구현/검증 완료가 아니다.

## 0A. Design Forge — 레퍼런스 생성·개선·추천·승인 (V2.1 최우선 신규 진입단계)

### 0A-1. 핵심 결정: GitHub 기술 재사용 + FFAX 고유 엔진, 새 저장소 없음

- **FFAX 저장소 유지:** `hibi89/frontend-foundry-ax` 단일 제품·현재 `feature/ffax-reference-fidelity-20261118` 개발 브랜치. FFAX 기존 17종 UI 컴포넌트, structured React 생성/편집, 디자인 브리프/2안, Undo/Redo, 로컬 저장/복원, read-only repo 검토, Ollama local adapter, Playwright/원본 변경 승인 흐름은 절대 축소하지 않는다.
- **지식 추천 엔진: UI UX Pro Max** (`nextlevelbuilder/ui-ux-pro-max-skill`, source snapshot `7436a6e0b6dc3add7c12d5b6ef1ccd3d410dd7fd`, MIT; skill metadata version 2.15.0). 검토된 스타일/산업별 팔레트/폰트 페어링/UX anti-pattern 추천 규칙을 **오프라인으로 추출한 정형 추천 데이터**로 채택한다. 소스 전체/CLI 설치는 자동 수행하지 않고 데이터·의존성·폰트의 라이선스/보안/중복 검토 후 필요한 자료만 버전 고정해 캐시/어댑터로 사용한다. GitHub Trending은 **신기술 탐색 채널**이지 런타임 필수 호출, 실제 유행 순위 기반 디자인 품질 보증, 자동 원격 코드 실행이 아니다.
- **OpenUI** (`scalewithalap/openui@8b87248a2605a164df55e47a6d9db3210102b822`, MIT): moodboard, typography/style preset, design token 실시간 동기화 등 **패턴만 참조**. 다른 대형 UI/DB/React 편집기 전체 이식은 중복·의존성 위험으로 불채택.
- **OpenStitch** (`heldernoid/openstitch@22815d1c071c49d177275a1a42b84018e84e88fb`, MIT): multi-screen `DESIGN.md`와 반복 디자인 흐름의 **연구 참고**. Docker/Ollama 다중 고사양 모델과 iframe 기반 전체 앱 **필수 의존성 불채택**(현재 GTX1050 Ti/RAM16GB, VM/컨테이너 회피, 로컬/0원 제약; 실제 성능 측정 전 추정).
- **기존 FFAX 자체 기술 핵심:** `src/core.mjs` `buildBrief`/`newDocument`/`createReference`/`approveReference`/`exportReact`, `src/local-ollama.mjs` Qwen `qwen3:4b-instruct` 구조화 텍스트 요청(검증 코드상 local-only; 실제 모델 시각 생성/품질 PASS는 NOT_RUN). 현행 '2개 색상 스와치+stack/grid'는 **다중 미학 시안 생성에 불충분**하므로 아래 사용자 기능으로 강화한다. Qwen 4B는 **이미지 생성 모델도 비전 기반 정밀 역설계 모델도 아니다**. 텍스트 계획/문구/디자인 설명 제안에만 선택 사용; 완전 무료 오프라인 fallback은 규칙·디자인 데이터·기존 컴포넌트 생성.
- **MLA/EAI/AXZERO:** 원본 repo의 고유 신뢰 모델·제품 정체성을 보존. MLA는 독립 자율개발/코드 실행 주체, EAI는 독립 Architect/Player 제품, AXZERO는 아직 실운용 증명 없는 옵션이다. **Design Forge의 필수 런타임 의존성·권한 주체·프롬프트/원본 전송 대상으로 사용하지 않는다.** 추후 실제 검증된 versioned read-only `DesignProposal`/quality advisor API 계약과 사용자 GO가 존재하는 경우에만 선택적 협력; FFAX 승인권/소스 생성 소유권은 이동하지 않는다.
- **외부 이미지 모델/스크린샷-투-코드 SaaS:** 초기 P0 필수 아님. 브랜드 일러스트/히어로 사진 같은 비CSS 자산은 사용자 소유 자산·안전한 로컬 SVG/일러스트 구성 우선; 무료 이미지 생성이 실제 가용하고 명시 승인이 있을 때만 **독립 AssetProvider**로 선택 사용. ChatGPT 이미지 생성 기능을 FFAX에서 자동 호출 가능하다고 가정하지 않는다. 유료 또는 외부 업로드는 별도 승인 없으면 HOLD.

### 0A-2. 가장 중요한 설계 원칙 — FFAX 내부에서 만든 레퍼런스는 다시 스크린샷 역설계하지 않는다

**Forge-native:** 사용자가 FFAX에서 요구사항/참고 이미지/스타일을 입력하면, FFAX는 먼저 **실제 렌더링 가능한 컴포넌트 트리 + 타입/색/레이아웃 토큰 + 자산 manifest + 텍스트 + viewport별 규칙**을 만들어 Playwright로 A/B/C 시안 PNG를 캡처한다. 사용자가 고르면 **그 시안의 코드/컴포넌트/자산을 그대로 구현 단계에 전달**하고, PNG와 소스 사양을 함께 SHA로 잠근다. `image-to-code`로 PNG를 재해석해 코드를 재생성하지 않는다. 결과가 달라지는 원인을 원천적으로 줄인다.

**External-image:** FFAX 외부에서 공급한 1장의 평면 PNG/JPEG는 디자인 소스가 없으므로 기존 `Image-to-code` 분석·레이어/자산 사양 재구성→FFAX 구현→실화면 캡처·비교의 순서를 유지한다. 불명확한 폰트·가려진 그림·숨겨진 인터랙션을 정확하게 복원했다고 주장하지 않는다.

원본 `referenceId`와 구현 `candidateId`는 별도이며, FFAX 안에서 만든 시안은 `designSourceId`도 함께 보존한다. **이미지 한 장이 아닌 `Design Source Bundle`이 정본**이다.

### 0A-3. 사용자가 실제로 보는 'Design Forge' 프론트엔드

```text
[새 디자인 생성 | 기존 이미지 개선 | 기존 프로젝트 UI 재설계]
  ├ 요구사항 입력: 사용목적/대상/꼭 필요한 기능/화면/데이터/수정 금지/접근성/모바일
  ├ 선택: 기존 이미지(로컬·사용권), 브랜드 키워드·로고·색감·예산·원본 보호
  ├ 디자인 취향: 클래식↔현대적, 미니멀↔화려, 밝음↔다크, 밀도, 동적효과
  ├ "더 고급스럽게/촌티 제거/젊은 감성/한국적 신비감/가독성 향상" 텍스트 지시
  ↓
[추천 카드] 적합성 근거 1-2문장 + 사용한 스타일 데이터/모델 여부 + 제한/추정
  ↓
[A/B/C 실제 HTML/React 렌더 시안] 기본 3안, 2~4안 설정 가능
  ├ 구조: hero/cards/forms/calendar/nav 등의 실제 컴포넌트
  ├ 색채/여백/타이포/그림/버튼/상태·화면 너비가 다른 원본 variants
  ├ 비교·확대/모바일/폰트 대체/키보드/색 대비 경고
  ↓
[선택·수정·혼합] A의 배치 + B의 배색 + C의 글꼴 등 선언적 토큰/컴포넌트 diff
  ├ "수정할 부분만" 대화/세부 속성/Undo·Redo
  ├ 자동 품질 피드백(규칙·측정) / 외부 모델은 명시 승인 때만
  ├ 재추천/재생성 default 최대 3회, 초과는 owner가 선택적으로 재시작
  ↓
[레퍼런스로 확정] source + assets + spec + viewport PNG 묶음 hash/manifest
  ↓
[FFAX 기존 구현 파이프라인] 바로 사용 가능 + Playwright/reference-fidelity QA
  ↓
[원본 앱 적용] Diff/rollback + owner GO → separate Production GO
```

이 단계의 **실제 Design Forge 화면은 P1 구현 대상으로 아직 NOT_IMPLEMENTED**. 사용자 대화 내용이 전체 시스템의 런타임 입력 계약이 되며, A/B/C 시안의 아름다움/순위는 모델의 취향 점수만으로 증명하지 않는다.

### 0A-4. 취향 추천·촌티 제거의 측정과 한계

- **추천은 규칙+데이터 기반:** 제품 카테고리, 사용자 특성, 접근성, 콘텐츠 밀도, 시안 레퍼런스와 비용·반응형 제약을 사용. 템플릿 복사만 반복하지 않도록 레이아웃 계층/타이포 계층/장식 예산/브랜드 독창성을 별도 축으로 생성.
- **일단 3안:** A=브랜드/콘텐츠 중심 고품질 편집형, B=정보 밀도 높은 대시보드형, C=대조적인 표현형. 특정 업종에 불리한 고정 3테마를 강제하지 않고 분산된 미학 방향을 유지한다. 선택·수정·혼합은 component IDs와 design tokens 교차 참조로 deterministic; 직접 PNG 덧칠하여 수동 작업을 가장하지 않는다.
- **Anti-pattern 체크:** 과도한 그라데이션·글로우·그림자·금색/보라색 남용, 무작위 폰트·장식, 흔한 AI 템플릿 조합, 불필요한 카드, 정보 계층 불분명, 색 대비 미달, 글자 뭉개짐·줄바꿈, HTML과 PNG 텍스트 불일치, 깨진 한글/한자, 레이아웃 오버플로, 버튼의 부재/의미 불명확. 미학 판단은 **추천**이며 최종 사용자 선택을 덮지 않는다.
- **객관적 게이트:** 폰트/자산 가용·라이선스, contrast, overflow, 스크린 리더/키보드, 필수 텍스트·버튼 존재, 링크/상호작용 의도, 회귀 금지. 완성도/미학 점수는 기준 픽스처·독립 평가 전 수치화 금지.
- **랜덤성/차별화:** 동일 brief+version+seed+theme+component registry면 같은 정형 스펙을 재생산; 3안의 layout archetype과 팔레트/타이포/정보 밀도가 의도적으로 다르게 설계. `seed`는 재현 가능한 선택에만 적용하고 외부 모델/폰트/렌더러의 완전 결정성을 가장하지 않는다.
- **원본 이미지 개선:** 변형 전 원본 hash·권리 출처 유지, 매 수정은 새 variant ID. 외부 이미지의 가려진 자산을 생성·추출했다고 거짓말 금지. 사용자 검토/허가 없이 원본 장식·브랜딩을 없애지 않는다.
- **실제 사용성과 별개인 렌더:** 시안 PNG는 브라우저 UI 캡처일 뿐 실제 기능 API가 동작한다는 뜻이 아니다. 기능은 P1 코딩/후행 P2 검증으로 별도 기록.

### 0A-5. 데이터·API 계약 (v2.1)

`DesignBriefV2`:
`{briefId, projectId, text, purpose, audience, mustKeep[], mustHave[], mayChange[], forbidden[], viewportProfiles[], designDials, referenceAssets[], sourceProvenance, ownerConstraints, chosenModel:{kind,version,consent}, budget}`.

`StyleRecommendationV1`:
`{styleId, dataSource:{repo,sha,license,version}, rationale, category, archetype, palette, typography, constraints, antiPatterns[], confidence, provenance}`.

`DesignVariantV1`:
`{variantId, parentVariantId|null, briefHash, presetId, seed, componentTree, designTokens, assetManifest, textCopy, responsiveRules, warnings[], sourceBundleSha256, previewCaptures:[{viewport,dpr,path,sha256}]}`.

`OwnerDesignApprovalV1`:
`{approvalId, selectedVariantId, sourceBundleSha256, referenceImageSha256, designSpecSha256, approvedAtKst, allowedChanges[], approvedByOwner:boolean, version}`.

`FrozenDesignBundleV1`:
`{referenceId, selectedVariant, codeSnapshot, specPath, designTokensPath, assetManifestPath, captures[], licenseManifest, provenance, immutableManifestSha256, noAutoOverwrite:true}`.

**필수 동작:** `POST /api/design/brief`→validated local brief; `POST /api/design/recommend`→A/B/C reproducible style proposals; `POST /api/design/variants`→real FFAX structured React candidates in disposable workspaces + captured previews; `POST /api/design/refine`→targeted typed patch/variant child; `POST /api/design/freeze`→owner-signaled SHA-locked bundle, atomic local commit, immutable receipt; `GET /api/design/jobs/{id}` read-only resume/status. These are **contract proposals, not pre-existing deployed endpoints**. Bind loopback + exact Host/Origin + CSRF/owner action; no arbitrary filesystem paths; do not expose local project/secret assets on public routes. Avoid requiring OS-admin service or GitHub App grants.

**State machine:** `DRAFT→RECOMMENDED→VARIANTS_READY→REFINING→READY_FOR_DESIGN_APPROVAL→DESIGN_LOCKED→IMPLEMENTING`; alternate `BLOCKED_ASSET|BLOCKED_MODEL|BLOCKED_LICENSE|CANCELLED|FAILED`. After `DESIGN_LOCKED`, edits create `DESIGN_REVISION_PENDING` with new SHA/approval, never silently mutate current reference. The existing downstream `REFERENCE_LOCKED→ASSETS_READY→CANDIDATE_GENERATED` applies on **external image** ingress; Forge-native with source bundle skips redundant image analysis and begins from `ASSETS_READY` after manifest verification.

### 0A-6. 결합 지점과 자원/보안 예산

- **FFAX engine owns orchestration.** Use local `DesignRecommendationAdapter` (versioned data), `VariantEngine` (existing FFAX core + extend registry), `PreviewCaptureAdapter` (Playwright), `FrozenBundleStore`, `QualityRules`. Design source and generated variants kept locally; no customer data in public repo. No new repo or GitHub push required for user projects.
- **GTX1050 Ti + RAM16 GB:** default no image diffusion, no 30B vision model, no Docker/VM, single Qwen 4B optional for text only; static templates/JS/React/CSS/SVG + Chromium captures are baseline. Control concurrent jobs, memory/CPU, per-job timeout, model call count; no performance promise without Windows measurement. Runtime install/upgrade exact version reviewed separately.
- **External references:** require usage rights check; user-provided sketches may not be commercially licensable. Generated template style data license != font/license != illustration ownership. Any image generation or external LLM call requires availability/consent/cost check; unsupported => `BLOCKED_MODEL` or deterministic local fallback, never silent paid/cloud upgrade.
- **Security:** model output treated as typed untrusted JSON, no arbitrary JS/CSS URL imports/external network. Untrusted generated code cannot be executed on ordinary owner host without genuine restriction, else HOLD. Local Chromium of **registered trusted component templates** is not arbitrary code execution. Allowed path/backup/rollback/owner GO unchanged.
- **Existing downstream:** Reference Fidelity `one-shot-ui` compare stays optional diagnostics; internal Forge variant should have parity to its own captured approved code/PNG by construction. Recompare on code changes/viewport differences and preserve capture version/font/source hashes; imported images still need full reconstruction.

### 0A-7. P1 구현 후보/의존 DAG (기존 SWU 분모 미변경)

```text
DF-01 Brief+design dials+provenance validation
       → DF-02 style recommender (offline UI UX Pro Max dataset adapter + fallback)
          → DF-03 independent A/B/C typed React variant generator
             → DF-04 token+component edit/mix+revision history
                → DF-05 preview actual render & quality warning
                   → DF-06 immutable freeze+bundle manifest+reopen
                      → DF-07 UI tabs/approval→same-source implementation handoff
                         → existing RF-04/05/06/07/08 fidelity & review flow
[External image branch] existing RF-01/02/03→RF-04...
```

| Candidate | Maps to existing REQ | P1 completion candidate |
|---|---|---|
| DF-01 | REQ-01/02/06/11 | Korean brief+constraints+local reference intake/invalid consent→typed `DesignBriefV2` |
| DF-02 | REQ-02/03/11 | offline design dataset → grounded recommendation with provenance and fallback |
| DF-03 | REQ-03/04/07 | 3 distinct browser-renderable component tree candidates + error path; no mock-only PNG |
| DF-04 | REQ-03/05/10 | targeted variant mutation/mix, Undo/Redo, invariant IDs and new immutable revisions |
| DF-05 | REQ-06/09 | Playwright local output and deterministic warning source, fails if missing font/asset |
| DF-06 | REQ-01/06/10/12 | owner freeze exact bundle, SHA receipts, reload, no silent overwrite |
| DF-07 | REQ-05/08/10/12 | FE click→BE/CLI→real variant/freeze→same-source React handoff, normal/refusal |

`DF` is **candidate implementation slicing**, not approved new SWU denominator or artificially weighted REQ. Preserve all original RF-01..08 and existing REQ-01..12 / AC-01..12 totals/weight & retry histories. P1: complete real FE/BE caller→callee→state/output/error and minimal syntax/type/smoke/security checks. P2: real frozen image render, UI/UX comparison, image/font/accessibility/Windows tests, independent Codex/Astra audit + owner acceptance. Implementation + verification rates **UNASSESSED** until audited against this enlarged full blueprint.

### 0A-8. Exclusions and definitive proof boundaries

- **No dependency on GitHub Trending live ranks** (changes daily) for UI quality; researching GitHub projects does not mean they are currently Trending top-ranked. No dynamic download/execute from trending.
- **No heavy local image generation claim:** FFAX Qwen 4B is text-only in current code; photo-real hero art, fantasy dragons and the exact look of a generated raster illustration are not guaranteed offline on current device. Real image asset support must be explicit with actual provider and rights.
- **No automatic fidelity 100%** from comparing the output image to itself; freeze is an identity/provenance check, while human aesthetic acceptance + real UI behavior/correctness remains independent.
- **No hidden privilege or external transmission:** no payment, remote reference images, main merge, Production changes, permission or dangerous repo writes without separate GO.
- **V2.1 blueprint is finalized design only:** owner user instruction to update design does not authorize third-party installation or source execution; new Design Forge code, render pipeline, freeze UI and actual upstream adoption remain `NOT_IMPLEMENTED / NOT_RUN` until distinct actual source commits & evidence.

- **결정일:** 2026-11-18 KST
- **결정 주체:** 사용자(현재 채팅에서 최종설계·저장소 선택 위임)
- **저장소:** `hibi89/frontend-foundry-ax`
- **개발 브랜치:** `feature/ffax-reference-fidelity-20261118`
- **이전 기준선:** `feature/ffax-workbench-p85-20261112@6273704267c71fe3fe6a050ebaf2deb76e5bcc3c`
- **설계 ID:** `FFAX-V2-REFERENCE-FIDELITY-20261118`
- **상태:** 최종설계 확정(P0); 기능 구현·P2 실증 완료와 구분
- **우선순위:** 현재 사용자 지시 + 중앙 정책 §0J/§0E + AGENTS/기존 REQ-01~12. 충돌 시 승인 없는 기능 축소·원본 변경은 허용하지 않음

## 0. 제품·저장소 결정

**기존 FFAX 단일 제품/단일 저장소 유지**. 별도 GitHub 저장소 또는 별도 상용 서비스로 분리하지 않는다. 기존 FFAX는 자연어 UI 제작, 17종 컴포넌트, 편집·Undo/Redo, 구조화된 React 코드 출력, 로컬 체크포인트, 안전한 프로젝트 검토 기능을 유지한다. 외부 프로젝트는 이미지 정밀 복원/검증의 **교체 가능한 모듈**로만 채용한다. 목적은 완전한 제품을 스크린샷 비교 CLI로 축소하는 것이 아니라, FFAX의 약한 **'확정 디자인 → 실제 사용 화면' 충실도**를 보완하는 것이다.

새 사용 모드:
- **Design Forge (V2.1 신규 P0):** 사용자 brief/보유 이미지 → 오프라인 추천·A/B/C 실제 코드·렌더 시안 → 개선/혼합 → 원본 source/자산/사양/PNG SHA 승인 잠금 → FFAX 구현에 직접 전달.
- **Create / Improve (기존):** brief→2안→컴포넌트/코드→편집/QA→승인된 diff/PR.
- **Reference Fidelity (신규, P0):** 이미지 고정→구조·자산 분석→초기 코드 생성→Playwright 실화면 캡처→one-shot-ui 분석/교정→반복→사람 검수→선택적 통합.
- **Agent/Provider (선택):** 기존 FFAX 로컬 Qwen/수동 모델 어댑터 유지. 타사 image-to-code 계열로 전체 제품을 대체하지 않는다.

UI 디자인의 1차 레퍼런스는 사용자가 업로드한 'FFAX에 적용할 최적 조합' 흐름도이며, 정본은 그에 대한 *아키텍처*이지 화면 색채/배치를 그대로 복제하라는 지시가 아니다. 실제 역학달력 랜딩 화면은 별도 참조 이미지/자산으로 잠근다.

## 1. 채택한 아키텍처 (외부 PNG/사진 입력 전용 경로; FFAX 내부 Design Forge 경로는 §0A 우선)

```text
[1 Reference Intake] PNG + source/rights + SHA256 + width/height/DPR + required elements
   → [2 Freeze] immutable reference receipt + user scope / approval + target viewport
   → [3 Design Decomposition] Image-to-code agent skill procedure
       background / main sections / component bounds / typography / asset inventory
       observable vs inferred vs unrecoverable; assets-ready checkpoint
   → [4 Generate] FFAX structured React generator / selected approved model
       screenshot-to-code optional, NEVER mandatory or silently paid/cloud
   → [5 Render] isolated local preview + Playwright capture at exact matched viewport/DPR
   → [6 Compare] one-shot-ui (internally pixelmatch) + heatmap + region/typography/layout issues
   → [7 Patch Proposal] ranked CSS/token/asset/content correction limited to allowlisted paths
   → [8 Bounded Iterate] isolated copy only; compare before/after; best-pass checkpoint;
       stop: acceptance candidate / max passes / no improvement / regression / risk
   → [9 Human Gate] reference vs real browser screenshot, difference board, issue list
   → [10 Scoped Integration] optional reviewed diff/PR + rollback + separate Production GO
```

Default iteration ceiling **5 passes per job** (user-configured lower cap allowed). Default output is **a proposal**, not an automatic modification to the owner's real source. Browser rendering, functional behavior and user acceptance are distinct evidence classes; image-score alone cannot mark `VERIFIED`.

## 2. 기술 조합의 확정/선택 구분

| Component | Decision | Use / boundary |
|---|---|---|
| FFAX existing | **KEEP / PRIMARY** | Orchestrator, project history, structured React output, owner UI, undo, change review |
| Image-to-code (`lenixeduardo/Image-to-code`) | **ADOPT AS REVIEWED WORKFLOW** | Layer-first analysis, assets/spec provenance, agent scripts when compatible; MIT, exact version & transitive risks before install |
| screenshot-to-code (`abi/screenshot-to-code`) | **OPTIONAL ADAPTER** | Initial code alternative only if model/provider and rights are permitted, local/free path verified; never key dependency |
| Playwright | **REUSE/EXTEND** | Browser screenshot, viewport/DPR, CSS/DOM evidence, console/network; existing FFAX QA preserved |
| one-shot-ui (`TN0123/one-shot-ui`) | **PRIMARY COMPARISON ENGINE** | extract/capture/compare/suggest-fixes via pinned, vetted CLI; never assume an upstream `run` invocation is safe for customer code |
| Pixelmatch | **TRANSITIVE VIA one-shot-ui** | Avoid duplicate standalone package unless validated need exists |
| OCR/local vision | **OPTIONAL** | Text assists, not ground truth; manual correction for Korean/Chinese characters and typography |
| Onlook/other UI tool | **NOT REQUIRED** | FFAX's own editor is the authority; evaluate only if objectively better and compatible |

Upstream open-source licenses are not a right to copy copyrighted screenshots, logos, fonts, or unseen image layers. Keep MIT copyright/license notices if upstream code is copied into FFAX. Pin and audit exact package version, dependency tree, lockfile and binary provenance before any release. No automatic `npx -y`/remote auto-install.

## 3. Workflow and concrete contracts

### 3.1 Ingestion + freeze

Inputs: `reference.png`, `provenance` (owner-generated / licensed / external), `rightsConfirmed`, `targetProject`, `viewport {width,height,dpr}`, `scope`, `lockedRegions[]`, `sourceCommit` where applicable. If the origin is a generated image, preserve its immutable bytes; do not silently re-generate when quality is low. Save a SHA256 receipt and immutable original under a job-specific restricted workspace. **No external upload by default.** If rights are unknown, permit local analysis but block publication/client delivery until resolved.

Reject changed SHA, unsupported file, oversized image, missing reference, path traversal, symlink escape, or unauthorized workspace scope. Images must not be committed to public GitHub if proprietary/customer content or rights are uncertain.

### 3.2 Layer/asset stage (외부 평면 레퍼런스 역설계용; Forge-native는 이미 잠긴 source/asset manifest를 검증 후 재사용)

Create `design-spec.json` and `asset-manifest.json`:
- section rectangles, stacking/order, spacing, grid, borders/radii/shadows, palette and text copy;
- `observed|inferred|unknown` confidence per property;
- background, hero illustration, logo, icons, fonts, user-facing textual components, asset source/license;
- independent text+image layers; no full screenshot pasted as static UI background to simulate success;
- missing/unrecoverable assets become **BLOCKED_ASSET** or deliberate, *labeled* fallback requiring user decision. Image generation for missing assets requires explicit appropriate image assets; preserve generated asset hashes.
- rasterized labels are converted to selectable HTML text with verification; illegible Korean/Hanja must be flagged, not guessed.

Source image alone cannot reveal exact font source, hidden behavior, responsive rules or unseen illustration pixels. Their reconstruction is approximate and marked accordingly.

### 3.3 Code generation

Keep source-generation interface behind `GenerationAdapter`: `generate({jobId,brief,spec,assets,modelId,scope}) -> {candidateId,artifacts,diagnostics,modelReceipt}`. Default uses FFAX's structured component/React toolchain. Optional screenshot-to-code adapters require explicit user opt-in and confirmation of **actual** local/free provider. No paid or cloud call silently; never state Qwen 4B is visually accurate until tested. Generated JSX/TSX stays **untrusted**, cannot run with host credentials or unrestricted network access.

### 3.4 Capture + comparison

`capture({candidateId,viewport,dpr,locale,timezone,fontsReady,animationsDisabled}) -> render.png + browser-receipt`. Use matched **image pixel size** and controlled DPR, browser version/fonts, deterministic clock/sample data, no unexpected network requests. Compare with one-shot-ui via locally vetted CLI: `compare({reference,render,engineVersion}) -> {heatmap,issues,pixelMetrics,structuralMetrics}`. Store engine stdout/stderr status and errors, input hashes, tool versions. A pixel heatmap is diagnostic: **no claimed percent fidelity solely from pixelmatch**. Colors/layout/type and missing/altered text are inspected independently.

### 3.5 Safe correction loop

`propose({issues,currentCandidate,allowedPaths}) -> patch` with targeted CSS/tokens/components/assets and before/after evidence. Only the disposable copy may be edited. Backup/reset a clean candidate before patch; verify allowlisted paths, no extra shell commands, no package-install, no secret/config/API changes, no dependency upgrades, no main/Production write. Enforce per-job run, CPU/memory/output and model-call caps; stop at at most five meaningful passes or sooner on no improvement, missing asset, functional regression or approval blocker. Keep `bestKnownCandidate` and always show a reversible diff. React app with arbitrary imported/untrusted code must be previewed only using a genuinely restricted runtime or remain **BLOCKED_UNTRUSTED_EXECUTION**; a normal Playwright tab alone is not full OS isolation. No heavy VM required just to compare static trusted CSS.

### 3.6 Job states and UI

`NEW → REFERENCE_LOCKED → ASSETS_READY → CANDIDATE_GENERATED → CAPTURED → COMPARED → PATCH_PROPOSED → REFINED → READY_FOR_OWNER_REVIEW → OWNER_APPROVED`.

Terminal/alternate: `BLOCKED_REFERENCE | BLOCKED_ASSET | BLOCKED_UNTRUSTED_EXECUTION | BLOCKED_PROVIDER | FAILED | CANCELLED`. `READY_FOR_OWNER_REVIEW` ≠ approved. Each step saves last successful checkpoint and error reason. UI should offer:
- new/reference mode toggle, preview, locked reference with provenance and SHA, target resolution/DPR;
- asset/contact sheet + editable layer/spec assumptions;
- left reference / right real browser / overlay / heatmap and per-region error list;
- generated React source and scoped patch diff, revert, approve;
- run count, stop/pause, local provider/cost indicator, error states;
- separate desktop/tablet/mobile results and accessibility/behavior gate.

## 4. Acceptance / quality / security

**Must-have visual gates (P2):**
1. Exact reference SHA, ownership/provenance and fixed viewport receipt.
2. Real rendered browser screenshot versus reference at identical pixel dimensions; no fake screenshot-as-background.
3. Background, header, calendar/cards/forms, Korean & Hanja text, imagery, fonts and asset licenses inspected region by region; screenshots and heatmap available.
4. No substantial unreviewed divergences; automated numeric metric thresholds must be calibrated to known fixtures and set **before** evaluation; final quality requires independent reviewer/owner approval, never a fabricated 95%/100%.
5. Three-width responsive/keyboard/accessibility/functional behavior validation **separate** from the single-reference screenshot.
6. Invalid reference, changed SHA, missing upstream CLI, timeout, out-of-scope patch, package network attempt, missing asset, unsupported model and nondeterministic capture must stop safely.
7. Preserve original files, project history, API/auth/route/functionality and existing FFAX REQ-01..12. Release gate `RG-01..RG-06` and fixed historical 12 AC / 100 weights unchanged unless separately explicitly approved.

**Reference test fixtures:** first use the original owner-created '역학달력 포털' illustration screenshot with explicit usage rights and locked SHA (do **not** invent SHA until bytes are present in workspace); keep simple deterministic synthetic layout as engineering fixture. HTML functions (date selection, sexagenary day, siju computation) belong to the separate calendar product; FFAX tests its UI reconstruction, not the astrology algorithm.

## 5. P1 implementable work units (candidate scheduling; not a new official SWU denominator)

| Candidate | Mapped REQ | Functional vertical slice | Acceptance for P1 code candidate |
|---|---|---|---|
| RF-01 | REQ-01/06/10 | reference import, SHA freeze, provenance, safe local store/reload | input→immutable receipt→retrieve/invalid SHA fail |
| RF-02 | REQ-03/06 | layer/spec/asset manifest pipeline and hard-gate | reference→assets/spec→ready or blocked |
| RF-03 | REQ-04/07 | selected generation adapter→isolated TSX candidate | spec/assets→React output with normal/error path |
| RF-04 | REQ-09 | Playwright actual candidate capture with exact DPR/viewport | candidate→render.png/receipt or clear failure |
| RF-05 | REQ-05/06/09 | one-shot-ui versioned compare & region issue report | reference+render→heatmap/issues or fail closed |
| RF-06 | REQ-05/10/11 | proposal patch→copy-only apply→bounded iteration→rollback | per-pass patch/snapshot/report, reject unsafe paths |
| RF-07 | REQ-05/09/10/12 | owner-facing reference/actual/diff UI and review states | controls→real engine paths, approve/reject persists |
| RF-08 | REQ-08/10/11/12 | reviewed scoped output to existing project safe-diff proposal | no original write/merge/deploy before separate GO |

P1 requires **real caller→callee→result/error** code, necessary local syntax/type/smoke and safety boundary checks; docs/mock/check counts are not completion. P2 owns full package audits/CI, independent screenshot/render, functional regression, multi-viewport/Windows/owner visual acceptance, code/security independent inspection. Candidate list is an engineering mapping; preserve any existing official REQ-ID/SWU counts, weights and retry evidence.

## 6. Status and non-goals at approval

- The initial local comparison adapter (from prior wave) is present on this branch: `scripts/ffax_reference_fidelity.mjs`. It is **not** the whole system.
- Upstream install/release pinned and real compare invocation: **NOT_RUN**.
- Automated generation-to-live-render pipeline, UI integration and safe auto CSS loop: **NOT_IMPLEMENTED** until subsequent commits.
- Entire P1 implementation/validation: **UNASSESSED**, no new percentage from a blueprint.
- No new repository, no deletion of old FFAX requirements, no default-branch merge, no Production, no payment, no external customer content transfer, **RELEASE HOLD**.

## 7. Decision precedence / change control

This document becomes the **user-selected FFAX V2 Reference Fidelity addendum** to `REQUIREMENTS.md`, `docs/ACCEPTANCE_MATRIX.md`, `docs/PRODUCT_SPEC_V1.md` and `AGENTS.md`. It adds fidelity requirements without silently discarding the existing approved FFAX capabilities. A future conflict or scope reduction requires explicit owner GO. The current user's choice to finalize this integration design is **not** approval to run third-party code against customer sources, change permissions, spend money, merge to main or deploy Production.
