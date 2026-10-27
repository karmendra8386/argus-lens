chrome.storage.local.get(['argusSettings'], (res) => {
  const s = res.argusSettings || { profile: 'standard', blocklist: [], enabled: true };
  document.querySelector('#profile').value = s.profile;
  document.querySelector('#blocklist').value = (s.blocklist || []).join('\n');
});
document.querySelector('#save').addEventListener('click', () => {
  chrome.storage.local.get(['argusSettings'], (res) => {
    const s = res.argusSettings || {};
    const blocklist = document.querySelector('#blocklist').value.split('\n').map(x => x.trim()).filter(Boolean);
    chrome.storage.local.set({ argusSettings: { ...s, profile: document.querySelector('#profile').value, blocklist } }, () => {
      document.querySelector('#msg').textContent = 'Saved.';
    });
  });
});
