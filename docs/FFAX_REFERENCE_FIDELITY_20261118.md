# FFAX Reference Fidelity Adapter — 2026-11-18

## Decision and scope

Keep FFAX's own React UI editing, 17-component registry, local project restore, approved model adapters and source-protection workflow. Do **not** replace the complete FFAX product with a screenshot-diff utility. Add the upstream `TN0123/one-shot-ui` compare/suggest-fixes capabilities as an **optional local engine**. The engine is MIT-licensed (Copyright 2026 Tanay Naik), but this repository contains no vendored upstream source.

Upstream references:
- https://github.com/TN0123/one-shot-ui (MIT)
- https://github.com/lenixeduardo/Image-to-code (MIT, optional future agent procedure)
- FFAX baseline: `REQUIREMENTS.md` REQ-05, REQ-06, REQ-09 and `AGENTS.md`

## Actual P1 code delivered

`scripts/ffax_reference_fidelity.mjs` offers an opt-in, local CLI entry point:

```sh
npm run reference:compare -- --reference C:/ffax-assets/reference.png --render C:/ffax-work/render.png --out C:/ffax-work/report-001 --engine-entry C:/ffax-tools/one-shot-ui/dist/cli.mjs --suggest
```

Before starting an external program, the adapter checks that both inputs are local PNG files with valid headers and exactly matching pixel sizes; calculates SHA256; bounds sizes; refuses an existing nonempty output directory; and uses Node `spawn` without a shell. It then invokes the *preinstalled* upstream CLI for `compare` and optionally `suggest-fixes`, and generates an on-disk `report.json` with provenance and the upstream heatmap. It never runs `converge`, edits CSS, installs packages, sends screenshots to external APIs or touches customer originals. Error paths fail closed. There is a 90-second process timeout. Successful local comparison means `MEASURED_NOT_APPROVED`, **not** visual, functional or buyer acceptance.

The Node test `tests/ffax-reference-fidelity.test.mjs` uses a synthetic CLI stand-in to check success, mismatched dimensions, missing upstream CLI, and evidence overwrite refusal. This is **not** a real upstream integration test.

## Deliberately blocked / next SWUs

1. **Upstream install + provenance verification:** evaluate a reviewed exact one-shot-ui release; no automatic installation or unapproved dependency upgrades. The installed CLI's version and runtime compatibility must be confirmed before real comparison. Node package versions and transitive licenses are separate from the upstream repository MIT license.
2. **Real Playwright capture:** accept reference images and a rendered workbench viewport with exact DPR, then connect the comparison command to FFAX's browser capture workflow. A user-facing UI and automated capture are **NOT IMPLEMENTED** in this commit.
3. **Isolated CSS convergence:** if adopted, allow `converge` only in a disposable copy after a backup/approval gate, produce a scoped diff, and require separate approval to import CSS changes into a real project. This is **NOT IMPLEMENTED**.
4. **P2 validation:** real installed CLI result, nontrivial Korean-heavy reference screens, responsive layouts, font and asset rights, real UI/browser QA and human visual acceptance. CI full sweep and independent audit **NOT_RUN**.

No paid services, original repo writes, Production changes, or main merge were authorized. `RELEASE HOLD`; official implementation/verification percentages remain `UNASSESSED`.
