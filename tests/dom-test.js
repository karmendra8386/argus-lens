// DOM test for Argus Lens + CostPerPrompt content scripts using jsdom
const fs = require('fs');
const { JSDOM } = require('/tmp/domtest/node_modules/jsdom');

function makeEnv(html, url) {
  const dom = new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true });
  const store = {};
  dom.window.chrome = {
    storage: {
      local: {
        get: (keys, cb) => { const out = {}; (Array.isArray(keys)?keys:[keys]).forEach(k=>{ if(store[k]!==undefined) out[k]=store[k]; }); setTimeout(()=>cb(out),0); },
        set: (obj, cb) => { Object.assign(store, obj); if(cb) setTimeout(cb,0); }
      },
      onChanged: { addListener: () => {} }
    },
    runtime: {}
  };
  dom.window._store = store;
  // offsetParent is null in jsdom by default; our findPromptBox checks it.
  Object.defineProperty(dom.window.HTMLElement.prototype, 'offsetParent', { get() { return this.parentElement; } });
  return dom;
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  let failures = 0;
  const assert = (cond, msg) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + msg); if (!cond) failures++; };

  // ---- Argus Lens ----
  {
    const dom = makeEnv(`<!doctype html><body><textarea id="prompt-textarea"></textarea></body>`, 'https://chatgpt.com/');
    const w = dom.window;
    w.eval(fs.readFileSync('/home/hatch/workspace/chrome-extensions/argus-lens/detectors.js', 'utf8'));
    w.eval(fs.readFileSync('/home/hatch/workspace/chrome-extensions/argus-lens/content.js', 'utf8'));
    await sleep(50);
    const box = w.document.querySelector('#prompt-textarea');
    box.value = 'My AWS key is AKIAIOSFODNN7EXAMPLE and email test@example.com';
    box.dispatchEvent(new w.Event('input', { bubbles: true }));
    await sleep(500);
    const banner = w.document.querySelector('#argus-lens-banner');
    assert(!!banner, 'Argus: banner element created');
    assert(banner && banner.classList.contains('show'), 'Argus: banner shown for AWS key + email');
    assert(banner && /AWS_KEY/.test(banner.textContent), 'Argus: banner names AWS_KEY');
    assert(banner && banner.dataset.level === 'block', 'Argus: level=block for secrets (standard profile)');
    // Enter interception
    const ev = new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    box.dispatchEvent(ev);
    assert(ev.defaultPrevented, 'Argus: Enter is blocked when secrets present');
    // Clean prompt: no banner, Enter allowed
    box.value = 'Write a haiku about autumn leaves';
    box.dispatchEvent(new w.Event('input', { bubbles: true }));
    await sleep(500);
    assert(!banner.classList.contains('show'), 'Argus: banner hides for clean prompt');
    const ev2 = new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    box.dispatchEvent(ev2);
    assert(!ev2.defaultPrevented, 'Argus: Enter allowed for clean prompt');
    // Audit was written, redacted
    const audit = w._store.argusAudit || [];
    assert(audit.length > 0, 'Argus: audit entry written');
    assert(audit.length === 0 || !JSON.stringify(audit).includes('AKIAIOSFODNN7EXAMPLE'), 'Argus: audit does NOT contain raw secret');
  }

  // ---- CostPerPrompt ----
  {
    const dom = makeEnv(`<!doctype html><body><div data-message-author-role="user"><p>Compare Kubernetes and ECS for our batch workload and recommend one, with trade-offs.</p></div><textarea id="prompt-textarea"></textarea></body>`, 'https://chatgpt.com/');
    const w = dom.window;
    w.eval(fs.readFileSync('/home/hatch/workspace/chrome-extensions/cost-per-prompt/pricing.js', 'utf8'));
    w.eval(fs.readFileSync('/home/hatch/workspace/chrome-extensions/cost-per-prompt/tokenizer.js', 'utf8'));
    w.eval(fs.readFileSync('/home/hatch/workspace/chrome-extensions/cost-per-prompt/content.js', 'utf8'));
    await sleep(1600);
    const badge = w.document.querySelector('#cpp-badge');
    assert(!!badge, 'CPP: badge element created');
    assert(badge && /CostPerPrompt/.test(badge.textContent), 'CPP: badge renders title');
    const box = w.document.querySelector('#prompt-textarea');
    box.value = 'Design a fault-tolerant agent orchestration layer. Prove it handles partial tool failures. Show your reasoning step by step.';
    box.dispatchEvent(new w.Event('input', { bubbles: true }));
    await sleep(500);
    const promptLine = w.document.querySelector('#cpp-prompt').textContent;
    assert(/tok in/.test(promptLine) && !/0 tok/.test(promptLine), 'CPP: live prompt cost updates (' + promptLine + ')');
    const spread = w.document.querySelector('#cpp-spread').textContent;
    assert(/×/.test(spread), 'CPP: cheapest-vs-selected spread shown (' + spread + ')');
    const conv = w.document.querySelector('#cpp-conv').textContent;
    assert(!/^0 tok/.test(conv), 'CPP: conversation tokens counted (' + conv + ')');
  }

  console.log(failures === 0 ? 'ALL DOM TESTS PASSED' : failures + ' FAILURES');
  process.exit(failures ? 1 : 0);
})();
