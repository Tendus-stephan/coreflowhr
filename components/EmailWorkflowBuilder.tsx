import React, { useState, useEffect } from 'react';
import { EmailWorkflow, CandidateStage, EmailTemplate } from '../types';
import { api } from '../services/api';
import { Button } from './ui/Button';
import { CustomSelect } from './ui/CustomSelect';
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
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

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

    const fieldLabel = (text: string) => (
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{text}</label>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                    <h2 className="text-base font-bold text-gray-900">
                        {workflow ? 'Edit Workflow' : 'Create Workflow'}
                    </h2>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">{error}</div>
                    )}

                    {/* Workflow Name */}
                    <div>
                        {fieldLabel('Workflow Name *')}
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Send Screening Email"
                            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-gray-400 transition-colors"
                        />
                    </div>

                    {/* Trigger Stage */}
                    <div>
                        {fieldLabel('Trigger Stage *')}
                        <CustomSelect
                            inputStyle
                            value={triggerStage}
                            onChange={(val) => {
                                const newStage = val as CandidateStage;
                                setTriggerStage(newStage);
                                const stageToTemplateTypeMap: Record<CandidateStage, string[]> = {
                                    [CandidateStage.NEW]: [],
                                    [CandidateStage.SCREENING]: ['Screening'],
                                    [CandidateStage.INTERVIEW]: ['Interview', 'Reschedule'],
                                    [CandidateStage.OFFER]: ['Offer'],
                                    [CandidateStage.HIRED]: ['Hired'],
                                    [CandidateStage.REJECTED]: ['Rejection'],
                                };
                                const allowedTypes = stageToTemplateTypeMap[newStage] || [];
                                const currentTemplate = templates.find(t => t.id === emailTemplateId);
                                if (currentTemplate && !allowedTypes.includes(currentTemplate.type)) {
                                    setEmailTemplateId('');
                                }
                            }}
                            className="py-2.5 rounded-lg"
                            options={Object.values(CandidateStage)
                                .filter(stage => stage !== CandidateStage.NEW)
                                .map(stage => ({ value: stage, label: stage }))}
                        />
                        <p className="text-xs text-gray-400 mt-1">Triggers when a candidate moves to this stage</p>
                    </div>

                    {/* Email Template */}
                    <div>
                        {fieldLabel('Email Template *')}
                        <CustomSelect
                            inputStyle
                            value={emailTemplateId}
                            onChange={setEmailTemplateId}
                            className="py-2.5 rounded-lg"
                            options={[
                                { value: '', label: getFilteredTemplates().length === 0 ? `No templates for ${triggerStage} stage` : 'Select a template...' },
                                ...getFilteredTemplates().map(t => ({ value: t.id, label: `${t.title} (${t.type})` })),
                            ]}
                        />
                        {getFilteredTemplates().length === 0 && (
                            <p className="text-xs text-amber-600 mt-1">
                                Create a {triggerStage === CandidateStage.OFFER ? 'Offer' :
                                    triggerStage === CandidateStage.REJECTED ? 'Rejection' :
                                    triggerStage} template in Email Templates first
                            </p>
                        )}
                        {isCurrentTemplateInvalid() && (
                            <p className="text-xs text-red-500 mt-1">Template not appropriate for {triggerStage} stage.</p>
                        )}
                    </div>

                    {/* Conditions */}
                    <div className="space-y-4 pt-3 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Conditions (Optional)</p>

                        <div>
                            {fieldLabel('Min AI Match Score')}
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={minMatchScore || ''}
                                onChange={(e) => setMinMatchScore(e.target.value ? parseInt(e.target.value) : undefined)}
                                placeholder="e.g., 70 — leave empty for no minimum"
                                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-gray-400 transition-colors"
                            />
                        </div>

                        <div>
                            {fieldLabel('Source Filter')}
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={sourceInput}
                                    onChange={(e) => setSourceInput(e.target.value)}
                                    onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSource(); } }}
                                    placeholder="e.g., LinkedIn, Job Board"
                                    className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-gray-400 transition-colors"
                                />
                                <Button variant="outline" size="sm" onClick={handleAddSource}>Add</Button>
                            </div>
                            {sourceFilter.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {sourceFilter.map(source => (
                                        <span key={source} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs">
                                            {source}
                                            <button onClick={() => handleRemoveSource(source)} className="text-gray-400 hover:text-gray-700"><X size={11} /></button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <p className="text-xs text-gray-400 mt-1">Leave empty to trigger for all sources</p>
                        </div>
                    </div>

                    {/* Settings */}
                    <div className="space-y-4 pt-3 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Settings</p>

                        <div>
                            {fieldLabel('Delay Before Sending (minutes)')}
                            <input
                                type="number"
                                min="0"
                                value={delayMinutes}
                                onChange={(e) => setDelayMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-gray-400 transition-colors"
                            />
                            <p className="text-xs text-gray-400 mt-1">0 = send immediately</p>
                        </div>

                        <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={enabled}
                                onChange={(e) => setEnabled(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-0"
                            />
                            <span className="text-sm font-medium text-gray-700">Enable this workflow</span>
                        </label>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button variant="black" size="sm" onClick={handleSave} disabled={saving} icon={<Save size={14} />}>
                        {saving ? 'Saving...' : 'Save Workflow'}
                    </Button>
                </div>
            </div>
        </div>
    );
};




