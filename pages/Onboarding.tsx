import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Copy, Loader2, Plus, X, ExternalLink } from 'lucide-react';
import { api } from '../services/api';
import { supabase } from '../services/supabase';
import { UserRole } from '../types';

type StepKey = 'workspace_name' | 'google' | 'invites' | 'client' | 'email';
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
    case 2: return 'google';
    case 3: return 'invites';
    case 4: return 'client';
    case 5: return 'email';
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
              i < stepNum
                ? 'bg-gray-400'
                : i === stepNum
                ? 'bg-gray-900'
                : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

const Onboarding: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<WizardStep>(1);
  const [steps, setSteps] = useState<Partial<Record<StepKey, StepStatus>>>({});
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [workspaceName, setWorkspaceName] = useState('');

  // Step 2 — Google
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleChecking, setGoogleChecking] = useState(false);

  // Step 3 — Invites
  const [invites, setInvites] = useState<InviteRow[]>([{ email: '', role: 'Recruiter' }]);
  const [sendingInvites, setSendingInvites] = useState(false);

  // Step 4 — Client
  const [clientName, setClientName] = useState('');
  const [clientIndustry, setClientIndustry] = useState('');
  const [savingClient, setSavingClient] = useState(false);

  // Step 5 — Email domain
  const [domainStatus, setDomainStatus] = useState<'loading' | 'verified' | 'pending' | 'not_configured'>('loading');
  const [domainName, setDomainName] = useState<string | null>(null);
  const [dnsRecords, setDnsRecords] = useState<Array<{ type: string; name: string; value: string }>>([]);
  const [verifying, setVerifying] = useState(false);
  const [copiedRecord, setCopiedRecord] = useState<number | null>(null);

  // Pre-fill workspace name
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mounted) return;

        // Check if already completed
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.onboarding_completed === true) {
          navigate('/dashboard', { replace: true });
          return;
        }

        const ws = await api.workspaces.getWorkspaceWithMembers();
        if (mounted) setWorkspaceName(ws.name || '');
      } catch { /* ignore */ }
    })();
    return () => { mounted = false; };
  }, [navigate]);

  // Restore step after Google OAuth redirect
  useEffect(() => {
    try {
      const resumeStep = sessionStorage.getItem('wizard_resume_step');
      if (resumeStep === '2') {
        setStep(2);
        sessionStorage.removeItem('wizard_resume_step');
        checkGoogleConnection();
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load domain status when reaching step 5
  useEffect(() => {
    if (step === 5) {
      loadDomainStatus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

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

  const loadDomainStatus = async () => {
    setDomainStatus('loading');
    try {
      const result = await api.onboarding.getResendDomainStatus();
      setDomainName(result.domain);
      setDnsRecords(result.records);
      setDomainStatus(result.status);
      if (result.status === 'verified') {
        setTimeout(() => advanceStep(5, 'done'), 2000);
      }
    } catch {
      setDomainStatus('not_configured');
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
    if (from === 5) {
      setStep('complete');
    } else {
      setStep((from as number + 1) as WizardStep);
    }
  };

  // ── Step handlers ──────────────────────────────────────────────

  const handleStep1 = async () => {
    if (!workspaceName.trim()) { setError('Please enter a workspace name.'); return; }
    setError(null);
    try {
      await api.workspaces.updateWorkspace({ name: workspaceName.trim() });
    } catch { /* non-blocking */ }
    advanceStep(1, 'done');
  };

  const handleConnectGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const integrations = await api.settings.getIntegrations();
      const gcal = integrations.find(i => i.name === 'Google Calendar');
      if (!gcal) throw new Error('Google Calendar integration not found');
      sessionStorage.setItem('wizard_resume_step', '2');
      const { url, error: connectError } = await api.settings.connectIntegration(gcal.id);
      if (connectError) throw new Error(connectError);
      if (url) window.location.href = url;
    } catch (e: any) {
      setError(e?.message || 'Failed to start Google connection.');
      setGoogleLoading(false);
      try { sessionStorage.removeItem('wizard_resume_step'); } catch { /* ignore */ }
    }
  };

  const handleStep3 = async () => {
    const validRows = invites.filter(r => r.email.trim());
    if (validRows.length === 0) {
      advanceStep(3, 'skipped');
      return;
    }
    setSendingInvites(true);
    setError(null);
    try {
      for (const row of validRows) {
        await api.workspaces.createInvite(row.email.trim(), row.role);
      }
      advanceStep(3, 'done');
    } catch (e: any) {
      setError(e?.message || 'Failed to send some invites.');
    } finally {
      setSendingInvites(false);
    }
  };

  const handleStep4 = async () => {
    if (!clientName.trim()) { setError('Please enter a client name.'); return; }
    setSavingClient(true);
    setError(null);
    try {
      await api.clients.create({
        name: clientName.trim(),
        ...(clientIndustry.trim() ? { notes: clientIndustry.trim() } : {}),
      });
      advanceStep(4, 'done');
    } catch (e: any) {
      setError(e?.message || 'Failed to create client.');
    } finally {
      setSavingClient(false);
    }
  };

  const handleVerifyDomain = async () => {
    setVerifying(true);
    setError(null);
    try {
      const result = await api.onboarding.verifyResendDomain();
      if (result.success) {
        setDomainStatus('verified');
        setTimeout(() => advanceStep(5, 'done'), 1500);
      } else {
        setDomainStatus('pending');
        setError('DNS records not verified yet — they can take up to 48 hours to propagate.');
      }
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleSkipSetup = async () => {
    setCompleting(true);
    try {
      await api.onboarding.completeWizard({ all: 'skipped' } as any);
      navigate('/auth/redirect', { replace: true });
    } catch {
      setCompleting(false);
    }
  };

  const handleFinish = async () => {
    setCompleting(true);
    setError(null);
    try {
      await api.onboarding.completeWizard(steps as Record<string, StepStatus>);
      sessionStorage.setItem('showDashboardLoader', 'true');
      navigate('/auth/redirect', { replace: true });
    } catch (e: any) {
      setError('Something went wrong. Please try again.');
      setCompleting(false);
    }
  };

  const copyRecord = (value: string, idx: number) => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopiedRecord(idx);
    setTimeout(() => setCopiedRecord(null), 2000);
  };

  // ── Render helpers ─────────────────────────────────────────────

  const btnPrimary = 'h-10 px-5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
  const btnBack = 'h-10 px-4 text-sm text-gray-500 hover:text-gray-900 transition-colors';
  const btnSkip = 'text-sm text-gray-400 hover:text-gray-600 transition-colors bg-transparent border-0 p-0';

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
      ) : (
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm text-gray-600">
          Authorise CoreflowHR to access your Google Calendar. You can disconnect at any time in Settings → Integrations.
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex items-center justify-between">
        <button className={btnBack} onClick={() => { setError(null); setStep(1); }}>Back</button>
        <div className="flex items-center gap-4">
          {!googleConnected && (
            <button className={btnSkip} onClick={() => advanceStep(2, 'skipped')}>Skip for now</button>
          )}
          {googleConnected ? (
            <button className={btnPrimary} onClick={() => advanceStep(2, 'done')}>Continue</button>
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

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Invite your team</h2>
        <p className="text-sm text-gray-500 mt-1">Team members can collaborate on jobs, candidates, and interviews.</p>
      </div>
      <div className="space-y-2">
        {invites.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="email"
              placeholder="colleague@company.com"
              value={row.email}
              onChange={e => setInvites(prev => prev.map((r, j) => j === i ? { ...r, email: e.target.value } : r))}
              className="flex-1 h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 transition-colors"
            />
            <select
              value={row.role}
              onChange={e => setInvites(prev => prev.map((r, j) => j === i ? { ...r, role: e.target.value as UserRole } : r))}
              className="h-10 px-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 bg-white transition-colors"
            >
              <option value="Recruiter">Recruiter</option>
              <option value="Admin">Admin</option>
              <option value="HiringManager">Hiring Manager</option>
              <option value="Viewer">Viewer</option>
            </select>
            {invites.length > 1 && (
              <button
                onClick={() => setInvites(prev => prev.filter((_, j) => j !== i))}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={15} />
              </button>
            )}
          </div>
        ))}
        {invites.length < 5 && (
          <button
            onClick={() => setInvites(prev => [...prev, { email: '', role: 'Recruiter' }])}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <Plus size={13} /> Add another
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex items-center justify-between">
        <button className={btnBack} onClick={() => { setError(null); setStep(2); }}>Back</button>
        <div className="flex items-center gap-4">
          <button className={btnSkip} onClick={() => advanceStep(3, 'skipped')}>Skip for now</button>
          <button className={btnPrimary} onClick={handleStep3} disabled={sendingInvites}>
            {sendingInvites ? <Loader2 size={14} className="animate-spin inline mr-1.5" /> : null}
            Send invites
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
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
            onKeyDown={e => { if (e.key === 'Enter') handleStep4(); }}
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
        <button className={btnBack} onClick={() => { setError(null); setStep(3); }}>Back</button>
        <div className="flex items-center gap-4">
          <button className={btnSkip} onClick={() => advanceStep(4, 'skipped')}>Skip for now</button>
          <button className={btnPrimary} onClick={handleStep4} disabled={savingClient}>
            {savingClient ? <Loader2 size={14} className="animate-spin inline mr-1.5" /> : null}
            Add client
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Set up candidate emails</h2>
        <p className="text-sm text-gray-500 mt-1">Verify your sending domain so candidate emails come from your address.</p>
      </div>

      {domainStatus === 'loading' && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 size={14} className="animate-spin" /> Checking domain status…
        </div>
      )}

      {domainStatus === 'verified' && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <Check size={15} className="flex-shrink-0" />
          {domainName} is verified — candidate emails are ready to go
        </div>
      )}

      {domainStatus === 'not_configured' && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 space-y-2">
          <p className="font-medium">No custom domain configured yet</p>
          <p className="text-blue-700">To send emails from your own address, add and verify a domain in your <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 inline-flex items-center gap-0.5">Resend account <ExternalLink size={11} /></a>, then set <code className="bg-blue-100 px-1 rounded text-xs">FROM_EMAIL</code> in your Supabase edge function secrets.</p>
        </div>
      )}

      {domainStatus === 'pending' && dnsRecords.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Add these DNS records to <span className="font-medium text-gray-900">{domainName}</span> through your domain provider:</p>
          <div className="space-y-2">
            {dnsRecords.map((rec, i) => (
              <div key={i} className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-start gap-3 text-xs font-mono">
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-700 font-sans text-[10px] font-semibold">{rec.type}</span>
                    <span className="text-gray-500 truncate">{rec.name}</span>
                  </div>
                  <p className="text-gray-700 break-all leading-relaxed">{rec.value}</p>
                </div>
                <button
                  onClick={() => copyRecord(rec.value, i)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-900 transition-colors p-1"
                  title="Copy value"
                >
                  {copiedRecord === i ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {domainStatus === 'pending' && dnsRecords.length === 0 && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          Domain found but DNS records could not be fetched. Check your Resend dashboard.
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex items-center justify-between">
        <button className={btnBack} onClick={() => { setError(null); setStep(4); }}>Back</button>
        <div className="flex items-center gap-4">
          <button className={btnSkip} onClick={() => advanceStep(5, 'skipped')}>Skip for now — remind me later</button>
          {domainStatus === 'pending' && (
            <button className={btnPrimary} onClick={handleVerifyDomain} disabled={verifying}>
              {verifying ? <Loader2 size={14} className="animate-spin inline mr-1.5" /> : null}
              I've added the records — verify now
            </button>
          )}
          {(domainStatus === 'not_configured' || domainStatus === 'loading') && (
            <button className={btnPrimary} onClick={() => advanceStep(5, 'skipped')}>Continue</button>
          )}
        </div>
      </div>
    </div>
  );

  const renderComplete = () => (
    <div className="space-y-6">
      <div>
        <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center mb-4">
          <Check size={18} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">You're all set</h2>
        <p className="text-sm text-gray-500 mt-1">Your workspace is ready. Here's what to do next.</p>
      </div>
      <div className="grid gap-3">
        {[
          { label: 'Post a job', desc: 'Create your first active role', href: '/jobs/new' },
          { label: 'Upload candidates', desc: 'Bulk-import CVs to get started fast', href: '/candidates' },
          { label: 'View pipeline', desc: 'See your Kanban board', href: '/candidates' },
        ].map(tile => (
          <button
            key={tile.href}
            onClick={() => {
              handleFinish();
            }}
            className="text-left w-full px-4 py-3 border border-gray-100 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-colors group"
          >
            <p className="text-sm font-semibold text-gray-900 group-hover:underline underline-offset-2">{tile.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{tile.desc}</p>
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
      <div className="w-full max-w-[520px] bg-white rounded-2xl border border-gray-100 px-10 py-10 shadow-sm">
        <div className="mb-2">
          <img
            src="/assets/images/coreflow-favicon-logo.png"
            alt="CoreflowHR"
            className="h-8 w-auto object-contain mb-6"
          />
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
