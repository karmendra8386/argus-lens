// Argus Lens detectors — ported 1:1 from Argus gateway/security/detectors.py
// Detectors never decide what happens — the policy engine does.
// Exposed as window.ArgusDetectors for the content script.

(function () {
  'use strict';

  function scanWith(text, patterns) {
    const findings = [];
    for (const [category, source, flags, severity] of patterns) {
      const re = new RegExp(source, flags);
      let m;
      while ((m = re.exec(text)) !== null) {
        findings.push({ category, severity, match: m[0], index: m.index });
        if (m[0].length === 0) re.lastIndex++;
      }
    }
    return findings;
  }

  const PII_PATTERNS = [
    ['EMAIL', '[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+', 'g', 'medium'],
    ['PHONE', '(?:\\+?1[-.\\s]?)?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}', 'g', 'medium'],
    ['SSN', '\\b\\d{3}-\\d{2}-\\d{4}\\b', 'g', 'high'],
    ['CREDIT_CARD', '\\b(?:\\d[ -]?){13,16}\\b', 'g', 'high'],
    ['IP_ADDRESS', '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b', 'g', 'low']
  ];

  const SECRETS_PATTERNS = [
    ['AWS_KEY', '\\bAKIA[0-9A-Z]{16}\\b', 'g', 'high'],
    ['AWS_SECRET', '\\baws_secret_access_key\\s*=\\s*[A-Za-z0-9/+=]{20,}', 'g', 'high'],
    ['PRIVATE_KEY', '-----BEGIN (?:RSA )?PRIVATE KEY-----', 'g', 'high'],
    ['GITHUB_TOKEN', '\\bghp_[A-Za-z0-9]{20,}\\b', 'g', 'high'],
    ['GITHUB_TOKEN_FINE', '\\bgithub_pat_[A-Za-z0-9_]{20,}\\b', 'g', 'high'],
    ['OPENAI_KEY', '\\bsk-[a-zA-Z0-9_-]{16,}\\b', 'g', 'high'],
    ['ANTHROPIC_KEY', '\\bsk-ant-[a-zA-Z0-9_-]{16,}\\b', 'g', 'high'],
    ['SLACK_TOKEN', '\\bxox[baprs]-[A-Za-z0-9-]{10,}\\b', 'g', 'high'],
    ['JWT', '\\beyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\b', 'g', 'medium'],
    ['GENERIC_SECRET', '\\b(api[_-]?key|secret|password)\\s*[:=]\\s*\\S{8,}', 'gi', 'medium']
  ];

  const INJECTION_PATTERNS = [
    ['INSTRUCTION_OVERRIDE', '\\b(ignore|disregard|forget)\\s+(all\\s+)?(previous|prior|earlier)\\s+(instructions|prompts|rules)\\b', 'gi', 'high'],
    ['ROLE_OVERRIDE', '\\b(you are now|act as|pretend (to be|you are)|simulate)\\b.{0,40}\\b(system|admin|root|developer)\\b', 'gi', 'high'],
    ['SYSTEM_PROMPT_PROBE', '\\b(reveal|show|print|repeat|output)\\b.{0,30}\\b(system prompt|initial instructions|your instructions)\\b', 'gi', 'high'],
    ['ENCODED_PAYLOAD', '\\b(base64|hex|rot13)[ -]?(decode|decode it|encoded)\\b', 'gi', 'medium'],
    ['JAILBREAK_KNOWN', '\\b(DAN|jailbreak|do anything now|unfiltered|no restrictions)\\b', 'gi', 'medium']
  ];

  // Policy profiles — ported from Argus policy.yaml
  const PROFILES = {
    strict:     { secrets: 'block',  pii: 'redact', prompt_injection: 'block', blocklist: 'block' },
    standard:   { secrets: 'block',  pii: 'redact', prompt_injection: 'flag',  blocklist: 'block' },
    permissive: { secrets: 'block',  pii: 'flag',   prompt_injection: 'flag',  blocklist: 'allow' }
  };

  function redactMatch(match) {
    if (!match) return '••••';
    if (match.length <= 4) return '••••';
    return match.slice(0, 4) + '••••' + (match.includes('@') ? match.slice(match.indexOf('@')) : '');
  }

  function redactText(text, findings) {
    // Redact in reverse order so indexes stay valid
    const sorted = [...findings].sort((a, b) => b.index - a.index);
    let out = text;
    for (const f of sorted) {
      out = out.slice(0, f.index) + '[REDACTED:' + f.category + ']' + out.slice(f.index + f.match.length);
    }
    return out;
  }

  function scan(text, blocklistPatterns = []) {
    const groups = {
      secrets: scanWith(text, SECRETS_PATTERNS).map(f => ({ ...f, detector: 'secrets' })),
      pii: scanWith(text, PII_PATTERNS).map(f => ({ ...f, detector: 'pii' })),
      prompt_injection: scanWith(text, INJECTION_PATTERNS).map(f => ({ ...f, detector: 'prompt_injection' })),
      blocklist: []
    };
    for (const p of blocklistPatterns) {
      if (!p || !p.trim()) continue;
      try {
        const re = new RegExp(p, 'gi');
        let m;
        while ((m = re.exec(text)) !== null) {
          groups.blocklist.push({ detector: 'blocklist', category: 'BLOCKED_TERM', severity: 'high', match: m[0], index: m.index });
          if (m[0].length === 0) re.lastIndex++;
        }
      } catch (_) { /* ignore invalid user regex */ }
    }
    const all = Object.values(groups).flat();
    return { groups, all, count: all.length };
  }

  function decide(scanResult, profileName) {
    const profile = PROFILES[profileName] || PROFILES.standard;
    let action = 'allow';
    const reasons = [];
    for (const [detector, findings] of Object.entries(scanResult.groups)) {
      if (!findings.length) continue;
      const policy = profile[detector] || 'flag';
      reasons.push({ detector, policy, count: findings.length, categories: [...new Set(findings.map(f => f.category))] });
      if (policy === 'block') action = 'block';
      else if (policy === 'redact' && action !== 'block') action = 'redact';
      else if (policy === 'flag' && action === 'allow') action = 'flag';
    }
    return { action, profile: profileName, reasons };
  }

  window.ArgusDetectors = { scan, decide, redactText, redactMatch, PROFILES };
})();
