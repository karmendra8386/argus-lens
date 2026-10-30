# Testing

## What was tested (Oct 27, 2026, before first publish)

1. **Manifest** — valid JSON, Manifest V3, all referenced files present.
2. **JS syntax** — `node --check` passes on every script.
3. **Detector logic (Node)** — AWS key → block; instruction-override → flag (standard) / block (strict); redaction replaces matches with `[REDACTED:TYPE]`. NOTE (corrected Oct 29, 2026): in v0.1.0–0.1.1, SSN + credit card were in the PII group and got REDACT, not block — this line was wrong for those versions; the owner caught it in hands-on testing.
4. **DOM integration (jsdom, `tests/dom-test.js`)** — simulated chat page with a `#prompt-textarea`:
   - Banner is created, shows for a secret/PII prompt, names the categories, and sets `level=block`
   - **Enter is intercepted** (`defaultPrevented`) while a secret is present, and allowed for a clean prompt
   - Banner hides for a clean prompt
   - Audit entry is written and **does not contain the raw secret**
   - CostPerPrompt: badge renders, live prompt cost updates (32 tok → ~$0.0007 on the sample), cheapest-vs-selected spread shows (25.0×), conversation tokens counted
   - Result: **14/14 passed**. The run caught one real bug — conversation counting relied only on `innerText`; fixed to fall back to `textContent`.

## What was NOT tested here

- Loading unpacked in a signed-in Chrome profile on the live chatgpt.com / claude.ai / gemini.google.com DOMs (this sandbox's headless Chromium cannot surface `chrome://extensions` or the live sites' signed-in DOM). Site UIs change often — the prompt-box selectors in `content.js` are the part most likely to need a tweak after a site redesign.
- Chrome Web Store review.

Run the DOM test: `npm i jsdom` then `node tests/dom-test.js` (paths in the file point at the sibling extension too — it tests both).

## Live install test (Oct 28, 2026, v0.1.1) — PASSED

Real-browser verification in Chromium 152 (headless, --load-extension, puppeteer-core,
ChatGPT-shaped page served for the chatgpt.com origin): service worker registered,
zero console/page errors. Typing the canonical example AWS key produced the BLOCK
banner ("BLOCK — 1 finding: AWS_KEY (AKIA••••)", profile standard); an email address
produced the REDACT state with the one-click Redact action offered, values masked in
the banner. Screenshot: ../store-assets/argus-live-install-test.png (real capture).
Still untested: the live sites' own logged-in DOMs.

## v0.1.2 policy change (Oct 29, 2026) — owner-directed

Owner found in hands-on testing that PII was only highlighted (redact offered, send
never blocked). New policy, implemented in detectors.js decide():
- SSN + credit card BLOCK in every profile (high-sensitivity PII, treated like secrets).
- ALL PII blocks in Strict; Standard keeps one-click redact for email/phone/IP;
  Permissive flags them. Secrets still block everywhere; injection blocks in Strict.
- Banner sub-line updated to state the policy accurately.
Tests: tests/logic-test.js — 24/24 policy-matrix assertions PASSED (per profile x
AWS key / SSN / card / email / phone / injection / blocklist / clean / mixed).
DOM suite re-run after the change: 14/14 PASSED (Enter intercept now also engages
for SSN/card prompts via the block path).
