// Argus Lens content script
// Watches the prompt box on ChatGPT / Claude / Gemini, scans on input,
// shows a banner, and intercepts Enter / Send when policy says BLOCK.

(function () {
  'use strict';
  const { scan, decide, redactText, redactMatch } = window.ArgusDetectors;
  let settings = { profile: 'standard', blocklist: [], enabled: true };
  let lastScan = null;
  let allowNextSend = false;

  chrome.storage.local.get(['argusSettings'], (res) => {
    if (res.argusSettings) settings = { ...settings, ...res.argusSettings };
  });
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.argusSettings) settings = { ...settings, ...changes.argusSettings.newValue };
  });

  function findPromptBox() {
    const selectors = [
      '#prompt-textarea', // ChatGPT (contenteditable in newer UI, textarea in older)
      'textarea[data-testid="chat-input"]',
      'div[contenteditable="true"][data-placeholder]',
      'textarea',
      'div.ProseMirror[contenteditable="true"]', // Claude
      'rich-textarea div[contenteditable="true"]', // Gemini
      'div[contenteditable="true"]'
    ];
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el && el.offsetParent !== null) return el;
    }
    return null;
  }

  function getText(el) {
    if (!el) return '';
    return (el.value !== undefined && el.tagName === 'TEXTAREA') ? el.value : (el.innerText || el.textContent || '');
  }

  function setText(el, text) {
    if (!el) return;
    if (el.tagName === 'TEXTAREA') {
      el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      el.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, text);
    }
  }

  function ensureBanner() {
    let b = document.getElementById('argus-lens-banner');
    if (b) return b;
    b = document.createElement('div');
    b.id = 'argus-lens-banner';
    b.innerHTML = `
      <div class="argus-head"><span class="argus-logo">◉ Argus Lens</span><button class="argus-close" aria-label="Dismiss">×</button></div>
      <div class="argus-body"></div>
      <div class="argus-actions">
        <button data-act="redact">Redact & keep editing</button>
        <button data-act="send">Send anyway</button>
        <button data-act="dismiss">Dismiss</button>
      </div>`;
    document.body.appendChild(b);
    b.querySelector('.argus-close').addEventListener('click', () => b.classList.remove('show'));
    b.querySelector('[data-act="dismiss"]').addEventListener('click', () => b.classList.remove('show'));
    b.querySelector('[data-act="send"]').addEventListener('click', () => {
      allowNextSend = true;
      b.classList.remove('show');
      const box = findPromptBox();
      if (box) box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
    });
    b.querySelector('[data-act="redact"]').addEventListener('click', () => {
      const box = findPromptBox();
      if (box && lastScan) {
        const redactable = lastScan.all.filter(f => f.detector === 'pii' || f.detector === 'secrets');
        setText(box, redactText(getText(box), redactable));
      }
      b.classList.remove('show');
    });
    return b;
  }

  function logAudit(scanResult, decision) {
    chrome.storage.local.get(['argusAudit'], (res) => {
      const audit = res.argusAudit || [];
      audit.unshift({
        ts: Date.now(),
        host: location.hostname,
        profile: decision.profile,
        action: decision.action,
        findings: scanResult.all.map(f => ({ detector: f.detector, category: f.category, severity: f.severity, match: redactMatch(f.match) }))
      });
      chrome.storage.local.set({ argusAudit: audit.slice(0, 200), argusLastScan: { ts: Date.now(), count: scanResult.count, action: decision.action, host: location.hostname } });
    });
  }

  function check() {
    if (!settings.enabled) return;
    const box = findPromptBox();
    const text = getText(box);
    if (!text || text.trim().length < 3) { document.getElementById('argus-lens-banner')?.classList.remove('show'); return; }
    const result = scan(text, settings.blocklist);
    lastScan = result;
    if (result.count === 0) { document.getElementById('argus-lens-banner')?.classList.remove('show'); return; }
    const decision = decide(result, settings.profile);
    const banner = ensureBanner();
    banner.dataset.level = decision.action;
    banner.querySelector('.argus-body').innerHTML =
      `<strong>${decision.action.toUpperCase()}</strong> — ${result.count} finding${result.count > 1 ? 's' : ''}: ` +
      result.all.slice(0, 6).map(f => `${f.category} (${redactMatch(f.match)})`).join(', ') +
      (result.count > 6 ? ` +${result.count - 6} more` : '') +
      `<br><span class="argus-sub">Profile: ${decision.profile} · Secrets, SSNs and card numbers always block. Other personal data ${decision.profile === 'strict' ? 'blocks in Strict' : 'can be redacted in one click'}. Nothing leaves your browser.</span>`;
    banner.classList.add('show');
    banner.querySelector('[data-act="redact"]').style.display = decision.action === 'block' ? 'none' : '';
    banner.querySelector('[data-act="send"]').style.display = decision.action === 'flag' || decision.action === 'redact' ? '' : 'none';
    if (decision.action !== 'flag') logAudit(result, decision);
  }

  // Debounced scan on any input in the page
  let t;
  document.addEventListener('input', () => { clearTimeout(t); t = setTimeout(check, 350); }, true);

  // Intercept Enter (without Shift) when policy is BLOCK
  document.addEventListener('keydown', (e) => {
    if (allowNextSend) { allowNextSend = false; return; }
    if (e.key !== 'Enter' || e.shiftKey) return;
    const box = findPromptBox();
    if (!box || !settings.enabled) return;
    const text = getText(box);
    const result = scan(text, settings.blocklist);
    const decision = decide(result, settings.profile);
    lastScan = result;
    if (decision.action === 'block' && result.count > 0) {
      e.preventDefault(); e.stopPropagation();
      logAudit(result, decision);
      ensureBanner().classList.add('show');
      check();
    }
  }, true);
})();
