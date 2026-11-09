# Argus Lens — AI Prompt Guard (Chrome Extension)

Browser companion to [Argus](https://github.com/karmendra8386/argus), the security layer for AI models by Karmendra Pandey.

Scans your prompt **locally, before you send it** on ChatGPT, Claude, Gemini, and AI Studio for:

- **Secrets** — AWS keys, GitHub/OpenAI/Anthropic keys, private keys, Slack tokens, JWTs, `password=`/`api_key=` patterns → **BLOCK**
- **PII** — email, phone, SSN, credit card, IP → **REDACT** (one-click)
- **Prompt injection** — instruction override, role override, system-prompt probing, jailbreak terms → **FLAG** (BLOCK in Strict)
- **Your blocklist** — custom regex in Options → **BLOCK**

Policy profiles are ported 1:1 from Argus `policy.yaml`: `strict` / `standard` (default) / `permissive`. Detectors are ported 1:1 from `gateway/security/detectors.py`. Nothing leaves your browser; the audit log stores redacted matches only.

## Demo

![Argus Lens demo](demo/demo.gif)

*Live capture (Nov 9, 2026) of the unmodified extension in Chromium: an AWS-style key in the prompt → **BLOCK**; an email → **REDACT**, and one click rewrites the prompt to `[REDACTED:EMAIL]`; a prompt-injection string → **FLAG**; a clean prompt → no banner. The chat page is a local stand-in (this environment has no logged-in chat session) — what is real, what is a stand-in, and the machine-checked banner record are documented in [`demo/`](demo/).*

## Works with

- **[Argus](https://github.com/karmendra8386/argus)** — the parent project: Lens's detectors and policy profiles are ported 1:1 from Argus's gateway (`policy.yaml`, `detectors.py`). Argus screens at the gateway; Lens screens in the browser, before the prompt is ever sent.
- **[Argus-Bench](https://doi.org/10.5281/zenodo.23877366)** — where the gateway detector's limits were measured: the same detector lineage scored 15/204 on the frozen corpus, which is exactly why defence in depth — browser *and* gateway — matters.
- **[mcplens](https://github.com/karmendra8386/mcplens)** — the third surface of the same stance: Lens guards prompts, Argus guards the gateway, mcplens vets the MCP servers that tools connect through.
- **[Cost Per Prompt](https://github.com/karmendra8386/cost-per-prompt)** — the sibling extension, cost side: live token and cost estimates inside the same chat sites, powered by [tokenecon](https://github.com/karmendra8386/agentic-ai-token-economics).

**The connected set** — one thread through all of it: what an agent did, what it cost, and whether it should have been allowed. [Argus](https://github.com/karmendra8386/argus) · [tokenecon](https://github.com/karmendra8386/agentic-ai-token-economics) · [mcplens](https://github.com/karmendra8386/mcplens) · [agent-cost-mcp-server](https://github.com/karmendra8386/agent-cost-mcp-server) · [Argus Lens](https://github.com/karmendra8386/argus-lens) · [PersistAIBench](https://github.com/karmendra8386/persistbench-bench) · [Argus-Bench](https://doi.org/10.5281/zenodo.23877366)

## How to use

**On a chat site (ChatGPT, Claude, Gemini, AI Studio):**
1. Open a chat and type or paste your prompt as usual — Argus Lens checks it **locally, before anything is sent**. Nothing to click when all is well.
2. If something is found, a banner appears above the prompt box:
   - **Secret detected** (API keys, tokens, passwords) — the prompt is **blocked**: Enter and the Send button won't submit it. Remove the secret, or move it somewhere safe, and the banner clears.
   - **Personal data** — **SSNs and credit card numbers are blocked outright**, like secrets, in every profile. Emails, phone numbers and IPs get **Redact** (replace each item with a placeholder in one click) — and in the **Strict** profile, all personal data is blocked outright.
   - **Prompt injection** (instructions trying to hijack the model) — a **warning flag**; in the **Strict** profile this also blocks sending.
3. The toolbar icon's **badge count** shows how many findings the current page produced.
4. Click the icon to see the **audit log**: what was flagged, where and when. Entries are stored **redacted only** — the raw secret or personal data is never written to the log — and stay in your browser.

**Options:** right-click the icon → **Options** to choose a protection profile — **Strict** (blocks injections too), **Standard** (default), or **Permissive** — and to add your own **custom blocklist rules** (regular expressions) for terms that must never leave your browser.

**Good to know:** 100% local — no account, no network calls, your prompts never leave your device.

## Install (developer mode, 1 minute)

1. Unzip `argus-lens.zip` (or use this folder)
2. Chrome → `chrome://extensions` → turn on **Developer mode**
3. **Load unpacked** → select the `argus-lens` folder
4. Open chatgpt.com / claude.ai / gemini.google.com, type a test prompt:
   `My AWS key is AKIAIOSFODNN7EXAMPLE and my email is test@example.com`
   → banner appears, Enter is blocked, email can be redacted in one click.

## Test it

Test strings are in the popup hint. Verified in Node against the ported detectors:
AWS key → block, instruction override → flag, SSN + card → block.

## Chrome Web Store (next step, needs you)

- Create a developer account ($5 one-time), upload `argus-lens.zip`
- Listing copy is in `manifest.json` description; screenshots: take the banner on ChatGPT + the popup
- Privacy disclosure: "No user data is collected or transmitted. All scanning is local."

## Files

`detectors.js` (ported detectors + policy) · `content.js` (banner + Enter interception) · `popup/` · `options/` (profile + blocklist) · `background.js` (badge)
Version 0.1.0 — MIT, same license as Argus.
