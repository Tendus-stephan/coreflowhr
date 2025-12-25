import React, { useState, useEffect } from 'react';
import { InterviewFeedback } from '../types';
import { api } from '../services/api';
import { Button } from './ui/Button';
import { Star, Save, X } from 'lucide-react';

interface InterviewFeedbackFormProps {
    interviewId: string;
    candidateId: string;
    onFeedbackSubmitted: () => void;
}

export const InterviewFeedbackForm: React.FC<InterviewFeedbackFormProps> = ({
    interviewId,
    candidateId,
    onFeedbackSubmitted
}) => {
    const [loading, setLoading] = useState(false);
    const [loadingExisting, setLoadingExisting] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Form state
    const [overallRating, setOverallRating] = useState<number | undefined>(undefined);
    const [technicalSkills, setTechnicalSkills] = useState<number | undefined>(undefined);
    const [communication, setCommunication] = useState<number | undefined>(undefined);
    const [culturalFit, setCulturalFit] = useState<number | undefined>(undefined);
    const [problemSolving, setProblemSolving] = useState<number | undefined>(undefined);
    const [strengths, setStrengths] = useState('');
    const [weaknesses, setWeaknesses] = useState('');
    const [overallImpression, setOverallImpression] = useState('');
    const [recommendation, setRecommendation] = useState<'Strong Yes' | 'Yes' | 'Maybe' | 'No' | 'Strong No' | ''>('');

    // Load existing feedback
    useEffect(() => {
        const loadExistingFeedback = async () => {
            try {
                setLoadingExisting(true);
                const existing = await api.interviews.getFeedback(interviewId);
                if (existing) {
                    setOverallRating(existing.overallRating);
                    setTechnicalSkills(existing.technicalSkills);
                    setCommunication(existing.communication);
                    setCulturalFit(existing.culturalFit);
                    setProblemSolving(existing.problemSolving);
                    setStrengths(existing.strengths || '');
                    setWeaknesses(existing.weaknesses || '');
                    setOverallImpression(existing.overallImpression || '');
                    setRecommendation(existing.recommendation || '');
                }
            } catch (err: any) {
                console.error('Error loading existing feedback:', err);
                // Don't show error - just start with empty form
            } finally {
                setLoadingExisting(false);
            }
        };

        loadExistingFeedback();
    }, [interviewId]);

    const handleSubmit = async () => {
        try {
            setLoading(true);
            setError(null);

            await api.interviews.submitFeedback(interviewId, {
                overallRating,
                technicalSkills,
                communication,
                culturalFit,
                problemSolving,
                strengths: strengths.trim() || undefined,
                weaknesses: weaknesses.trim() || undefined,
                overallImpression: overallImpression.trim() || undefined,
                recommendation: recommendation || undefined
            });

            onFeedbackSubmitted();
        } catch (err: any) {
            console.error('Error submitting feedback:', err);
            setError(err.message || 'Failed to submit feedback');
        } finally {
            setLoading(false);
        }
    };

    const StarRating = ({ 
        value, 
        onChange, 
        label 
    }: { 
        value: number | undefined; 
        onChange: (value: number) => void; 
        label: string;
    }) => {
        return (
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">{label}</label>
                <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => onChange(star)}
                            className="focus:outline-none transition-transform hover:scale-110"
                        >
                            <Star
                                size={20}
                                className={star <= (value || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                            />
                        </button>
                    ))}
                    {value && (
                        <span className="text-xs text-gray-500 ml-2">{value}/5</span>
                    )}
                </div>
            </div>
        );
    };

    if (loadingExisting) {
        return (
            <div className="text-center py-4">
                <div className="text-sm text-gray-500">Loading...</div>
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

            <div className="space-y-4">
                {/* Ratings */}
                <div className="grid grid-cols-2 gap-4">
                    <StarRating
                        value={overallRating}
                        onChange={setOverallRating}
                        label="Overall Rating"
                    />
                    <StarRating
                        value={technicalSkills}
                        onChange={setTechnicalSkills}
                        label="Technical Skills"
                    />
                    <StarRating
                        value={communication}
                        onChange={setCommunication}
                        label="Communication"
                    />
                    <StarRating
                        value={culturalFit}
                        onChange={setCulturalFit}
                        label="Cultural Fit"
                    />
                    <StarRating
                        value={problemSolving}
                        onChange={setProblemSolving}
                        label="Problem Solving"
                    />
                </div>

                {/* Recommendation */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                        Recommendation
                    </label>
                    <select
                        value={recommendation}
                        onChange={(e) => setRecommendation(e.target.value as any)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                    >
                        <option value="">Select recommendation...</option>
                        <option value="Strong Yes">Strong Yes</option>
                        <option value="Yes">Yes</option>
                        <option value="Maybe">Maybe</option>
                        <option value="No">No</option>
                        <option value="Strong No">Strong No</option>
                    </select>
                </div>

                {/* Strengths */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                        Strengths
                    </label>
                    <textarea
                        value={strengths}
                        onChange={(e) => setStrengths(e.target.value)}
                        placeholder="What did the candidate do well?"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all resize-none"
                        rows={4}
                    />
                </div>

                {/* Weaknesses / Areas for Improvement */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                        Areas for Improvement
                    </label>
                    <textarea
                        value={weaknesses}
                        onChange={(e) => setWeaknesses(e.target.value)}
                        placeholder="What areas could the candidate improve?"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all resize-none"
                        rows={4}
                    />
                </div>

                {/* Overall Impression */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                        Overall Impression
                    </label>
                    <textarea
                        value={overallImpression}
                        onChange={(e) => setOverallImpression(e.target.value)}
                        placeholder="Provide your overall thoughts and impressions..."
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all resize-none"
                        rows={4}
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
                <Button
                    variant="outline"
                    onClick={onFeedbackSubmitted}
                    disabled={loading}
                    className="flex-1"
                >
                    Cancel
                </Button>
                <Button
                    variant="black"
                    onClick={handleSubmit}
                    disabled={loading}
                    icon={<Save size={16} />}
                    className="flex-1"
                >
                    {loading ? 'Saving...' : 'Save Feedback'}
                </Button>
            </div>
        </div>
    );
};




