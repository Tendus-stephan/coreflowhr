import React, { useState, useEffect } from 'react';
import { EmailLog } from '../types';
import { api } from '../services/api';
import { Mail, CheckCircle, AlertCircle, Clock, ExternalLink } from 'lucide-react';

interface EmailHistoryProps {
    candidateId: string;
}

export const EmailHistory: React.FC<EmailHistoryProps> = ({ candidateId }) => {
    const [emails, setEmails] = useState<EmailLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load email history
    useEffect(() => {
        const loadEmailHistory = async () => {
            try {
                setLoading(true);
                setError(null);
                const fetchedEmails = await api.candidates.getEmailHistory(candidateId);
                setEmails(fetchedEmails);
            } catch (err: any) {
                console.error('Error loading email history:', err);
                setError(err.message || 'Failed to load email history');
            } finally {
                setLoading(false);
            }
        };

        if (candidateId) {
            loadEmailHistory();
        }
    }, [candidateId]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    };

    const getStatusIcon = (status: EmailLog['status']) => {
        switch (status) {
            case 'sent':
                return <Clock size={14} className="text-blue-500" />;
            case 'delivered':
                return <CheckCircle size={14} className="text-gray-600" />;
            case 'opened':
                return <Mail size={14} className="text-blue-600" />;
            case 'clicked':
                return <ExternalLink size={14} className="text-purple-500" />;
            case 'bounced':
            case 'failed':
                return <AlertCircle size={14} className="text-gray-500" />;
            default:
                return <Clock size={14} className="text-gray-400" />;
        }
    };

    const getStatusText = (status: EmailLog['status']) => {
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-sm text-gray-500">Loading email history...</div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {error && (
                <div className="bg-gray-100 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
                    {error}
                </div>
            )}

            {emails.length === 0 && (
                <div className="text-center py-12">
                    <Mail size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-sm text-gray-500">No email history</p>
                    <p className="text-xs text-gray-400 mt-2">Emails sent to this candidate will appear here</p>
                </div>
            )}

            <div className="space-y-3">
                {emails.map((email) => (
                    <div
                        key={email.id}
                        className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors"
                    >
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    {getStatusIcon(email.status)}
                                    <h4 className="text-sm font-bold text-gray-900 truncate">{email.subject}</h4>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span>To: {email.toEmail}</span>
                                    {email.emailType && (
                                        <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                                            {email.emailType}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-gray-500 mb-1">{formatDate(email.sentAt)}</div>
                                <div className="text-xs text-gray-400">{getStatusText(email.status)}</div>
                            </div>
                        </div>
                        
                        {email.content && (
                            <div 
                                className="text-sm text-gray-700 leading-relaxed border-t border-gray-100 pt-3 mt-3 max-h-40 overflow-y-auto"
                                dangerouslySetInnerHTML={{ __html: email.content }}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};




