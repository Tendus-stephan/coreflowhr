import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, Plus, X, Camera, Briefcase, Upload, Kanban, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { Avatar } from '../components/ui/Avatar';

type StepKey = 'workspace_name' | 'profile' | 'google' | 'invites' | 'client';
type StepStatus = 'done' | 'skipped';
type WizardStep = 1 | 2 | 3 | 4 | 5 | 'complete';

interface InviteRow {
  email: string;
  role: UserRole;
}

const TOTAL_STEPS = 5;

const stepKey = (step: WizardStep): StepKey | null => {
  switch (step) {
    case 1: return 'workspace_name';
    case 2: return 'profile';
    case 3: return 'google';
    case 4: return 'invites';
    case 5: return 'client';
    default: return null;
  }
};

const DotIndicator: React.FC<{ current: WizardStep }> = ({ current }) => {
  const stepNum = current === 'complete' ? TOTAL_STEPS + 1 : (current as number);
  return (
    <div className="flex items-center gap-2 mb-6">
      <span className="text-xs font-medium text-gray-400">
        {current === 'complete' ? 'Complete' : `Step ${stepNum} of ${TOTAL_STEPS}`}
      </span>
      <div className="flex items-center gap-1.5 ml-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i < stepNum ? 'bg-gray-400' : i === stepNum ? 'bg-gray-900' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const [step, setStep] = useState<WizardStep>(1);
  const [steps, setSteps] = useState<Partial<Record<StepKey, StepStatus>>>({});
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — workspace
  const [workspaceName, setWorkspaceName] = useState('');

  // Step 2 — profile
  const [profileName, setProfileName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Step 3 — Google
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleChecking, setGoogleChecking] = useState(false);
  const [googleWaiting, setGoogleWaiting] = useState(false);
  const googlePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Step 4 — Invites
  const roleDropdownRef = useRef<HTMLDivElement | null>(null);
  const [invites, setInvites] = useState<InviteRow[]>([{ email: '', role: 'Recruiter' }]);
  const [sendingInvites, setSendingInvites] = useState(false);
  const [inviteErrors, setInviteErrors] = useState<(string | null)[]>([null]);
  const [inviteSent, setInviteSent] = useState<boolean[]>([false]);
  const [roleOpenIdx, setRoleOpenIdx] = useState<number | null>(null);

  // Step 5 — Client
  const [clientName, setClientName] = useState('');
  const [clientIndustry, setClientIndustry] = useState('');
  const [savingClient, setSavingClient] = useState(false);

  // Pre-fill workspace name + profile name on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const user = authUser;
        if (!user || !mounted) return;

        // Check if already completed
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed, name, avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.onboarding_completed === true) {
          navigate('/dashboard', { replace: true });
          return;
        }

        if (mounted) {
          setProfileName(profile?.name || user.email?.split('@')[0] || '');
          setAvatarUrl(profile?.avatar_url || null);
        }

        const ws = await api.workspaces.getWorkspaceWithMembers();
        if (mounted) setWorkspaceName(ws.name || '');
      } catch { /* ignore */ }
    })();
    return () => { mounted = false; };
  }, [navigate]);


  const checkGoogleConnection = async () => {
    setGoogleChecking(true);
    try {
      const integrations = await api.settings.getIntegrations();
      const gcal = integrations.find(i => i.name === 'Google Calendar');
      setGoogleConnected(!!gcal?.active);
    } catch { /* ignore */ } finally {
      setGoogleChecking(false);
    }
  };

  const recordStep = (s: WizardStep, status: StepStatus) => {
    const key = stepKey(s);
    if (!key) return;
    setSteps(prev => ({ ...prev, [key]: status }));
  };

  const advanceStep = (from: WizardStep, status: StepStatus) => {
    recordStep(from, status);
    setError(null);
    setStep(from === 5 ? 'complete' : (from as number + 1) as WizardStep);
  };

  // ── Avatar upload ──────────────────────────────────────────────

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB.'); return; }

    setUploadingAvatar(true);
    setError(null);
    try {
      const user = authUser;
      if (!user) { setError('Please refresh the page and try again.'); setUploadingAvatar(false); return; }
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(publicUrl);
    } catch (e: any) {
      setError(e?.message || 'Failed to upload photo.');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // ── Step handlers ──────────────────────────────────────────────

  const handleStep1 = async () => {
    if (!workspaceName.trim()) { setError('Please enter a workspace name.'); return; }
    setError(null);
    try {
      await api.workspaces.updateWorkspace({ name: workspaceName.trim() });
      window.dispatchEvent(new CustomEvent('workspaceUpdated'));
    } catch { /* non-blocking */ }
    advanceStep(1, 'done');
  };

  const handleStep2 = async () => {
    if (!profileName.trim()) { setError('Please enter your name.'); return; }
    setSavingProfile(true);
    setError(null);
    try {
      await api.auth.updateProfile({ name: profileName.trim(), avatar: avatarUrl ?? undefined });
      window.dispatchEvent(new Event('profileUpdated'));
      advanceStep(2, 'done');
    } catch (e: any) {
      setError(e?.message || 'Failed to save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const stopGooglePoll = () => {
    if (googlePollRef.current) {
      clearInterval(googlePollRef.current);
      googlePollRef.current = null;
    }
  };

  const startGooglePoll = () => {
    stopGooglePoll();
    googlePollRef.current = setInterval(async () => {
      try {
        const integrations = await api.settings.getIntegrations();
        const gcal = integrations.find(i => i.name === 'Google Calendar');
        if (gcal?.active) {
          stopGooglePoll();
          setGoogleWaiting(false);
          setGoogleConnected(true);
          try { localStorage.removeItem('google_oauth_done'); } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
    }, 2500);
  };

  // Listen for the storage event fired when the OAuth tab closes
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'google_oauth_done' && e.newValue) {
        stopGooglePoll();
        setGoogleWaiting(false);
        setGoogleConnected(true);
        try { localStorage.removeItem('google_oauth_done'); } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      stopGooglePoll();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close role dropdown on outside click
  useEffect(() => {
    if (roleOpenIdx === null) return;
    const handler = (e: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node)) {
        setRoleOpenIdx(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [roleOpenIdx]);

  // Check Google connection status when entering step 3
  useEffect(() => {
    if (step === 3) checkGoogleConnection();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Auto-advance 1.5 s after Google connects
  useEffect(() => {
    if (!googleConnected || step !== 3) return;
    const t = setTimeout(() => advanceStep(3, 'done'), 1500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleConnected, step]);

  const handleConnectGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const integrations = await api.settings.getIntegrations();
      const gcal = integrations.find(i => i.name === 'Google Calendar');
      if (!gcal) throw new Error('Google Calendar integration not found');
      const { url, error: connectError } = await api.settings.connectIntegration(gcal.id);
      if (connectError) throw new Error(connectError);
      if (url) {
        window.open(url, 'google_oauth', 'width=600,height=700,resizable=yes');
        setGoogleWaiting(true);
        startGooglePoll();
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to start Google connection.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleStep4 = async () => {
    // Client-side validation first
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const newErrors: (string | null)[] = invites.map((r, i) => {
      if (inviteSent[i]) return null; // already sent — no re-validation
      const email = r.email.trim();
      if (!email) return 'Please enter an email address';
      if (!emailRe.test(email)) return 'Please enter a valid email address';
      return null;
    });

    // If all rows are empty (and none already sent), show error on first row
    const allEmpty = invites.every((r, i) => !inviteSent[i] && !r.email.trim());
    if (allEmpty) {
      setInviteErrors(invites.map((_, i) => i === 0 ? 'Please enter an email address' : null));
      return;
    }

    // Show errors only on rows that have a non-empty but invalid email
    const hasErrors = newErrors.some((e, i) => e !== null && invites[i].email.trim() !== '');
    if (hasErrors) {
      setInviteErrors(newErrors.map((e, i) => invites[i].email.trim() ? e : null));
      return;
    }

    setSendingInvites(true);
    setError(null);
    const updatedErrors = [...newErrors];
    const updatedSent = [...inviteSent];
    let anySuccess = false;

    for (let i = 0; i < invites.length; i++) {
      if (inviteSent[i]) continue; // already sent
      const email = invites[i].email.trim();
      if (!email) continue;
      try {
        await api.workspaces.createInvite(email, invites[i].role);
        updatedSent[i] = true;
        updatedErrors[i] = null;
        anySuccess = true;
      } catch (e: any) {
        const msg = e?.message || '';
        if (msg === 'ALREADY_MEMBER') {
          updatedErrors[i] = 'This person is already in your workspace';
        } else {
          updatedErrors[i] = msg || 'Failed to send invite';
        }
      }
    }

    setInviteErrors(updatedErrors);
    setInviteSent(updatedSent);
    setSendingInvites(false);

    // If all unblocked rows succeeded or were skipped, advance
    const allDoneOrSent = invites.every((r, i) => {
      if (inviteSent[i] || updatedSent[i]) return true;
      if (!r.email.trim()) return true;
      return false;
    });
    if (allDoneOrSent) advanceStep(4, anySuccess ? 'done' : 'skipped');
  };

  const handleStep5 = async () => {
    if (!clientName.trim()) { setError('Please enter a client name.'); return; }
    setSavingClient(true);
    setError(null);
    try {
      await api.clients.create({
        name: clientName.trim(),
        ...(clientIndustry.trim() ? { notes: clientIndustry.trim() } : {}),
      });
      advanceStep(5, 'done');
    } catch (e: any) {
      setError(e?.message || 'Failed to create client.');
    } finally {
      setSavingClient(false);
    }
  };

  const handleSkipSetup = async () => {
    setCompleting(true);
    try {
      await api.onboarding.completeWizard({ all: 'skipped' } as any);
      navigate('/auth/redirect', { replace: true });
    } catch { setCompleting(false); }
  };

  const handleFinish = async () => {
    setCompleting(true);
    setError(null);
    try {
      await api.onboarding.completeWizard(steps as Record<string, StepStatus>);
      sessionStorage.setItem('showDashboardLoader', 'true');
      navigate('/auth/redirect', { replace: true });
    } catch {
      setError('Something went wrong. Please try again.');
      setCompleting(false);
    }
  };

  // ── Styles ─────────────────────────────────────────────────────

  const btnPrimary = 'h-10 px-5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
  const btnBack = 'h-10 px-4 text-sm text-gray-500 hover:text-gray-900 transition-colors';
  const btnSkip = 'text-sm text-gray-400 hover:text-gray-600 transition-colors bg-transparent border-0 p-0';

  // ── Step renders ───────────────────────────────────────────────

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Welcome to CoreflowHR</h2>
        <p className="text-sm text-gray-500 mt-1">Let's get your workspace ready. This takes under two minutes.</p>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">Workspace name</label>
        <input
          type="text"
          value={workspaceName}
          onChange={e => setWorkspaceName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleStep1(); }}
          placeholder="e.g. Acme Recruiting"
          className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 transition-colors"
          autoFocus
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex justify-end">
        <button className={btnPrimary} onClick={handleStep1}>Get started</button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Set up your profile</h2>
        <p className="text-sm text-gray-500 mt-1">Add your name and photo so teammates can recognise you.</p>
      </div>

      {/* Avatar picker */}
      <div className="flex items-center gap-5">
        <div className="relative flex-shrink-0">
          <Avatar name={profileName || 'You'} src={avatarUrl ?? undefined} className="w-[72px] h-[72px] text-xl" />
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-1 -right-1 w-7 h-7 bg-gray-900 rounded-full flex items-center justify-center text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
            title="Upload photo"
          >
            {uploadingAvatar ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium text-gray-700">Profile photo</p>
          <p className="text-xs text-gray-400">JPG, PNG or GIF · max 5 MB</p>
          {avatarUrl && (
            <button
              onClick={() => setAvatarUrl(null)}
              className="text-xs text-red-400 hover:text-red-600 transition-colors"
            >
              Remove photo
            </button>
          )}
        </div>
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">Your name</label>
        <input
          type="text"
          value={profileName}
          onChange={e => setProfileName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleStep2(); }}
          placeholder="e.g. Sarah Johnson"
          className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 transition-colors"
          autoFocus
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex items-center justify-between">
        <button className={btnBack} onClick={() => { setError(null); setStep(1); }}>Back</button>
        <div className="flex items-center gap-4">
          <button className={btnSkip} onClick={() => advanceStep(2, 'skipped')}>Skip for now</button>
          <button className={btnPrimary} onClick={handleStep2} disabled={savingProfile}>
            {savingProfile ? <Loader2 size={14} className="animate-spin inline mr-1.5" /> : null}
            Save &amp; continue
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Connect your Google account</h2>
        <p className="text-sm text-gray-500 mt-1">Sync interviews to Google Calendar and auto-generate Google Meet links.</p>
      </div>
      {googleChecking ? (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 size={14} className="animate-spin" /> Checking connection…
        </div>
      ) : googleConnected ? (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <Check size={15} className="flex-shrink-0" />
          Google Calendar connected successfully
        </div>
      ) : googleWaiting ? (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
          <Loader2 size={14} className="animate-spin flex-shrink-0" />
          Waiting for Google authorisation to complete…
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm text-gray-600">
          Authorise CoreflowHR to access your Google Calendar. A new tab will open — once you approve access it will close automatically.
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex items-center justify-between">
        <button className={btnBack} onClick={() => { setError(null); setStep(2); }}>Back</button>
        <div className="flex items-center gap-4">
          {!googleConnected && !googleWaiting && (
            <button className={btnSkip} onClick={() => advanceStep(3, 'skipped')}>Skip for now</button>
          )}
          {googleConnected ? (
            <button className={btnPrimary} onClick={() => advanceStep(3, 'done')}>Continue</button>
          ) : googleWaiting ? (
            <button className={btnSkip} onClick={() => { stopGooglePoll(); setGoogleWaiting(false); advanceStep(3, 'skipped'); }}>Skip for now</button>
          ) : (
            <button className={btnPrimary} onClick={handleConnectGoogle} disabled={googleLoading}>
              {googleLoading ? <Loader2 size={14} className="animate-spin inline mr-1.5" /> : null}
              Connect Google
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Invite your team</h2>
        <p className="text-sm text-gray-500 mt-1">Team members can collaborate on jobs, candidates, and interviews.</p>
      </div>
      <div className="space-y-2" ref={roleDropdownRef}>
        {invites.map((row, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-2">
              <input
                type="email"
                placeholder="colleague@company.com"
                value={row.email}
                disabled={inviteSent[i]}
                onChange={e => {
                  setInvites(prev => prev.map((r, j) => j === i ? { ...r, email: e.target.value } : r));
                  setInviteErrors(prev => prev.map((err, j) => j === i ? null : err));
                }}
                className={`flex-1 h-10 px-3 text-sm border rounded-xl focus:outline-none focus:border-gray-400 transition-colors ${
                  inviteSent[i] ? 'bg-gray-50 text-gray-400 border-gray-100' :
                  inviteErrors[i] ? 'border-red-300 focus:border-red-400' : 'border-gray-200'
                }`}
              />
              <div className="relative flex-shrink-0">
                <button
                  type="button"
                  disabled={inviteSent[i]}
                  onClick={() => setRoleOpenIdx(roleOpenIdx === i ? null : i)}
                  className={`h-10 pl-3 pr-7 text-sm border rounded-xl bg-white transition-colors text-left w-36 ${
                    inviteSent[i] ? 'border-gray-100 text-gray-400 bg-gray-50 cursor-default' : 'border-gray-200 text-gray-700 hover:border-gray-300 cursor-pointer'
                  }`}
                >
                  {row.role === 'HiringManager' ? 'Hiring Manager' : row.role}
                </button>
                <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {roleOpenIdx === i && (
                  <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                    {(['Recruiter', 'HiringManager', 'Viewer'] as UserRole[]).map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setInvites(prev => prev.map((row, j) => j === i ? { ...row, role: r } : row));
                          setRoleOpenIdx(null);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          row.role === r ? 'bg-gray-50 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        {r === 'HiringManager' ? 'Hiring Manager' : r}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {invites.length > 1 && !inviteSent[i] && (
                <button
                  onClick={() => {
                    setInvites(prev => prev.filter((_, j) => j !== i));
                    setInviteErrors(prev => prev.filter((_, j) => j !== i));
                    setInviteSent(prev => prev.filter((_, j) => j !== i));
                  }}
                  className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
                >
                  <X size={15} />
                </button>
              )}
              {inviteSent[i] && (
                <Check size={15} className="text-green-500 flex-shrink-0" />
              )}
            </div>
            {inviteSent[i] && (
              <p className="text-xs text-green-600 pl-1">Invite sent to {invites[i].email}</p>
            )}
            {!inviteSent[i] && inviteErrors[i] && (
              <p className="text-xs text-red-500 pl-1">{inviteErrors[i]}</p>
            )}
          </div>
        ))}
        {invites.length < 5 && (
          <button
            onClick={() => {
              setInvites(prev => [...prev, { email: '', role: 'Recruiter' }]);
              setInviteErrors(prev => [...prev, null]);
              setInviteSent(prev => [...prev, false]);
            }}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <Plus size={13} /> Add another
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex items-center justify-between">
        <button className={btnBack} onClick={() => { setError(null); setStep(3); }}>Back</button>
        <div className="flex items-center gap-4">
          <button className={btnSkip} onClick={() => advanceStep(4, 'skipped')}>Skip for now</button>
          <button className={btnPrimary} onClick={handleStep4} disabled={sendingInvites}>
            {sendingInvites ? <Loader2 size={14} className="animate-spin inline mr-1.5" /> : null}
            Send invites
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Add your first client</h2>
        <p className="text-sm text-gray-500 mt-1">Link jobs and candidates to clients to keep your pipeline organised.</p>
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Company name <span className="text-red-400">*</span></label>
          <input
            type="text"
            placeholder="e.g. TechCorp Ltd"
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleStep5(); }}
            className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 transition-colors"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Industry <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            type="text"
            placeholder="e.g. Software, Finance, Healthcare"
            value={clientIndustry}
            onChange={e => setClientIndustry(e.target.value)}
            className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 transition-colors"
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex items-center justify-between">
        <button className={btnBack} onClick={() => { setError(null); setStep(4); }}>Back</button>
        <div className="flex items-center gap-4">
          <button className={btnSkip} onClick={() => advanceStep(5, 'skipped')}>Skip for now</button>
          <button className={btnPrimary} onClick={handleStep5} disabled={savingClient}>
            {savingClient ? <Loader2 size={14} className="animate-spin inline mr-1.5" /> : null}
            Add client
          </button>
        </div>
      </div>
    </div>
  );

  const renderComplete = () => (
    <div className="space-y-5">
      <div>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <h2 className="text-xl font-bold text-gray-900">You're all set</h2>
        <p className="text-sm text-gray-500 mt-1">Your workspace is ready. Here's what to do next.</p>
      </div>
      <div className="grid gap-2.5">
        {[
          {
            label: 'Post a job',
            desc: 'Create your first active role',
            icon: <Briefcase size={16} className="text-blue-600" />,
            iconBg: 'bg-blue-50',
            primary: true,
          },
          {
            label: 'Upload candidates',
            desc: 'Bulk-import CVs to get started fast',
            icon: <Upload size={16} className="text-purple-600" />,
            iconBg: 'bg-purple-50',
            primary: false,
          },
          {
            label: 'View pipeline',
            desc: 'See your Kanban board',
            icon: <Kanban size={16} className="text-green-600" />,
            iconBg: 'bg-green-50',
            primary: false,
          },
        ].map(tile => (
          <button
            key={tile.label}
            onClick={handleFinish}
            className={`relative text-left w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all group
              ${tile.primary
                ? 'border-gray-900/20 bg-gray-50 hover:bg-gray-100 hover:shadow-sm'
                : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50 hover:shadow-sm'
              }`}
          >
            {tile.primary && (
              <span className="absolute top-2.5 right-9 text-[10px] font-semibold text-gray-500 bg-gray-200 rounded-full px-2 py-0.5 leading-none">
                Start here
              </span>
            )}
            <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${tile.iconBg}`}>
              {tile.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{tile.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{tile.desc}</p>
            </div>
            <ArrowRight size={14} className="flex-shrink-0 text-gray-300 group-hover:text-gray-500 transition-colors" />
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex justify-end">
        <button className={btnPrimary} onClick={handleFinish} disabled={completing}>
          {completing ? <Loader2 size={14} className="animate-spin inline mr-1.5" /> : null}
          Go to dashboard
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[520px] bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <img
            src="/assets/images/coreflow-favicon-logo.png"
            alt="CoreflowHR"
            className="h-7 w-auto object-contain"
          />
          <span className="text-base font-semibold text-gray-900 tracking-tight">CoreflowHR</span>
        </div>

        {step !== 'complete' && <DotIndicator current={step} />}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
        {step === 'complete' && renderComplete()}
      </div>

      {step !== 'complete' && (
        <button
          onClick={handleSkipSetup}
          disabled={completing}
          className="text-xs text-gray-400 hover:text-gray-600 mt-6 transition-colors bg-transparent border-0"
        >
          Skip setup and go to dashboard
        </button>
      )}
    </div>
  );
};

export default Onboarding;
