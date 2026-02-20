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
    const [triggerStage, setTriggerStage] = useState<CandidateStage>(CandidateStage.SCREENING);
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
                setTriggerStage(CandidateStage.SCREENING); // Default to Screening (New stage workflows are disabled)
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

    // Filter templates based on trigger stage to prevent logical errors
    // e.g., "Offer Accepted" template shouldn't be available for "Offer" stage trigger
    // These offer status templates are handled separately by the offer system, not workflows
    const getFilteredTemplates = (): EmailTemplate[] => {
        // Templates that should NEVER be used in workflows (handled by other systems)
        const excludedTemplateTypes = [
            'Offer Accepted',
            'Offer Declined', 
            'Counter Offer Response'
        ];

        const stageToTemplateTypeMap: Record<CandidateStage, string[]> = {
            [CandidateStage.NEW]: [], // New stage workflows are disabled
            [CandidateStage.SCREENING]: ['Screening'],
            [CandidateStage.INTERVIEW]: ['Interview', 'Reschedule'],
            [CandidateStage.OFFER]: ['Offer'], // Only "Offer" type for sending offers, NOT status templates
            [CandidateStage.HIRED]: ['Hired'],
            [CandidateStage.REJECTED]: ['Rejection']
        };

        const allowedTypes = stageToTemplateTypeMap[triggerStage] || [];
        
        // Get currently selected template (if editing)
        const currentTemplate = emailTemplateId ? templates.find(t => t.id === emailTemplateId) : null;
        const isCurrentTemplateInvalid = currentTemplate && (
            excludedTemplateTypes.includes(currentTemplate.type) ||
            (allowedTypes.length > 0 && !allowedTypes.includes(currentTemplate.type))
        );
        
        // Filter templates:
        // 1. Exclude offer status templates (handled by offer system, not workflows)
        // 2. Only show templates matching the allowed types for this stage
        // 3. BUT: Include current template even if invalid (so user can see what was selected)
        const filtered = templates.filter(template => {
            // Always include current template (even if invalid) so user can see it
            if (template.id === emailTemplateId) {
                return true;
            }
            // Never show offer status templates in workflows
            if (excludedTemplateTypes.includes(template.type)) {
                return false;
            }
            // If no allowed types for this stage, show all (except excluded)
            if (allowedTypes.length === 0) {
                return true;
            }
            // Only show templates matching allowed types
            return allowedTypes.includes(template.type);
        });
        
        return filtered;
    };

    // Check if current template selection is invalid
    const isCurrentTemplateInvalid = (): boolean => {
        if (!emailTemplateId) return false;
        const currentTemplate = templates.find(t => t.id === emailTemplateId);
        if (!currentTemplate) return false;
        
        const excludedTemplateTypes = ['Offer Accepted', 'Offer Declined', 'Counter Offer Response'];
        if (excludedTemplateTypes.includes(currentTemplate.type)) return true;
        
        const stageToTemplateTypeMap: Record<CandidateStage, string[]> = {
            [CandidateStage.NEW]: [],
            [CandidateStage.SCREENING]: ['Screening'],
            [CandidateStage.INTERVIEW]: ['Interview', 'Reschedule'],
            [CandidateStage.OFFER]: ['Offer'],
            [CandidateStage.HIRED]: ['Hired'],
            [CandidateStage.REJECTED]: ['Rejection']
        };
        const allowedTypes = stageToTemplateTypeMap[triggerStage] || [];
        return allowedTypes.length > 0 && !allowedTypes.includes(currentTemplate.type);
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

        // Validate template is appropriate for trigger stage
        if (isCurrentTemplateInvalid()) {
            setError('The selected email template is not appropriate for this trigger stage. Please select a different template.');
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
                        <div className="bg-gray-100 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
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
                            onChange={(e) => {
                                const newStage = e.target.value as CandidateStage;
                                setTriggerStage(newStage);
                                // Reset template selection if current template is not valid for new stage
                                const filteredTemplates = templates.filter(template => {
                                    const stageToTemplateTypeMap: Record<CandidateStage, string[]> = {
                                        [CandidateStage.NEW]: [],
                                        [CandidateStage.SCREENING]: ['Screening'],
                                        [CandidateStage.INTERVIEW]: ['Interview', 'Reschedule'],
                                        [CandidateStage.OFFER]: ['Offer'],
                                        [CandidateStage.HIRED]: ['Hired'],
                                        [CandidateStage.REJECTED]: ['Rejection']
                                    };
                                    const allowedTypes = stageToTemplateTypeMap[newStage] || [];
                                    return allowedTypes.includes(template.type);
                                });
                                const currentTemplate = templates.find(t => t.id === emailTemplateId);
                                if (currentTemplate && !filteredTemplates.find(t => t.id === currentTemplate.id)) {
                                    setEmailTemplateId(''); // Clear invalid selection
                                }
                            }}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                        >
                            {Object.values(CandidateStage)
                                .filter(stage => stage !== CandidateStage.NEW) // Remove "New" - workflows are disabled for New stage
                                .map(stage => (
                                    <option key={stage} value={stage}>{stage}</option>
                                ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            This workflow will trigger when a candidate moves to this stage
                        </p>
                        <p className="text-xs text-yellow-600 mt-1 italic">
                            Note: "New" stage workflows are disabled - candidates are contacted via LinkedIn outreach first
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
                            {getFilteredTemplates().length === 0 ? (
                                <option value="" disabled>
                                    No templates available for {triggerStage} stage
                                </option>
                            ) : (
                                getFilteredTemplates().map(template => (
                                    <option key={template.id} value={template.id}>
                                        {template.title} ({template.type})
                                    </option>
                                ))
                            )}
                        </select>
                        {getFilteredTemplates().length === 0 && (
                            <p className="text-xs text-amber-600 mt-1">
                                Create a {triggerStage === CandidateStage.OFFER ? 'Offer' : 
                                         triggerStage === CandidateStage.REJECTED ? 'Rejection' : 
                                         triggerStage} template in Settings → Email Templates first
                            </p>
                        )}
                        {isCurrentTemplateInvalid() && (
                            <p className="text-xs text-gray-600 mt-1 font-medium">
                                ⚠️ This template is not appropriate for {triggerStage} stage. Please select a different template.
                            </p>
                        )}
                        {!isCurrentTemplateInvalid() && getFilteredTemplates().length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                                Only templates appropriate for {triggerStage} stage are shown
                            </p>
                        )}
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
                                                className="hover:text-gray-700"
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




