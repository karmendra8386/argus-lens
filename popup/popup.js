const $ = (s) => document.querySelector(s);
function render() {
  chrome.storage.local.get(['argusSettings','argusAudit','argusLastScan'], (res) => {
    const s = res.argusSettings || { profile: 'standard', enabled: true };
    $('#profile').value = s.profile;
    $('#status').textContent = s.enabled ? 'On' : 'Off';
    $('#status').classList.toggle('off', !s.enabled);
    $('#toggle').textContent = s.enabled ? 'Turn off' : 'Turn on';
    const last = res.argusLastScan;
    if (last) $('#last').textContent = `Last scan: ${last.count} finding(s) · action ${last.action} · ${last.host} · ${new Date(last.ts).toLocaleTimeString()}`;
    const audit = res.argusAudit || [];
    $('#audit').innerHTML = audit.slice(0, 8).map(a =>
      `<li><strong>${a.action.toUpperCase()}</strong> ${new Date(a.ts).toLocaleString()} — ${a.findings.map(f => f.category).join(', ') || '—'}</li>`
    ).join('') || '<li>No blocked/redacted events yet.</li>';
  });
}
$('#profile').addEventListener('change', (e) => {
  chrome.storage.local.get(['argusSettings'], (res) => {
    chrome.storage.local.set({ argusSettings: { ...(res.argusSettings||{}), profile: e.target.value } }, render);
  });
});
$('#toggle').addEventListener('click', () => {
  chrome.storage.local.get(['argusSettings'], (res) => {
    const s = res.argusSettings || { profile: 'standard', enabled: true };
    chrome.storage.local.set({ argusSettings: { ...s, enabled: !s.enabled } }, render);
  });
});
$('#clear').addEventListener('click', () => chrome.storage.local.set({ argusAudit: [] }, render));
$('#options').addEventListener('click', () => chrome.runtime.openOptionsPage());
render();
