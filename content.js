// content.js — LinkedIn Networker sidebar
// Injects a Shadow DOM sidebar panel into LinkedIn profile pages.

(() => {
  if (document.getElementById('ln-networker-host')) return; // already injected

  // ─── Shadow DOM host ────────────────────────────────────────────────────────

  const host = document.createElement('div');
  host.id = 'ln-networker-host';
  Object.assign(host.style, {
    position: 'fixed', top: '0', right: '0',
    height: '100vh', zIndex: '999999',
    pointerEvents: 'none', fontFamily: 'sans-serif',
  });
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  // ─── Styles ─────────────────────────────────────────────────────────────────

  const style = document.createElement('style');
  style.textContent = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :host { all: initial; }

    #tab {
      position: fixed;
      top: 50%;
      right: 0;
      transform: translateY(-50%);
      width: 28px;
      height: 72px;
      background: #0a66c2;
      color: #fff;
      border: none;
      border-radius: 8px 0 0 8px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 700;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      letter-spacing: 0.05em;
      writing-mode: vertical-rl;
      text-orientation: mixed;
      pointer-events: all;
      box-shadow: -2px 0 8px rgba(0,0,0,0.15);
      transition: width 0.15s, background 0.15s;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #tab:hover { background: #004182; width: 32px; }

    #panel {
      position: fixed;
      top: 0;
      right: -380px;
      width: 360px;
      height: 100vh;
      background: #fff;
      box-shadow: -4px 0 20px rgba(0,0,0,0.12);
      display: flex;
      flex-direction: column;
      pointer-events: all;
      transition: right 0.25s cubic-bezier(0.4,0,0.2,1);
      z-index: 999998;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      color: #18181b;
    }
    #panel.open { right: 0; }

    /* Header */
    .p-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      border-bottom: 1px solid #e4e4e7;
      flex-shrink: 0;
    }
    .p-logo { font-weight: 700; font-size: 14px; color: #0a66c2; }
    .p-header-btns { display: flex; gap: 6px; }
    .icon-btn {
      background: none; border: none; cursor: pointer;
      font-size: 15px; color: #71717a; padding: 2px 5px;
      border-radius: 4px; transition: color 0.15s;
    }
    .icon-btn:hover { color: #18181b; }

    /* Scroll area */
    .p-body {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
    }

    /* States */
    .state {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 10px; padding: 40px 20px;
      text-align: center; color: #71717a;
    }
    .state-icon { font-size: 30px; }
    .spinner {
      width: 26px; height: 26px;
      border: 3px solid #e4e4e7;
      border-top-color: #0a66c2;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Profile card */
    .p-header-card {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 14px 14px 10px; gap: 10px;
    }
    .p-name { font-weight: 700; font-size: 15px; line-height: 1.3; }
    .p-headline { font-size: 12px; color: #71717a; line-height: 1.4; word-break: break-word; }
    .ext-link { font-size: 16px; text-decoration: none; color: #71717a; flex-shrink: 0; margin-top: 2px; }
    .ext-link:hover { color: #0a66c2; }

    /* Stats — one per line */
    .stats {
      display: flex; flex-direction: column;
      padding: 6px 14px 4px; gap: 4px;
    }
    .position-row {
      display: flex; align-items: baseline; gap: 6px;
      padding: 2px 14px 10px; overflow: hidden;
    }
    .position-row .stat-label { white-space: nowrap; flex-shrink: 0; }
    .position-row .stat-value {
      font-size: 12px; font-weight: 600; color: #18181b;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;
    }
    .stat { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
    .stat-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #71717a; white-space: nowrap; flex-shrink: 0; }
    .stat-value { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }

    /* Divider */
    .divider { height: 1px; background: #e4e4e7; margin: 0 14px; }

    /* Sections */
    .sec-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px 6px;
    }
    .sec-title {
      font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.07em; color: #71717a;
    }

    /* About */
    .about-text {
      font-size: 12px; line-height: 1.5; color: #71717a;
      padding: 0 14px 8px;
      max-height: 120px;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: #e4e4e7 transparent;
    }
    .about-text::-webkit-scrollbar { width: 4px; }
    .about-text::-webkit-scrollbar-track { background: transparent; }
    .about-text::-webkit-scrollbar-thumb { background: #e4e4e7; border-radius: 2px; }
    .skills-row {
      display: flex; flex-wrap: wrap; gap: 4px;
      padding: 0 14px 10px;
    }
    .skills-row::before {
      content: 'Top skills';
      display: block; width: 100%;
      font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em;
      color: #71717a; margin-bottom: 4px;
    }

    /* Score */
    .score-loading { display: flex; align-items: center; gap: 8px; padding: 6px 14px 10px; }
    .spinner-sm { width: 14px; height: 14px; border-width: 2px; }
    .score-row { display: flex; align-items: flex-start; gap: 12px; padding: 4px 14px 8px; }
    .score-badge {
      width: 52px; height: 52px; border-radius: 50%;
      font-size: 18px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; border: 3px solid #e4e4e7;
    }
    .score-badge.high { border-color: #16a34a; color: #16a34a; }
    .score-badge.mid  { border-color: #d97706; color: #d97706; }
    .score-badge.low  { border-color: #dc2626; color: #dc2626; }
    .score-sub { font-size: 12px; font-weight: 500; margin-bottom: 4px; text-transform: capitalize; }
    .tags { display: flex; flex-wrap: wrap; gap: 4px; }
    .tag {
      background: #f4f4f5; border: 1px solid #e4e4e7;
      border-radius: 100px; padding: 1px 8px; font-size: 11px;
    }
    .reasoning { font-size: 12px; line-height: 1.5; color: #71717a; padding: 0 14px 10px; }

    /* Email */
    .email-result { font-size: 12px; padding: 4px 14px 10px; color: #71717a; word-break: break-all; }

    /* Draft toggle */
    .draft-toggle { display: flex; gap: 2px; background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 6px; padding: 2px; }
    .toggle-btn {
      padding: 3px 10px; border: none; border-radius: 4px;
      font-size: 11px; font-weight: 500; cursor: pointer;
      background: transparent; color: #71717a; transition: all 0.15s;
      font-family: inherit;
    }
    .toggle-btn.active { background: #fff; color: #18181b; box-shadow: 0 1px 2px rgba(0,0,0,0.08); }

    .char-count { padding: 2px 14px 4px; font-size: 11px; color: #71717a; }
    .char-count.over { color: #dc2626; font-weight: 600; }

    .draft-textarea {
      width: calc(100% - 28px); margin: 0 14px 6px;
      padding: 8px; border: 1px solid #e4e4e7; border-radius: 5px;
      font-size: 12px; line-height: 1.5; resize: vertical;
      font-family: inherit; color: #18181b;
    }
    .draft-textarea:focus { outline: none; border-color: #0a66c2; }
    .draft-footer { display: flex; gap: 6px; padding: 2px 14px 6px; }

    /* Notes */
    .notes-section { padding: 10px 14px 6px; display: flex; flex-direction: column; gap: 4px; }
    .notes-textarea {
      width: 100%; padding: 8px; border: 1px solid #e4e4e7;
      border-radius: 5px; font-size: 12px; font-family: inherit;
      resize: none; color: #18181b;
    }
    .notes-textarea:focus { outline: none; border-color: #0a66c2; }

    /* Footer */
    .p-footer { padding: 10px 14px 14px; }
    .sheet-status { font-size: 11px; text-align: center; margin-top: 4px; }

    /* Buttons */
    .btn {
      padding: 7px 14px; border-radius: 5px;
      font-size: 12px; font-weight: 500; border: none;
      cursor: pointer; transition: background 0.15s, opacity 0.15s;
      font-family: inherit;
    }
    .btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .btn-primary  { background: #0a66c2; color: #fff; }
    .btn-primary:hover:not(:disabled) { background: #004182; }
    .btn-secondary { background: #f4f4f5; color: #18181b; border: 1px solid #e4e4e7; }
    .btn-secondary:hover:not(:disabled) { background: #e4e4e7; }
    .btn-ghost { background: transparent; color: #71717a; }
    .btn-ghost:hover:not(:disabled) { color: #18181b; }
    .btn-sm { padding: 4px 10px; font-size: 11px; }
    .btn-full { width: 100%; }

    .hidden { display: none !important; }
    .muted { color: #71717a; }
  `;
  shadow.appendChild(style);

  // ─── HTML ────────────────────────────────────────────────────────────────────

  const tab = document.createElement('button');
  tab.id = 'tab';
  tab.textContent = 'LN';
  shadow.appendChild(tab);

  const panel = document.createElement('div');
  panel.id = 'panel';
  panel.innerHTML = `
    <!-- Header -->
    <div class="p-header">
      <span class="p-logo">LinkedIn Networker</span>
      <div class="p-header-btns">
        <button class="icon-btn" id="btn-settings" title="Settings">⚙</button>
        <button class="icon-btn" id="btn-close" title="Close">✕</button>
      </div>
    </div>

    <!-- Scroll body -->
    <div class="p-body">

      <!-- Loading -->
      <div class="state" id="state-loading">
        <div class="spinner"></div>
        <p>Scraping profile…</p>
      </div>

      <!-- Error -->
      <div class="state hidden" id="state-error">
        <div class="state-icon">⚠️</div>
        <p id="error-msg" class="muted"></p>
        <button class="btn btn-secondary" id="btn-retry">Retry</button>
      </div>

      <!-- No resume -->
      <div class="state hidden" id="state-no-resume">
        <div class="state-icon">📄</div>
        <p class="muted">Add your resume in Settings first.</p>
        <button class="btn btn-primary" id="btn-goto-settings">Open Settings</button>
      </div>

      <!-- Main content -->
      <div class="hidden" id="main-content">

        <!-- Profile card -->
        <div class="p-header-card">
          <div>
            <div class="p-name" id="p-name"></div>
            <div class="p-headline" id="p-headline"></div>
          </div>
          <a class="ext-link" id="p-link" href="#" target="_blank">↗</a>
        </div>

        <div class="stats">
          <div class="stat"><span class="stat-label">Company</span><span class="stat-value" id="s-company">—</span></div>
          <div class="stat"><span class="stat-label">School</span><span class="stat-value" id="s-school">—</span></div>
          <div class="stat"><span class="stat-label">Mutual</span><span class="stat-value" id="s-mutual">—</span></div>
          <div class="stat"><span class="stat-label">Degree</span><span class="stat-value" id="s-degree">—</span></div>
        </div>
        <div class="position-row">
          <span class="stat-label">Position</span>
          <span class="stat-value" id="s-position">—</span>
        </div>

        <div class="divider"></div>

        <!-- About -->
        <div id="about-wrap" class="hidden">
          <div class="sec-header"><span class="sec-title">About</span></div>
          <p class="about-text" id="p-about"></p>
          <div id="p-skills-row" class="hidden skills-row"></div>
          <div class="divider"></div>
        </div>

        <!-- Score -->
        <div class="sec-header">
          <span class="sec-title">Networking Score</span>
          <button class="btn btn-sm btn-primary" id="btn-score">Score</button>
        </div>
        <div class="score-loading hidden" id="score-loading">
          <div class="spinner spinner-sm"></div><span class="muted">Analyzing…</span>
        </div>
        <div class="hidden" id="score-result">
          <div class="score-row">
            <div class="score-badge" id="score-badge">—</div>
            <div>
              <div class="score-sub" id="score-industry"></div>
              <div class="tags" id="score-tags"></div>
            </div>
          </div>
          <p class="reasoning" id="score-reasoning"></p>
        </div>

        <div class="divider"></div>

        <!-- Email -->
        <div class="sec-header">
          <span class="sec-title">Email</span>
          <button class="btn btn-sm btn-secondary" id="btn-email">Look up</button>
        </div>
        <div class="email-result" id="email-result">—</div>

        <div class="divider"></div>

        <!-- Draft message -->
        <div class="sec-header">
          <span class="sec-title">Draft Message</span>
          <div class="draft-toggle">
            <button class="toggle-btn active" id="toggle-li">LinkedIn</button>
            <button class="toggle-btn" id="toggle-em">Email</button>
          </div>
          <button class="btn btn-sm btn-secondary" id="btn-draft" disabled>Draft</button>
        </div>
        <div class="score-loading hidden" id="draft-loading">
          <div class="spinner spinner-sm"></div><span class="muted" id="draft-loading-text">Writing…</span>
        </div>
        <div class="char-count hidden" id="char-count"></div>
        <textarea class="draft-textarea hidden" id="draft-text" rows="5"></textarea>
        <div class="draft-footer hidden" id="draft-footer">
          <button class="btn btn-sm btn-ghost" id="btn-copy">Copy</button>
          <button class="btn btn-sm btn-ghost" id="btn-redraft">Redraft</button>
        </div>

        <div class="divider"></div>

        <!-- Notes -->
        <div class="notes-section">
          <span class="sec-title">Notes</span>
          <textarea class="notes-textarea" id="notes" rows="2" placeholder="Add a note…"></textarea>
        </div>

        <!-- Add to sheet -->
        <div class="p-footer">
          <button class="btn btn-primary btn-full" id="btn-sheet">+ Add to Sheet</button>
          <div class="sheet-status hidden" id="sheet-status"></div>
        </div>

      </div><!-- /main-content -->
    </div><!-- /p-body -->
  `;
  shadow.appendChild(panel);

  // ─── State ──────────────────────────────────────────────────────────────────

  const $ = id => shadow.getElementById(id);
  let profileData = null;
  let scoreResult = null;
  let draftMode = 'linkedin';
  const LI_LIMIT = 200;

  // ─── Toggle panel ────────────────────────────────────────────────────────────

  function setPanel(open) {
    panel.classList.toggle('open', open);
    tab.style.display = open ? 'none' : '';
  }

  tab.addEventListener('click', () => {
    const opening = !panel.classList.contains('open');
    setPanel(opening);
    if (opening && !profileData) scrape();
  });
  $('btn-close').addEventListener('click', () => setPanel(false));
  $('btn-settings').addEventListener('click', () => chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' }));
  $('btn-goto-settings').addEventListener('click', () => chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' }));

  // ─── UI helpers ─────────────────────────────────────────────────────────────

  function showState(name) {
    ['loading','error','no-resume','main-content'].forEach(s => {
      const el = $(`state-${s}`) ?? $('main-content');
      if (s === 'main-content') {
        $('main-content').classList.toggle('hidden', name !== 'main');
      } else {
        $(`state-${s}`)?.classList.toggle('hidden', s !== name);
      }
    });
  }

  function show(id) { $(id)?.classList.remove('hidden'); }
  function hide(id) { $(id)?.classList.add('hidden'); }

  // ─── Scrape ──────────────────────────────────────────────────────────────────

  async function scrape() {
    const { resume } = await chrome.storage.sync.get('resume');
    if (!resume) { showState('no-resume'); return; }

    showState('loading');
    // Small delay to let LinkedIn finish rendering
    await new Promise(r => setTimeout(r, 800));

    try {
      profileData = scrapeProfile();
      render(profileData);
      showState('main');
    } catch (err) {
      $('error-msg').textContent = err.message || 'Could not scrape profile.';
      showState('error');
    }
  }

  $('btn-retry').addEventListener('click', scrape);

  // ─── Render ──────────────────────────────────────────────────────────────────

  function render(p) {
    $('p-name').textContent = p.name ?? 'Unknown';
    // Show headline; if missing, fall back to "Title at Company"
    $('p-headline').textContent = p.headline
      ?? (p.currentTitle && p.currentCompany ? `${p.currentTitle} at ${p.currentCompany}` : p.currentTitle ?? '');
    $('p-link').href = p.profileUrl ?? '#';

    $('s-company').textContent = p.currentCompany ?? '—';
    $('s-school').textContent = p.education?.[0]?.school ?? '—';
    $('s-mutual').textContent = p.mutualConnections ?? '—';
    $('s-degree').textContent = p.connectionDegree ?? '—';
    $('s-position').textContent = p.currentTitle ?? '—';

    if (p.about || p.aboutSkills?.length) {
      $('p-about').textContent = p.about ?? '';
      const skillsRow = $('p-skills-row');
      if (p.aboutSkills?.length) {
        skillsRow.innerHTML = '';
        p.aboutSkills.forEach(skill => {
          const s = document.createElement('span');
          s.className = 'tag'; s.textContent = skill;
          skillsRow.appendChild(s);
        });
        show('p-skills-row');
      }
      show('about-wrap');
    }

    if (p.email) {
      $('email-result').textContent = p.email;
      $('email-result').classList.remove('muted');
    }
  }

  // ─── Score ───────────────────────────────────────────────────────────────────

  $('btn-score').addEventListener('click', runScore);

  async function runScore() {
    const { openaiKey, resume } = await chrome.storage.sync.get(['openaiKey','resume']);
    if (!openaiKey) { alert('Add OpenAI key in Settings.'); return; }

    $('btn-score').disabled = true;
    show('score-loading'); hide('score-result');

    try {
      scoreResult = await getNetworkingScore(openaiKey, resume, profileData);
      renderScore(scoreResult);
      $('btn-draft').disabled = false;
    } catch(e) { alert(`Score error: ${e.message}`); }
    finally { hide('score-loading'); $('btn-score').disabled = false; }
  }

  function renderScore(r) {
    const badge = $('score-badge');
    badge.textContent = r.score;
    badge.className = 'score-badge ' + (r.score >= 70 ? 'high' : r.score >= 40 ? 'mid' : 'low');
    $('score-industry').textContent = `Industry match: ${r.industry_match ?? '—'}`;
    const tagsEl = $('score-tags');
    tagsEl.innerHTML = '';
    (r.overlap_tags ?? []).slice(0,5).forEach(t => {
      const s = document.createElement('span');
      s.className = 'tag'; s.textContent = t; tagsEl.appendChild(s);
    });
    $('score-reasoning').textContent = r.reasoning ?? '';
    show('score-result');
  }

  // ─── Draft ───────────────────────────────────────────────────────────────────

  $('toggle-li').addEventListener('click', () => setDraftMode('linkedin'));
  $('toggle-em').addEventListener('click', () => setDraftMode('email'));
  $('btn-draft').addEventListener('click', runDraft);
  $('btn-redraft').addEventListener('click', runDraft);
  $('btn-copy').addEventListener('click', () => {
    navigator.clipboard.writeText($('draft-text').value).then(() => {
      $('btn-copy').textContent = 'Copied!';
      setTimeout(() => { $('btn-copy').textContent = 'Copy'; }, 1500);
    });
  });

  function setDraftMode(mode) {
    draftMode = mode;
    $('toggle-li').classList.toggle('active', mode === 'linkedin');
    $('toggle-em').classList.toggle('active', mode === 'email');
    if ($('draft-text').value) runDraft();
  }

  async function runDraft() {
    const { openaiKey, resume } = await chrome.storage.sync.get(['openaiKey','resume']);
    if (!openaiKey) { alert('Add OpenAI key in Settings.'); return; }

    $('btn-draft').disabled = true;
    show('draft-loading'); hide('draft-text'); hide('draft-footer'); hide('char-count');
    $('draft-loading-text').textContent = draftMode === 'linkedin' ? 'Writing LinkedIn message…' : 'Writing email…';

    try {
      const msg = await draftMessage(openaiKey, resume, profileData, scoreResult, draftMode);
      const ta = $('draft-text');
      ta.value = msg;
      ta.rows = draftMode === 'email' ? 8 : 4;
      show('draft-text'); show('draft-footer');
      if (draftMode === 'linkedin') {
        updateCharCount(msg.length);
        show('char-count');
        ta.addEventListener('input', () => updateCharCount(ta.value.length));
      }
    } catch(e) { alert(`Draft error: ${e.message}`); }
    finally { hide('draft-loading'); $('btn-draft').disabled = false; }
  }

  function updateCharCount(len) {
    const el = $('char-count');
    el.textContent = `${len} / ${LI_LIMIT} characters`;
    el.classList.toggle('over', len > LI_LIMIT);
  }

  // ─── Email lookup ─────────────────────────────────────────────────────────────

  $('btn-email').addEventListener('click', async () => {
    const { hunterKey } = await chrome.storage.sync.get('hunterKey');
    if (!hunterKey) { alert('Add Hunter.io key in Settings.'); return; }

    $('btn-email').disabled = true;
    $('email-result').textContent = 'Looking up…';

    const parts = (profileData?.name ?? '').split(' ');
    const result = await findEmail(hunterKey, parts[0] ?? '', parts.slice(1).join(' '), profileData?.currentCompany ?? '');
    $('email-result').textContent = result ? `${result.email} (${result.confidence}% confidence)` : 'No email found';
    $('btn-email').disabled = false;
  });

  // ─── Add to Sheet ─────────────────────────────────────────────────────────────

  $('btn-sheet').addEventListener('click', async () => {
    const { spreadsheetId } = await chrome.storage.sync.get('spreadsheetId');
    if (!spreadsheetId) { alert('Set Spreadsheet ID in Settings.'); return; }

    const statusEl = $('sheet-status');
    $('btn-sheet').disabled = true;
    statusEl.textContent = 'Connecting…';
    show('sheet-status');

    try {
      const tokenRes = await chrome.runtime.sendMessage({ type: 'GET_AUTH_TOKEN', interactive: true });
      if (!tokenRes.success) throw new Error(tokenRes.error);

      const emailText = $('email-result').textContent;
      const email = emailText && emailText !== '—' ? emailText : '';
      const notes = $('notes').value;
      const row = [
        new Date().toLocaleDateString(),
        profileData?.name ?? '',
        profileData?.currentTitle ?? '',
        profileData?.currentCompany ?? '',
        profileData?.education?.[0]?.school ?? '',
        scoreResult?.score ?? '',
        scoreResult?.industry_match ?? '',
        (scoreResult?.overlap_tags ?? []).join(', '),
        profileData?.mutualConnections ?? '',
        email, notes,
        profileData?.profileUrl ?? '',
      ];

      const res = await chrome.runtime.sendMessage({ type: 'APPEND_TO_SHEET', token: tokenRes.token, spreadsheetId, values: row });
      if (!res.success) throw new Error(res.error);

      statusEl.textContent = '✓ Added to Sheet';
      statusEl.style.color = '#16a34a';
    } catch(e) {
      statusEl.textContent = `Error: ${e.message}`;
      statusEl.style.color = '#dc2626';
    } finally { $('btn-sheet').disabled = false; }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SCRAPING
  // ═══════════════════════════════════════════════════════════════════════════

  const SECTION_HEADERS = new Set([
    'Highlights','About','Featured','Experience','Education','Skills',
    'Recommendations','Activity','Interests','Publications','Courses',
    'Projects','Honors & Awards','Volunteering','Certifications','Languages',
    'Open to','More profiles for you','People you may know',
  ]);

  function getProfilePhoto() {
    // LinkedIn uploaded profile photos always contain 'profile-displayphoto' in the URL.
    // Default/ghost avatars use static assets that do NOT contain this string.
    const photo = document.querySelector('img[src*="profile-displayphoto"]');
    if (photo && photo.naturalWidth >= 48) return photo.src;
    return null; // No uploaded photo — don't show a placeholder
  }

  function getName() {
    return [...document.querySelectorAll('h2')]
      .find(h => {
        const t = h.textContent.trim();
        return t.length > 1 && t.length < 100
          && !t.toLowerCase().includes('notification')
          && !SECTION_HEADERS.has(t);
      })?.textContent.trim() ?? null;
  }

  function parseTopCard(name) {
    const mainEl = document.querySelector('main');
    if (!mainEl || !name) return {};
    const lines = mainEl.innerText.split('\n').map(l => l.trim()).filter(Boolean);
    const nameIdx = lines.findIndex(l => l === name);
    if (nameIdx === -1) return {};
    let headline = null, location = null, degree = null;
    for (let i = nameIdx + 1; i < Math.min(nameIdx + 15, lines.length); i++) {
      const line = lines[i];
      if (!degree && /^·\s*(1st|2nd|3rd\+?)/i.test(line)) { degree = line.replace(/^·\s*/,'').trim(); continue; }
      if (!location && /,/.test(line) && line.length < 80 && !/follower|connection|·/i.test(line)) { location = line; continue; }
      if (/follower|connection|mutual/i.test(line)) continue;
      if (/^[A-Za-z]+\/[A-Za-z]+$/.test(line)) continue;
      if (['Message','Connect','Follow','More','Contact info','Open to'].includes(line)) continue;
      if (!headline && line.length > 5) headline = line;
      if (headline && location) break;
    }
    return { headline, location, degree };
  }

  function getMutualConnections() {
    const text = document.querySelector('main')?.innerText ?? '';
    const m1 = text.match(/(\d+)\s+other\s+mutual/i);
    if (m1) {
      const named = text.match(/([A-Z][a-z]+(?:,\s*[A-Z][a-z]+)*)\s+and\s+(\d+)\s+other\s+mutual/i);
      return parseInt(m1[1],10) + (named ? named[1].split(',').length : 0);
    }
    const m2 = text.match(/(\d+)\s+mutual\s+connection/i);
    if (m2) return parseInt(m2[1],10);
    const m3 = text.match(/have\s+(\d+)\s+mutual/i);
    if (m3) return parseInt(m3[1],10);
    return /mutual connection/i.test(text) ? 1 : 0;
  }

  // Find a section by heading — handles LinkedIn's 2025 DOM where h2 may contain
  // buttons, icons, or screen-reader spans that add extra text.
  function findSection(heading) {
    const h2 = [...document.querySelectorAll('h2')].find(h => {
      const text = h.textContent.trim();
      // Exact match
      if (text === heading) return true;
      // Text starts with heading (e.g. "EducationShow all 3 educations")
      if (text.startsWith(heading)) return true;
      // Any span child has exactly the heading
      return [...h.querySelectorAll('span')].some(s => s.textContent.trim() === heading);
    });
    // LinkedIn sometimes uses <div> instead of <section>
    return h2?.closest('section') ?? h2?.closest('div[id]') ?? h2?.parentElement ?? null;
  }

  function getAbout() {
    const section = findSection('About');
    if (!section) return { about: null, aboutSkills: [] };
    const raw = section.innerText.replace(/^About\s*/i,'').trim();
    if (!raw) return { about: null, aboutSkills: [] };

    // LinkedIn appends "Top skills\nSkill1 • Skill2..." at the bottom
    const topSkillsMatch = raw.match(/Top skills\s*\n(.+)$/s);
    let about = raw;
    let aboutSkills = [];
    if (topSkillsMatch) {
      about = raw.slice(0, topSkillsMatch.index).trim();
      aboutSkills = topSkillsMatch[1].split(/[•\n]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 60);
    }
    return { about: about.slice(0,800) || null, aboutSkills };
  }

  const DATE_RE = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Present|\d{4})\b/;

  // Get top-level list items from a section, supporting both <ul>/<li> and
  // LinkedIn's div[role="list"]/div[role="listitem"] patterns.
  function getSectionItems(section) {
    // Standard HTML list
    const ul = section.querySelector('ul');
    if (ul) return [...ul.children].filter(el => el.tagName === 'LI');
    // ARIA list (LinkedIn sometimes uses this)
    const list = section.querySelector('[role="list"]');
    if (list) return [...list.children];
    return [];
  }

  // For grouped entries, get company name by cloning the outer <li> and removing
  // the nested <ul> — then reading textContent gives us the sr-only company text
  // that innerText misses (visually-hidden spans aren't included in innerText).
  function companyFromGroupedLi(li, nestedUlEl) {
    // Clone so we don't modify the real DOM
    const clone = li.cloneNode(true);
    // Remove the nested roles list from the clone
    const cloneNested = clone.querySelector('ul');
    if (cloneNested) cloneNested.remove();

    // textContent of the remaining header includes sr-only company name
    const lines = clone.textContent.split(/[\n\r]+/)
      .map(l => l.trim()).filter(Boolean);

    // Company name: first non-date, non-duration, non-location line < 100 chars
    const company = lines.find(l =>
      l.length > 1 && l.length < 100
      && !DATE_RE.test(l)
      && !/^\d+\s*(mos?|yr)/i.test(l)   // "11 mos", "1 yr"
      && !/·/.test(l)                    // skip "Internship · 11 mos" lines
      && !SECTION_HEADERS.has(l)
    );
    return company?.split('·')[0].trim() ?? null;
  }

  function getExperience() {
    const section = findSection('Experience');
    if (!section) return [];
    const items = getSectionItems(section);
    if (!items.length) return [];

    const results = [];

    for (const li of items) {
      const lines = li.innerText.trim().split('\n').map(l => l.trim()).filter(Boolean);
      if (!lines.length) continue;

      // Grouped entry = has a nested list whose items themselves contain date strings
      const nestedUlEl = li.querySelector('ul');
      const nestedItems = nestedUlEl
        ? [...nestedUlEl.children].filter(n => n.tagName === 'LI' && DATE_RE.test(n.innerText))
        : [];
      const isGrouped = nestedItems.length > 0;

      if (isGrouped) {
        // For grouped entries the company name is often in a visually-hidden span or img alt.
        // We explicitly search outside the nested <ul> to avoid picking up sub-role links.
        const company = companyFromGroupedLi(li, nestedUlEl);

        for (const nli of nestedItems) {
          const nLines = nli.innerText.trim().split('\n').map(l => l.trim()).filter(Boolean);
          if (!nLines.length) continue;
          const title = nLines[0];
          const duration = nLines.find(l => DATE_RE.test(l)) ?? null;
          if (title && !SECTION_HEADERS.has(title)) results.push({ title, company, duration });
        }
      } else {
        // Simple single-role entry.
        // LinkedIn's format: line 0 = title, line 1 = "Company · Type", line 2 = dates.
        // DO NOT use anchor.innerText — it returns the title (not company) because the
        // anchor wraps the whole entry in LinkedIn's 2025 DOM.
        const title = lines[0];
        if (!title || SECTION_HEADERS.has(title)) continue;

        // Line 1 is "Company · Employment-type" — split on · to get just the name
        let company = null;
        const companyLine = lines.find((l, i) => i > 0 && !DATE_RE.test(l) && l.length > 1 && l.length < 150);
        if (companyLine) company = companyLine.split('·')[0].trim();

        const duration = lines.find(l => DATE_RE.test(l)) ?? null;
        results.push({ title, company, duration });
      }
    }

    // Sort: current roles (Present) always first
    results.sort((a, b) => {
      const aP = /Present/i.test(a.duration ?? '');
      const bP = /Present/i.test(b.duration ?? '');
      return aP && !bP ? -1 : !aP && bP ? 1 : 0;
    });

    return results;
  }

  function getEducation() {
    const section = findSection('Education');
    if (!section) return [];
    const items = getSectionItems(section);

    if (items.length) {
      return items.map(li => {
        const lines = li.innerText.trim().split('\n').map(l => l.trim()).filter(Boolean);
        const school = lines[0] ?? null;
        if (!school || SECTION_HEADERS.has(school) || school.length > 150) return null;
        const degree = lines.find(l => l !== school && !DATE_RE.test(l) && l.length > 3
          && !/^(Grade|Activities|MIT SCHOLAR)/i.test(l)) ?? null;
        const years = lines.find(l => /\d{4}/.test(l)) ?? null;
        return { school, degree, years };
      }).filter(Boolean);
    }

    // Fallback: parse the section's innerText directly when no list items found
    const raw = section.innerText.replace(/^Education\s*/i,'').trim();
    const entries = [];
    const eduLines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    let cur = null;
    for (const line of eduLines) {
      if (SECTION_HEADERS.has(line) || /^Show all/i.test(line)) break;
      if (/\d{4}/.test(line)) { if (cur) cur.years = line; continue; }
      if (/^(Grade|Activities|MIT)/i.test(line)) continue;
      if (DATE_RE.test(line)) continue;
      if (!cur || (line.length > 5 && !line.includes('·') && !cur.degree)) {
        if (cur?.school) entries.push(cur);
        cur = { school: line, degree: null, years: null };
      } else if (cur && !cur.degree && line.length > 3) {
        cur.degree = line;
      }
    }
    if (cur?.school) entries.push(cur);
    return entries;
  }

  function getSkills() {
    const section = findSection('Skills');
    if (!section) return [];
    return getSectionItems(section)
      .map(li => li.innerText.trim().split('\n')[0].trim())
      .filter(s => s.length > 1 && s.length < 60 && !SECTION_HEADERS.has(s))
      .slice(0, 20);
  }

  function scrapeProfile() {
    const name = getName();
    const { headline, location, degree } = parseTopCard(name);
    const experience = getExperience();
    const { about, aboutSkills } = getAbout();
    return {
      name, headline, location, connectionDegree: degree,
      mutualConnections: getMutualConnections(),
      about, aboutSkills,
      currentTitle: experience[0]?.title ?? null,
      currentCompany: experience[0]?.company ?? null,
      experience, education: getEducation(), skills: getSkills(),
      email: document.querySelector('a[href^="mailto:"]')?.href.replace('mailto:','') ?? null,
      profileUrl: window.location.href.match(/(https:\/\/www\.linkedin\.com\/in\/[^/?#]+)/)?.[1] ?? window.location.href,
      scrapedAt: new Date().toISOString(),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // API CALLS (direct fetch from content script)
  // ═══════════════════════════════════════════════════════════════════════════

  async function openAIChat(apiKey, messages) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-5.4-mini', messages, temperature: 0.3 }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message ?? 'OpenAI error'); }
    return (await res.json()).choices[0].message.content;
  }

  function formatProfile(p) {
    const lines = [];
    if (p.name) lines.push(`Name: ${p.name}`);
    if (p.headline) lines.push(`Headline: ${p.headline}`);
    if (p.about) lines.push(`About: ${p.about}`);
    if (p.experience?.length) { lines.push('Experience:'); p.experience.slice(0,5).forEach(e => lines.push(`  - ${e.title}${e.company ? ' at '+e.company : ''}`)); }
    if (p.education?.length)  { lines.push('Education:');  p.education.forEach(e => lines.push(`  - ${e.school}${e.degree ? ': '+e.degree : ''}`)); }
    if (p.skills?.length) lines.push(`Skills: ${p.skills.slice(0,15).join(', ')}`);
    return lines.join('\n');
  }

  async function getNetworkingScore(apiKey, resume, profile) {
    const system = `Return ONLY valid JSON (no markdown):
{"score":<0-100>,"industry_match":"<high|medium|low>","overlap_tags":["..."],"reasoning":"<2-3 sentences>"}
Weights: industry/company-type 40%, skill/resume overlap 35%, mutual connections 25%. Be honest.`;
    const user = `MY RESUME:\n${resume}\n\nPROFILE:\n${formatProfile(profile)}\n\nMutual connections: ${profile.mutualConnections ?? 0}`;
    const raw = await openAIChat(apiKey, [{role:'system',content:system},{role:'user',content:user}]);
    try { return JSON.parse(raw); } catch { const m = raw.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); throw new Error('Bad JSON'); }
  }

  async function draftMessage(apiKey, resume, profile, score, mode) {
    const emailText = $('email-result').textContent;
    const system = mode === 'linkedin'
      ? `Write a LinkedIn connection request. MAX 200 characters. No generic openers. Reference ONE specific thing. Human tone. Return ONLY the message.`
      : `Write a cold networking email. Subject line first, then blank line, then 4-6 sentence body. No generic openers. Specific and genuine. Sign off with [Your name]. Return ONLY the email.`;
    const user = `MY BACKGROUND:\n${resume}\n\nPROFILE:\n${formatProfile(profile)}\n\nOVERLAP: ${(score?.overlap_tags??[]).join(', ')}\nEMAIL: ${emailText !== '—' ? emailText : 'unknown'}`;
    return openAIChat(apiKey, [{role:'system',content:system},{role:'user',content:user}]);
  }

  async function findEmail(hunterKey, firstName, lastName, company) {
    if (!hunterKey || !company) return null;
    const params = new URLSearchParams({ first_name: firstName, last_name: lastName, company, api_key: hunterKey });
    const res = await fetch(`https://api.hunter.io/v2/email-finder?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.email ? { email: data.data.email, confidence: data.data.confidence } : null;
  }

  // ─── Listen for popup → open panel message ────────────────────────────────

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'TOGGLE_PANEL') {
      const opening = !panel.classList.contains('open');
      setPanel(opening);
      if (opening && !profileData) scrape();
    }
  });

  // ─── SPA navigation: re-scrape when LinkedIn navigates between profiles ────

  let lastUrl = location.href;
  const navObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      if (/linkedin\.com\/in\//.test(lastUrl)) {
        // Reset state for new profile
        profileData = null;
        scoreResult = null;
        $('p-about').textContent = '';
        hide('about-wrap');
        hide('score-result');
        hide('score-loading');
        hide('draft-text');
        hide('draft-footer');
        hide('char-count');
        hide('draft-loading');
        $('email-result').textContent = '—';
        $('notes').value = '';
        hide('sheet-status');
        $('btn-draft').disabled = true;

        // If panel was open, re-scrape the new profile
        const wasOpen = panel.classList.contains('open');
        if (wasOpen) {
          showState('loading');
          setTimeout(() => scrape(), 1200); // give LinkedIn time to render
        }
      }
    }
  });
  navObserver.observe(document.body, { childList: true, subtree: true });

})();
