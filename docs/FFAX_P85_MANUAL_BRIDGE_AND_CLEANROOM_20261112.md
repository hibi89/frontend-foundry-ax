# FFAX P85 third pass — owner-reviewed AI exchange + clean-room gate

**Date:** 2026-11-12 KST. **Source SHA:** `ffd04a8f452ef3f7523201767b1f18cd3d18fb31` on private `feature/ffax-workbench-p85-20261112`. **Score: 78/100 provisional unchanged**, goal 85 **not reached**. Release HOLD; no Vercel/Production.

## Implemented
- **Browser manual-AI bridge:** owner signs off on copy-only prompt, manually takes non-sensitive UI brief to an external AI if desired, pastes JSON response, checks explicit design approval and imports only registered components. `makeManualAIPrompt` rejects obvious credentials, email, .env and private-source indicators. `parseModelDesign` rejects unapproved or unknown components, executable source, extra fields, and model output containing common tokens or email. Editing canvas and React TSX preview update; nothing is auto-transmitted, auto-pushed or deployed.
- **Shared schema:** moved strict JSON model parser into `src/core.mjs`, existing `src/ai-structured-output.mjs` re-exports it. Existing 12 synthetic TSX screens still typecheck. No local source/network event is sent to an AI model.
- **Tests:** `tests/manual-ai-ui.test.mjs` covers consent, secret/email refusal, approval, malicious component and valid model JSON. `scripts/manual_browser_probe.py` operates on the same actual HTML/CSS/JS in Chromium (injected DOM due local URL navigation policy), including rejection/no-mutation guarantees.
- **Clean-room:** `scripts/cleanroom_gate.mjs` copies only a code/test allowlist into a new temporary location, runs six independent checks, deletes the working copy, and produces a JSON log. No network install, token, customer data or deployment.
- **CI definition:** `.github/workflows/ffax-manual-ci.yml` is **workflow_dispatch ONLY**; not triggered, not billed or claimed PASS. It provides a future Node and browser QA runner after explicit minutes/cost authorization. Not a verified CI run.

## Measured local execution
| Check | Result | Limitation |
|---|---|---|
| `npm test` | **91 PASS / 0 FAIL / 0 SKIP** | Local Node22 Linux |
| `python scripts/browser_qa.py` | **30 PASS / 0 FAIL** | Chromium HTML/CSS/JS injected; not live URL |
| `python scripts/manual_browser_probe.py` | **10 PASS / 0 FAIL** | Owner-controlled manual JSON flow, synthetic model response |
| `python scripts/accessibility_probe.py` | **12 PASS / 0 FAIL** | Basic keyboard/semantics, not axe |
| `python scripts/contrast_probe.py` | **828 computed text checks, 0 low-contrast candidates** | 3 themes × 3 viewports, does not certify WCAG |
| `node scripts/model_contract_probe.mjs` | **12/12 TypeScript synthetic screens** | No actual model call |
| `node scripts/cleanroom_gate.mjs` | **6/6 isolated checks PASS** | Existing preinstalled tools; not clean npm install or GH Actions |
| `node scripts/local_acceptance_gate.mjs` | **D1–D5 5/5 PASS** | Local synthetic workflow; real customer/API/production untested |

## Approach comparison
- **A remote direct LLM integration:** eventual automatic UX and real provider metering, but requires approved vendor, prompt-data transmission, token/cost envelope, failure handling and actual provider responses. **Not authorized/implemented now**.
- **B user-mediated manual model bridge (implemented):** no API charge from FFAX, no automatic data transmission, inspectable JSON and explicit approval; requires human copy/paste and is **not equivalent to automated AI generation**. Chosen as reversible near-term capability without product-scope reduction.

## Fixed acceptance status
- **78/100 retained:** AC01 8, AC02 8, AC03 12, AC05 6, AC06 12, AC07 12, AC08 12, AC10 5, AC11 3.
- **AC04 0/14:** manual fixture + synthetic TypeScript does not meet real-model-generated React final criterion.
- **AC09 0/6:** axe-core formal critical/serious audit and actual user UI acceptance unavailable; color checks alone insufficient.
- **AC12 0/2:** no fresh GitHub Actions green run or owner final release review; local clean-room run is not provider CI.
- **85 target not reached**. To reach score at least 85 under unchanged rubric, AC04 (14p) or AC09 (6p) plus AC12 (2p) must fully qualify.

## Security and preservation
- Private `main` at `191289d19f7eb6203a2a6beb5e8efbcf10bc844d` not touched; PR #1 remains Draft/unmerged.
- Existing product repos, customer files, credentials, external API quotas, billing, permissions and Production unchanged.
- Manual copying into another AI service can expose the brief; source code and private customer data should never be pasted. Regex filters are only defense-in-depth, **not a guarantee of complete secret/PII detection**.
- GitHub author/committer identity inspected earlier as `hibi89`. This evidence is tied to exact source SHA above.

## Reproduce
```bash
npm test
node scripts/model_contract_probe.mjs
python scripts/browser_qa.py
python scripts/manual_browser_probe.py
python scripts/accessibility_probe.py
python scripts/contrast_probe.py
node scripts/local_acceptance_gate.mjs
node scripts/cleanroom_gate.mjs
```
Chromium and Playwright/Pillow are required for Python tests, and `tsc` must be on PATH. `npm start` provides local preview at `127.0.0.1:4173`; actual browser navigation in the current sandbox is blocked by policy. No deployment.
