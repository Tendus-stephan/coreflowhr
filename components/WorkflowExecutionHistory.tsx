import React, { useState, useEffect } from 'react';
import { WorkflowExecution, EmailWorkflow } from '../types';
import { api } from '../services/api';
import { supabase } from '../services/supabase';
import { CheckCircle, XCircle, Clock, SkipForward } from 'lucide-react';

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
        if (isOpen) {
            loadExecutions();
        }
    }, [isOpen, workflow.id]);

    const loadExecutions = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await api.workflows.getExecutions(workflow.id);
            
            // Get candidate names for each execution (skip test executions where candidate_id = user_id)
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

            const executionsWithNames = data.map(execution => ({
                ...execution,
                candidateName: execution.candidateId === userId 
                    ? 'Test Execution' 
                    : (candidateMap.get(execution.candidateId) || 'Unknown Candidate')
            }));

            setExecutions(executionsWithNames);
        } catch (err: any) {
            console.error('Error loading executions:', err);
            setError(err.message || 'Failed to load execution history');
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status: WorkflowExecution['status']) => {
        switch (status) {
            case 'sent':
                return <CheckCircle size={16} className="text-gray-500" />;
            case 'failed':
                return <XCircle size={16} className="text-gray-500" />;
            case 'pending':
                return <Clock size={16} className="text-gray-500" />;
            case 'skipped':
                return <SkipForward size={16} className="text-gray-500" />;
            default:
                return <Clock size={16} className="text-gray-500" />;
        }
    };

    const getStatusColor = (status: WorkflowExecution['status']) => {
        return 'bg-gray-100 text-gray-700';
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Execution History</h2>
                        <p className="text-sm text-gray-500 mt-1">{workflow.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <span className="text-gray-500">✕</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-sm text-gray-500">Loading history...</div>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                            {error}
                        </div>
                    ) : executions.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-sm text-gray-500">No executions yet</p>
                            <p className="text-xs text-gray-400 mt-2">
                                This workflow hasn't been triggered yet. It will execute automatically when candidates move to the {workflow.triggerStage} stage.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {executions.map((execution) => (
                                <div
                                    key={execution.id}
                                    className="bg-gray-50 border border-gray-200 rounded-xl p-4"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                {getStatusIcon(execution.status)}
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(execution.status)}`}>
                                                    {execution.status.toUpperCase()}
                                                </span>
                                                <span className="text-sm font-medium text-gray-900">
                                                    {execution.errorMessage?.includes('[TEST]') 
                                                        ? 'Test Execution' 
                                                        : (execution.candidateName || 'Unknown Candidate')}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {formatDate(execution.executedAt)}
                                            </div>
                                            {execution.errorMessage && (
                                                <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                                                    {execution.errorMessage}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

