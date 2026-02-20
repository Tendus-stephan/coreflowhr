import React from 'react';
import { InterviewFeedback } from '../types';
import { Avatar } from './ui/Avatar';
import { Star, TrendingUp, TrendingDown, MessageSquare } from 'lucide-react';

interface InterviewFeedbackCardProps {
    feedback: InterviewFeedback;
    interviewDate?: string;
    interviewTime?: string;
    jobTitle?: string;
}

export const InterviewFeedbackCard: React.FC<InterviewFeedbackCardProps> = ({
    feedback,
    interviewDate,
    interviewTime,
    jobTitle
}) => {
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric'
        });
    };

    const formatTime = (timeString?: string) => {
        if (!timeString) return '';
        return timeString;
    };

    const getRecommendationColor = (recommendation?: string) => {
        switch (recommendation) {
            case 'Strong Yes':
                return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'Yes':
                return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'Maybe':
                return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'No':
                return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'Strong No':
                return 'bg-gray-100 text-gray-700 border-gray-200';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    const renderStars = (rating?: number) => {
        if (!rating) return null;
        return (
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        size={14}
                        className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                    />
                ))}
                <span className="text-xs text-gray-600 ml-1">{rating}/5</span>
            </div>
        );
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <Avatar 
                            name={feedback.userName || 'User'} 
                            src={feedback.userAvatarUrl} 
                            className="w-6 h-6 text-[10px]" 
                        />
                        <div>
                            <p className="text-xs font-bold text-gray-900">{feedback.userName || 'Unknown'}</p>
                            <p className="text-[10px] text-gray-500">
                                {formatDate(interviewDate)} {interviewTime && `at ${formatTime(interviewTime)}`}
                            </p>
                        </div>
                    </div>
                    {jobTitle && (
                        <p className="text-xs text-gray-600 mt-1">{jobTitle}</p>
                    )}
                </div>
                {feedback.recommendation && (
                    <span className={`px-2 py-1 text-xs font-bold rounded border ${getRecommendationColor(feedback.recommendation)}`}>
                        {feedback.recommendation}
                    </span>
                )}
            </div>

            {/* Ratings */}
            {(feedback.overallRating || feedback.technicalSkills || feedback.communication || feedback.culturalFit || feedback.problemSolving) && (
                <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-gray-100">
                    {feedback.overallRating && (
                        <div>
                            <p className="text-xs font-medium text-gray-700 mb-1">Overall Rating</p>
                            {renderStars(feedback.overallRating)}
                        </div>
                    )}
                    {feedback.technicalSkills && (
                        <div>
                            <p className="text-xs font-medium text-gray-700 mb-1">Technical Skills</p>
                            {renderStars(feedback.technicalSkills)}
                        </div>
                    )}
                    {feedback.communication && (
                        <div>
                            <p className="text-xs font-medium text-gray-700 mb-1">Communication</p>
                            {renderStars(feedback.communication)}
                        </div>
                    )}
                    {feedback.culturalFit && (
                        <div>
                            <p className="text-xs font-medium text-gray-700 mb-1">Cultural Fit</p>
                            {renderStars(feedback.culturalFit)}
                        </div>
                    )}
                    {feedback.problemSolving && (
                        <div>
                            <p className="text-xs font-medium text-gray-700 mb-1">Problem Solving</p>
                            {renderStars(feedback.problemSolving)}
                        </div>
                    )}
                </div>
            )}

            {/* Strengths */}
            {feedback.strengths && (
                <div className="mb-3">
                    <div className="flex items-center gap-1 mb-1">
                        <TrendingUp size={14} className="text-gray-600" />
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Strengths</p>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pl-5">
                        {feedback.strengths}
                    </p>
                </div>
            )}

            {/* Weaknesses */}
            {feedback.weaknesses && (
                <div className="mb-3">
                    <div className="flex items-center gap-1 mb-1">
                        <TrendingDown size={14} className="text-orange-600" />
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Areas for Improvement</p>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pl-5">
                        {feedback.weaknesses}
                    </p>
                </div>
            )}

            {/* Overall Impression */}
            {feedback.overallImpression && (
                <div className="mb-3">
                    <div className="flex items-center gap-1 mb-1">
                        <MessageSquare size={14} className="text-blue-600" />
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Overall Impression</p>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pl-5">
                        {feedback.overallImpression}
                    </p>
                </div>
            )}

            {/* Timestamp */}
            <div className="pt-3 border-t border-gray-100 mt-3">
                <p className="text-[10px] text-gray-400">
                    Submitted {formatDate(feedback.createdAt)}
                    {feedback.updatedAt !== feedback.createdAt && ` • Updated ${formatDate(feedback.updatedAt)}`}
                </p>
            </div>
        </div>
    );
};

