# FRONTEND FOUNDRY AX (FFAX)

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
