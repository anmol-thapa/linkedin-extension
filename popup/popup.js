// popup.js — minimal launcher popup
// The real UI is the injected sidebar in content.js.

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isLinkedIn = /linkedin\.com\/in\//.test(tab?.url ?? '');
  const hintEl = document.getElementById('hint');
  const toggleBtn = document.getElementById('btn-toggle');
  const statusEl = document.getElementById('status');

  if (isLinkedIn) {
    hintEl.textContent = 'Click to toggle the sidebar on this profile.';
    toggleBtn.disabled = false;
  } else {
    hintEl.textContent = 'Navigate to a LinkedIn profile (linkedin.com/in/…) first.';
    toggleBtn.disabled = true;
    toggleBtn.style.opacity = '0.45';
  }

  toggleBtn.addEventListener('click', async () => {
    if (!tab?.id) return;
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PANEL' });
      window.close();
    } catch {
      // Content script might not be injected yet — inject it
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      setTimeout(() => chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PANEL' }), 300);
      window.close();
    }
  });

  document.getElementById('btn-settings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Show resume status
  const { resume } = await chrome.storage.sync.get('resume');
  if (!resume) {
    statusEl.textContent = '⚠ Add your resume in Settings';
    statusEl.className = 'warn';
  } else {
    statusEl.textContent = '✓ Resume loaded';
    statusEl.className = 'ok';
  }
});
