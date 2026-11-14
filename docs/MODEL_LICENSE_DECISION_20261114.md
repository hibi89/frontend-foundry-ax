# FFAX local model license decision — 2026-11-14 KST

**Decision:** `qwen3:4b-instruct` is the only zero-cash Ollama model tag allowed in the commercial-product FFAX preview until additional licences are individually reviewed. The model is **not** stored in GitHub or redistributed.

## Options assessed
| Model | Licence evidence | Size | Decision |
|---|---|---|---|
| `qwen2.5-coder:3b` | Qwen Research Licence; 3B commercial use not cleared | ~1.9GB | **BLOCK**, previous setup advice superseded |
| `qwen2.5-coder:1.5b` | Apache-2.0 instruct variant | ~986MB | Alternative if 4B exceeds local resources; not enabled before 12-brief quality benchmark |
| `qwen3:4b-instruct` | Qwen3-4B-Instruct-2507 Apache-2.0 | ~2.5GB | **SELECT** for future real-model QA |

Sources: https://ollama.com/library/qwen2.5-coder%3A3b-base ; https://ollama.com/library/qwen2.5-coder%3A1.5b-instruct ; https://ollama.com/library/qwen3%3A4b-instruct ; https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507/blob/main/LICENSE .

## Cost, security and completion
- No API fee or model-weight distribution. Owner installs/downloads Ollama and model onto their PC or other approved localhost machine.
- Model-tag allowlist and `/api/tags` installed-weight size check run before each prompt; localhost only; cloud tags refused; consent and secret masking fail closed; preview not auto-applied.
- **Commercial sale/redistribution/actual customer-data rights remain unapproved; licence check is one prerequisite only**. Real local 12-brief AI generation, strict TSX React build, Windows owner UX, CI, complete QA and marketing claims require separate evidence. Official full-blueprint completion remains **UNASSESSED**, not 100%.
- Previous `qwen2.5-coder:3b` setup instructions must not be repeated in 1PM owner checklist or client-facing documentation.
