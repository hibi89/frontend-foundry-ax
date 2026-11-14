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
