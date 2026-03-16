'use strict';

document.addEventListener('DOMContentLoaded', () => {

  const viewLogin     = document.getElementById('view-login');
  const viewConnected = document.getElementById('view-connected');
  const emailInput    = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const btnLogin      = document.getElementById('btn-login');
  const loginError    = document.getElementById('login-error');
  const jobSelect     = document.getElementById('job-select');
  const noJobsHint    = document.getElementById('no-jobs-hint');
  const btnSignout    = document.getElementById('btn-signout');
  const emailDisplay  = document.getElementById('conn-email-display');
  const statToday     = document.getElementById('stat-today');
  const statJobs      = document.getElementById('stat-jobs');

  function show(view) {
    viewLogin.style.display     = view === 'login'     ? 'flex' : 'none';
    viewConnected.style.display = view === 'connected' ? 'flex' : 'none';
  }

  function setError(msg) {
    loginError.textContent   = msg;
    loginError.style.display = msg ? 'block' : 'none';
  }

  function sendMessage(msg) {
    return new Promise(resolve => {
      chrome.runtime.sendMessage(msg, response => resolve(response || {}));
    });
  }

  async function loadJobs() {
    jobSelect.innerHTML      = '<option value="">Loading…</option>';
    noJobsHint.style.display = 'none';

    const res  = await sendMessage({ type: 'GET_JOBS' });
    if (res.error === 'not_authenticated') { show('login'); return; }
    if (res.error) { jobSelect.innerHTML = '<option value="">Failed to load</option>'; return; }

    const jobs = res.jobs || [];
    statJobs.textContent = jobs.length;

    if (jobs.length === 0) {
      jobSelect.innerHTML      = '<option value="">No active jobs</option>';
      noJobsHint.style.display = 'block';
    } else {
      jobSelect.innerHTML = jobs.map(j => `<option value="${j.id}">${j.title}</option>`).join('');
    }

    // Restore last selected job
    chrome.storage.local.get(['selectedJobId'], ({ selectedJobId }) => {
      if (selectedJobId && Array.from(jobSelect.options).some(o => o.value === selectedJobId)) {
        jobSelect.value = selectedJobId;
      }
    });
  }

  async function loadStats() {
    const res = await sendMessage({ type: 'GET_STATS' });
    statToday.textContent = res.sourcedToday ?? 0;
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  chrome.storage.local.get(['accessToken', 'userEmail'], async ({ accessToken, userEmail }) => {
    if (accessToken) {
      if (emailDisplay) emailDisplay.textContent = userEmail || '';
      show('connected');
      await Promise.all([loadJobs(), loadStats()]);
    } else {
      show('login');
    }
  });

  // ── Login ─────────────────────────────────────────────────────────────────

  btnLogin.addEventListener('click', async () => {
    const email    = emailInput.value.trim();
    const password = passwordInput.value;
    setError('');

    if (!email || !password) { setError('Please enter your email and password.'); return; }

    btnLogin.disabled    = true;
    btnLogin.textContent = 'Signing in…';

    const res = await sendMessage({ type: 'SIGN_IN', email, password });

    btnLogin.disabled    = false;
    btnLogin.textContent = 'Sign in';

    if (res.error) { setError(res.error); return; }

    if (emailDisplay) emailDisplay.textContent = email;
    show('connected');
    await Promise.all([loadJobs(), loadStats()]);
  });

  emailInput.addEventListener('keydown',    e => { if (e.key === 'Enter') passwordInput.focus(); });
  passwordInput.addEventListener('keydown', e => { if (e.key === 'Enter') btnLogin.click(); });

  // ── Job selection ─────────────────────────────────────────────────────────

  jobSelect.addEventListener('change', () => {
    chrome.storage.local.set({ selectedJobId: jobSelect.value || null });
    // Broadcast updated job to any open content scripts
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'JOB_CHANGED', jobId: jobSelect.value }).catch(() => {});
      }
    });
  });

  // ── Sign out ──────────────────────────────────────────────────────────────

  btnSignout.addEventListener('click', async () => {
    await sendMessage({ type: 'SIGN_OUT' });
    emailInput.value    = '';
    passwordInput.value = '';
    setError('');
    show('login');
  });

});
