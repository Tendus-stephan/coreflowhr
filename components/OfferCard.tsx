import React from 'react';
import { Offer } from '../types';
import { Button } from './ui/Button';
import { Edit2, Send, AlertCircle, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface OfferCardProps {
    offer: Offer;
    candidateName?: string;
    jobTitle?: string;
    onEdit: (offer: Offer) => void;
    onSend?: (offer: Offer) => void;
    onAcceptCounterOffer?: (offer: Offer) => void;
    onDeclineCounterOffer?: (offer: Offer) => void;
    onNegotiateCounterOffer?: (offer: Offer) => void;
}

export const OfferCard: React.FC<OfferCardProps> = ({
    offer,
    candidateName,
    jobTitle,
    onEdit,
    onSend,
    onAcceptCounterOffer,
    onDeclineCounterOffer,
    onNegotiateCounterOffer
}) => {
    const getStatusColor = (status: Offer['status']) => {
        // All statuses use normal gray color
        return 'bg-gray-100 text-gray-700';
    };

    const formatSalary = () => {
        if (!offer.salaryAmount) return 'Not specified';
        const currency = offer.salaryCurrency === 'USD' ? '$' : offer.salaryCurrency;
        const period = offer.salaryPeriod === 'yearly' ? 'per year' : offer.salaryPeriod === 'monthly' ? 'per month' : 'per hour';
        return `${currency}${offer.salaryAmount.toLocaleString()} ${period}`;
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Not set';
        return format(new Date(dateString), 'MMM d, yyyy');
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-base font-bold text-gray-900">{offer.positionTitle}</h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(offer.status)}`}>
                            {offer.status.toUpperCase()}
                        </span>
                        {offer.status === 'negotiating' && offer.negotiationHistory && offer.negotiationHistory.some((item: any) => item.type === 'counter_offer') && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-orange-100 text-orange-700 flex items-center gap-1">
                                <AlertCircle size={12} />
                                Counter Offer
                            </span>
                        )}
                    </div>
                    {candidateName && (
                        <p className="text-sm text-gray-600 mb-1">Candidate: {candidateName}</p>
                    )}
                    {jobTitle && (
                        <p className="text-sm text-gray-600">Job: {jobTitle}</p>
                    )}
                </div>
                {offer.status === 'draft' && (
                    <button
                        onClick={() => onEdit(offer)}
                        className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors rounded hover:bg-gray-100"
                        title="Edit offer"
                    >
                        <Edit2 size={16} />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                    <span className="text-gray-500">Salary:</span>
                    <p className="font-medium text-gray-900">{formatSalary()}</p>
                </div>
                {offer.startDate && (
                    <div>
                        <span className="text-gray-500">Start Date:</span>
                        <p className="font-medium text-gray-900">{formatDate(offer.startDate)}</p>
                    </div>
                )}
                {offer.expiresAt && (
                    <div>
                        <span className="text-gray-500">Expires:</span>
                        <p className="font-medium text-gray-900">{formatDate(offer.expiresAt)}</p>
                    </div>
                )}
                {offer.sentAt && (
                    <div>
                        <span className="text-gray-500">Sent:</span>
                        <p className="font-medium text-gray-900">{formatDate(offer.sentAt)}</p>
                    </div>
                )}
            </div>

            {offer.benefits && offer.benefits.length > 0 && (
                <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1">Benefits:</p>
                    <div className="flex flex-wrap gap-1">
                        {offer.benefits.map((benefit, index) => (
                            <span
                                key={index}
                                className="px-2 py-0.5 bg-gray-50 text-gray-700 rounded text-xs"
                            >
                                {benefit}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {offer.notes && (
                <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1">Notes:</p>
                    <p className="text-sm text-gray-700">{offer.notes}</p>
                </div>
            )}

            {offer.response && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Candidate Response:</p>
                    <p className="text-sm text-gray-700">{offer.response}</p>
                </div>
            )}

            {offer.negotiationHistory && offer.negotiationHistory.length > 0 && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-xs font-medium text-orange-900 mb-2">Counter Offer Received</p>
                    {offer.negotiationHistory
                        .filter((item: any) => item.type === 'counter_offer')
                        .map((item: any, index: number) => {
                            const co = item.counterOffer;
                            return (
                                <div key={index} className="mb-3 last:mb-0">
                                    <p className="text-xs text-orange-700 mb-2">
                                        {format(new Date(item.timestamp), 'MMM d, yyyy h:mm a')}
                                    </p>
                                    <div className="space-y-1 text-sm text-gray-700">
                                        {co.salaryAmount && (
                                            <p>
                                                <span className="font-medium">Salary:</span>{' '}
                                                {co.salaryCurrency === 'USD' ? '$' : co.salaryCurrency}
                                                {co.salaryAmount.toLocaleString()}{' '}
                                                {co.salaryPeriod === 'yearly' ? 'per year' : co.salaryPeriod === 'monthly' ? 'per month' : 'per hour'}
                                            </p>
                                        )}
                                        {co.startDate && (
                                            <p>
                                                <span className="font-medium">Start Date:</span>{' '}
                                                {format(new Date(co.startDate), 'MMM d, yyyy')}
                                            </p>
                                        )}
                                        {co.benefits && co.benefits.length > 0 && (
                                            <p>
                                                <span className="font-medium">Benefits:</span> {co.benefits.join(', ')}
                                            </p>
                                        )}
                                        {co.notes && (
                                            <p className="mt-2 italic text-gray-600">"{co.notes}"</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
                {offer.status === 'draft' && onSend && (
                    <Button
                        variant="black"
                        size="sm"
                        onClick={() => onSend(offer)}
                        icon={<Send size={14} />}
                    >
                        Send Offer
                    </Button>
                )}
                {offer.status === 'negotiating' && offer.negotiationHistory && offer.negotiationHistory.some((item: any) => item.type === 'counter_offer') && (
                    <>
                        {onAcceptCounterOffer && (
                            <Button
                                variant="black"
                                size="sm"
                                onClick={() => onAcceptCounterOffer(offer)}
                                icon={<CheckCircle size={14} />}
                            >
                                Accept
                            </Button>
                        )}
                        {onNegotiateCounterOffer && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onNegotiateCounterOffer(offer)}
                                icon={<MessageSquare size={14} />}
                            >
                                Negotiate
                            </Button>
                        )}
                        {onDeclineCounterOffer && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDeclineCounterOffer(offer)}
                                icon={<XCircle size={14} />}
                            >
                                Decline
                            </Button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

