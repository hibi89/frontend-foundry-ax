# FFAX third-party notices (v1.0 engineering verification)

- React and React DOM v19.2.7 — MIT license; https://github.com/facebook/react
- TypeScript v5.8.3 — Apache-2.0 license; https://github.com/microsoft/TypeScript
- @types/react v19.2.14 and @types/react-dom v19.2.3 — MIT; https://github.com/DefinitelyTyped/DefinitelyTyped
- axe-core v4.14.0 — MPL-2.0 license; https://github.com/dequelabs/axe-core
- Ollama (optional, installed separately by the owner) — see https://ollama.com/; model-specific licenses must be checked before commercial redistribution.

No third-party binary or model weights are committed to this repository. This file does not grant sublicenses or certify customer-data usage rights.

## Verified local model default (2026-11-14)

- **Allowed for FFAX commercial-prep default:** `qwen3:4b-instruct` (Ollama model, approx. 2.5 GB), sourced from Qwen3-4B-Instruct-2507, **Apache License 2.0**. Source model card/licence: https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507 and https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507/blob/main/LICENSE ; Ollama tag: https://ollama.com/library/qwen3%3A4b-instruct . Not bundled or redistributed.
- **Rejected:** `qwen2.5-coder:3b` (and 3B base variants): **Qwen Research License**, commercial use requires separate permission. Provenance: https://ollama.com/library/qwen2.5-coder%3A3b-base and https://apache.googlesource.com/www-site/+/main/content/legal/generative-tooling-terms-reviewed.md . No commercial authorization has been supplied.
- Other model tags are fail-closed until license review and explicit addition to the allowlist. Actual local inference quality/owner acceptance not yet verified.

## V2.1 Reference Fidelity / Design Forge source attribution (2026-11-18)

- **UI UX Pro Max Skill** — `nextlevelbuilder/ui-ux-pro-max-skill`; MIT, Copyright (c) 2024 Next Level Builder. Pinned source snapshot `7436a6e0b6dc3add7c12d5b6ef1ccd3d410dd7fd`, taxonomy blob `7ed18d6ef06557b9a6f2285b87b458fd71e4722f`. FFAX's `src/design-forge.mjs` implements independently authored style adaptations, with provenance IDs for the source taxonomy; upstream CSV/font files and installed CLI binaries have **not** been copied or redistributed. Review original `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/LICENSE` before incorporating additional files.
- **one-shot-ui** — `TN0123/one-shot-ui`, MIT, Copyright (c) 2026 Tanay Naik. 별도 설치하는 선택형 CLI, 정확한 npm `0.12.0`/MIT 메타데이터 및 FFAX synthetic PNG에서 실 `compare`, `suggest-fixes`, `extract`, PNG heatmap 호출을 [Actions #44327619821](https://github.com/hibi89/frontend-foundry-ax/actions/runs/44327619821) Windows·Ubuntu **2/2 PASS**로 검증. **제품 내 engine vendoring/필수 런타임 추가 없음.** 전체 전이 의존성 라이선스·공급망 전수 감사 및 실제 외부 고객 이미지 권리/시각 수락은 **NOT_RUN**; 이 검증으로 대체 불가. Source: `https://github.com/TN0123/one-shot-ui`.
- **Image-to-code** — `lenixeduardo/Image-to-code`, MIT; design layer/spec workflow reference only. No upstream source installed or executed by FFAX. Source: `https://github.com/lenixeduardo/Image-to-code`.
- **OpenUI** and **OpenStitch** — open-source design-flow research references only; no copied code or runtime dependency. Verify individual file licenses before future adoption.

No external fonts or illustrations are redistributed. A repository's MIT license does not grant rights to third-party screenshots, brand assets, generated content or commercial font binaries. `P1_SOURCE_ONLY` does not certify end-user licensing or visual acceptance.
