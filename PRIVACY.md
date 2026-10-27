# Privacy Policy — Argus Lens

_Last updated: October 27, 2026_

Argus Lens is a Chrome extension by Karmendra Pandey, the browser companion to the open-source Argus project (https://github.com/karmendra8386/argus).

## What the extension does

Argus Lens scans text you type into AI chat websites (chatgpt.com, chat.openai.com, claude.ai, gemini.google.com, aistudio.google.com) **locally in your browser** for patterns such as API keys, email addresses, and prompt-injection phrases, and warns you before the text is sent.

## Data collection: none

- **No data is collected, transmitted, sold, or shared.** The extension has no server, no analytics, and makes no network requests of its own.
- Scanning happens entirely on your device with built-in pattern matching.
- Your policy profile, custom blocklist, and settings are stored only in your browser's local extension storage (`chrome.storage.local`).
- The audit log is stored only in your browser's local extension storage, stores **redacted** matches only (for example `AKIA••••`), and can be cleared at any time from the popup (**Clear audit**). It never leaves your device.

## Permissions and why

- `storage` — to save your settings and the local, redacted audit log described above.
- `activeTab` — to interact with the chat tab you are using when you open the popup.
- Host access to the five AI chat sites listed above — so the scanner can read the prompt box on those pages. The extension does not run on any other website.

## Limited use disclosure

Argus Lens does not use or transfer user data for any purpose unrelated to its single purpose (prompt scanning). It does not use or transfer data to determine creditworthiness or for lending purposes.

## Changes

Any change to this policy will be published in this document in the extension's public repository, with an updated date.

## Contact

Karmendra Pandey — via the GitHub repository: https://github.com/karmendra8386/argus-lens/issues
