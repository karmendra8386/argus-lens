// Argus Lens background service worker — initializes defaults, updates badge.
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['argusSettings'], (res) => {
    if (!res.argusSettings) {
      chrome.storage.local.set({ argusSettings: { profile: 'standard', blocklist: [], enabled: true } });
    }
  });
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.argusLastScan) return;
  const { count = 0, action } = changes.argusLastScan.newValue || {};
  chrome.action.setBadgeText({ text: count ? String(count) : '' });
  chrome.action.setBadgeBackgroundColor({ color: action === 'block' ? '#ef4444' : action === 'redact' ? '#f59e0b' : '#3b82f6' });
});
