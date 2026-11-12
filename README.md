> **2026-11-12 FFAX P85 third pass — 78/100 provisional (unchanged), 85 target NOT reached.** [Manual AI bridge + six-step clean-room verification](docs/FFAX_P85_MANUAL_BRIDGE_AND_CLEANROOM_20261112.md). Added browser approval flow: copy an explicitly vetted UI prompt to a model yourself, paste strict JSON, approve, and edit the resulting UI. **This is manual AI-assisted review, not live API generation.** Local Node 91 PASS / browser 30 + manual bridge 10 PASS / a11y basics 12 PASS / contrast 828 checks / clean-room 6 PASS. GitHub Actions config manual-dispatch only, **never run**; real LLM, axe, owner UX signoff, clean CI and Production remain unverified. 

---

> **2026-11-12 FFAX 85% 재도전 — 검증된 78/100점 잠정 유지.** 실제 구현·검증은 증가했지만 AC04/AC09/AC12의 필수 수락 게이트는 미완료다. [이번 구현 및 재현 로그](docs/FFAX_P85_SECOND_PASS_20261112.md). 새 코드: 구조화된 모델 출력→등록 컴포넌트→React TSX 안전 변환, 12개 합성 타입 검사, D1–D5 로컬 통합 시나리오, 3테마×3폭 대비 검수. **실제 모델·axe·GitHub CI·배포는 미검증**. 실행: `npm run check:offline` (Node>=20, TypeScript CLI, Python Playwright/Chromium 및 레거시 React UMD 경로 필요).

---

> **2026-11-12 FFAX P85 워크스트림:** 검증된 고정 평가표 **78/100점 잠정** (이전75 + AC11 3). **85점 목표 미달 / RELEASE HOLD**. `feature/ffax-workbench-p85-20261112`의 [P85 범위·실측·한계](docs/FFAX_P85_WORKSTREAM_EVIDENCE_20261112.md)를 먼저 확인. 외부 AI 실연동, axe/수동 UX 검토, clean CI는 미검증. 아래 P75 README는 이전 체크포인트.

---

# FRONTEND FOUNDRY AX (FFAX)

> **Latest P75 development (2026-11-12 KST): 75/100 provisional engineering score**, feature branch `feature/ffax-workbench-p75-20261112`, [Draft PR #1](https://github.com/hibi89/frontend-foundry-ax/pull/1) unmerged, RELEASE HOLD. Earlier P50 below is historical. [P75 evidence](docs/FFAX_P75_ENGINEERING_EVIDENCE_20261112.md).

## Safe local React project review (v0.2)

Use the new CLI to **inspect a synthetic React fixture, create an isolated snapshot, preview an allowlisted CSS-only change, require explicit approval, compare API flows and verify an exact rollback**. It never modifies the original source, requires no credentials, does not run imported code, and does not push or deploy.

```bash
npm install --ignore-scripts
npm test   # 49/49 local Node tests
node scripts/workspace_cli.mjs inspect fixtures/react-market
node scripts/workspace_cli.mjs import fixtures/react-market /tmp/ffax-workspaces demo-market
# Place your own UI CSS change in /tmp/new-theme.css first
node scripts/workspace_cli.mjs preview /tmp/ffax-workspaces/demo-market /tmp/new-theme.css
node scripts/workspace_cli.mjs apply /tmp/ffax-workspaces/demo-market /tmp/new-theme.css p75-demo-0001 APPROVE_UI_PATCH
node scripts/workspace_cli.mjs verify-original /tmp/ffax-workspaces/demo-market
node scripts/workspace_cli.mjs rollback /tmp/ffax-workspaces/demo-market p75-demo-0001 APPROVE_ROLLBACK
```

The two fixtures include five API/UI flows each. TSX handlers are executed under a React API **stub**; actual React runtime, real GitHub imports, Windows and customer repos have not been validated. See P75 evidence before treating the 75% figure as production readiness.


> **v0.1 local-first workbench implemented on `feature/ffax-workbench-p50-20261112` — P50 technical milestone (50/100 provisional), RELEASE HOLD. The v1.0 product is not complete.**

![FFAX concept poster](assets/concepts/ffax-v1-vision.webp)

*User-approved vision poster, converted to WebP for repository viewing. This is concept art, not a screenshot of a shipped product.*

## Run the current prototype

```bash
npm install --ignore-scripts
npm start
# Open http://127.0.0.1:4173 on your local machine
npm test
# Optional Linux Chromium probe (requires Python Playwright, Pillow and /usr/bin/chromium):
python scripts/browser_qa.py
```

The prototype runs locally without any paid AI API, secret, external project connection or cloud deployment. It offers rule-based structured Korean briefs, 2 design options, 13 UI components, 3 themes, editable component properties, drag/move, undo/redo, locally approved reference image palette/layout variants, React TSX source export and a quick 3-width UI check. **It is not yet a working LLM-to-React production pipeline or GitHub-app integration.**

**Tests:** Node 24 PASS, headless Chromium *same-source injected DOM* 30 PASS; locally hosted HTTP GET 200. Chromium URL navigation directly to localhost was blocked by this execution environment; actual browser navigation against the URL, Windows and React runtime integration remain **unverified**.

[Implementation evidence](docs/FFAX_P50_ENGINEERING_EVIDENCE_20261112.md) · [100-point rubric](docs/ACCEPTANCE_MATRIX.md) · [Status](STATUS.md) · [Handoff](HANDOFF.md)

---

FFAX is a proposed AI-powered frontend production system: **brief → design → React code → visual editing → browser-based QA → reviewed integration**. Its purpose is to build and improve reusable, production-grade user interfaces while preserving existing application functionality.

## Final product definition

The authoritative **v1.0 completion contract** is [REQUIREMENTS.md](REQUIREMENTS.md) together with [docs/ACCEPTANCE_MATRIX.md](docs/ACCEPTANCE_MATRIX.md). Requirements are not complete unless objective evidence and release gates pass.

- **Full product specification:** [docs/PRODUCT_SPEC_V1.md](docs/PRODUCT_SPEC_V1.md)
- **Seven practical use cases + how AI generation and visual editing work:** [docs/USE_CASES_AND_IMPLEMENTATION_V1.md](docs/USE_CASES_AND_IMPLEMENTATION_V1.md)
- **Productivity validation method (not actual measured results):** [docs/PRODUCTIVITY_BENCHMARK_PLAN.md](docs/PRODUCTIVITY_BENCHMARK_PLAN.md)
- **Architecture and alternatives:** [docs/ARCHITECTURE_DECISIONS.md](docs/ARCHITECTURE_DECISIONS.md)
- **Development rules:** [AGENTS.md](AGENTS.md)
- **Current progress:** [STATUS.md](STATUS.md)
- **Handoff:** [HANDOFF.md](HANDOFF.md)

## Intended UI

The previously reviewed **FFAX concept poster is design direction, not a functional screenshot**. Its example KPI values, projects and integration badges are illustrative and do not constitute shipped features or verified metrics.

The target layout is a dark, crisp workspace: left project navigation and prompt panel; center live preview/canvas; right component, property and QA panels; top workflow navigation; portfolio of product previews beneath. A visually equivalent WebP copy of the approved poster is now stored at `assets/concepts/ffax-v1-vision.webp` (verified blob SHA `01d42b4e74eed25a3b23ec6966f77b6bd7b22e54`). The original PNG remains a separate source file outside GitHub.

## Boundaries

- Preserve existing repositories, production behavior and original data. No unapproved deployment, security change or external transmission.
- UI quality is judged on **rendered browser output**, not code generation alone.
- Imported design references and open-source packages require license/provenance checks.
- Every acceptance criterion must have a reproducible test, screenshot, log, or documented manual review.

**Status:** 50/100 provisional technical milestone on feature branch; RELEASE HOLD; deployment NOT APPLICABLE.
