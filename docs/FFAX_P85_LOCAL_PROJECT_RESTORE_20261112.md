# FFAX P85 fourth pass — versioned local JSON project save/reopen

**Date:** 2026-11-12 KST. **Code SHA:** `a76a962037b41d474699845378c2656e439f66f1` on `feature/ffax-workbench-p85-20261112`. **Engineering score: 78/100 unchanged, not 85**; release HOLD. The fixed 12 AC weights and original product goals are unchanged.

## User-facing capability
- Download a versioned `ffax-local-project.v1` JSON snapshot from the visual editor; no cloud storage.
- Reopen via a local JSON file picker, with strict schema and explicit `window.confirm` before changing the displayed project.
- Preserve current canvas as a reversible undo step; canceled or rejected imports do not mutate current document, backend or GitHub.
- Validate project version/title/approach/themes/brief and 2 design options, approved rights-bound palette, registered components, node ID uniqueness, props allowlists, size limits and valid CSS hex colors. No script evaluation or unrestricted external URL loading.
- This is an integrity **validation** and reversible local import, not an authentic digital signature or complete customer-PII detector.

## Evidence
| Test | Result | Limitation |
|---|---|---|
| `npm test` | 105 PASS / 0 FAIL / 0 SKIP | Node22 Linux; added 9 archive unit tests |
| `python scripts/browser_qa.py` | 30 PASS / 0 FAIL | Chromium injected exact same HTML/CSS/JS, real local HTTP separately; no direct URL navigation |
| `python scripts/project_restore_probe.py` | 9 PASS / 0 FAIL | Chromium injected; actual download, reject, cancel, accept, undo and JS error check |
| `python scripts/manual_browser_probe.py` | 10 PASS / 0 FAIL | JSON synthetic, not external model |
| `node scripts/local_acceptance_gate.mjs` | 5 local D1-D5 PASS | Synthetic/local only, not signed off for release |
| Git Blob parity | 6 / 6 exact | Core, app, HTML, CSS, Node tests, Chromium restore probe |

## Objective / limits
- Original v1.0 metric **78/100**: AC01 8, AC02 8, AC03 12, AC05 6, AC06 12, AC07 12, AC08 12, AC10 5, AC11 3. This feature improves real usability but does **not** constitute a completed new AC.
- AC04 0/14: live approved LLM provider + generated React product build and 10/12 confirmed prompts incomplete.
- AC09 0/6: formal axe critical/serious audit plus owner visual usability acceptance still missing.
- AC12 0/2: clean installation GitHub CI and D1-D5 official end-to-end proof incomplete. Existing manual-only workflow not executed; cost approval not assumed.
- No external data sent, no billed AI, no Git merge, no change to existing main or customer product sources, no Production.
- Rollback prior feature HEAD `2f568716f76d2df300fcc862d86018ec1ddb490f` (use non-force revert as appropriate).

## Reproduce
```sh
npm test
python scripts/browser_qa.py
python scripts/project_restore_probe.py
python scripts/manual_browser_probe.py
node scripts/local_acceptance_gate.mjs
```

QA browser probe uses `set_content` due the local environment's blocked URL navigation; do not equate it with real Windows or Production browser verification. Axe-core could not be retrieved from the current environment; formal AXE not run. User visual approval pending.
