# FRONTEND FOUNDRY AX (FFAX)

> **Concept / requirements baseline — not yet implemented.**

FFAX is a proposed AI-powered frontend production system: **brief → design → React code → visual editing → browser-based QA → reviewed integration**. Its purpose is to build and improve reusable, production-grade user interfaces while preserving existing application functionality.

## Final product definition

The authoritative **v1.0 completion contract** is [REQUIREMENTS.md](REQUIREMENTS.md) together with [docs/ACCEPTANCE_MATRIX.md](docs/ACCEPTANCE_MATRIX.md). Requirements are not complete unless objective evidence and release gates pass.

- **Full product specification:** [docs/PRODUCT_SPEC_V1.md](docs/PRODUCT_SPEC_V1.md)
- **Architecture and alternatives:** [docs/ARCHITECTURE_DECISIONS.md](docs/ARCHITECTURE_DECISIONS.md)
- **Development rules:** [AGENTS.md](AGENTS.md)
- **Current progress:** [STATUS.md](STATUS.md)
- **Handoff:** [HANDOFF.md](HANDOFF.md)

## Intended UI

The previously reviewed **FFAX concept poster is design direction, not a functional screenshot**. Its example KPI values, projects and integration badges are illustrative and do not constitute shipped features or verified metrics.

The target layout is a dark, crisp workspace: left project navigation and prompt panel; center live preview/canvas; right component, property and QA panels; top workflow navigation; portfolio of product previews beneath. The original concept artwork is retained in the conversation and must be added under `assets/concepts/` when a verified binary upload path is available. No placeholder will be represented as the original asset.

## Boundaries

- Preserve existing repositories, production behavior and original data. No unapproved deployment, security change or external transmission.
- UI quality is judged on **rendered browser output**, not code generation alone.
- Imported design references and open-source packages require license/provenance checks.
- Every acceptance criterion must have a reproducible test, screenshot, log, or documented manual review.

**Status:** RESEARCH / SPECIFIED (0 verified product features; deployment: NOT APPLICABLE).
