# Argus Lens — AI Prompt Guard (Chrome Extension)

Browser companion to [Argus](https://github.com/karmendra8386/argus), the security layer for AI models by Karmendra Pandey.

Scans your prompt **locally, before you send it** on ChatGPT, Claude, Gemini, and AI Studio for:

- **Secrets** — AWS keys, GitHub/OpenAI/Anthropic keys, private keys, Slack tokens, JWTs, `password=`/`api_key=` patterns → **BLOCK**
- **PII** — email, phone, SSN, credit card, IP → **REDACT** (one-click)
- **Prompt injection** — instruction override, role override, system-prompt probing, jailbreak terms → **FLAG** (BLOCK in Strict)
- **Your blocklist** — custom regex in Options → **BLOCK**

Policy profiles are ported 1:1 from Argus `policy.yaml`: `strict` / `standard` (default) / `permissive`. Detectors are ported 1:1 from `gateway/security/detectors.py`. Nothing leaves your browser; the audit log stores redacted matches only.

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
