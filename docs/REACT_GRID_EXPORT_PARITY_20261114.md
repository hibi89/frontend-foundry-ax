# FFAX React TSX preview/export grid layout parity — 2026-11-14 KST

## Verified bug and correction
- Repository: private `hibi89/frontend-foundry-ax`, branch `feature/ffax-workbench-p85-20261112`, exact functional source SHA `0acf96c95d133c02f3666238fd638a4f3468f854`.
- Before: `renderMarkup(doc)` selected `layout-stack` for A or `layout-grid` for B, while `exportReact(doc)` unconditionally returned `display:'flex',flexDirection:'column'` for **both**. A client choosing dashboard B would get stacked source.
- After: `src/core.mjs` TSX exporter renders A as vertical flex and B as responsive CSS grid using `repeat(auto-fit,minmax(min(100%,300px),1fr))`. `Navbar`, `Hero`, `Table` and `Tabs` grid items span all columns, and exported `main` includes `data-layout`. Text, color, spacing, alignment, 3 themes, strict parser and security boundary remain; no customer-original modification.
- Choice A = assume customer imports FFAX preview CSS (smallest generated source but undisclosed dependency); Choice B = self-contained inline responsive grid (minor TSX size cost, no customer CSS/third-party dependency). **Implemented B**, lower customer setup cost/fragility and safer maintenance.

## Test evidence
- `tests/react-export-layout.test.mjs` **3/3 PASS** in local Node and GitHub Linux/Windows CI:
  1. A preview/export stack, B preview/export grid, grid full-width primary sections, correct responsive grid declaration
  2. Component text and theme changes persist in TSX export
  3. A strictly parsed, explicitly approved mock model-shaped JSON grid produces grid TSX without real model calls
- [GitHub Actions run 43548778693](https://github.com/hibi89/frontend-foundry-ax/actions/runs/43548778693): **4/4 SUCCESS**, Node22 Linux **118 PASS /0 FAIL**, Windows **118 PASS /0 FAIL**; React19 strict typecheck/SSR 12/12 **synthetic only**, real localhost Chromium 3 widths, axe, contrast, cleanroom; Windows owner ZIP generated after all three functional jobs passed.
- ZIP evidence: `ffax-owner-review-unreleased` ID `14095432154` in run 43548778693 (7-day retention); downloaded and unzipped nested `FFAX-OWNER-REVIEW.zip`, **22 members**, `SOURCE_SHA.txt=0acf96c95d133c02f3666238fd638a4f3468f854`, inner ZIP SHA256 `0305998d4b373bb46a8c239aed9d4bf7abb520c27d90a6d38deb497b0d892b8f`. Verified exact updated exported layout code present and Node/start/model-check scripts packaged.
- Limits: CI does not run an actual Qwen3 4B inference, does not accept any user's final visual design, does not prove customer project merge or public production. No paid API or redistributed model.

## Correct scoring / next
- Fixed existing engineering rubric **80/100 provisional**, not 83/100: this fixes a defect in previously credited AC03/06 and exported output, with no new accepted criteria added.
- **AC04 0/14** actual 12 frozen prompts with ≥10 real React19 strict type/render successes; **AC09 0/6** explicit user Windows visuals/keyboard signoff; **RG06 pending**. Central official whole-final-blueprint rate **UNASSESSED** pending approved weights/independent acceptance, including other P0 limitations already listed in `FINAL_BLUEPRINT_TRACE_20261114.md`. `[작업중]` and RELEASE HOLD.
- Owner-only actions remain consolidated in existing 2026-11-14 13:00 Asia/Seoul automation. No customer secrets uploaded, no main/Production edits, ordinary Git revert supported.
