// CoreflowHR Auto Sourcer — profile & search sourcing panel
(function () {
  'use strict';

  if (document.getElementById('coreflow-host')) return;

  const isSearchPage = /linkedin\.com\/search\/results\/people/.test(location.href);
  const isProfilePage = /linkedin\.com\/in\//.test(location.href);

  // ── Shared helpers ────────────────────────────────────────────────────────

  function getText(...selectors) {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        const t = (el?.innerText || el?.textContent || '').trim();
        if (t) return t;
      } catch (_) {}
    }
    return '';
  }

  // ── Profile extraction (profile pages) ───────────────────────────────────

  function extractProfile() {
    const name = getText('h1.text-heading-xlarge', 'h1[class*="heading"]', 'h1');
    const headline = getText('.text-body-medium.break-words', '.pv-text-details__left-panel .text-body-medium');
    const location = getText('.pv-text-details__left-panel span.text-body-small:not(.inline)', '.pb2 .text-body-small');
    const about = getText('#about ~ * .visually-hidden', '#about + * .visually-hidden');

    let currentCompany = '';
    const expSpans = document.querySelectorAll('#experience ~ * li:first-child span[aria-hidden="true"]');
    if (expSpans.length > 1) currentCompany = (expSpans[1]?.textContent || '').split('·')[0].trim();

    const skills = [];
    document.querySelectorAll('#skills ~ * span[aria-hidden="true"]').forEach(el => {
      const t = el.textContent?.trim();
      if (t && t.length < 60 && !skills.includes(t)) skills.push(t);
    });

    const workExperience = [];
    document.querySelectorAll('#experience ~ * li').forEach(li => {
      const spans = [...li.querySelectorAll('span[aria-hidden="true"]')].map(s => s.textContent?.trim()).filter(Boolean);
      if (spans[0]) workExperience.push({ role: spans[0], company: (spans[1] || '').split('·')[0].trim(), period: spans[2] || '', description: spans[4] || '' });
    });

    const education = [];
    document.querySelectorAll('#education ~ * li').forEach(li => {
      const spans = [...li.querySelectorAll('span[aria-hidden="true"]')].map(s => s.textContent?.trim()).filter(Boolean);
      if (spans[0]) education.push({ institution: spans[0], degree: spans[1] || '', period: spans[2] || '' });
    });

    const photoEl = document.querySelector('.pv-top-card-profile-picture__image--show, .pv-top-card-profile-picture img, img[class*="profile-photo"]');

    return {
      name, headline, location, currentCompany,
      about: about.substring(0, 2000),
      profilePhotoUrl: photoEl?.src || '',
      linkedInUrl: window.location.href.split('?')[0].replace(/\/$/, '').toLowerCase(),
      skills: skills.slice(0, 25),
      workExperience: workExperience.slice(0, 10),
      education: education.slice(0, 5),
    };
  }

  // ── Job change signal detection ───────────────────────────────────────────

  const MONTH_MAP = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };

  function parseStartDate(periodStr) {
    if (!periodStr) return null;
    // "Jan 2024 – Present" or "January 2024 – Present"
    const named = periodStr.match(/([A-Za-z]+)\s+(\d{4})/);
    if (named) {
      const mon = MONTH_MAP[named[1].toLowerCase().slice(0, 3)];
      const yr = parseInt(named[2]);
      if (mon !== undefined && yr) return new Date(yr, mon, 1);
    }
    // "2024 – Present"
    const yearOnly = periodStr.match(/^(\d{4})/);
    if (yearOnly) return new Date(parseInt(yearOnly[1]), 0, 1);
    return null;
  }

  function monthsAgo(date) {
    const now = new Date();
    return (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
  }

  function detectSignals(workExperience) {
    const signals = [];
    if (!workExperience || workExperience.length === 0) return signals;

    const latest = workExperience[0];
    const startDate = parseStartDate(latest.period);

    if (startDate) {
      const ago = monthsAgo(startDate);
      // Started a new role recently — prime sourcing target
      if (ago <= 3) {
        signals.push({ type: 'hot', label: `Started new role ${ago <= 1 ? 'this month' : ago + 'mo ago'}`, icon: '🔔' });
      } else if (ago <= 6) {
        signals.push({ type: 'warm', label: `Changed role ${ago}mo ago`, icon: '📍' });
      }

      // Detect likely promotion: same company but new title in experience list
      if (workExperience.length >= 2) {
        const prev = workExperience[1];
        const sameCompany = latest.company && prev.company &&
          latest.company.toLowerCase().includes(prev.company.toLowerCase().split(' ')[0]);
        if (sameCompany && latest.role !== prev.role) {
          signals.push({ type: 'promo', label: 'Recently promoted', icon: '⬆' });
        }
      }
    }

    // Open to work — check profile photo frame and headline
    const openFrame = document.querySelector('.open-to-work-hero-image, [class*="open-to-work"]');
    const headline = getText('.text-body-medium.break-words') || '';
    if (openFrame || /open to (work|opportunities|roles|new roles)/i.test(headline)) {
      signals.push({ type: 'open', label: 'Open to opportunities', icon: '✓' });
    }

    return signals;
  }

  // ── Search results extraction ─────────────────────────────────────────────

  function extractSearchResults() {
    const results = [];
    const cards = document.querySelectorAll(
      'li.reusable-search__result-container, [data-view-name="search-entity-result-universal-template"]'
    );
    cards.forEach(card => {
      const nameEl   = card.querySelector('.entity-result__title-text a span[aria-hidden="true"], .app-aware-link span[aria-hidden="true"]');
      const titleEl  = card.querySelector('.entity-result__primary-subtitle');
      const compEl   = card.querySelector('.entity-result__secondary-subtitle');
      const locEl    = card.querySelector('.entity-result__tertiary-subtitle span[aria-hidden="true"]');
      const linkEl   = card.querySelector('a[href*="/in/"]');
      const photoEl  = card.querySelector('img.presence-entity__image, .entity-result__universal-image img');

      const name       = nameEl?.textContent?.trim();
      const profileUrl = linkEl?.href?.split('?')[0]?.replace(/\/$/, '')?.toLowerCase();

      if (!name || !profileUrl || !profileUrl.includes('/in/')) return;

      results.push({
        name,
        headline:       titleEl?.textContent?.trim() || '',
        currentCompany: compEl?.textContent?.trim()  || '',
        location:       locEl?.textContent?.trim()   || '',
        linkedInUrl:    profileUrl,
        profilePhotoUrl: photoEl?.src || '',
        workExperience: [], education: [], skills: [], about: '',
      });
    });
    return results;
  }

  // ── Shared CSS ────────────────────────────────────────────────────────────

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
    :host { all: initial; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

    #panel {
      position: fixed;
      bottom: 24px; right: 24px;
      width: 288px;
      background: #fff;
      border: 1px solid #e5e5e4;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,.06), 0 12px 28px -4px rgba(0,0,0,.14);
      z-index: 2147483647;
      overflow: hidden;
      transition: opacity .18s, transform .18s;
      max-height: 560px;
      display: flex; flex-direction: column;
    }
    #panel.hidden { opacity: 0; pointer-events: none; transform: translateY(6px); }

    .cf-header {
      display: flex; align-items: center; gap: 8px;
      padding: 0 13px; height: 44px;
      border-bottom: 1px solid #efefee;
      background: #f7f7f6; flex-shrink: 0;
    }
    .cf-logo-wrap {
      width: 22px; height: 22px; background: #1a1a1a;
      border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .cf-logo { width: 14px; height: 14px; object-fit: contain; filter: invert(1) brightness(10); }
    .cf-title { font-size: 12px; font-weight: 600; color: #1a1a1a; letter-spacing: -.01em; flex: 1; }
    .cf-mode-badge {
      font-size: 10px; font-weight: 500; padding: 2px 7px;
      border-radius: 99px; letter-spacing: .02em;
    }
    .cf-mode-badge.search { background: #f0f7ff; color: #2563eb; }
    .cf-mode-badge.profile { background: #f0fdf4; color: #16a34a; }
    .cf-close {
      width: 24px; height: 24px; border-radius: 5px;
      border: none; background: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: #9b9b9b; font-size: 16px; line-height: 1;
      transition: background .12s, color .12s;
    }
    .cf-close:hover { background: #efefee; color: #1a1a1a; }

    .cf-scroll { overflow-y: auto; flex: 1; }

    /* Signals */
    .cf-signals {
      display: flex; flex-direction: column; gap: 4px;
      padding: 10px 13px; border-bottom: 1px solid #efefee;
    }
    .cf-signal {
      display: flex; align-items: center; gap: 7px;
      font-size: 11px; color: #1a1a1a; line-height: 1.3;
    }
    .cf-signal-icon { font-size: 12px; flex-shrink: 0; }
    .cf-signal.hot .cf-signal-label { color: #dc2626; font-weight: 500; }
    .cf-signal.warm .cf-signal-label { color: #d97706; font-weight: 500; }
    .cf-signal.open .cf-signal-label { color: #16a34a; font-weight: 500; }
    .cf-signal.promo .cf-signal-label { color: #2563eb; font-weight: 500; }

    /* Profile save UI */
    .cf-candidate {
      padding: 12px 13px 11px; border-bottom: 1px solid #efefee;
    }
    .cf-name { font-size: 13px; font-weight: 600; color: #1a1a1a; line-height: 1.3; }
    .cf-meta { font-size: 11px; color: #6b6b6b; margin-top: 3px; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .cf-body { padding: 12px 13px 13px; }
    .cf-label {
      font-size: 10px; font-weight: 500; color: #9b9b9b;
      text-transform: uppercase; letter-spacing: .07em; margin-bottom: 6px;
    }

    select {
      width: 100%; height: 34px; padding: 0 28px 0 10px;
      border: 1px solid #e5e5e4; border-radius: 6px;
      font-family: inherit; font-size: 12px; color: #1a1a1a;
      background: #efefee url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%239b9b9b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 9px center;
      appearance: none; outline: none; cursor: pointer;
      transition: border-color .12s; margin-bottom: 9px;
    }
    select:focus { border-color: #1a1a1a; background-color: #fff; }
    select:disabled { opacity: .5; cursor: not-allowed; }

    button.cf-save, button.cf-source-btn {
      width: 100%; height: 34px;
      background: #1a1a1a; color: #fff;
      border: none; border-radius: 7px;
      font-family: inherit; font-size: 12px; font-weight: 500;
      cursor: pointer; transition: background .12s, transform .08s;
      letter-spacing: -.01em;
      display: flex; align-items: center; justify-content: center; gap: 6px;
    }
    button.cf-save:hover:not(:disabled),
    button.cf-source-btn:hover:not(:disabled) { background: #2d2d2d; }
    button.cf-save:active:not(:disabled),
    button.cf-source-btn:active:not(:disabled) { transform: scale(0.99); }
    button.cf-save:disabled,
    button.cf-source-btn:disabled { opacity: .5; cursor: not-allowed; }
    button.cf-save.success, button.cf-source-btn.success { background: #16a34a; }
    button.cf-save.error, button.cf-source-btn.error   { background: #eb5757; }

    .cf-msg {
      font-size: 11px; color: #6b6b6b;
      text-align: center; padding: 6px 0 0; line-height: 1.5;
    }
    .cf-msg.err { color: #eb5757; }
    .cf-msg.success { color: #16a34a; }

    .cf-auth { padding: 18px 13px; text-align: center; }
    .cf-auth p { font-size: 12px; color: #6b6b6b; line-height: 1.6; }
    .cf-auth small { font-size: 11px; color: #9b9b9b; margin-top: 5px; display: block; }

    .cf-spinner {
      display: inline-block; width: 12px; height: 12px;
      border: 1.5px solid rgba(255,255,255,.3);
      border-top-color: #fff;
      border-radius: 50%; animation: cf-spin .55s linear infinite; flex-shrink: 0;
    }
    @keyframes cf-spin { to { transform: rotate(360deg); } }

    /* Search results list */
    .cf-search-header { padding: 11px 13px 10px; border-bottom: 1px solid #efefee; }
    .cf-search-title { font-size: 12px; font-weight: 600; color: #1a1a1a; margin-bottom: 2px; }
    .cf-search-sub { font-size: 11px; color: #9b9b9b; }

    .cf-candidate-list { flex: 1; overflow-y: auto; }
    .cf-candidate-row {
      display: flex; align-items: flex-start; gap: 9px;
      padding: 9px 13px; border-bottom: 1px solid #f5f5f4; cursor: pointer;
      transition: background .1s;
    }
    .cf-candidate-row:hover { background: #f7f7f6; }
    .cf-candidate-row.selected { background: #f0f7ff; }
    .cf-row-check {
      width: 15px; height: 15px; border-radius: 4px; border: 1.5px solid #d1d1d0;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; margin-top: 1px; transition: border-color .1s, background .1s;
    }
    .cf-candidate-row.selected .cf-row-check {
      background: #1a1a1a; border-color: #1a1a1a;
    }
    .cf-check-svg { display: none; }
    .cf-candidate-row.selected .cf-check-svg { display: block; }
    .cf-row-name { font-size: 12px; font-weight: 600; color: #1a1a1a; line-height: 1.3; }
    .cf-row-meta { font-size: 11px; color: #6b6b6b; margin-top: 1px; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }

    .cf-search-footer {
      padding: 11px 13px; border-top: 1px solid #efefee;
      display: flex; flex-direction: column; gap: 8px; flex-shrink: 0;
    }
    .cf-select-all {
      font-size: 11px; font-weight: 500; color: #6b6b6b;
      background: none; border: none; cursor: pointer; padding: 0;
      text-align: left; transition: color .1s;
    }
    .cf-select-all:hover { color: #1a1a1a; }

    .cf-progress {
      height: 3px; background: #efefee; border-radius: 99px; overflow: hidden;
    }
    .cf-progress-bar {
      height: 100%; background: #1a1a1a; border-radius: 99px;
      transition: width .3s ease;
    }

    /* Toggle FAB */
    #cf-toggle {
      position: fixed; bottom: 24px; right: 24px;
      width: 42px; height: 42px; border-radius: 50%;
      background: #1a1a1a; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 10px rgba(0,0,0,.28);
      z-index: 2147483647; transition: background .12s, transform .12s;
    }
    #cf-toggle:hover { background: #2d2d2d; transform: scale(1.06); }
    #cf-toggle img { width: 20px; height: 20px; object-fit: contain; filter: invert(1) brightness(10); }
    #cf-toggle.hidden { display: none; }
  `;

  // ── Shadow DOM scaffold ───────────────────────────────────────────────────

  function buildHost() {
    const host = document.createElement('div');
    host.id = 'coreflow-host';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = CSS;
    shadow.appendChild(style);

    const toggle = document.createElement('button');
    toggle.id = 'cf-toggle';
    toggle.innerHTML = `<img src="${chrome.runtime.getURL('icons/icon48.png')}" alt="CF" />`;
    toggle.title = 'CoreflowHR';
    toggle.classList.add('hidden');
    shadow.appendChild(toggle);

    const panel = document.createElement('div');
    panel.id = 'panel';
    panel.innerHTML = `
      <div class="cf-header">
        <div class="cf-logo-wrap">
          <img class="cf-logo" src="${chrome.runtime.getURL('icons/icon48.png')}" alt="" />
        </div>
        <span class="cf-title">CoreflowHR</span>
        <span class="cf-mode-badge ${isSearchPage ? 'search' : 'profile'}">${isSearchPage ? 'Bulk Source' : 'Quick Save'}</span>
        <button class="cf-close" id="cf-close-btn" title="Collapse">×</button>
      </div>
      <div class="cf-scroll" id="cf-content"></div>
    `;
    shadow.appendChild(panel);

    shadow.getElementById('cf-close-btn').addEventListener('click', () => {
      panel.classList.add('hidden');
      toggle.classList.remove('hidden');
    });
    toggle.addEventListener('click', () => {
      panel.classList.remove('hidden');
      toggle.classList.add('hidden');
    });

    return { shadow, panel, toggle, content: shadow.getElementById('cf-content') };
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  function renderNotAuth(content) {
    content.innerHTML = `
      <div class="cf-auth">
        <p>Sign in to CoreflowHR to start sourcing candidates.</p>
        <small>Click the CoreflowHR icon in your browser toolbar.</small>
      </div>
    `;
  }

  function renderLoading(content) {
    content.innerHTML = `
      <div class="cf-body" style="text-align:center;padding:20px 14px;color:#9b9b9b;font-size:12px;">
        Loading…
      </div>
    `;
  }

  // ── Profile page UI ───────────────────────────────────────────────────────

  function renderProfileUI(content, profile, jobs, savedJobId) {
    const signals = detectSignals(profile.workExperience);
    const metaParts = [profile.headline, profile.currentCompany].filter(Boolean);

    const signalsHTML = signals.length ? `
      <div class="cf-signals">
        ${signals.map(s => `
          <div class="cf-signal ${s.type}">
            <span class="cf-signal-icon">${s.icon}</span>
            <span class="cf-signal-label">${s.label}</span>
          </div>
        `).join('')}
      </div>
    ` : '';

    content.innerHTML = `
      <div class="cf-candidate">
        <div class="cf-name">${profile.name || 'LinkedIn Profile'}</div>
        ${metaParts.length ? `<div class="cf-meta">${metaParts.join(' · ')}</div>` : ''}
      </div>
      ${signalsHTML}
      <div class="cf-body">
        <div class="cf-label">Source into job</div>
        ${jobs.length === 0
          ? `<div class="cf-msg">No active jobs. Create one in CoreflowHR first.</div>`
          : `<select id="cf-job-select">
               ${jobs.map(j => `<option value="${j.id}">${j.title}</option>`).join('')}
             </select>
             <button class="cf-save" id="cf-save-btn">Add to Pipeline</button>
             <div class="cf-msg" id="cf-status"></div>`
        }
      </div>
    `;

    if (jobs.length === 0) return;

    const select  = content.querySelector('#cf-job-select');
    const saveBtn = content.querySelector('#cf-save-btn');
    const status  = content.querySelector('#cf-status');

    if (savedJobId && jobs.some(j => j.id === savedJobId)) select.value = savedJobId;

    select.addEventListener('change', () => {
      chrome.storage.local.set({ selectedJobId: select.value });
    });

    saveBtn.addEventListener('click', () => {
      const jobId = select.value;
      if (!jobId) { status.textContent = 'Please select a job.'; status.className = 'cf-msg err'; return; }

      saveBtn.disabled = true;
      saveBtn.innerHTML = `<span class="cf-spinner"></span>Saving…`;
      status.textContent = '';
      chrome.storage.local.set({ selectedJobId: jobId });

      chrome.runtime.sendMessage({ type: 'SAVE_PROFILE', profile }, res => {
        if (chrome.runtime.lastError || !res) {
          saveBtn.disabled = false; saveBtn.textContent = 'Add to Pipeline';
          status.textContent = 'Something went wrong.'; status.className = 'cf-msg err'; return;
        }
        if (res.error === 'not_authenticated') { renderNotAuth(content); return; }
        if (res.error === 'no_job') {
          saveBtn.disabled = false; saveBtn.textContent = 'Add to Pipeline';
          status.textContent = 'Select a job first.'; status.className = 'cf-msg err'; return;
        }
        if (res.success) {
          saveBtn.classList.add('success');
          saveBtn.textContent = res.isUpdate ? 'Updated ✓' : 'Sourced ✓';
          status.textContent = res.isUpdate ? 'Profile updated in pipeline.' : 'Candidate added to pipeline.';
          status.className = 'cf-msg success';
          setTimeout(() => {
            saveBtn.classList.remove('success'); saveBtn.disabled = false;
            saveBtn.textContent = 'Add to Pipeline'; status.textContent = '';
            status.className = 'cf-msg';
          }, 4000);
        } else {
          saveBtn.disabled = false; saveBtn.textContent = 'Add to Pipeline';
          status.textContent = res.error || 'Something went wrong.'; status.className = 'cf-msg err';
        }
      });
    });
  }

  // ── Search results page UI ────────────────────────────────────────────────

  function renderSearchUI(content, candidates, jobs, savedJobId) {
    if (candidates.length === 0) {
      content.innerHTML = `
        <div class="cf-auth">
          <p>No candidate profiles found on this page.</p>
          <small>Scroll down to load results, then try again.</small>
          <button id="cf-retry" style="margin-top:12px;width:100%;height:32px;background:#1a1a1a;color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:500;cursor:pointer;">Refresh</button>
        </div>
      `;
      content.querySelector('#cf-retry')?.addEventListener('click', () => {
        renderLoading(content);
        setTimeout(() => {
          const fresh = extractSearchResults();
          renderSearchUI(content, fresh, jobs, savedJobId);
        }, 400);
      });
      return;
    }

    const selected = new Set();

    function render() {
      const selCount = selected.size;
      content.innerHTML = `
        <div class="cf-search-header">
          <div class="cf-search-title">Source into pipeline</div>
          <div class="cf-search-sub">${candidates.length} candidates found on page</div>
        </div>
        <div class="cf-body" style="padding-bottom:10px;">
          <div class="cf-label">Target job</div>
          ${jobs.length === 0
            ? `<div class="cf-msg">No active jobs. Create one in CoreflowHR first.</div>`
            : `<select id="cf-job-select">
                 ${jobs.map(j => `<option value="${j.id}"${j.id === savedJobId ? ' selected' : ''}>${j.title}</option>`).join('')}
               </select>`
          }
        </div>
        <div class="cf-candidate-list" id="cf-list">
          ${candidates.map((c, i) => `
            <div class="cf-candidate-row${selected.has(i) ? ' selected' : ''}" data-index="${i}">
              <div class="cf-row-check">
                <svg class="cf-check-svg" width="9" height="9" viewBox="0 0 9 9" fill="none">
                  <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div style="min-width:0">
                <div class="cf-row-name">${c.name}</div>
                <div class="cf-row-meta">${[c.headline, c.currentCompany].filter(Boolean).join(' · ') || c.location || ''}</div>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="cf-search-footer">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <button class="cf-select-all" id="cf-select-all">
              ${selCount === candidates.length ? 'Deselect all' : 'Select all'}
            </button>
            <span style="font-size:11px;color:#6b6b6b;">${selCount} selected</span>
          </div>
          ${selCount > 0 ? `
            <button class="cf-source-btn" id="cf-source-btn">
              Source ${selCount} candidate${selCount === 1 ? '' : 's'}
            </button>
          ` : ''}
          <div class="cf-msg" id="cf-status"></div>
        </div>
      `;

      // Row toggle
      content.querySelectorAll('.cf-candidate-row').forEach(row => {
        row.addEventListener('click', () => {
          const idx = parseInt(row.dataset.index);
          selected.has(idx) ? selected.delete(idx) : selected.add(idx);
          render();
        });
      });

      // Select all / deselect all
      content.querySelector('#cf-select-all')?.addEventListener('click', () => {
        if (selected.size === candidates.length) {
          selected.clear();
        } else {
          candidates.forEach((_, i) => selected.add(i));
        }
        render();
      });

      // Job selection persist
      const jobSel = content.querySelector('#cf-job-select');
      jobSel?.addEventListener('change', () => {
        chrome.storage.local.set({ selectedJobId: jobSel.value });
      });

      // Source button
      const sourceBtn = content.querySelector('#cf-source-btn');
      sourceBtn?.addEventListener('click', () => {
        const jobId = content.querySelector('#cf-job-select')?.value;
        if (!jobId) return;

        const toSource = [...selected].map(i => candidates[i]);
        sourceBtn.disabled = true;
        sourceBtn.innerHTML = `<span class="cf-spinner"></span>Sourcing ${toSource.length}…`;

        chrome.runtime.sendMessage({ type: 'BULK_SAVE_PROFILES', jobId, profiles: toSource }, res => {
          if (chrome.runtime.lastError || !res?.success) {
            sourceBtn.disabled = false;
            sourceBtn.textContent = `Source ${toSource.length} candidate${toSource.length === 1 ? '' : 's'}`;
            const st = content.querySelector('#cf-status');
            if (st) { st.textContent = 'Something went wrong. Try again.'; st.className = 'cf-msg err'; }
            return;
          }
          const { saved = 0, updated = 0, failed = 0 } = res;
          sourceBtn.classList.add('success');
          sourceBtn.textContent = `${saved + updated} sourced ✓`;
          const st = content.querySelector('#cf-status');
          if (st) {
            st.textContent = `${saved} new · ${updated} updated${failed > 0 ? ` · ${failed} skipped` : ''}`;
            st.className = 'cf-msg success';
          }
          selected.clear();
        });
      });
    }

    render();
  }

  // ── Init panel ────────────────────────────────────────────────────────────

  async function initPanel() {
    const { content } = buildHost();
    renderLoading(content);

    const authRes = await new Promise(r => chrome.runtime.sendMessage({ type: 'CHECK_AUTH' }, r));
    if (!authRes?.authenticated) { renderNotAuth(content); return; }

    const [jobsRes, { selectedJobId }] = await Promise.all([
      new Promise(r => chrome.runtime.sendMessage({ type: 'GET_JOBS' }, r)),
      new Promise(r => chrome.storage.local.get(['selectedJobId'], r)),
    ]);

    if (jobsRes?.error === 'not_authenticated') { renderNotAuth(content); return; }

    const jobs = jobsRes?.jobs || [];

    if (isSearchPage) {
      const candidates = extractSearchResults();
      renderSearchUI(content, candidates, jobs, selectedJobId);
    } else {
      const profile = extractProfile();
      renderProfileUI(content, profile, jobs, selectedJobId);
    }
  }

  // ── Wait for page ready ───────────────────────────────────────────────────

  function waitAndInit(retries = 0) {
    const ready = isSearchPage
      ? !!document.querySelector('li.reusable-search__result-container, [data-view-name="search-entity-result-universal-template"]')
      : !!document.querySelector('h1');

    if (ready || retries > 20) {
      initPanel();
    } else {
      setTimeout(() => waitAndInit(retries + 1), 600);
    }
  }

  // ── SPA navigation support ────────────────────────────────────────────────

  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    const relevant = /linkedin\.com\/in\//.test(location.href) ||
                     /linkedin\.com\/search\/results\/people/.test(location.href);
    if (relevant) {
      document.getElementById('coreflow-host')?.remove();
      setTimeout(() => waitAndInit(), 1200);
    }
  }).observe(document.documentElement, { childList: true, subtree: true });

  // ── Start ─────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => waitAndInit());
  } else {
    waitAndInit();
  }

})();
