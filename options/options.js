// options.js

const $ = id => document.getElementById(id);

// ─── Load saved settings ──────────────────────────────────────────────────────

async function load() {
  const stored = await chrome.storage.sync.get([
    'openaiKey', 'hunterKey', 'spreadsheetId', 'resume', 'googleClientId', 'networkPref', 'recruiterMode',
  ]);

  if (stored.openaiKey)      $('openai-key').value       = stored.openaiKey;
  if (stored.hunterKey)      $('hunter-key').value       = stored.hunterKey;
  if (stored.spreadsheetId)  $('sheet-id').value         = stored.spreadsheetId;
  if (stored.googleClientId) $('google-client-id').value = stored.googleClientId;

  if (stored.resume) {
    $('resume').value = stored.resume;
    updateWordCount(stored.resume);
  }

  if (stored.recruiterMode) $('recruiter-mode').checked = true;

  const prefMap = { broad: 0, medium: 1, close: 2 };
  const pref = stored.networkPref ?? 'medium';
  $('network-pref-slider').value = prefMap[pref] ?? 1;
  updatePrefUI($('network-pref-slider').value);

  // Show the redirect URI they need to register in GCP
  const { redirectUrl } = await chrome.runtime.sendMessage({ type: 'GET_REDIRECT_URL' });
  if (redirectUrl) $('redirect-uri').textContent = redirectUrl;

  await refreshGoogleStatus();
}

// ─── Google auth status ───────────────────────────────────────────────────────

async function refreshGoogleStatus() {
  const { googleToken, googleTokenExpiry } = await chrome.storage.session.get(['googleToken', 'googleTokenExpiry']);
  const connected = googleToken && googleTokenExpiry && Date.now() < googleTokenExpiry;

  $('google-dot').classList.toggle('connected', !!connected);
  $('google-status-text').textContent = connected ? 'Connected' : 'Not connected';
  $('btn-google-connect').style.display    = connected ? 'none' : '';
  $('btn-google-disconnect').style.display = connected ? '' : 'none';
}

// ─── Save ─────────────────────────────────────────────────────────────────────

async function save() {
  const settings = {
    openaiKey:      $('openai-key').value.trim(),
    hunterKey:      $('hunter-key').value.trim(),
    spreadsheetId:  $('sheet-id').value.trim(),
    resume:         $('resume').value.trim(),
    googleClientId: $('google-client-id').value.trim(),
    networkPref:    ['broad','medium','close'][$('network-pref-slider').value] ?? 'medium',
    recruiterMode:  $('recruiter-mode').checked,
  };

  await chrome.storage.sync.set(settings);

  const status = $('save-status');
  status.style.display = 'inline';
  setTimeout(() => { status.style.display = 'none'; }, 2000);
}

// ─── Networking preference slider ─────────────────────────────────────────────

const PREF_LABELS = ['Very Broad', 'Medium', 'Close'];
const PREF_DESCS  = [
  'Any shared field or general space is a plus, even without direct experience overlap. Good for expanding your network early or across adjacent areas.',
  'Moderate matching. Looks for meaningful overlap in skills, roles, or industry with reasonable leeway for adjacent experience.',
  'Requires tight alignment in industry vertical and domain. Similar roles in clearly different spaces will score lower.',
];

function updatePrefUI(val) {
  $('pref-label').textContent = PREF_LABELS[val];
  $('pref-desc').textContent  = PREF_DESCS[val];
}

// ─── Word count ───────────────────────────────────────────────────────────────

function updateWordCount(text) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  $('resume-word-count').textContent = words ? `${words} words` : '';
}

// ─── PDF Upload ───────────────────────────────────────────────────────────────

function setUploadStatus(type, message) {
  const el = $('upload-status');
  el.className = `upload-status ${type}`;
  el.innerHTML = type === 'loading'
    ? `<span class="spin"></span><span>${message}</span>`
    : `<span>${type === 'success' ? '✓' : '✗'}</span><span>${message}</span>`;
  el.classList.remove('hidden');
}

async function extractPdfText(file) {
  // pdfjsLib is loaded globally from the script tag in options.html
  pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdf.worker.min.js');

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += pageText + '\n\n';
  }

  return fullText.trim();
}

async function convertToATS(rawText, apiKey) {
  const system = `You are an expert resume writer and ATS (Applicant Tracking System) specialist.
Convert the raw extracted resume text into a clean, well-structured ATS-friendly plain text format.

Rules:
- Use clear section headers in ALL CAPS (e.g., EXPERIENCE, EDUCATION, SKILLS, SUMMARY)
- Keep all real information — do not add, invent, or remove any facts
- Fix any garbled text caused by PDF extraction (merged words, broken lines, etc.)
- Remove visual formatting artifacts (page numbers, headers/footers, stray characters)
- Use simple bullet points with dashes (-)
- Keep dates in consistent format (e.g., Jan 2022 – Mar 2024)
- Output plain text only — no markdown, no bold, no symbols beyond dashes and pipes

Return ONLY the cleaned resume text.`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `RAW RESUME TEXT:\n\n${rawText}` },
      ],
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? 'OpenAI error');
  }

  return (await res.json()).choices[0].message.content.trim();
}

async function handlePdfUpload(file) {
  if (!file || file.type !== 'application/pdf') {
    setUploadStatus('error', 'Please upload a PDF file.');
    return;
  }

  const apiKey = $('openai-key').value.trim();
  if (!apiKey) {
    setUploadStatus('error', 'Add your OpenAI API key first, then upload.');
    return;
  }

  try {
    setUploadStatus('loading', 'Extracting text from PDF…');
    const rawText = await extractPdfText(file);

    if (!rawText || rawText.length < 50) {
      throw new Error('Could not extract text — the PDF may be image-based or scanned.');
    }

    setUploadStatus('loading', 'Converting to ATS format with OpenAI…');
    const atsText = await convertToATS(rawText, apiKey);

    $('resume').value = atsText;
    updateWordCount(atsText);
    setUploadStatus('success', `Done — ${file.name} converted to ATS text. Review it below, then Save Settings.`);
  } catch (err) {
    setUploadStatus('error', err.message);
  }
}

// ─── Wire up buttons ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Tab switching
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      item.classList.add('active');
      document.getElementById(`tab-${item.dataset.tab}`).classList.add('active');
    });
  });

  load();

  $('btn-save').addEventListener('click', save);
  $('network-pref-slider').addEventListener('input', e => updatePrefUI(e.target.value));
  $('btn-cancel').addEventListener('click', () => window.close());

  $('resume').addEventListener('input', e => updateWordCount(e.target.value));

  // Upload zone
  const zone = $('upload-zone');
  const fileInput = $('resume-file');

  zone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', e => {
    if (e.target.files[0]) handlePdfUpload(e.target.files[0]);
  });

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handlePdfUpload(file);
  });

  // Google auth
  $('btn-google-connect').addEventListener('click', async () => {
    const res = await chrome.runtime.sendMessage({ type: 'GET_AUTH_TOKEN', interactive: true });
    if (res.success) {
      await refreshGoogleStatus();
    } else {
      alert(`Google sign-in failed: ${res.error}`);
    }
  });

  $('btn-google-disconnect').addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'REVOKE_AUTH_TOKEN' });
    await refreshGoogleStatus();
  });
});
