# FFAX P85 SECOND PASS — local real-engineering evidence, score frozen at 78

**Checked:** 2026-11-12 KST. **Repository:** Private `hibi89/frontend-foundry-ax`, branch `feature/ffax-workbench-p85-20261112`, tested code SHA `9733dbf72810e03d85ca29811f53ae368a8a651a`.

## What changed

| Area | Actual change | Why |
|---|---|---|
| AI model output boundary | `src/ai-structured-output.mjs` rejects unapproved requests, non-JSON/extra fields, unregistered components, arbitrary JSX, invalid props | Never eval or execute third-party model code; maintain bounded registered React components |
| Model fixture regression | `tests/ai-structured-output.test.mjs` adds 19 cases, `scripts/model_contract_probe.mjs` compiles 12 synthetic outputs with real TypeScript CLI | Prove schema/parser/export behavior separately from actual model calls |
| End-to-end rehearsal | `scripts/local_acceptance_gate.mjs` tests D1–D5 across existing safe importer, design, reference approval, retry budget, QA | Reproducible offline 5-stage check; not a clean environment GitHub CI |
| Visual accessibility | `styles.css` button/badge/eyebrow contrast adjustments in 3 themes; `scripts/contrast_probe.py` computed-text audit in Chromium across 375/768/1440 | Correct actual low-contrast ocean buttons/daylight small text while preserving chosen dark/purple design |
| Task commands | `package.json` v0.4 scripts for model contract, contrast, D1–D5, consolidated offline gate | Enable next developer to repeat actual verification |

## Test execution (same local source as GitHub blobs)

```sh
cd /path/to/ffax
npm test                         # 86 PASS / 0 FAIL / 0 SKIP
node scripts/model_contract_probe.mjs   # 12/12 synthetic designs typechecked (no LLM)
python scripts/react_runtime_probe.py   # 12/12 React UMD renders, 36 viewports
python scripts/accessibility_probe.py   # 12/12 lightweight keyboard/name checks (not axe)
python scripts/browser_qa.py            # 30/30 same-source Chromium injected DOM checks
python scripts/contrast_probe.py        # 738 computed-text samples across 9 combinations, 0 candidates
node scripts/local_acceptance_gate.mjs  # D1-D5 5/5 LOCAL ONLY
npm run check:offline            # combined pass on tested machine
```

- Chromium directly navigating to `http://127.0.0.1:4173/` returns `net::ERR_BLOCKED_BY_ADMINISTRATOR`; **not a claimed website failure**, nor is injected `set_content` a URL test.
- Older locally installed React UMD is used for runtime probe; TypeScript ambient React shim validates generated syntax/contracts, not actual React 19 application installation.
- The planned `axe-core` dependency could not be obtained from local cache (public registry DNS unavailable). **Axe critical/serious zero is NOT verified.** Human visual approval is still pending.
- The new model-output parser consumes **synthetic JSON fixtures**, not actual inference. No external LLM/API call, private code upload, charge or user information transmission.
- No GitHub Actions CI executed (private-minute cost/permission unclear), no Vercel deployment, no existing customer system modified.

## Why score remains 78 (and 85 is not reached)

Previously accepted provisional local engineering rubric: AC01=8, AC02=8, AC03=12, AC05=6, AC06=12, AC07=12, AC08=12, AC10=5, AC11=3 => **78/100**. The above extension makes the candidate safer and easier to test but changes no full acceptance criterion. AC04 0/14 (live model generation), AC09 0/6 (axe+human UX), AC12 0/2 (clean CI+full shipment gate) remain, so 85 cannot be honestly declared.

## Next shortest path

1. Decide explicitly on a model/provider, permitted prompt data, price/zero-cost limit. A real model integrated into the isolated pipeline and tested over fixed 12 briefs could earn AC04 14 **if all conditions pass**; never presume the user's API billing consent.
2. Run official axe-core in real browser, inspect visual screenshots, record user UX signoff (AC09 6).
3. Clean checkout/install+private CI confirmation and repeat D1–D5 in test environment (AC12 2). Verify SHA and released branch, then request final release approval.

**State:** 78/100 provisional, 85 target NOT MET, RELEASE HOLD. Product main and all unrelated repositories preserved.
