# FFAX P75 — local-first React import, API preservation and Git review evidence

**Checked:** 2026-11-12 KST  
**Code SHA:** `5cdba6922584df3e3824d105d8345307670ea5ca` on `feature/ffax-workbench-p75-20261112`  
**PR:** [#1 — Draft, unmerged](https://github.com/hibi89/frontend-foundry-ax/pull/1) targeting `main`  
**v1.0 target:** fixed 100-point `docs/ACCEPTANCE_MATRIX.md` criteria, **75/100 provisional engineering**, RELEASE HOLD.  
**Production:** not applicable. No cloud deployment, paid model, real customer data or changes to existing product repositories.

## Summary: 50 → 75 (provisional +25p)

| AC | Weight | Feature and test | Evidence limitations |
|---|---:|---|---|
| AC-01 React sample import | 8 | Two independent React+TSX fixtures, read-only scan, SHA-256 manifest, isolated-copy import and exact source digest check, source unchanged | **Local test fixtures only.** GitHub remote repository import/authentication and large real project compatibility not verified |
| AC-07 preserve existing application logic/API | 12 | Existing `react-market` and `react-analytics` fixtures, 5 service/API flows each before/after CSS-only patch/rollback; 5 actual TSX callbacks per app executed via transpile with React API stub; authorization guards, unsafe patch refusal, SHA conflict checks | **Service logic and transpiled TSX handler tests, not full native React runtime/customer integration.** Full integration of WORKNOVA etc remains unverified |
| AC-10 branch, approval, rollback | 5 | Explicit approval required for isolated UI patch and rollback; local new Git repo real branch → commit UI-only change → `git revert` restores byte-exact original, main untouched; review-plan model; real Draft [PR #1](https://github.com/hibi89/frontend-foundry-ax/pull/1) created and confirmed unmerged | Actual FFAX built-in GitHub adapter tested with injected mock; the real PR was opened through authenticated development connector, not by shipping app; external account authorization/merge/production not exercised |
| **New points** | **25** | + P50 previous locally tested 50 points | **75/100 provisional technical milestone**, not functional/product/customer/retail completion |

### Local implementation and re-run

Files: `src/workspace.mjs`, `src/github-review.mjs`, `scripts/workspace_cli.mjs`, `fixtures/react-{market,analytics}`, `tests/{workspace,react-tsx-interactions,github-review,git-revert}.test.mjs`.

```bash
npm install --ignore-scripts
npm test
npm run test:browser
node scripts/workspace_cli.mjs inspect fixtures/react-market
# User explicitly chooses an empty output directory under temp:
node scripts/workspace_cli.mjs import fixtures/react-market /tmp/my-ffax-workspaces demo-market
node scripts/workspace_cli.mjs preview /tmp/my-ffax-workspaces/demo-market /tmp/new-theme.css
node scripts/workspace_cli.mjs apply /tmp/my-ffax-workspaces/demo-market /tmp/new-theme.css p75-demo-0001 APPROVE_UI_PATCH
node scripts/workspace_cli.mjs verify-original /tmp/my-ffax-workspaces/demo-market
node scripts/workspace_cli.mjs rollback /tmp/my-ffax-workspaces/demo-market p75-demo-0001 APPROVE_ROLLBACK
```

**Measured on local Linux Node v22.16.0/Python3.13.5**:
- `npm test` — **49 PASS / 0 FAIL / 0 SKIP** across original P50 and new P75 unit/regression tests (includes local Git fixture rollback).
- `npm run test:browser` — previously established Chromium injected same-source screen **30 PASS / 0 FAIL**: 375 / 768 / 1440px, UI controls, visual editing, overflow fail→repair, image-rights gate, console/network checks.
- Local HTTP server responds 200 (separate smoke). **Chromium direct localhost navigation blocked by execution environment policy** and is not a PASS.
- CLI integration: `inspect → import → preview → apply(APPROVE_UI_PATCH) → verify-original → rollback(APPROVE_ROLLBACK)` PASS. Example source SHA-256 for market UI: `7d7291722f4cabcfb7876aa96d11c8340e0747d90178eb5caace4c8c62f1779e` **unchanged after rollback**. Manifest project digest `e45d3589b70ea98105691795cd4d24171420602b923f0f9d6545d74385a9be52` unchanged on original.
- GitHub code exact blob parity was checked against locally tested files for relevant source and tests. GitHub main remains at prior `191289d19f7eb6203a2a6beb5e8efbcf10bc844d`.
- Authenticated GitHub [Draft PR #1](https://github.com/hibi89/frontend-foundry-ax/pull/1) exists, **OPEN / DRAFT / unmerged**, branch `feature/ffax-workbench-p75-20261112`, new code SHA referenced above.

### Safety and architecture choice
- Compared A unrestricted JSX rewriting/source overwrites (broad but high regression risk) vs B **read-only scan + isolated snapshot + allowlisted CSS-only patch + Git draft review** (narrower but more predictable); v0.2 adopts **B**.
- No import of .env, symlinks, hardlinked source files, node_modules, .git, secret paths, unrecognized source files. Import has file count and byte limits. No untrusted code execution.
- Patch is scoped to `src/ui/*.css`, requires original SHA, explicit `APPROVE_UI_PATCH`, keeps before backup, uses local isolated copy; rollback requires `APPROVE_ROLLBACK` and last SHA match. Duplicate job ID rejected; no force push, automatic merge, or deploy.
- **Current importer is intentionally small:** real repositories containing `.git`, `node_modules`, lock files, extra assets, or unsupported paths may require a safe exclusion policy and dedicated adapter later. It must not be described as a universal GitHub importer.

### Unverified / remaining 25 points
- AC-04 **14**: actual AI/LLM-based React code generation through end-to-end real TS build/typecheck/render of 12 briefs.
- AC-09 **6**: axe+human keyboard and accessibility acceptance.
- AC-11 **3**: paid/remote AI budgets, failure injection, explicit external consent and secret masking in real provider integration.
- AC-12 **2**: clean install, entire D1–D5 demos, CI and release documentation.
- Previously accepted P50 browser QA is **limited to Chromium set_content**; Windows native/real URL/Production still unknown.
- Approval still required for paid model API, outside-code transmission, real private repo connection, customer source, branch merges, permissions or deployments.

**Outcome:** P75 technical milestone reached on a separate FFAX branch, with safety/quality limitations clearly segregated. **RELEASE HOLD.**
