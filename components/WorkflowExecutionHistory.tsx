import React, { useState, useEffect } from 'react';
import { WorkflowExecution, EmailWorkflow } from '../types';
import { api } from '../services/api';
import { supabase } from '../services/supabase';
import { CheckCircle, XCircle, Clock, SkipForward, X } from 'lucide-react';

interface WorkflowExecutionHistoryProps {
    workflow: EmailWorkflow;
    isOpen: boolean;
    onClose: () => void;
}

interface ExecutionWithCandidate extends WorkflowExecution {
    candidateName?: string;
}

export const WorkflowExecutionHistory: React.FC<WorkflowExecutionHistoryProps> = ({
    workflow,
    isOpen,
    onClose
}) => {
    const [executions, setExecutions] = useState<ExecutionWithCandidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) loadExecutions();
    }, [isOpen, workflow.id]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const loadExecutions = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await api.workflows.getExecutions(workflow.id);
            const userId = (await supabase.auth.getUser()).data.user?.id;
            const realCandidateIds = [...new Set(data.filter(e => e.candidateId !== userId).map(e => e.candidateId))];
            let candidateMap = new Map<string, string>();
            if (realCandidateIds.length > 0) {
                const { data: candidates } = await supabase
                    .from('candidates')
                    .select('id, name')
                    .in('id', realCandidateIds);
                candidateMap = new Map((candidates || []).map(c => [c.id, c.name]));
            }
            setExecutions(data.map(execution => ({
                ...execution,
                candidateName: execution.candidateId === userId
                    ? 'Test Execution'
                    : (candidateMap.get(execution.candidateId) || 'Unknown Candidate')
            })));
        } catch (err: any) {
            setError(err.message || 'Failed to load execution history');
        } finally {
            setLoading(false);
        }
    };

    const statusIcon = (status: WorkflowExecution['status']) => {
        const cls = 'flex-shrink-0';
        if (status === 'sent') return <CheckCircle size={13} className={`${cls} text-green-500`} />;
        if (status === 'failed') return <XCircle size={13} className={`${cls} text-red-500`} />;
        if (status === 'skipped') return <SkipForward size={13} className={`${cls} text-gray-400`} />;
        return <Clock size={13} className={`${cls} text-amber-500`} />;
    };

    const statusBadge = (status: WorkflowExecution['status']) => {
        const base = 'text-[10px] font-semibold px-1.5 py-0.5 rounded-full';
        if (status === 'sent') return `${base} bg-green-50 text-green-700`;
        if (status === 'failed') return `${base} bg-red-50 text-red-600`;
        if (status === 'skipped') return `${base} bg-gray-100 text-gray-500`;
        return `${base} bg-amber-50 text-amber-600`;
    };

    const formatDate = (d: string) => {
        const date = new Date(d);
        return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-gray-200 flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                    <div className="min-w-0">
                        <h2 className="text-base font-bold text-gray-900 leading-none">Execution History</h2>
                        <p className="text-xs text-gray-400 mt-1 truncate">{workflow.name}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0">
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-sm text-gray-400">Loading...</div>
                    ) : error ? (
                        <div className="m-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">{error}</div>
                    ) : executions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                            <Clock size={20} className="text-gray-300 mb-3" />
                            <p className="text-sm font-semibold text-gray-700">No executions yet</p>
                            <p className="text-xs text-gray-400 mt-1 max-w-xs">
                                This workflow will run automatically when a candidate moves to the <strong>{workflow.triggerStage}</strong> stage.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {executions.map((execution) => (
                                <div key={execution.id} className="px-6 py-3 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {statusIcon(execution.status)}
                                            <span className="text-sm font-medium text-gray-900 truncate">
                                                {execution.errorMessage?.includes('[TEST]') ? 'Test Execution' : (execution.candidateName || 'Unknown Candidate')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="text-xs text-gray-400">{formatDate(execution.executedAt)}</span>
                                            <span className={statusBadge(execution.status)}>{execution.status}</span>
                                        </div>
                                    </div>
                                    {execution.errorMessage && !execution.errorMessage.includes('[TEST]') && (
                                        <p className="mt-1.5 text-xs text-gray-500 pl-5">{execution.errorMessage}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
