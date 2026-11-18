# FFAX V2.0 — Reference Fidelity Mode 최종설계 정본

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
- **Create / Improve (기존):** brief→2안→컴포넌트/코드→편집/QA→승인된 diff/PR.
- **Reference Fidelity (신규, P0):** 이미지 고정→구조·자산 분석→초기 코드 생성→Playwright 실화면 캡처→one-shot-ui 분석/교정→반복→사람 검수→선택적 통합.
- **Agent/Provider (선택):** 기존 FFAX 로컬 Qwen/수동 모델 어댑터 유지. 타사 image-to-code 계열로 전체 제품을 대체하지 않는다.

UI 디자인의 1차 레퍼런스는 사용자가 업로드한 'FFAX에 적용할 최적 조합' 흐름도이며, 정본은 그에 대한 *아키텍처*이지 화면 색채/배치를 그대로 복제하라는 지시가 아니다. 실제 역학달력 랜딩 화면은 별도 참조 이미지/자산으로 잠근다.

## 1. 채택한 아키텍처 (사용자 흐름도 보완)

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

### 3.2 Layer/asset stage (hard before the first visual-generation pass)

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
