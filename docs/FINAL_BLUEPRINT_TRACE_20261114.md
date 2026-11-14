# FFAX v1.0 — Full blueprint requirement-to-evidence trace (2026-11-14 KST)

**Purpose:** Do not confuse a limited 12-AC engineering rubric (80/100 provisional) with the user's **entire final product blueprint 100%**. Sources are `REQUIREMENTS.md`, `docs/PRODUCT_SPEC_V1.md`, `docs/ACCEPTANCE_MATRIX.md`, and central `OWNER-FINAL-BLUEPRINT-100`. This is a **coverage audit without new weights**, not a user-approved rescore.

- Exact functional code SHA: `e5982bf53ea9e65625051d2f3937abfc2ce979ba` on private `feature/ffax-workbench-p85-20261112`.
- [Hosted CI run 43547649624](https://github.com/hibi89/frontend-foundry-ax/actions/runs/43547649624): 4/4 SUCCESS; Linux and Windows 115/115 each; React 19 strict SSR/typecheck 12/12 **synthetic**, localhost HTTP static/Host security, Chromium 3 widths and axe, cleanroom. **No actual local Qwen inference or owner device/UX acceptance.**
- Private customer data, real customer repositories, tokens, real hosted Production, and real commercial sales have not been tested. Production/Vercel is N/A because this is a localhost product, not because it passed live deployment.

## P0 requirement trace (no numerical scoring from this table)

| Final REQ | Existing implementation/evidence | Still missing or limited |
|---|---|---|
| REQ-01 project lifecycle | `src/core.mjs` JSON project import/export/Undo, `src/workspace.mjs` isolated React fixtures; `tests/project-transfer.test.mjs`, `tests/workspace.test.mjs` | Actual customer's own existing React GitHub repo connectivity, long-lived user state/customer preservation unverified |
| REQ-02 natural language brief | `buildBrief` structured Korean/English phrase rules + 2 selectable directions in `src/core.mjs`; synthetic fixed briefs | General ambiguous natural-language interpretation and real Qwen quality unverified |
| REQ-03 design system | Three documented themes, responsive CSS, 13 registry component types, three widths; contrast probe | Full reusable typography/radius token coverage and real client brand acceptance not proven |
| REQ-04 AI UI code | `src/local-ollama.mjs` opt-in Qwen adapter; strict `parseModelDesign` and TSX generator; `scripts/react_real_probe.mjs` | **Blocking:** run 12 fixed prompts against actual license-cleared installed Qwen, get ≥10 real typecheck/SSR renders; synthetic 12/12 cannot substitute |
| REQ-05 visual editor | Registered component property editing/move/remove, `DocumentHistory` Undo/Redo and TSX export, Chromium interaction tests | Only safe registered component tree; arbitrary customer JSX visual editing outside P0 promise unless separately approved |
| REQ-06 reference images | Rights checkbox, local color extraction and two candidate style directions, explicit approval | Real user-authorized image rights and final accepted similarity/usable style not proven on owner device |
| REQ-07 component library | 13 named registry components in `src/core.mjs` with preview renderer; 3 theme tests | Full real chart/sidebar/advanced form integrations not independently demonstrated; do not advertise fully working charts |
| REQ-08 existing apps | `src/workspace.mjs` original digest protection, sample React route/API-diff/rollback, test fixtures | Real WORKNOVA/KUODRA/DBVORA customer app integration and exact app API contract preservation **unverified** |
| REQ-09 browser QA | Real served localhost Chromium widths 375/768/1440, console/network/overflow, formal axe and 900 contrast checks in 2026-11-14 CI | Actual physical owner Windows UI/keyboard acceptance and representative client environments missing |
| REQ-10 version/approval/recovery | GitHub Draft PR #1, safe synthetic patch approval, undo, isolated rollback tests and hashes | Customer GitHub repo write path/real owned branch integration not approved or executed |
| REQ-11 cost/security/recovery | Fail-closed opt-in localhost Qwen, no external paid keys; Host allowlist and protected JSON receipts; Node security tests | Owner's actual model/resource usage, customer PII/legal handling and extended recovery not verified |
| REQ-12 operational readiness | GitHub hosted Windows/Linux 115/115, Chromium/axe, new owner unsigned ZIP with guide and SHA, CI release artifacts | User's own Windows clean install/npm availability, live Qwen and final UX acceptance; commercial support and buyer delivery policy pending |

## Required user flows (WF-01..WF-07)

- WF-01 project creation/readonly import → REQ-01/08, currently local fixtures; actual client GitHub read-only import pending.
- WF-02 requirements → REQ-02, rule-based structure proven; general model semantics pending.
- WF-03 2 designs + explicit approve → REQ-02/03, local design directions proven.
- WF-04 generation → REQ-04/07, synthetic TSX tested; actual local model generation pending.
- WF-05 visual editing → REQ-05, limited to supported registry, browser proven.
- WF-06 QA → REQ-09, hosted Chromium/axe proven; owner user acceptance pending.
- WF-07 safe diff/PR → REQ-08/10, sample GitHub Draft PR and fixture rollback; real buyer target integration pending.

## Acceptance and release boundary

- **Fixed internal AC01/02/03/05/06/07/08/10/11/12** total = **80/100 provisional** from restricted tests. **AC04 0/14** real installed model; **AC09 0/6** human UX approval. No partial award under fixed all-or-nothing rules.
- **Official central entire-final-blueprint percentage = UNASSESSED**, because current whole-requirement correspondence and user-approved weights have not been fully audited; the above mapping deliberately does **not** invent weights, quietly re-scope P0 or convert CI success into official completion.
- Release gates RG01/02/03/05 have bounded synthetic/hosted proof; **RG04 N/A** localhost-only product; **RG06 FAIL/PENDING** until explicit owner signoff. Real clients, software rights/buyer delivery/ongoing maintenance terms, and Kmong listing approval remain separate commercial gates.
- **Owner-only tasks consolidated for 2026-11-14 13:00 Asia/Seoul**: actual Windows Ollama `qwen3:4b-instruct` install/12-brief live benchmark with `RUN-LIVE-MODEL-CHECK.cmd`, upload only non-sensitive `FFAX-LIVE-MODEL-RESULT.json` + `SOURCE_SHA.txt`; 7 UI/keyboard/visual checks and approval. Do not ask for them before the unified 13:00 message.
- No paid API, domain/Vercel deployment, permissions change, original source modification, customer data GitHub upload, or claim of 100%; **RELEASE HOLD** and central `[작업중]` continue.

## Reproduction / rollback

- `npm install --ignore-scripts --no-audit --no-fund`, `npm test` on Linux and Windows Node22, `npm run test:react-real` for **synthetic only**. Browser/accessibility/cleanroom steps are listed in `.github/workflows/ffax-manual-ci.yml`.
- The reviewed GitHub artifact `ffax-owner-review-unreleased` ID `14094548197` (7 days) embeds source SHA `e5982bf53ea9e65625051d2f3937abfc2ce979ba` and ships no model/developer keys. ZIP SHA256 `6dbb1f2ffa5198b50b37e9b2e213f53bd16240a6a1cea8d83dfef534f190d087`.
- `main` and customer originals untouched; use normal `git revert` after examining changes, never force push. Update `STATUS.md`, `HANDOFF.md` and hub Kmong ledger when evidence materially changes.
