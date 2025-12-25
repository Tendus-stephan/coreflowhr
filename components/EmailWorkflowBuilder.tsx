import React, { useState, useEffect } from 'react';
import { EmailWorkflow, CandidateStage, EmailTemplate } from '../types';
import { api } from '../services/api';
import { Button } from './ui/Button';
import { X, Save } from 'lucide-react';

interface EmailWorkflowBuilderProps {
    workflow?: EmailWorkflow | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export const EmailWorkflowBuilder: React.FC<EmailWorkflowBuilderProps> = ({
    workflow,
    isOpen,
    onClose,
    onSave
}) => {
    const [name, setName] = useState('');
    const [triggerStage, setTriggerStage] = useState<CandidateStage>(CandidateStage.NEW);
    const [emailTemplateId, setEmailTemplateId] = useState('');
    const [minMatchScore, setMinMatchScore] = useState<number | undefined>(undefined);
    const [sourceFilter, setSourceFilter] = useState<string[]>([]);
    const [enabled, setEnabled] = useState(true);
    const [delayMinutes, setDelayMinutes] = useState(0);
    
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [sourceInput, setSourceInput] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadTemplates();
            if (workflow) {
                // Editing existing workflow
                setName(workflow.name);
                setTriggerStage(workflow.triggerStage);
                setEmailTemplateId(workflow.emailTemplateId);
                setMinMatchScore(workflow.minMatchScore);
                setSourceFilter(workflow.sourceFilter || []);
                setEnabled(workflow.enabled);
                setDelayMinutes(workflow.delayMinutes);
            } else {
                // Creating new workflow
                setName('');
                setTriggerStage(CandidateStage.NEW);
                setEmailTemplateId('');
                setMinMatchScore(undefined);
                setSourceFilter([]);
                setEnabled(true);
                setDelayMinutes(0);
            }
            setError(null);
        }
    }, [isOpen, workflow]);

    const loadTemplates = async () => {
        try {
            const data = await api.settings.getTemplates();
            setTemplates(data);
        } catch (err: any) {
            console.error('Error loading templates:', err);
            setError(err.message || 'Failed to load email templates');
        }
    };

    const handleAddSource = () => {
        if (sourceInput.trim() && !sourceFilter.includes(sourceInput.trim())) {
            setSourceFilter([...sourceFilter, sourceInput.trim()]);
            setSourceInput('');
        }
    };

    const handleRemoveSource = (source: string) => {
        setSourceFilter(sourceFilter.filter(s => s !== source));
    };

    const handleSave = async () => {
        if (!name.trim()) {
            setError('Workflow name is required');
            return;
        }

        if (!emailTemplateId) {
            setError('Email template is required');
            return;
        }

        try {
            setSaving(true);
            setError(null);

            if (workflow) {
                // Update existing workflow
                await api.workflows.update(workflow.id, {
                    name: name.trim(),
                    triggerStage,
                    emailTemplateId,
                    minMatchScore: minMatchScore || undefined,
                    sourceFilter: sourceFilter.length > 0 ? sourceFilter : undefined,
                    enabled,
                    delayMinutes
                });
            } else {
                // Create new workflow
                await api.workflows.create({
                    name: name.trim(),
                    triggerStage,
                    emailTemplateId,
                    minMatchScore: minMatchScore || undefined,
                    sourceFilter: sourceFilter.length > 0 ? sourceFilter : undefined,
                    enabled,
                    delayMinutes
                });
            }

            onSave();
            onClose();
        } catch (err: any) {
            console.error('Error saving workflow:', err);
            setError(err.message || 'Failed to save workflow');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">
                        {workflow ? 'Edit Workflow' : 'Create Workflow'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Workflow Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Workflow Name *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Send Screening Email"
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                        />
                    </div>

                    {/* Trigger Stage */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Trigger Stage *
                        </label>
                        <select
                            value={triggerStage}
                            onChange={(e) => setTriggerStage(e.target.value as CandidateStage)}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                        >
                            {Object.values(CandidateStage).map(stage => (
                                <option key={stage} value={stage}>{stage}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            This workflow will trigger when a candidate moves to this stage
                        </p>
                    </div>

                    {/* Email Template */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Template *
                        </label>
                        <select
                            value={emailTemplateId}
                            onChange={(e) => setEmailTemplateId(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                        >
                            <option value="">Select a template...</option>
                            {templates.map(template => (
                                <option key={template.id} value={template.id}>
                                    {template.title} ({template.type})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Conditions */}
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                        <h3 className="text-sm font-medium text-gray-700">Conditions (Optional)</h3>

                        {/* Minimum Match Score */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Minimum AI Match Score
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={minMatchScore || ''}
                                onChange={(e) => setMinMatchScore(e.target.value ? parseInt(e.target.value) : undefined)}
                                placeholder="e.g., 70 (leave empty for no minimum)"
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Only trigger if candidate's AI match score is at least this value
                            </p>
                        </div>

                        {/* Source Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Source Filter
                            </label>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={sourceInput}
                                    onChange={(e) => setSourceInput(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddSource();
                                        }
                                    }}
                                    placeholder="e.g., LinkedIn, Job Board"
                                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddSource}
                                >
                                    Add
                                </Button>
                            </div>
                            {sourceFilter.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {sourceFilter.map(source => (
                                        <span
                                            key={source}
                                            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                                        >
                                            {source}
                                            <button
                                                onClick={() => handleRemoveSource(source)}
                                                className="hover:text-red-600"
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                                Only trigger for candidates from these sources (leave empty for all sources)
                            </p>
                        </div>
                    </div>

                    {/* Settings */}
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                        <h3 className="text-sm font-medium text-gray-700">Settings</h3>

                        {/* Delay */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Delay Before Sending (minutes)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={delayMinutes}
                                onChange={(e) => setDelayMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Wait this many minutes before sending the email (0 = send immediately)
                            </p>
                        </div>

                        {/* Enabled */}
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="enabled"
                                checked={enabled}
                                onChange={(e) => setEnabled(e.target.checked)}
                                className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black/5"
                            />
                            <label htmlFor="enabled" className="text-sm font-medium text-gray-700">
                                Enable this workflow
                            </label>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="black"
                        onClick={handleSave}
                        disabled={saving}
                        icon={<Save size={16} />}
                    >
                        {saving ? 'Saving...' : 'Save Workflow'}
                    </Button>
                </div>
            </div>
        </div>
    );
};




