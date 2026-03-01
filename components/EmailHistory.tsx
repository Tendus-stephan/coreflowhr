import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { EmailLog } from '../types';
import { api } from '../services/api';
import { Mail, CheckCircle, AlertCircle, Clock, ExternalLink, ArrowUpRight, ArrowDownLeft, RefreshCw, Reply } from 'lucide-react';

const PREVIEW_LENGTH = 150;

function stripHtml(html: string): string {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').trim();
}

function truncatePreview(text: string, maxLen: number): string {
  const plain = stripHtml(text);
  if (plain.length <= maxLen) return plain;
  return plain.slice(0, maxLen).trim() + '…';
}

interface EmailHistoryProps {
    candidateId: string;
    candidateEmail?: string | null;
    onUnreadCountChange?: () => void;
    onReplyClick?: (email: EmailLog) => void;
}

export const EmailHistory: React.FC<EmailHistoryProps> = ({ candidateId, candidateEmail, onUnreadCountChange, onReplyClick }) => {
    const [emails, setEmails] = useState<EmailLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const onUnreadCountChangeRef = useRef(onUnreadCountChange);
    onUnreadCountChangeRef.current = onUnreadCountChange;

    const loadEmailHistory = useCallback(async () => {
        if (!candidateId) return;
        try {
            setLoading(true);
            setError(null);
            const fetchedEmails = await api.candidates.getEmailHistory(candidateId);
            setEmails(fetchedEmails);
            onUnreadCountChangeRef.current?.();
        } catch (err: any) {
            console.error('Error loading email history:', err);
            setError(err.message || 'Failed to load email history');
        } finally {
            setLoading(false);
        }
    }, [candidateId]);

    useEffect(() => {
        if (candidateId) loadEmailHistory();
    }, [candidateId, loadEmailHistory]);

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

    const handleExpand = async (email: EmailLog) => {
        setExpandedId((prev) => (prev === email.id ? null : email.id));
        if (email.direction === 'inbound' && email.read === false) {
            try {
                await api.candidates.markEmailRead(candidateId, email.id);
                setEmails((prev) =>
                    prev.map((e) => (e.id === email.id ? { ...e, read: true } : e))
                );
                onUnreadCountChange?.();
            } catch (_) {}
        }
    };

    const threads = useMemo(() => {
        const byThread = new Map<string, EmailLog[]>();
        const noThread: EmailLog[] = [];
        for (const e of emails) {
            const tid = e.threadId || e.id;
            if (!e.threadId) {
                noThread.push(e);
                continue;
            }
            if (!byThread.has(tid)) byThread.set(tid, []);
            byThread.get(tid)!.push(e);
        }
        for (const arr of byThread.values()) {
            arr.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
        }
        const threadList = Array.from(byThread.entries()).map(([tid, arr]) => ({
            threadId: tid,
            emails: arr
        }));
        threadList.sort(
            (a, b) =>
                new Date(b.emails[b.emails.length - 1]?.sentAt ?? 0).getTime() -
                new Date(a.emails[a.emails.length - 1]?.sentAt ?? 0).getTime()
        );
        return { threadList, noThread };
    }, [emails]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-sm text-gray-500">Loading email history...</div>
            </div>
        );
    }

    const renderEmail = (email: EmailLog, isInThread?: boolean) => {
        const isInbound = email.direction === 'inbound';
        const isUnread = isInbound && email.read === false;
        const isExpanded = expandedId === email.id;
        const differentAddress =
            isInbound &&
            candidateEmail &&
            email.fromEmail &&
            email.fromEmail.toLowerCase() !== candidateEmail.toLowerCase();

        return (
            <div
                key={email.id}
                className={`bg-white border rounded-xl overflow-hidden transition-colors ${
                    isUnread ? 'border-blue-200' : 'border-gray-200'
                } ${isInThread ? 'ml-4 mt-2' : ''}`}
            >
                <button
                    type="button"
                    onClick={() => handleExpand(email)}
                    className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                {isUnread && (
                                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" aria-hidden />
                                )}
                                {isInbound ? (
                                    <ArrowDownLeft size={14} className="text-blue-600 shrink-0" />
                                ) : (
                                    <ArrowUpRight size={14} className="text-gray-500 shrink-0" />
                                )}
                                <span className="text-xs text-gray-500 shrink-0">
                                    {isInbound ? 'Reply' : 'Sent'}
                                </span>
                                {!isInbound && getStatusIcon(email.status)}
                                <h4
                                    className={`text-sm truncate ${isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-900'}`}
                                >
                                    {email.subject}
                                </h4>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                                {isInbound ? (
                                    <span>From: {email.fromEmail}</span>
                                ) : (
                                    <span>To: {email.toEmail}</span>
                                )}
                                {email.emailType && (
                                    <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                                        {email.emailType}
                                    </span>
                                )}
                            </div>
                            {differentAddress && (
                                <p className="text-xs text-amber-700 mt-1">
                                    This reply came from a different address; consider updating the candidate’s email.
                                </p>
                            )}
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                            <div className="text-xs text-gray-500">{formatDate(email.sentAt)}</div>
                            {!isInbound && (
                                <div className="text-xs text-gray-400">{getStatusText(email.status)}</div>
                            )}
                            {onReplyClick && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onReplyClick(email); }}
                                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                                >
                                    <Reply size={12} /> Reply
                                </button>
                            )}
                        </div>
                    </div>
                    {email.content && (
                        <div className="text-sm text-gray-600 border-t border-gray-100 pt-3 mt-3">
                            {isExpanded ? (
                                <div
                                    className="max-h-60 overflow-y-auto"
                                    dangerouslySetInnerHTML={{ __html: email.content }}
                                />
                            ) : (
                                <p className="line-clamp-2">
                                    {truncatePreview(email.content, PREVIEW_LENGTH)}
                                </p>
                            )}
                        </div>
                    )}
                </button>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Email history</span>
                <button
                    type="button"
                    onClick={() => loadEmailHistory()}
                    disabled={loading}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                    title="Refresh"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>
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
                {threads.threadList.map(({ threadId, emails: threadEmails }) => (
                    <div key={threadId} className="space-y-1">
                        {threadEmails.map((email, i) => renderEmail(email, i > 0))}
                    </div>
                ))}
                {threads.noThread.map((email) => renderEmail(email))}
            </div>
        </div>
    );
};
