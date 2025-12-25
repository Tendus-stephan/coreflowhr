import React, { useState, useEffect } from 'react';
import { EmailWorkflow } from '../types';
import { api } from '../services/api';
import { Button } from './ui/Button';
import { Plus, Edit2, Trash2, Play, History, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';

interface WorkflowListProps {
    onEdit: (workflow: EmailWorkflow) => void;
    onTest: (workflow: EmailWorkflow) => void;
    onViewHistory: (workflow: EmailWorkflow) => void;
    onCreate: () => void;
}

export const WorkflowList: React.FC<WorkflowListProps> = ({
    onEdit,
    onTest,
    onViewHistory,
    onCreate
}) => {
    const [workflows, setWorkflows] = useState<EmailWorkflow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        loadWorkflows();
    }, []);

    const loadWorkflows = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await api.workflows.list();
            
            // Remove duplicate workflows (keep first one, delete rest)
            const seen = new Map<string, string>(); // stage+name -> workflow id
            const duplicatesToDelete: string[] = [];
            
            for (const workflow of data) {
                const key = `${workflow.triggerStage}:${workflow.name.toLowerCase()}`;
                if (seen.has(key)) {
                    // Found duplicate - mark for deletion
                    duplicatesToDelete.push(workflow.id);
                } else {
                    seen.set(key, workflow.id);
                }
            }

            // Delete duplicates
            for (const duplicateId of duplicatesToDelete) {
                try {
                    await api.workflows.delete(duplicateId);
                } catch (deleteErr: any) {
                    console.error('Error deleting duplicate workflow:', deleteErr);
                }
            }

            // Reload workflows after cleanup if duplicates were deleted
            if (duplicatesToDelete.length > 0) {
                const cleanedData = await api.workflows.list();
                setWorkflows(cleanedData);
            } else {
                setWorkflows(data);
            }
        } catch (err: any) {
            console.error('Error loading workflows:', err);
            setError(err.message || 'Failed to load workflows');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (workflow: EmailWorkflow) => {
        try {
            setTogglingId(workflow.id);
            const updated = await api.workflows.toggle(workflow.id, !workflow.enabled);
            setWorkflows(workflows.map(w => w.id === workflow.id ? updated : w));
        } catch (err: any) {
            console.error('Error toggling workflow:', err);
            alert(err.message || 'Failed to toggle workflow');
        } finally {
            setTogglingId(null);
        }
    };

    const handleDelete = async (workflow: EmailWorkflow) => {
        if (!confirm(`Are you sure you want to delete workflow "${workflow.name}"?`)) {
            return;
        }

        try {
            setDeletingId(workflow.id);
            await api.workflows.delete(workflow.id);
            setWorkflows(workflows.filter(w => w.id !== workflow.id));
        } catch (err: any) {
            console.error('Error deleting workflow:', err);
            alert(err.message || 'Failed to delete workflow');
        } finally {
            setDeletingId(null);
        }
    };

    const getStageColor = (stage: string) => {
        return 'bg-gray-100 text-gray-700';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-sm text-gray-500">Loading workflows...</div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Email Workflows</h3>
                <Button
                    variant="black"
                    size="sm"
                    icon={<Plus size={16} />}
                    onClick={onCreate}
                >
                    Create Workflow
                </Button>
            </div>

            {workflows.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-sm text-gray-500 mb-4">No workflows configured</p>
                    <p className="text-xs text-gray-400 mb-4">Create workflows to automatically send emails when candidates move to specific stages</p>
                    <Button
                        variant="outline"
                        size="sm"
                        icon={<Plus size={16} />}
                        onClick={onCreate}
                    >
                        Create Your First Workflow
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    {workflows.map((workflow) => (
                        <div
                            key={workflow.id}
                            className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h4 className="text-sm font-bold text-gray-900">{workflow.name}</h4>
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getStageColor(workflow.triggerStage)}`}>
                                            {workflow.triggerStage}
                                        </span>
                                        {!workflow.enabled && (
                                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600">
                                                Disabled
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span>Template: {workflow.emailTemplateId}</span>
                                        {workflow.minMatchScore && (
                                            <span>Min Score: {workflow.minMatchScore}%</span>
                                        )}
                                        {workflow.delayMinutes > 0 && (
                                            <span>Delay: {workflow.delayMinutes} min</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleToggle(workflow)}
                                        disabled={togglingId === workflow.id}
                                        className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors rounded hover:bg-gray-100"
                                        title={workflow.enabled ? 'Disable workflow' : 'Enable workflow'}
                                    >
                                        {togglingId === workflow.id ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : workflow.enabled ? (
                                            <ToggleRight size={18} className="text-green-600" />
                                        ) : (
                                            <ToggleLeft size={18} />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => onTest(workflow)}
                                        className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded hover:bg-blue-50"
                                        title="Test workflow"
                                    >
                                        <Play size={16} />
                                    </button>
                                    <button
                                        onClick={() => onViewHistory(workflow)}
                                        className="p-1.5 text-gray-400 hover:text-purple-600 transition-colors rounded hover:bg-purple-50"
                                        title="View execution history"
                                    >
                                        <History size={16} />
                                    </button>
                                    <button
                                        onClick={() => onEdit(workflow)}
                                        className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors rounded hover:bg-gray-100"
                                        title="Edit workflow"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(workflow)}
                                        disabled={deletingId === workflow.id}
                                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded hover:bg-red-50 disabled:opacity-50"
                                        title="Delete workflow"
                                    >
                                        {deletingId === workflow.id ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Trash2 size={16} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

