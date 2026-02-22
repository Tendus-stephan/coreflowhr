import React, { useState, useEffect } from 'react';
import { Offer } from '../types';
import { api } from '../services/api';
import { Button } from './ui/Button';
import { X, Plus, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';

interface NegotiateCounterOfferModalProps {
    offer: Offer;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export const NegotiateCounterOfferModal: React.FC<NegotiateCounterOfferModalProps> = ({
    offer,
    isOpen,
    onClose,
    onSave
}) => {
    const [salaryAmount, setSalaryAmount] = useState<number | undefined>(offer.salaryAmount);
    const [salaryCurrency, setSalaryCurrency] = useState(offer.salaryCurrency || 'USD');
    const [salaryPeriod, setSalaryPeriod] = useState<'hourly' | 'monthly' | 'yearly'>(offer.salaryPeriod || 'yearly');
    const [startDate, setStartDate] = useState(offer.startDate || '');
    const [benefits, setBenefits] = useState<string[]>(offer.benefits || []);
    const [benefitInput, setBenefitInput] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && offer) {
            setSalaryAmount(offer.salaryAmount);
            setSalaryCurrency(offer.salaryCurrency || 'USD');
            setSalaryPeriod(offer.salaryPeriod || 'yearly');
            setStartDate(offer.startDate || '');
            setBenefits(offer.benefits || []);
            setNotes('');
            setError(null);
        }
    }, [isOpen, offer]);

    const handleAddBenefit = () => {
        if (benefitInput.trim() && !benefits.includes(benefitInput.trim())) {
            setBenefits([...benefits, benefitInput.trim()]);
            setBenefitInput('');
        }
    };

    const handleRemoveBenefit = (index: number) => {
        setBenefits(benefits.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!salaryAmount || salaryAmount <= 0) {
            setError('Please enter a valid salary amount');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await api.offers.respondToCounterOffer(offer.id, {
                salaryAmount,
                salaryCurrency,
                salaryPeriod,
                startDate: startDate || undefined,
                benefits: benefits.length > 0 ? benefits : undefined,
                notes: notes.trim() || undefined
            });

            onSave();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to send negotiation response');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col m-4">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">
                        Negotiate Counter Offer
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
                        <div className="p-4 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-600 mb-4">
                                Update the offer terms to respond to the candidate's counter offer. The candidate will receive an email with your updated terms.
                            </p>
                        </div>

                        {/* Salary */}
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Salary Amount *
                                </label>
                                <input
                                    type="number"
                                    value={salaryAmount || ''}
                                    onChange={(e) => setSalaryAmount(e.target.value ? parseFloat(e.target.value) : undefined)}
                                    placeholder="0.00"
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Currency
                                </label>
                                <select
                                    value={salaryCurrency}
                                    onChange={(e) => setSalaryCurrency(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                >
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="GBP">GBP (£)</option>
                                    <option value="CAD">CAD (C$)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Period
                                </label>
                                <select
                                    value={salaryPeriod}
                                    onChange={(e) => setSalaryPeriod(e.target.value as 'hourly' | 'monthly' | 'yearly')}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                >
                                    <option value="yearly">Per Year</option>
                                    <option value="monthly">Per Month</option>
                                    <option value="hourly">Per Hour</option>
                                </select>
                            </div>
                        </div>

                        {/* Start Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                            />
                        </div>

                        {/* Benefits */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Benefits
                            </label>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={benefitInput}
                                    onChange={(e) => setBenefitInput(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddBenefit();
                                        }
                                    }}
                                    placeholder="e.g., Health Insurance"
                                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddBenefit}
                                    icon={<Plus size={14} />}
                                >
                                    Add
                                </Button>
                            </div>
                            {benefits.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {benefits.map((benefit, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm"
                                        >
                                            {benefit}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveBenefit(index)}
                                                className="hover:text-gray-700 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Additional Notes (Optional)
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add any additional notes or comments for the candidate..."
                                rows={4}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="black"
                        onClick={handleSubmit}
                        disabled={saving || !salaryAmount || salaryAmount <= 0}
                        icon={saving ? <Loader2 size={16} className="animate-spin" /> : undefined}
                    >
                        {saving ? 'Sending...' : 'Send Negotiation Response'}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};



