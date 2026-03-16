'use strict';

const SUPABASE_URL = 'https://lpjyxpxkagctaibmqcoi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxwanl4cHhrYWdjdGFpYm1xY29pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTYxNjUsImV4cCI6MjA3OTYzMjE2NX0.-_1W16G-hzj8Y61wA1zWemfK5iaB9BsS8BXA_fsQniM';

async function getStorage(...keys) {
  return new Promise(resolve => chrome.storage.local.get(keys, resolve));
}

async function setStorage(obj) {
  return new Promise(resolve => chrome.storage.local.set(obj, resolve));
}

async function signIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error_description || data.msg || 'Login failed' };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

async function refreshAccessToken(refreshToken) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const data = await res.json();
  if (!res.ok) return null;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

async function getValidToken() {
  const { accessToken, refreshToken, expiresAt } = await getStorage('accessToken', 'refreshToken', 'expiresAt');
  if (!accessToken) return null;
  if (expiresAt && Date.now() > expiresAt - 60_000) {
    const refreshed = await refreshAccessToken(refreshToken);
    if (!refreshed) return null;
    await setStorage(refreshed);
    return refreshed.accessToken;
  }
  return accessToken;
}

async function callEdgeFunction(method, body = null) {
  const token = await getValidToken();
  if (!token) return { error: 'not_authenticated' };

  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${SUPABASE_URL}/functions/v1/linkedin-import`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || `HTTP ${res.status}` };
  return data;
}

// Increment sourced count in storage for today's session stats
async function incrementSourcedCount(count = 1) {
  const { sourcedToday = 0, sourcedDate } = await getStorage('sourcedToday', 'sourcedDate');
  const today = new Date().toDateString();
  const base = sourcedDate === today ? sourcedToday : 0;
  await setStorage({ sourcedToday: base + count, sourcedDate: today });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === 'SIGN_IN') {
    signIn(message.email, message.password).then(async result => {
      if (result.error) { sendResponse({ error: result.error }); return; }
      await setStorage({ ...result, userEmail: message.email });
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'SIGN_OUT') {
    chrome.storage.local.remove(
      ['accessToken', 'refreshToken', 'expiresAt', 'selectedJobId', 'userEmail', 'sourcedToday', 'sourcedDate'],
      () => sendResponse({ success: true })
    );
    return true;
  }

  if (message.type === 'GET_JOBS') {
    callEdgeFunction('GET').then(sendResponse);
    return true;
  }

  if (message.type === 'SAVE_PROFILE') {
    getStorage('selectedJobId').then(({ selectedJobId }) => {
      if (!selectedJobId) { sendResponse({ error: 'no_job' }); return; }
      callEdgeFunction('POST', { jobId: selectedJobId, profile: message.profile })
        .then(async res => {
          if (res.success) await incrementSourcedCount(1);
          sendResponse(res);
        });
    });
    return true;
  }

  // Bulk source: import multiple profiles from a search results page
  if (message.type === 'BULK_SAVE_PROFILES') {
    const { jobId, profiles } = message;
    if (!jobId || !profiles?.length) { sendResponse({ error: 'missing_params' }); return true; }

    const results = { saved: 0, updated: 0, failed: 0 };
    Promise.all(
      profiles.map(profile =>
        callEdgeFunction('POST', { jobId, profile })
          .then(res => {
            if (res.success) {
              res.isUpdate ? results.updated++ : results.saved++;
            } else {
              results.failed++;
            }
          })
          .catch(() => { results.failed++; })
      )
    ).then(async () => {
      const total = results.saved + results.updated;
      if (total > 0) await incrementSourcedCount(total);
      sendResponse({ success: true, ...results });
    });
    return true;
  }

  if (message.type === 'CHECK_AUTH') {
    getValidToken().then(token => sendResponse({ authenticated: !!token }));
    return true;
  }

  if (message.type === 'GET_STATS') {
    getStorage('sourcedToday', 'sourcedDate').then(({ sourcedToday = 0, sourcedDate }) => {
      const today = new Date().toDateString();
      sendResponse({ sourcedToday: sourcedDate === today ? sourcedToday : 0 });
    });
    return true;
  }
});
