import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { 
  User as UserIcon, CreditCard, Mail, AlertCircle, Monitor, Smartphone, X, Sparkles,
  Save, MessageSquare, FileText, Layers, Plus, Shield, CheckCircle, Lock, Key, LogOut, Upload,
  Download, ExternalLink, Loader2, Calendar, DollarSign, Image as ImageIcon, Copy, Eye, EyeOff, Zap
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { api, Session } from '../services/api';
import { User, BillingPlan, EmailTemplate, Integration, Invoice, EmailWorkflow } from '../types';
import { supabase } from '../services/supabase';
import { createCheckoutSession, createPortalSession, PLANS } from '../services/stripe';
import { WorkflowList } from '../components/WorkflowList';
import { EmailWorkflowBuilder } from '../components/EmailWorkflowBuilder';
import { WorkflowExecutionHistory } from '../components/WorkflowExecutionHistory';

// --- Card Brand Logo Component ---
const CardBrandLogo = ({ brand, className = "w-12 h-8" }: { brand: string; className?: string }) => {
  const normalizedBrand = brand.toLowerCase().replace(/\s+/g, '_');
  
  if (normalizedBrand === 'visa') {
    return (
      <div className={`${className} bg-white rounded border border-gray-200 flex items-center justify-center overflow-hidden p-1`}>
        <svg viewBox="0 0 100 32" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <rect width="100" height="32" fill="#1434CB" rx="3"/>
          <text x="50" y="22" fontSize="18" fontWeight="700" fill="white" textAnchor="middle" fontFamily="Arial, sans-serif" letterSpacing="2px">VISA</text>
        </svg>
      </div>
    );
  }
  
  if (normalizedBrand === 'mastercard') {
    return (
      <div className={`${className} bg-white rounded border border-gray-200 flex items-center justify-center overflow-hidden relative`}>
        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#EB001B] rounded-full opacity-95"></div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#F79E1B] rounded-full opacity-95"></div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-20"></div>
      </div>
    );
  }
  
  if (normalizedBrand === 'verve') {
    return (
      <div className={`${className} bg-gradient-to-r from-[#5C2D91] via-[#5C2D91] to-[#00A651] rounded border border-gray-200 flex items-center justify-center overflow-hidden px-1`}>
        <svg viewBox="0 0 80 32" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <text x="40" y="21" fontSize="10" fontWeight="700" fill="white" textAnchor="middle" fontFamily="Arial, sans-serif" letterSpacing="1px">VERVE</text>
        </svg>
      </div>
    );
  }
  
  if (normalizedBrand === 'amex' || normalizedBrand === 'american_express') {
    return (
      <div className={`${className} bg-[#006FCF] rounded border border-gray-200 flex items-center justify-center overflow-hidden px-1`}>
        <svg viewBox="0 0 80 32" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <text x="40" y="21" fontSize="8" fontWeight="700" fill="white" textAnchor="middle" fontFamily="Arial, sans-serif" letterSpacing="1px">AMEX</text>
        </svg>
      </div>
    );
  }
  
  if (normalizedBrand === 'discover') {
    return (
      <div className={`${className} bg-[#FF6000] rounded border border-gray-200 flex items-center justify-center overflow-hidden px-1`}>
        <svg viewBox="0 0 90 32" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <text x="45" y="21" fontSize="9" fontWeight="700" fill="white" textAnchor="middle" fontFamily="Arial, sans-serif" letterSpacing="0.5px">DISCOVER</text>
        </svg>
      </div>
    );
  }
  
  // Generic card icon for unknown brands
  return (
    <div className={`${className} bg-gray-100 rounded border border-gray-200 flex items-center justify-center`}>
      <CreditCard size={16} className="text-gray-400" />
    </div>
  );
};

// --- Help Modal ---
const HelpModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}>
        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Help & Support</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-100">
                    <X size={20} />
                </button>
            </div>
            <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600">
                    Need assistance? Our support team is here to help you with any questions or issues.
                </p>
                <div className="space-y-3">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                        <div className="bg-white p-2 rounded-lg border border-gray-200">
                            <Mail size={20} className="text-gray-900"/>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-900">Email Support</p>
                            <p className="text-xs text-gray-500">coreflowhr@gmail.com</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
        </div>
    </div>,
    document.body
  );
};

// --- Edit Template Modal ---
const EditTemplateModal: React.FC<{ template: EmailTemplate | null, isOpen: boolean, onClose: () => void, onSave: (t: EmailTemplate) => Promise<void>, isSaving: boolean, saveMessage: { type: 'success' | 'error', text: string } | null }> = ({ template, isOpen, onClose, onSave, isSaving, saveMessage }) => {
    const [formData, setFormData] = useState<EmailTemplate | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generateError, setGenerateError] = useState<string | null>(null);

    useEffect(() => {
        if (template) {
            setFormData({ ...template });
        }
    }, [template]);

    const handleSave = async () => {
        if (!formData) return;
        await onSave(formData);
        // Modal will be closed by parent on success
    };

    const handleGenerate = async () => {
        if (!formData) return;
        
        setIsGenerating(true);
        setGenerateError(null);
        
        try {
            // Map template type to the format expected by Gemini
            const templateTypeMap: Record<string, 'interview' | 'screening' | 'rejection' | 'offer' | 'hired' | 'reschedule'> = {
                'Interview': 'interview',
                'Sourcing': 'screening',
                'Rejection': 'rejection',
                'Offer': 'offer',
                'Hired': 'hired',
                'Reschedule': 'reschedule'
            };
            
            const geminiType = templateTypeMap[formData.type] || 'interview';
            
            const { generateEmailTemplate } = await import('../services/geminiService');
            const generated = await generateEmailTemplate(geminiType);
            
            setFormData({
                ...formData,
                subject: generated.subject,
                content: generated.content
            });
        } catch (error: any) {
            console.error('Error generating template:', error);
            let errorMessage = error.message || 'Failed to generate template. Please try again.';
            
            // Provide more helpful error message for API key issues
            if (errorMessage.includes('API key') || errorMessage.includes('VITE_API_KEY')) {
                errorMessage = 'Gemini API key not configured. Please set VITE_API_KEY in your .env file and restart the server. See GEMINI_SETUP.md for instructions.';
            }
            
            setGenerateError(errorMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen || !formData) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}>
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Edit Template: {formData.title}</h2>
                    <button onClick={onClose} disabled={isSaving} className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                    {saveMessage && (
                        <div className={`p-3 rounded-lg border ${saveMessage.type === 'success' ? 'bg-gray-100 border-gray-200 text-gray-800' : 'bg-gray-100 border-gray-200 text-gray-800'}`}>
                            <p className="text-sm font-medium">{saveMessage.text}</p>
                        </div>
                    )}
                    {generateError && (
                        <div className="p-3 rounded-lg border bg-gray-100 border-gray-200 text-gray-800">
                            <p className="text-sm font-medium">{generateError}</p>
                        </div>
                    )}
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">{formData.title}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{formData.desc}</p>
                        </div>
                        <Button 
                            variant="outline" 
                            onClick={handleGenerate} 
                            disabled={isGenerating || isSaving}
                            className="flex items-center gap-2"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={16} className="text-gray-600" />
                                    Generate with AI
                                </>
                            )}
                        </Button>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">Subject Line</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                            value={formData.subject}
                            onChange={(e) => setFormData({...formData, subject: e.target.value})}
                            disabled={isSaving || isGenerating}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">Email Body</label>
                        <textarea 
                            className="w-full h-64 px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none resize-none font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                            value={formData.content}
                            onChange={(e) => setFormData({...formData, content: e.target.value})}
                            disabled={isSaving || isGenerating}
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            Available variables: {'{candidate_name}'}, {'{job_title}'}, {'{company_name}'}, {'{interview_date}'}, {'{interview_time}'}, {'{interview_duration}'}, {'{interview_type}'}, {'{interviewer_name}'}, {'{meeting_link}'}, {'{address}'}, {'{interview_details}'}
                            {formData.type === 'Reschedule' && (
                                <> • Reschedule-specific: {'{old_interview_date}'}, {'{old_interview_time}'}, {'{previous_interview_time}'}, {'{new_interview_time}'}</>
                            )}
                        </p>
                    </div>
                </div>
                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button variant="black" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Template'}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// --- Change Password Modal ---
const ChangePasswordModal = ({ isOpen, onClose, onChangePassword, isLoading, error }: {
    isOpen: boolean;
    onClose: () => void;
    onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    isLoading: boolean;
    error: string | null;
}) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            // Reset form when modal closes
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setValidationError(null);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);

        if (!currentPassword || !newPassword || !confirmPassword) {
            setValidationError('All fields are required');
            return;
        }

        if (newPassword.length < 8) {
            setValidationError('Password must be at least 8 characters long');
            return;
        }

        if (newPassword !== confirmPassword) {
            setValidationError('New passwords do not match');
            return;
        }

        if (currentPassword === newPassword) {
            setValidationError('New password must be different from current password');
            return;
        }

        await onChangePassword(currentPassword, newPassword);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Change Password</h2>
                    <button onClick={onClose} disabled={isLoading} className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {(error || validationError) && (
                        <div className="p-3 rounded-lg border bg-gray-100 border-gray-200 text-gray-800">
                            <p className="text-sm font-medium">{error || validationError}</p>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">Current Password</label>
                        <div className="relative">
                            <input
                                type={showCurrentPassword ? "text" : "password"}
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none pr-10"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                disabled={isLoading}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900"
                            >
                                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">New Password</label>
                        <div className="relative">
                            <input
                                type={showNewPassword ? "text" : "password"}
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none pr-10"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={isLoading}
                                required
                                minLength={8}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900"
                            >
                                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">Confirm New Password</label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none pr-10"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={isLoading}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900"
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={onClose} disabled={isLoading} type="button">Cancel</Button>
                        <Button variant="black" type="submit" disabled={isLoading}>
                            {isLoading ? 'Changing...' : 'Change Password'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

// --- 2FA Setup Modal ---
const TwoFactorSetupModal = ({ isOpen, onClose, onVerify, qrCode, secret, backupCodes, isLoading, error }: {
    isOpen: boolean;
    onClose: () => void;
    onVerify: (code: string) => Promise<void>;
    qrCode: string;
    secret: string;
    backupCodes: string[];
    isLoading: boolean;
    error: string | null;
}) => {
    const [verificationCode, setVerificationCode] = useState('');
    const [step, setStep] = useState<'setup' | 'verify'>('setup');
    const [backupCodesCopied, setBackupCodesCopied] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setVerificationCode('');
            setStep('setup');
            setBackupCodesCopied(false);
        }
    }, [isOpen]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (verificationCode.length !== 6) return;
        await onVerify(verificationCode);
    };

    const copyBackupCodes = () => {
        navigator.clipboard.writeText(backupCodes.join('\n'));
        setBackupCodesCopied(true);
        setTimeout(() => setBackupCodesCopied(false), 2000);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Enable Two-Factor Authentication</h2>
                    <button onClick={onClose} disabled={isLoading} className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg border bg-gray-100 border-gray-200 text-gray-800">
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}
                    
                    {step === 'setup' && (
                        <>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-2">Step 1: Scan QR Code</h3>
                                <p className="text-xs text-gray-500 mb-3">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
                                {qrCode && (
                                    <div className="bg-white p-4 border border-gray-200 rounded-xl flex justify-center">
                                        <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-2">Or Enter Secret Manually</h3>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={secret}
                                        className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => navigator.clipboard.writeText(secret)}
                                        className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-2">Step 2: Save Backup Codes</h3>
                                <p className="text-xs text-gray-500 mb-2">Save these codes in a safe place. You'll need them if you lose access to your authenticator app.</p>
                                <div className="bg-gray-50 p-4 border border-gray-200 rounded-xl">
                                    <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                                        {backupCodes.map((code, i) => (
                                            <div key={i} className="text-center py-1">{code}</div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={copyBackupCodes}
                                        className="mt-3 w-full py-2 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 flex items-center justify-center gap-2"
                                    >
                                        <Copy size={14} />
                                        {backupCodesCopied ? 'Copied!' : 'Copy Backup Codes'}
                                    </button>
                                </div>
                            </div>
                            <div className="pt-2">
                                <Button variant="black" onClick={() => setStep('verify')} className="w-full">
                                    Next: Verify Code
                                </Button>
                            </div>
                        </>
                    )}

                    {step === 'verify' && (
                        <>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-2">Step 3: Verify Code</h3>
                                <p className="text-xs text-gray-500 mb-3">Enter the 6-digit code from your authenticator app</p>
                                <form onSubmit={handleVerify}>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]{6}"
                                        maxLength={6}
                                        className="w-full px-4 py-3 text-center text-lg font-mono tracking-widest border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 focus:border-black outline-none"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        disabled={isLoading}
                                        autoFocus
                                        placeholder="000000"
                                    />
                                    <div className="flex gap-3 mt-4">
                                        <Button variant="outline" onClick={() => setStep('setup')} type="button" className="flex-1">Back</Button>
                                        <Button variant="black" type="submit" disabled={isLoading || verificationCode.length !== 6} className="flex-1">
                                            {isLoading ? 'Verifying...' : 'Verify & Enable'}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

// Notification Toggle Component
const NotificationToggle = ({ label, description, checked, onChange }: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => Promise<void>;
}) => {
    const [isUpdating, setIsUpdating] = useState(false);
    
    const handleToggle = async () => {
        setIsUpdating(true);
        try {
            await onChange(!checked);
        } finally {
            setIsUpdating(false);
        }
    };
    
    return (
        <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
            <div>
                <p className="text-sm font-bold text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{description}</p>
            </div>
            <button
                type="button"
                onClick={handleToggle}
                disabled={isUpdating}
                className={`w-11 h-6 rounded-full transition-colors duration-300 ease-in-out relative focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-black/20 disabled:opacity-50 disabled:cursor-not-allowed ${checked ? 'bg-black' : 'bg-gray-200'}`}
            >
                <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-300 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
        </div>
    );
};

// --- Test Workflow Modal ---
const TestWorkflowModal: React.FC<{ 
    workflow: EmailWorkflow | null, 
    isOpen: boolean, 
    onClose: () => void,
    onTest: (workflowId: string, testPlaceholders: Record<string, string>) => Promise<void>,
    isTesting: boolean
}> = ({ workflow, isOpen, onClose, onTest, isTesting }) => {
    const [testPlaceholders, setTestPlaceholders] = useState<Record<string, string>>({});

    // Get required placeholders based on workflow trigger stage
    const getRequiredPlaceholders = (): string[] => {
        if (!workflow) return [];
        
        const stageMap: Record<string, string[]> = {
            'Screening': ['candidate_name', 'job_title', 'company_name', 'your_name'],
            'Interview': ['candidate_name', 'job_title', 'company_name', 'interview_date', 'interview_time', 'interview_duration', 'interview_type', 'interviewer_name', 'meeting_link', 'address', 'interview_details', 'your_name'],
            'Reschedule': ['candidate_name', 'job_title', 'company_name', 'previous_interview_time', 'new_interview_time', 'interview_date', 'interview_time', 'interview_duration', 'interview_type', 'meeting_link', 'address', 'your_name'],
            'Offer': ['candidate_name', 'position_title', 'job_title', 'company_name', 'salary', 'salary_amount', 'salary_currency', 'salary_period', 'start_date', 'expires_at', 'benefits', 'benefits_list', 'your_name'],
            'Rejected': ['candidate_name', 'job_title', 'company_name', 'your_name'],
            'Hired': ['candidate_name', 'job_title', 'company_name', 'your_name']
        };
        
        return stageMap[workflow.triggerStage] || [];
    };

    const requiredPlaceholders = getRequiredPlaceholders();
    
    // Default values for placeholders
    const getDefaultValue = (placeholder: string): string => {
        const defaults: Record<string, string> = {
            candidate_name: 'John Doe',
            job_title: 'Software Engineer',
            position_title: 'Software Engineer',
            company_name: 'Our Company',
            your_name: 'Recruiter',
            interviewer_name: 'Interviewer',
            interview_date: 'Monday, January 15, 2024',
            interview_time: '10:00 AM',
            interview_duration: '1 hour',
            interview_type: 'Video Call',
            interview_details: 'Date: Monday, January 15, 2024\nTime: 10:00 AM\nDuration: 1 hour\nType: Video Call',
            meeting_link: 'https://meet.google.com/xxx-yyyy-zzz',
            address: '123 Main St, City, State 12345',
            previous_interview_time: 'Monday, January 8, 2024 at 2:00 PM',
            new_interview_time: 'Monday, January 15, 2024 at 10:00 AM',
            salary: '$100,000 per year',
            salary_amount: '100000',
            salary_currency: 'USD',
            salary_period: 'per year',
            start_date: 'February 1, 2024',
            expires_at: 'January 31, 2024',
            benefits: 'Health insurance, 401k, Paid time off',
            benefits_list: '• Health insurance\n• 401k\n• Paid time off'
        };
        return defaults[placeholder] || '';
    };

    const handlePlaceholderChange = (placeholder: string, value: string) => {
        setTestPlaceholders(prev => ({
            ...prev,
            [placeholder]: value
        }));
    };

    const handleTest = async () => {
        if (!workflow) return;
        
        // Merge user inputs with defaults (user inputs take precedence)
        const mergedPlaceholders: Record<string, string> = {};
        requiredPlaceholders.forEach(placeholder => {
            mergedPlaceholders[placeholder] = testPlaceholders[placeholder] || getDefaultValue(placeholder);
        });
        
        await onTest(workflow.id, mergedPlaceholders);
    };

    if (!isOpen || !workflow) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}>
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Test Workflow</h2>
                        <p className="text-sm text-gray-500 mt-1">Enter test values for placeholders</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-100" disabled={isTesting}>
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-4 overflow-y-auto">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                            <strong>Workflow:</strong> {workflow.name} ({workflow.triggerStage})
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                            Fill in test values below. Empty fields will use default values. The test email will be sent to your email address.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {requiredPlaceholders.map(placeholder => (
                            <div key={placeholder}>
                                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                                    {placeholder.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </label>
                                <input
                                    type="text"
                                    value={testPlaceholders[placeholder] || ''}
                                    onChange={(e) => handlePlaceholderChange(placeholder, e.target.value)}
                                    placeholder={getDefaultValue(placeholder)}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                    disabled={isTesting}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isTesting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleTest}
                        disabled={isTesting}
                        className="flex items-center gap-2"
                    >
                        {isTesting ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Sending Test Email...
                            </>
                        ) : (
                            <>
                                <Zap size={16} />
                                Send Test Email
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const Settings: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [user, setUser] = useState<User | null>(null);
    const [activeTab, setActiveTab] = useState('profile');
    const [sessions, setSessions] = useState<Session[]>([]);
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [plan, setPlan] = useState<BillingPlan | null>(null);
    const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoadingBilling, setIsLoadingBilling] = useState(false);
    const [billingError, setBillingError] = useState<string | null>(null);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [stripeSubscription, setStripeSubscription] = useState<any>(null);
    const [stripePaymentMethod, setStripePaymentMethod] = useState<any>(null);
    const [isConnectingIntegration, setIsConnectingIntegration] = useState<string | null>(null);

    // Security State
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
    const [is2FASetupModalOpen, setIs2FASetupModalOpen] = useState(false);
    const [twoFactorQR, setTwoFactorQR] = useState('');
    const [twoFactorSecret, setTwoFactorSecret] = useState('');
    const [twoFactorBackupCodes, setTwoFactorBackupCodes] = useState<string[]>([]);
    const [twoFactorFactorId, setTwoFactorFactorId] = useState<string | null>(null);
    const [isVerifying2FA, setIsVerifying2FA] = useState(false);
    const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
    const [isEnabling2FA, setIsEnabling2FA] = useState(false);
    const [isRevokingSession, setIsRevokingSession] = useState<string | null>(null);

    // Profile form state
    const [profileData, setProfileData] = useState({
        name: '',
        email: '',
        jobTitle: '',
        phone: '',
    });
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [templateSaveMessage, setTemplateSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    
    // Workflow state
    const [editingWorkflow, setEditingWorkflow] = useState<EmailWorkflow | null>(null);
    const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
    const [testingWorkflow, setTestingWorkflow] = useState<EmailWorkflow | null>(null);
    const [isTestWorkflowModalOpen, setIsTestWorkflowModalOpen] = useState(false);
    const [testPlaceholders, setTestPlaceholders] = useState<Record<string, string>>({});
    const [isTestingWorkflow, setIsTestingWorkflow] = useState(false);
    const [viewingHistoryWorkflow, setViewingHistoryWorkflow] = useState<EmailWorkflow | null>(null);
    const [workflowListKey, setWorkflowListKey] = useState(0); // For refreshing the list
    
    // Notification preferences state
    const [notificationPrefs, setNotificationPrefs] = useState({
        emailNotifications: true,
        interviewScheduleUpdates: true,
        offerUpdates: true,
        weeklyDigestEnabled: false,
    } as {
        emailNotifications: boolean;
        interviewScheduleUpdates: boolean;
        offerUpdates: boolean;
        weeklyDigestEnabled: boolean;
    });
    
    // Compliance settings state
    const [complianceSettings, setComplianceSettings] = useState({
        dataRetentionPeriod: '6 months',
        consentRequired: true,
    });

    useEffect(() => {
        const load = async () => {
            const u = await api.auth.me();
            setUser(u);
            setProfileData({
                name: u.name,
                email: u.email,
                jobTitle: u.jobTitle || '',
                phone: u.phone || '',
            });
            setAvatarUrl(u.avatar || null);
            // Load sessions (this also tracks the current session)
            const s = await api.auth.getSessions();
            setSessions(s);
            
            // Load security settings
            try {
                const securitySettings = await api.auth.getSecuritySettings();
                setTwoFactorEnabled(securitySettings.twoFactorEnabled);
            } catch (error) {
                console.error('Error loading security settings:', error);
            }
            try {
                const [p, inv, billingDetails] = await Promise.all([
                    api.settings.getPlan(),
                    api.settings.getInvoices().catch(() => []), // Gracefully handle if function not deployed
                    api.settings.getBillingDetails().catch(() => ({ subscription: null, paymentMethod: null })) // Gracefully handle if function not deployed
                ]);
                setPlan(p);
                setInvoices(inv);
                
                // Use Stripe subscription data if available, otherwise fallback to database subscription data
                if (billingDetails.subscription) {
                    setStripeSubscription(billingDetails.subscription);
                    setStripePaymentMethod(billingDetails.paymentMethod);
                } else if (p.subscriptionStatus === 'active' && p.subscriptionStripeId) {
                    // Create subscription object from database data as fallback
                    setStripeSubscription({
                        id: p.subscriptionStripeId,
                        status: p.subscriptionStatus,
                        planName: p.name,
                        amount: p.price,
                        currency: p.currency === '$' ? 'USD' : p.currency,
                        interval: p.interval === 'monthly' ? 'month' : 'year',
                        currentPeriodEnd: p.subscriptionPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                        cancelAtPeriodEnd: false
                    });
                    setStripePaymentMethod(null); // Payment method not available from database
                } else {
                    setStripeSubscription(null);
                    setStripePaymentMethod(null);
                }
            } catch (error) {
                // If billing functions aren't deployed yet, just load plan from database
                const p = await api.settings.getPlan();
                setPlan(p);
                setInvoices([]);
                
                // Use database subscription data if available
                if (p.subscriptionStatus === 'active' && p.subscriptionStripeId) {
                    setStripeSubscription({
                        id: p.subscriptionStripeId,
                        status: p.subscriptionStatus,
                        planName: p.name,
                        amount: p.price,
                        currency: p.currency === '$' ? 'USD' : p.currency,
                        interval: p.interval === 'monthly' ? 'month' : 'year',
                        currentPeriodEnd: p.subscriptionPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                        cancelAtPeriodEnd: false
                    });
                    setStripePaymentMethod(null);
                } else {
                    setStripeSubscription(null);
                    setStripePaymentMethod(null);
                }
                console.warn('Billing Edge Functions may not be deployed yet. Using database subscription data as fallback.');
            }
            const t = await api.settings.getTemplates();
            setTemplates(t);
            const i = await api.settings.getIntegrations();
            setIntegrations(i);
            
            // Load notification preferences
            try {
                const prefs = await api.settings.getNotificationPreferences();
                setNotificationPrefs(prefs);
            } catch (error) {
                console.error('Error loading notification preferences:', error);
            }
            
            // Load compliance settings
            try {
                const compliance = await api.settings.getComplianceSettings();
                setComplianceSettings(compliance);
            } catch (error) {
                console.error('Error loading compliance settings:', error);
            }
        };
        load();
    }, []);

    const refreshBillingData = async () => {
        setIsLoadingBilling(true);
        try {
            const [updatedPlan, updatedInvoices, billingDetails] = await Promise.all([
                api.settings.getPlan(),
                api.settings.getInvoices(),
                api.settings.getBillingDetails()
            ]);
            setPlan(updatedPlan);
            setInvoices(updatedInvoices);
            setStripeSubscription(billingDetails.subscription);
            setStripePaymentMethod(billingDetails.paymentMethod);
        } catch (error) {
            console.error('Error refreshing billing data:', error);
        } finally {
            setIsLoadingBilling(false);
        }
    };

    // Check for payment success and refresh billing data
    useEffect(() => {
        const paymentSuccess = searchParams.get('payment');
        if (paymentSuccess === 'success') {
            // Refresh billing data after successful payment
            refreshBillingData();
            // Switch to billing tab
            setActiveTab('billing');
            // Clear the query parameter
            searchParams.delete('payment');
            setSearchParams(searchParams, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    // Clear save message when opening a new template
    useEffect(() => {
        if (editingTemplate) {
            setTemplateSaveMessage(null);
        }
    }, [editingTemplate?.id]);

    // Reload sessions when switching to security tab or after refresh
    useEffect(() => {
        if (activeTab === 'security') {
            const refreshSessions = async () => {
                try {
                    const updatedSessions = await api.auth.getSessions();
                    setSessions(updatedSessions);
                } catch (error) {
                    console.error('Error refreshing sessions:', error);
                }
            };
            refreshSessions();
        }
    }, [activeTab]);

    // Handle OAuth callback redirects
    useEffect(() => {
        const handleOAuthCallback = async () => {
            const params = new URLSearchParams(window.location.search);
            const integrationSuccess = params.get('integration_success');
            const integrationError = params.get('integration_error');
            const tabParam = params.get('tab');
            
            // Switch to the specified tab if provided
            if (tabParam) {
                setActiveTab(tabParam);
            }
            
            if (integrationError) {
                // Always switch to integrations tab for integration errors
                setActiveTab('integrations');
                setSaveMessage({ type: 'error', text: `Connection failed: ${decodeURIComponent(integrationError)}` });
                setTimeout(() => setSaveMessage(null), 5000);
                // Clean up URL but preserve tab if specified
                const cleanUrl = tabParam ? `/settings?tab=${tabParam}` : '/settings';
                window.history.replaceState({}, '', cleanUrl);
                return;
            }

            if (integrationSuccess) {
                // Integration connection successful - reload integrations
                // Always switch to integrations tab for integration success
                setActiveTab('integrations');
                try {
                    const updatedIntegrations = await api.settings.getIntegrations();
                    setIntegrations(updatedIntegrations);
                    setSaveMessage({ type: 'success', text: 'Integration connected successfully!' });
                    
                    // Create notification for integration connected
                    const connectedIntegration = updatedIntegrations.find(i => i.active);
                    if (connectedIntegration && user) {
                        try {
                            const { supabase } = await import('../services/supabase');
                            await supabase
                                .from('notifications')
                                .insert({
                                    user_id: user.id,
                                    title: 'Integration Connected',
                                    desc: `${connectedIntegration.name} has been successfully connected to your account.`,
                                    type: 'integration_connected',
                                    category: 'system',
                                    unread: true
                                });
                            
                            // Log activity
                            const { logIntegrationConnected } = await import('../services/activityLogger');
                            await logIntegrationConnected(connectedIntegration.name);
                        } catch (notifError) {
                            console.error('Error creating integration connected notification:', notifError);
                        }
                    }
                    
                    setTimeout(() => setSaveMessage(null), 3000);
                } catch (error: any) {
                    console.error('Error loading integrations after OAuth:', error);
                    setSaveMessage({ type: 'error', text: 'Connected but failed to refresh. Please refresh the page.' });
                    setTimeout(() => setSaveMessage(null), 3000);
                }
                
                // Clean up URL but preserve tab
                const cleanUrl = tabParam ? `/settings?tab=${tabParam}` : '/settings';
                window.history.replaceState({}, '', cleanUrl);
            }
        };

        handleOAuthCallback();
    }, []);

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setSaveMessage({ type: 'error', text: 'Please select an image file' });
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setSaveMessage({ type: 'error', text: 'Image size must be less than 5MB' });
            return;
        }

        setIsUploading(true);
        setSaveMessage(null);

        try {
            const userId = user?.id;
            if (!userId) throw new Error('User not found');

            // Create a unique filename (path within the bucket, no need to include bucket name)
            const fileExt = file.name.split('.').pop();
            const filePath = `${userId}/${Date.now()}.${fileExt}`;

            // Upload to Supabase Storage
            const { error: uploadError, data } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) {
                // If bucket doesn't exist, provide helpful error message
                if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('does not exist')) {
                    throw new Error('Avatar storage bucket not found. Please create the "avatars" bucket in Supabase Storage. See CREATE_AVATAR_BUCKET.sql for instructions.');
                }
                if (uploadError.message.includes('permission') || uploadError.message.includes('policy')) {
                    throw new Error('Permission denied. Please check storage policies are set up correctly. See CREATE_AVATAR_BUCKET.sql for instructions.');
                }
                // Handle HTTP2 protocol errors and network issues
                if (uploadError.message.includes('Failed to fetch') || uploadError.message.includes('ERR_HTTP2_PROTOCOL_ERROR')) {
                    throw new Error('Network error: Unable to connect to storage. Please check your internet connection and Supabase configuration. Ensure the "avatars" bucket exists and is properly configured.');
                }
                throw uploadError;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setAvatarUrl(publicUrl);
            setSaveMessage({ type: 'success', text: 'Avatar uploaded successfully! Click Save Changes to apply.' });
        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            setSaveMessage({ type: 'error', text: error.message || 'Failed to upload avatar' });
        } finally {
            setIsUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDeleteAvatar = async () => {
        setAvatarUrl(null);
        setSaveMessage({ type: 'success', text: 'Avatar removed. Click Save Changes to apply.' });
        
        // Optionally auto-save the deletion
        // Uncomment the following if you want to auto-save on delete:
        // try {
        //     const updatedUser = await api.auth.updateProfile({
        //         avatar: null,
        //     });
        //     setUser(updatedUser);
        //     window.dispatchEvent(new CustomEvent('profileUpdated'));
        // } catch (error) {
        //     console.error('Error removing avatar:', error);
        // }
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        setSaveMessage(null);

        try {
            const updatedUser = await api.auth.updateProfile({
                name: profileData.name,
                jobTitle: profileData.jobTitle,
                phone: profileData.phone,
                avatar: avatarUrl || undefined,
            });

            setUser(updatedUser);
            setSaveMessage({ type: 'success', text: 'Profile updated successfully!' });
            
            // Update local avatar state to match saved value
            setAvatarUrl(updatedUser.avatar || null);
            
            // Dispatch custom event to notify Sidebar to refresh
            window.dispatchEvent(new CustomEvent('profileUpdated'));
            
            // Clear message after 3 seconds
            setTimeout(() => setSaveMessage(null), 3000);
        } catch (error: any) {
            console.error('Error saving profile:', error);
            setSaveMessage({ type: 'error', text: error.message || 'Failed to save profile' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateTemplate = async (updated: EmailTemplate) => {
        setIsSavingTemplate(true);
        setTemplateSaveMessage(null);

        try {
            const savedTemplate = await api.settings.updateTemplate(updated.id, {
                subject: updated.subject,
                content: updated.content
            });

            // Update local state with saved template
            setTemplates(prev => prev.map(t => t.id === savedTemplate.id ? savedTemplate : t));
            setTemplateSaveMessage({ type: 'success', text: 'Template saved successfully' });

            // Close modal after showing success message
            setTimeout(() => {
                setEditingTemplate(null);
                setTemplateSaveMessage(null);
            }, 1500);
        } catch (error: any) {
            console.error('Error updating template:', error);
            setTemplateSaveMessage({ 
                type: 'error', 
                text: error.message || 'Failed to save template. Please try again.' 
            });
        } finally {
            setIsSavingTemplate(false);
        }
    };

    const handleIntegrationConnect = async (integration: Integration) => {
        console.log('Connect button clicked for:', integration);
        
        if (integration.active) {
            // Disconnect
            try {
                console.log('Disconnecting integration:', integration.id);
                await api.settings.disconnectIntegration(integration.id);
                setIntegrations(prev => prev.map(i => 
                    i.id === integration.id 
                        ? { ...i, active: false, connectedDate: undefined }
                        : i
                ));
                setSaveMessage({ type: 'success', text: `${integration.name} disconnected successfully` });
                setTimeout(() => setSaveMessage(null), 3000);
            } catch (error: any) {
                console.error('Error disconnecting integration:', error);
                setSaveMessage({ type: 'error', text: `Failed to disconnect ${integration.name}` });
                setTimeout(() => setSaveMessage(null), 3000);
            }
        } else {
            // Connect - initiate OAuth flow
            console.log('Connecting integration:', integration.id);
            setIsConnectingIntegration(integration.id);
            try {
                const result = await api.settings.connectIntegration(integration.id);
                console.log('Connect integration result:', result);
                
                if (result.error) {
                    console.error('Connection error:', result.error);
                    setSaveMessage({ type: 'error', text: result.error });
                    setTimeout(() => setSaveMessage(null), 3000);
                    setIsConnectingIntegration(null);
                    return;
                }

                if (result.url) {
                    console.log('Redirecting to OAuth URL:', result.url);
                    // Redirect to OAuth provider
                    window.location.href = result.url;
                } else {
                    console.error('No OAuth URL returned');
                    setSaveMessage({ type: 'error', text: 'Failed to initiate connection. Please try again.' });
                    setTimeout(() => setSaveMessage(null), 3000);
                    setIsConnectingIntegration(null);
                }
            } catch (error: any) {
                console.error('Error connecting integration:', error);
                setSaveMessage({ type: 'error', text: error.message || 'Failed to connect integration' });
                setTimeout(() => setSaveMessage(null), 3000);
                setIsConnectingIntegration(null);
            }
        }
    };

    // Security Handlers
    const handleChangePassword = async (currentPassword: string, newPassword: string) => {
        setIsChangingPassword(true);
        setPasswordChangeError(null);

        try {
            const result = await api.auth.changePassword(currentPassword, newPassword);
            
            if (result.error) {
                setPasswordChangeError(result.error);
                return;
            }

            setSaveMessage({ type: 'success', text: 'Password changed successfully!' });
            setTimeout(() => {
                setSaveMessage(null);
                setIsPasswordModalOpen(false);
            }, 2000);
        } catch (error: any) {
            setPasswordChangeError(error.message || 'Failed to change password');
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleEnable2FA = async () => {
        setIsEnabling2FA(true);
        setTwoFactorError(null);

        try {
            const result = await api.auth.enableTwoFactor();
            setTwoFactorQR(result.qrCode);
            setTwoFactorSecret(result.secret);
            setTwoFactorBackupCodes(result.backupCodes);
            setTwoFactorFactorId(result.factorId || null); // Store factor ID
            setIs2FASetupModalOpen(true);
        } catch (error: any) {
            setTwoFactorError(error.message || 'Failed to enable 2FA');
            setSaveMessage({ type: 'error', text: error.message || 'Failed to enable 2FA' });
            setTimeout(() => setSaveMessage(null), 3000);
        } finally {
            setIsEnabling2FA(false);
        }
    };

    const handleVerify2FA = async (code: string) => {
        setIsVerifying2FA(true);
        setTwoFactorError(null);

        try {
            // Pass factorId to verification if we have it
            const result = await api.auth.verifyTwoFactor(code, twoFactorFactorId || undefined);
            
            if (result.error) {
                setTwoFactorError(result.error);
                return;
            }

            setTwoFactorEnabled(true);
            setTwoFactorFactorId(null); // Clear factor ID after successful verification
            setIs2FASetupModalOpen(false);
            setSaveMessage({ type: 'success', text: 'Two-factor authentication enabled successfully!' });
            setTimeout(() => setSaveMessage(null), 3000);
        } catch (error: any) {
            setTwoFactorError(error.message || 'Failed to verify 2FA code');
        } finally {
            setIsVerifying2FA(false);
        }
    };

    const handleDisable2FA = async () => {
        if (!confirm('Are you sure you want to disable two-factor authentication? This will reduce your account security.')) {
            return;
        }

        setIsEnabling2FA(true);

        try {
            await api.auth.disableTwoFactor();
            setTwoFactorEnabled(false);
            setSaveMessage({ type: 'success', text: 'Two-factor authentication disabled successfully' });
            setTimeout(() => setSaveMessage(null), 3000);
        } catch (error: any) {
            setSaveMessage({ type: 'error', text: error.message || 'Failed to disable 2FA' });
            setTimeout(() => setSaveMessage(null), 3000);
        } finally {
            setIsEnabling2FA(false);
        }
    };

    const handleRevokeSession = async (sessionId: string) => {
        // Find the session to get its device name for confirmation
        const session = sessions.find(s => s.id === sessionId);
        const deviceName = session?.device || 'this device';
        
        if (!confirm(`Are you sure you want to revoke access from ${deviceName}? The user will need to sign in again on that device.`)) {
            return;
        }

        setIsRevokingSession(sessionId);

        try {
            const result = await api.auth.revokeSession(sessionId);
            
            if (result.error) {
                setSaveMessage({ type: 'error', text: result.error });
                setTimeout(() => setSaveMessage(null), 3000);
                setIsRevokingSession(null);
                return;
            }

            // If revoking current session, user will be signed out
            if (sessionId === 'current' || session?.current) {
                setSaveMessage({ type: 'success', text: 'Session revoked. Signing out...' });
                // Page will redirect to login
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1000);
                return;
            }

            // Reload sessions from database to get updated list
            setTimeout(async () => {
                try {
                    const updatedSessions = await api.auth.getSessions();
                    setSessions(updatedSessions);
                } catch (err) {
                    console.error('Error reloading sessions:', err);
                    // Fallback: remove from UI
                    setSessions(prev => prev.filter(s => s.id !== sessionId));
                }
            }, 500);
            
            setSaveMessage({ type: 'success', text: 'Session revoked successfully' });
            setTimeout(() => setSaveMessage(null), 3000);
        } catch (error: any) {
            setSaveMessage({ type: 'error', text: error.message || 'Failed to revoke session' });
            setTimeout(() => setSaveMessage(null), 3000);
        } finally {
            setIsRevokingSession(null);
        }
    };

    const handleRevokeAllSessions = async () => {
        if (!confirm('Are you sure you want to revoke all sessions? You will need to sign in again on all devices.')) {
            return;
        }

        try {
            await api.auth.revokeAllSessions();
            // Keep only current session in UI
            setSessions(prev => prev.filter(s => s.current));
            setSaveMessage({ type: 'success', text: 'All sessions revoked successfully. You will need to sign in again on other devices.' });
            setTimeout(() => setSaveMessage(null), 3000);
        } catch (error: any) {
            setSaveMessage({ type: 'error', text: error.message || 'Failed to revoke sessions' });
            setTimeout(() => setSaveMessage(null), 3000);
        }
    };

    const handleUpdateNotificationPrefs = async (updates: {
        emailNotifications?: boolean;
        interviewScheduleUpdates?: boolean;
        offerUpdates?: boolean;
        weeklyDigestEnabled?: boolean;
    }) => {
        try {
            await api.settings.updateNotificationPreferences(updates);
            setNotificationPrefs(prev => ({ ...prev, ...updates }));
            setSaveMessage({ type: 'success', text: 'Notification preferences updated successfully!' });
            setTimeout(() => setSaveMessage(null), 3000);
        } catch (error: any) {
            console.error('Error updating notification preferences:', error);
            setSaveMessage({ type: 'error', text: error.message || 'Failed to update notification preferences' });
            setTimeout(() => setSaveMessage(null), 3000);
        }
    };

    const handleUpdateComplianceSettings = async (updates: {
        dataRetentionPeriod?: string;
        consentRequired?: boolean;
    }) => {
        try {
            await api.settings.updateComplianceSettings(updates);
            setComplianceSettings(prev => ({ ...prev, ...updates }));
            setSaveMessage({ type: 'success', text: 'Compliance settings updated successfully!' });
            setTimeout(() => setSaveMessage(null), 3000);
        } catch (error: any) {
            console.error('Error updating compliance settings:', error);
            setSaveMessage({ type: 'error', text: error.message || 'Failed to update compliance settings' });
            setTimeout(() => setSaveMessage(null), 3000);
        }
    };

    const handleUpgradePlan = async (planType: 'basic' | 'professional', billingInterval: 'monthly' | 'yearly') => {
        setIsProcessingPayment(true);
        setBillingError(null);

        try {
            const result = await createCheckoutSession(planType, billingInterval);
            
            if (result.error) {
                setBillingError(result.error);
                return;
            }

            if (result.url) {
                // Redirect to Stripe Checkout
                window.location.href = result.url;
            } else {
                setBillingError('Failed to create checkout session. Please try again.');
            }
        } catch (error: any) {
            console.error('Error creating checkout session:', error);
            setBillingError(error.message || 'Failed to start checkout. Please try again.');
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const handleManageBilling = async () => {
        setIsProcessingPayment(true);
        setBillingError(null);

        try {
            const result = await createPortalSession();
            
            if (result.error) {
                console.error('Portal session error:', result.error);
                const details = (result as any).details;
                setBillingError(result.error + (details ? ` - ${details}` : ''));
                return;
            }

            if (result.url) {
                // Redirect to Stripe Customer Portal
                window.location.href = result.url;
            } else {
                setBillingError('Failed to open billing portal. Please check that you have an active subscription.');
            }
        } catch (error: any) {
            console.error('Error opening billing portal:', error);
            const errorMessage = error.message || 'Failed to open billing portal. Please try again.';
            setBillingError(errorMessage + ' Check Supabase Edge Function logs for details.');
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const tabs = [
        { id: 'profile', label: 'My Profile', icon: UserIcon },
        { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
        { id: 'notifications', label: 'Notifications', icon: Mail },
        { id: 'templates', label: 'Email Templates', icon: FileText },
        { id: 'workflows', label: 'Email Workflows', icon: Zap },
        { id: 'integrations', label: 'Integrations', icon: Layers, requiresProfessional: true },
        { id: 'security', label: 'Security', icon: AlertCircle },
    ];

    if (!user) return (
        <div className="min-h-screen bg-white">
            <div className="p-8">
                <div className="text-sm text-gray-500">Loading...</div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-white">
            <div className="p-8 max-w-6xl mx-auto">
            <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
            
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage your account, billing, and preferences.</p>
                </div>
                <Button variant="outline" onClick={() => setIsHelpOpen(true)}>Help & Support</Button>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar */}
                <div className="w-full md:w-64 flex-shrink-0 space-y-1">
                    {tabs
                        .filter(tab => {
                            // Hide integrations tab for Basic plan
                            if (tab.requiresProfessional && plan?.name === 'Basic Plan') {
                                return false;
                            }
                            return true;
                        })
                        .map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm p-8 min-h-[500px]">
                    {activeTab === 'profile' && (
                        <div className="space-y-8">
                            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4">Profile Information</h2>
                            
                            {/* Save Message */}
                            {saveMessage && (
                                <div className={`p-4 rounded-xl border ${
                                    saveMessage.type === 'success' 
                                        ? 'bg-gray-100 border-gray-200 text-gray-800' 
                                        : 'bg-gray-100 border-gray-200 text-gray-800'
                                }`}>
                                    <p className="text-sm font-medium">{saveMessage.text}</p>
                                </div>
                            )}

                            <div className="flex items-center gap-6">
                                <Avatar name={profileData.name} src={avatarUrl} className="w-20 h-20 text-2xl" />
                                <div>
                                    <div className="flex gap-3">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleAvatarUpload}
                                            className="hidden"
                                            id="avatar-upload"
                                        />
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading}
                                            icon={isUploading ? undefined : <Upload size={16} />}
                                        >
                                            {isUploading ? 'Uploading...' : 'Change Avatar'}
                                        </Button>
                                        {avatarUrl && (
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                                                onClick={handleDeleteAvatar}
                                            >
                                                Delete
                                            </Button>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">Recommended: 400x400px, Max 5MB</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-900">Full Name</label>
                                    <input 
                                        type="text" 
                                        value={profileData.name}
                                        onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-900">Email Address</label>
                                    <input 
                                        type="email" 
                                        value={profileData.email}
                                        disabled
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed" 
                                    />
                                    <p className="text-xs text-gray-500">Email cannot be changed</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-900">Job Title</label>
                                    <input 
                                        type="text" 
                                        value={profileData.jobTitle}
                                        onChange={(e) => setProfileData({...profileData, jobTitle: e.target.value})}
                                        placeholder="Recruiter"
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-900">Phone Number</label>
                                    <input 
                                        type="tel" 
                                        value={profileData.phone}
                                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                                        placeholder="+1 (555) 000-0000" 
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none" 
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end pt-4 border-t border-gray-100">
                                <Button 
                                    variant="black" 
                                    icon={<Save size={16}/>}
                                    onClick={handleSaveProfile}
                                    disabled={isSaving}
                                >
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'billing' && (
                        <div className="space-y-8">
                            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4">Plan & Billing</h2>
                            
                            {/* Error Message */}
                            {billingError && (
                                <div className="p-4 rounded-xl border border-gray-200 bg-gray-100 text-gray-800">
                                    <p className="text-sm font-medium whitespace-pre-line">{billingError}</p>
                                    <p className="text-xs text-gray-700 mt-2">
                                        💡 Check Supabase Dashboard → Logs → Edge Functions → create-portal-session for detailed error logs.
                                    </p>
                                </div>
                            )}

                            {/* Current Plan Card */}
                             <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">Current Plan</p>
                                    <h3 className="text-2xl font-bold text-gray-900">
                                        {isLoadingBilling ? (
                                            <Loader2 size={20} className="animate-spin inline" />
                                        ) : stripeSubscription ? (
                                            stripeSubscription.planName
                                        ) : (
                                            plan?.name || 'Free Plan'
                                        )}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        {isLoadingBilling ? (
                                            'Loading...'
                                        ) : stripeSubscription ? (
                                            <>
                                                {stripeSubscription.currency === 'USD' ? '$' : stripeSubscription.currency}{stripeSubscription.amount.toFixed(2)}/{stripeSubscription.interval === 'month' ? 'month' : 'year'}
                                                {' • '}
                                                {stripeSubscription.cancelAtPeriodEnd 
                                                    ? `Cancels on ${new Date(stripeSubscription.currentPeriodEnd).toLocaleDateString()}`
                                                    : `Renews on ${new Date(stripeSubscription.currentPeriodEnd).toLocaleDateString()}`
                                                }
                                            </>
                                        ) : (
                                            'No active subscription'
                                        )}
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    {stripeSubscription && (
                                        <Button 
                                            variant="outline" 
                                            onClick={handleManageBilling}
                                            disabled={isProcessingPayment}
                                        >
                                            {isProcessingPayment ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin mr-2" />
                                                    Loading...
                                                </>
                                            ) : (
                                                'Manage Subscription'
                                            )}
                                        </Button>
                                    )}
                                    {(!stripeSubscription && !isLoadingBilling) && (
                                        <Button 
                                            variant="black" 
                                            onClick={() => handleUpgradePlan('professional', 'monthly')}
                                            disabled={isProcessingPayment}
                                        >
                                            {isProcessingPayment ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin mr-2" />
                                                    Processing...
                                                </>
                                            ) : (
                                                'Upgrade Plan'
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>
                            
                            {/* Payment Method */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-4">Payment Method</h3>
                                {isLoadingBilling ? (
                                    <div className="flex items-center justify-center p-8 border border-gray-200 rounded-xl">
                                        <Loader2 size={20} className="animate-spin text-gray-400" />
                                    </div>
                                ) : stripePaymentMethod ? (
                                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                                    <div className="flex items-center gap-4">
                                            <CardBrandLogo brand={stripePaymentMethod.type} />
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">
                                                    {stripePaymentMethod.type.charAt(0).toUpperCase() + stripePaymentMethod.type.slice(1).replace('_', ' ')} ending in {stripePaymentMethod.last4}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Expires {String(stripePaymentMethod.expMonth).padStart(2, '0')}/{stripePaymentMethod.expYear}
                                                </p>
                                            </div>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={handleManageBilling}
                                            disabled={isProcessingPayment}
                                        >
                                            Edit
                                        </Button>
                                    </div>
                                ) : (
                                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-8 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                                                <CreditCard size={16} className="text-gray-400" />
                                        </div>
                                        <div>
                                                <p className="text-sm font-bold text-gray-900">No payment method on file</p>
                                                <p className="text-xs text-gray-500">Add a payment method to subscribe to a plan</p>
                                        </div>
                                    </div>
                                        <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={() => handleUpgradePlan('professional', 'monthly')}
                                            disabled={isProcessingPayment}
                                        >
                                            Add
                                        </Button>
                                </div>
                                )}
                            </div>

                            {/* Billing History */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-gray-900">Billing History</h3>
                                    {isLoadingBilling && (
                                        <Loader2 size={16} className="animate-spin text-gray-400" />
                                    )}
                                </div>
                                {invoices.length === 0 ? (
                                    <div className="border border-gray-200 rounded-xl p-8 text-center">
                                        <CreditCard size={32} className="mx-auto text-gray-400 mb-3" />
                                        <p className="text-sm text-gray-500">No billing history available</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {invoices.map((invoice) => (
                                            <div 
                                                key={invoice.id} 
                                                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors gap-3 sm:gap-4"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <DollarSign size={16} className="text-gray-400 flex-shrink-0" />
                                                        <p className="text-sm font-bold text-gray-900 truncate">
                                                            {invoice.amount}
                                                        </p>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                                            invoice.status === 'Paid' 
                                                                ? 'bg-gray-100 text-gray-700' 
                                                                : invoice.status === 'Pending'
                                                                ? 'bg-gray-100 text-gray-600'
                                                                : 'bg-gray-100 text-gray-700'
                                                        }`}>
                                                            {invoice.status}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500 ml-7">
                                                        <Calendar size={12} />
                                                        {new Date(invoice.date).toLocaleDateString('en-US', { 
                                                            year: 'numeric', 
                                                            month: 'long', 
                                                            day: 'numeric' 
                                                        })}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 ml-7 sm:ml-0">
                                                    {(invoice as any).hostedInvoiceUrl && (
                                                        <a
                                                            href={(invoice as any).hostedInvoiceUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
                                                        >
                                                            <ExternalLink size={12} />
                                                            View Invoice
                                                        </a>
                                                    )}
                                                    {(invoice as any).invoicePdf && (
                                                        <a
                                                            href={(invoice as any).invoicePdf}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
                                                        >
                                                            <Download size={12} />
                                                            Download
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'notifications' && (
                        <div className="space-y-8">
                             <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4">Notification Preferences</h2>
                             
                             {saveMessage && (
                                 <div className={`p-4 rounded-xl border ${
                                     saveMessage.type === 'success' 
                                         ? 'bg-green-50 border-green-200 text-green-800' 
                                         : 'bg-gray-100 border-gray-200 text-gray-800'
                                 }`}>
                                     <p className="text-sm font-medium">{saveMessage.text}</p>
                                 </div>
                             )}

                             <div className="space-y-4">
                                 <NotificationToggle
                                     label="Email Notifications"
                                     description="Get notified for new applicants and system updates"
                                     checked={notificationPrefs.emailNotifications}
                                     onChange={async (checked) => {
                                         await handleUpdateNotificationPrefs({ emailNotifications: checked });
                                     }}
                                 />
                                 <NotificationToggle
                                     label="Interview Schedule Updates"
                                     description="Receive email reminders about upcoming interviews"
                                     checked={notificationPrefs.interviewScheduleUpdates}
                                     onChange={async (checked) => {
                                         await handleUpdateNotificationPrefs({ interviewScheduleUpdates: checked });
                                     }}
                                 />
                                 <NotificationToggle
                                     label="Offer Updates"
                                     description="Notifications when offers are accepted or declined"
                                     checked={notificationPrefs.offerUpdates}
                                     onChange={async (checked) => {
                                         await handleUpdateNotificationPrefs({ offerUpdates: checked });
                                     }}
                                 />
                                 <NotificationToggle
                                     label="Weekly digest"
                                     description="Weekly summary of jobs and pipeline activity (in-app notification)"
                                     checked={notificationPrefs.weeklyDigestEnabled}
                                     onChange={async (checked) => {
                                         await handleUpdateNotificationPrefs({ weeklyDigestEnabled: checked });
                                     }}
                                 />
                             </div>
                        </div>
                    )}

                    {activeTab === 'templates' && (
                        <div className="space-y-8">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                <h2 className="text-lg font-bold text-gray-900">Email Templates</h2>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                {templates.map((template) => (
                                    <div key={template.id} className="p-6 border border-gray-200 rounded-xl hover:border-gray-300 transition-all group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-gray-900">{template.title}</h3>
                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium uppercase tracking-wider">{template.type}</span>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => setEditingTemplate(template)}>Edit</Button>
                                        </div>
                                        <p className="text-sm text-gray-500 mb-4">{template.desc}</p>
                                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                            <p className="text-xs text-gray-400 font-medium mb-1 uppercase tracking-wider">Subject</p>
                                            <p className="text-sm text-gray-900 truncate">{template.subject}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'workflows' && (
                        <div className="space-y-8">
                            <WorkflowList
                                key={workflowListKey}
                                onEdit={(workflow) => {
                                    setEditingWorkflow(workflow);
                                    setIsWorkflowModalOpen(true);
                                }}
                                onTest={(workflow) => {
                                    // Open test workflow modal with placeholder inputs
                                    setTestingWorkflow(workflow);
                                    setTestPlaceholders({});
                                    setIsTestWorkflowModalOpen(true);
                                }}
                                onViewHistory={(workflow) => setViewingHistoryWorkflow(workflow)}
                                onCreate={() => {
                                    setEditingWorkflow(null);
                                    setIsWorkflowModalOpen(true);
                                }}
                            />
                        </div>
                    )}

                    {activeTab === 'integrations' && (
                        <div className="space-y-8">
                            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4">Integrations</h2>
                            {saveMessage && (
                                <div className={`p-4 rounded-lg border ${saveMessage.type === 'success' ? 'bg-gray-100 border-gray-200 text-gray-800' : 'bg-gray-100 border-gray-200 text-gray-800'}`}>
                                    <p className="text-sm font-medium">{saveMessage.text}</p>
                                </div>
                            )}
                            {plan?.name === 'Basic Plan' ? (
                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
                                    <Layers size={48} className="mx-auto text-gray-400 mb-4" />
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">Integrations Available on Professional Plan</h3>
                                    <p className="text-sm text-gray-500 mb-6">
                                        Upgrade to Professional to connect Google Calendar, Google Meet, and Microsoft Teams.
                                    </p>
                                    <Button
                                        variant="black"
                                        onClick={() => {
                                            setActiveTab('billing');
                                            handleUpgradePlan('professional', 'monthly');
                                        }}
                                    >
                                        Upgrade to Professional
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {integrations.filter(integration => integration.id !== 'teams').map((integration) => (
                                        <div key={integration.id} className="flex items-center justify-between p-6 border border-gray-200 rounded-xl hover:shadow-sm transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center p-2">
                                                    <img src={integration.logo} alt={integration.name} className="w-full h-full object-contain" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-900">{integration.name}</h3>
                                                    <p className="text-sm text-gray-500">{integration.desc}</p>
                                                </div>
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleIntegrationConnect(integration);
                                                }}
                                                disabled={isConnectingIntegration === integration.id}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                                    integration.active 
                                                    ? 'bg-black text-white hover:bg-gray-800' 
                                                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                                                }`}
                                            >
                                                {isConnectingIntegration === integration.id 
                                                    ? 'Connecting...' 
                                                    : integration.active 
                                                        ? 'Disconnect' 
                                                        : 'Connect'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    
                     {activeTab === 'security' && (
                        <div className="space-y-8">
                             <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4">Security Settings</h2>
                             
                             {/* Two-Factor Auth Section */}
                             <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center text-gray-900 shadow-sm">
                                            <Shield size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-sm">Two-Factor Authentication</h3>
                                            <p className="text-sm text-gray-500 mt-1 max-w-sm">Add an extra layer of security to your account by requiring a code when signing in.</p>
                                            
                                            {twoFactorEnabled && (
                                                <div className="flex items-center gap-2 mt-3 text-gray-700 text-xs font-medium bg-gray-100 w-fit px-2 py-1 rounded-md border border-gray-200">
                                                    <CheckCircle size={12} />
                                                    Enabled
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => twoFactorEnabled ? handleDisable2FA() : handleEnable2FA()}
                                        disabled={isEnabling2FA}
                                        className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black/20 disabled:opacity-50 disabled:cursor-not-allowed ${twoFactorEnabled ? 'bg-black' : 'bg-gray-300'}`}
                                    >
                                        <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ease-in-out ${twoFactorEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                             </div>

                             {/* Password & Login */}
                             <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Lock size={16} className="text-gray-400" /> Password & Login
                                </h3>
                                <button 
                                    onClick={() => setIsPasswordModalOpen(true)}
                                    className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
                                >
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-gray-900 group-hover:underline">Change Password</p>
                                        <span className="text-gray-400">•</span>
                                        <p className="text-xs text-gray-500">Update your account password</p>
                                    </div>
                                    <Key size={16} className="text-gray-400 group-hover:text-gray-900" />
                                </button>
                             </div>

                             {/* Active Sessions */}
                             <div>
                                 <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
                                    <Monitor size={16} className="text-gray-400" /> Active Sessions
                                 </h3>
                                 <div className="space-y-3">
                                     {sessions.length === 0 ? (
                                         <div className="text-center py-8 text-gray-500 text-sm">
                                             No active sessions found
                                         </div>
                                     ) : (
                                         sessions.map(session => (
                                             <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white hover:border-gray-300 transition-colors">
                                                 <div className="flex items-center gap-4 flex-1">
                                                     <div className="p-2 rounded-lg text-gray-600 bg-gray-50 border border-gray-100">
                                                         {session.icon === 'mobile' ? <Smartphone size={20} /> : <Monitor size={20} />}
                                                     </div>
                                                     <div className="flex-1">
                                                         <div className="flex items-center gap-2">
                                                            <p className="text-sm font-bold text-gray-900">{session.device}</p>
                                                            {session.current && <span className="text-gray-700 text-[10px] font-bold bg-gray-50 px-2 py-0.5 rounded border border-gray-100 uppercase tracking-wide">Current</span>}
                                                         </div>
                                                         <p className="text-xs text-gray-500 mt-0.5">{session.location} • <span className="font-mono">{session.ip || '192.168.x.x'}</span></p>
                                                         <p className="text-[10px] text-gray-400 mt-1">Last active: {session.time}</p>
                                                     </div>
                                                 </div>
                                                 {!session.current && (
                                                     <Button
                                                         variant="ghost"
                                                         size="sm"
                                                         onClick={() => handleRevokeSession(session.id)}
                                                         disabled={isRevokingSession === session.id}
                                                         className="ml-4 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                                     >
                                                         {isRevokingSession === session.id ? (
                                                             <>
                                                                 <Loader2 size={14} className="animate-spin mr-1" />
                                                                 Revoking...
                                                             </>
                                                         ) : (
                                                             <>
                                                                 <X size={14} className="mr-1" />
                                                                 Revoke
                                                             </>
                                                         )}
                                                     </Button>
                                                 )}
                                             </div>
                                         ))
                                     )}
                                 </div>
                                 {sessions.length > 1 && (
                                     <div className="mt-4 pt-4 border-t border-gray-200">
                                         <Button
                                             variant="outline"
                                             size="sm"
                                             onClick={handleRevokeAllSessions}
                                             className="w-full text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-gray-200"
                                         >
                                             <LogOut size={14} className="mr-2" />
                                             Revoke All Other Sessions
                                         </Button>
                                     </div>
                                 )}
                             </div>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Modals */}
            <ChangePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
                onChangePassword={handleChangePassword}
                isLoading={isChangingPassword}
                error={passwordChangeError}
            />
            
            <TwoFactorSetupModal
                isOpen={is2FASetupModalOpen}
                onClose={() => {
                    setIs2FASetupModalOpen(false);
                    setTwoFactorError(null);
                }}
                onVerify={handleVerify2FA}
                qrCode={twoFactorQR}
                secret={twoFactorSecret}
                backupCodes={twoFactorBackupCodes}
                isLoading={isVerifying2FA}
                error={twoFactorError}
            />
            
            {editingTemplate && (
                <EditTemplateModal
                    template={editingTemplate}
                    isOpen={!!editingTemplate}
                    onClose={() => setEditingTemplate(null)}
                    onSave={handleUpdateTemplate}
                    isSaving={isSavingTemplate}
                    saveMessage={templateSaveMessage}
                />
            )}

            {/* Workflow Builder Modal */}
            <EmailWorkflowBuilder
                workflow={editingWorkflow}
                isOpen={isWorkflowModalOpen}
                onClose={() => {
                    setEditingWorkflow(null);
                    setIsWorkflowModalOpen(false);
                }}
                onSave={() => {
                    setWorkflowListKey(prev => prev + 1); // Refresh the list
                    setIsWorkflowModalOpen(false);
                    setEditingWorkflow(null);
                }}
            />

            {/* Workflow Execution History Modal */}
            {viewingHistoryWorkflow && (
                <WorkflowExecutionHistory
                    workflow={viewingHistoryWorkflow}
                    isOpen={viewingHistoryWorkflow !== null}
                    onClose={() => setViewingHistoryWorkflow(null)}
                />
            )}

            {/* Test Workflow Modal */}
            <TestWorkflowModal
                workflow={testingWorkflow}
                isOpen={isTestWorkflowModalOpen}
                onClose={() => {
                    setIsTestWorkflowModalOpen(false);
                    setTestingWorkflow(null);
                    setTestPlaceholders({});
                }}
                onTest={async (workflowId, placeholders) => {
                    setIsTestingWorkflow(true);
                    try {
                        const candidatesResult = await api.candidates.list({ page: 1, pageSize: 1 });
                        const testCandidateId = candidatesResult.data?.[0]?.id || 'test';
                        await api.workflows.test(workflowId, testCandidateId, placeholders);
                        alert('Test email sent successfully! Check your email inbox.');
                        setIsTestWorkflowModalOpen(false);
                        setTestingWorkflow(null);
                        setTestPlaceholders({});
                    } catch (err: any) {
                        alert(err.message || 'Failed to send test email');
                    } finally {
                        setIsTestingWorkflow(false);
                    }
                }}
                isTesting={isTestingWorkflow}
            />
            </div>
        </div>
    );
};

export default Settings;

