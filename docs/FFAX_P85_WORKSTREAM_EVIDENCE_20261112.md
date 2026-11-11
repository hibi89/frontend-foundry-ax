# FFAX P85 workstream — tested P78 checkpoint (2026-11-12 KST)

**This is a P85 development workstream, NOT a verified P85 milestone.** Fixed v1.0 rubric is 75 prior + **AC11 3 PASS** = **78/100 provisional**; AC04 (14), AC09 (6), AC12 (2) remain 0. User goal 85 is **not yet met**. No scope/weights changed.

## Code implemented

- `src/ai-gate.mjs`: model API boundary **without an embedded provider or token**, prompt-only opt-in, source-file refusal, conservative input/output secret/PII filtering, explicit owner-provided rate and per-job/per-session cost caps, maximum two attempts with same idempotency key, 429 retry only, bounded timeout/cancel, safe hashed audit, duplicate job rejection, failure and interrupted-job `review_hold` recovery. Actual supplier pricing/billing not observed. No real external AI request was sent.
- `tests/ai-gate.test.mjs`: 18 targeted tests; no private data, real API, or network connection used.
- `src/app.mjs`: preserve native button/label semantics in visual editor, Enter/Space select and `aria-pressed` for viewport switches. Core UI code unchanged.
- `scripts/accessibility_probe.py`: actual Chromium injected-same-source checks for language, names/labels, IDs, native roles, focus, keyboard and viewport; NOT an axe-core audit and NOT human UX signoff.
- `scripts/react_export_probe.mjs`: 12 fixed rule-based briefs -> 12 generated TSX files; TypeScript 5.8.3 check via **minimal local React ambient shim**, JS transpilation. This is **not an AI/LLM generation test** and not authoritative React production type coverage.
- `scripts/react_runtime_probe.py`: 12 TSX exports rendered in a **genuine locally installed legacy React UMD runtime** (not bundled or remotely fetched) using Chromium `set_content`, 36 responsive viewport checks. Genuine runtime but **not target production React version or URL navigation**.

## Direct test evidence (local Linux)

| Command | Result | Scope |
|---|---|---|
| `npm test` | **67 PASS / 0 FAIL / 0 SKIP** | 49 prior unit/integration tests + 18 new opt-in policy tests |
| `python scripts/browser_qa.py` | **30 PASS / 0 FAIL** | Actual Chromium same-source injected HTML/CSS/JS, local HTTP independently GET200 |
| `python scripts/accessibility_probe.py` | **12 PASS / 0 FAIL** | Keyboard/focus/native semantics/labels, **not axe** |
| `python scripts/react_runtime_probe.py` | **12/12 renders, 36 viewport checks, 0 JS errors** | Legacy locally installed real React UMD + TypeScript shim, not production runtime |

## Strict scoring and remaining gates

- **AC11 +3/3 provisional:** simulated adapter, budget, abort/timeout/retry/idempotency, hashed log/privacy and restoration all exercised. Real provider, secret management and actual invoices remain unverified and require owner authorization.
- **AC04 +0/14:** no approved live LLM provider or prompt→actual React end-to-end through installed provider. Rules engine TSX tests are *partial technical readiness only*.
- **AC09 +0/6:** 12 lightweight accessibility checks PASS, but axe-core critical/serious 0 proof and a genuine independent/manual UX approval are missing. No false accessibility certification.
- **AC12 +0/2:** clean-install on a separate environment, GitHub CI success, and D1–D5 integrated demo not complete. Testing on current populated Linux container is not a clean install/CI release.
- **Total = 78/100 (provisional local engineering), RELEASE HOLD.** Goal 85 not met; do not invent percentage or label this release candidate.

### Deployment and source preservation
No Vercel/Production, no permission changes, no main merge, no outside product changes. Work is limited to private `feature/ffax-workbench-p85-20261112`. Existing P75 Draft PR #1 is untouched. GitHub source SHA will be recorded after actual commit and post-push read-back. Public hub receives only metadata and never private implementation source.

### Next priority toward a verified >=85
1. Real AI adapter with explicit model/provider/data-transmission/price approval, genuine React target runtime + 12 brief tests; **AC04 14** if all acceptance conditions pass, yielding at least 92 with AC11, not a guaranteed 85.
2. Obtain axe-core from license-verified dependency, genuine Chromium URL/Windows and manual user UX acceptance for **AC09 6**; until then it remains 0.
3. Clean CI from pinned dependencies + D1–D5 scenario for **AC12 2** (private CI cost/quotas need approval).
4. Do not merge Draft PR or deploy automatically.
