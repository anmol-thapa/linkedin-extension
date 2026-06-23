// background.js — MV3 service worker
// Handles Google OAuth token flow and message routing.
//
// Uses launchWebAuthFlow (implicit grant) — more reliable than getAuthToken
// for unpacked/development extensions.
//
// Requires a "Web Application" OAuth client in Google Cloud Console with:
//   Authorized redirect URI: https://<extension-id>.chromiumapp.org/
// Store the Web App client ID in chrome.storage.sync under 'googleClientId',
// OR hardcode it below in GOOGLE_CLIENT_ID.

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

// ─── OAuth via launchWebAuthFlow ─────────────────────────────────────────────

async function getAuthToken(interactive = true) {
  // Return cached token if available
  const { googleToken, googleTokenExpiry } = await chrome.storage.session.get(['googleToken', 'googleTokenExpiry']);
  if (googleToken && googleTokenExpiry && Date.now() < googleTokenExpiry) {
    return googleToken;
  }

  // No valid cached token — need to re-auth
  if (!interactive) {
    throw new Error('Not connected');
  }

  const { googleClientId } = await chrome.storage.sync.get('googleClientId');
  if (!googleClientId) {
    throw new Error('No Google Client ID set. Add it in Settings.');
  }

  const redirectUri = chrome.identity.getRedirectURL();
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', googleClientId);
  authUrl.searchParams.set('response_type', 'token');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', SHEETS_SCOPE);
  authUrl.searchParams.set('prompt', 'select_account');

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl.toString(), interactive: true },
      async (responseUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!responseUrl) {
          reject(new Error('Auth cancelled'));
          return;
        }
        const hash = new URL(responseUrl).hash.slice(1);
        const params = new URLSearchParams(hash);
        const token = params.get('access_token');
        const expiresIn = parseInt(params.get('expires_in') ?? '3600', 10);
        if (token) {
          // Cache token in session storage (cleared when browser closes)
          await chrome.storage.session.set({
            googleToken: token,
            googleTokenExpiry: Date.now() + (expiresIn - 60) * 1000,
          });
          resolve(token);
        } else {
          reject(new Error('No access token in response'));
        }
      }
    );
  });
}

async function revokeAuthToken() {
  await chrome.storage.session.remove(['googleToken', 'googleTokenExpiry']);
}

// ─── Message router ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_AUTH_TOKEN') {
    getAuthToken(message.interactive ?? true)
      .then(token => sendResponse({ success: true, token }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'REVOKE_AUTH_TOKEN') {
    revokeAuthToken()
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'APPEND_TO_SHEET') {
    const { token, spreadsheetId, values } = message;
    appendToSheet(token, spreadsheetId, values)
      .then(res => sendResponse({ success: true, result: res }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'GET_REDIRECT_URL') {
    sendResponse({ redirectUrl: chrome.identity.getRedirectURL() });
    return true;
  }

  if (message.type === 'OPEN_OPTIONS') {
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'TOGGLE_PANEL') {
    // Forward to the active tab's content script
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PANEL' });
    });
    sendResponse({ success: true });
    return true;
  }
});

// ─── Sheets API ──────────────────────────────────────────────────────────────

async function appendToSheet(token, spreadsheetId, values) {
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Get column A to find first empty row after header (top-down)
  const getRes = await fetch(`${base}/${encodeURIComponent('Sheet1!A:A')}`, { headers });
  if (!getRes.ok) {
    const err = await getRes.json();
    throw new Error(err.error?.message ?? 'Sheets API error (get)');
  }
  const rows = (await getRes.json()).values ?? [];
  // Start at index 1 (skip header row), find first empty slot
  let nextRow = rows.length + 1;
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i]?.some(cell => cell !== '' && cell != null)) {
      nextRow = i + 1; // convert to 1-indexed
      break;
    }
  }

  const putRes = await fetch(
    `${base}/${encodeURIComponent(`Sheet1!A${nextRow}`)}?valueInputOption=USER_ENTERED`,
    { method: 'PUT', headers, body: JSON.stringify({ values: [values] }) }
  );

  if (!putRes.ok) {
    const err = await putRes.json();
    throw new Error(err.error?.message ?? 'Sheets API error (write)');
  }

  return putRes.json();
}
