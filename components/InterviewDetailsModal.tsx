import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Interview } from '../types';
import { X, Calendar as CalendarIcon, Clock, Video, Phone, MapPin, User, Briefcase, FileText, ExternalLink } from 'lucide-react';
import { Button } from './ui/Button';
import { api } from '../services/api';

interface InterviewDetailsModalProps {
  interview: Interview | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  onDelete?: () => void;
  onEdit?: (interview: Interview) => void;
}

export const InterviewDetailsModal: React.FC<InterviewDetailsModalProps> = ({
  interview,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onEdit
}) => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !interview) return null;

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this interview?')) {
      return;
    }

    setLoading(true);
    try {
      await api.interviews.cancel(interview.id, 'Cancelled by user');
      onDelete?.();
      onUpdate?.();
      onClose();
    } catch (error: any) {
      console.error('Error cancelling interview:', error);
      alert(`Failed to cancel interview: ${error.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getTypeIcon = () => {
    switch (interview.type) {
      case 'Google Meet':
        return <Video size={20} className="text-gray-600" />;
      case 'Phone':
        return <Phone size={20} className="text-gray-600" />;
      case 'In-Person':
        return <MapPin size={20} className="text-gray-600" />;
      default:
        return <CalendarIcon size={20} className="text-gray-600" />;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-white rounded-t-2xl flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Interview Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Candidate Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <User size={20} className="text-gray-600" />
              <h3 className="font-semibold text-gray-900">Candidate</h3>
            </div>
            <p className="text-gray-700 ml-8">{interview.candidateName}</p>
          </div>

          {/* Job Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Briefcase size={20} className="text-gray-600" />
              <h3 className="font-semibold text-gray-900">Position</h3>
            </div>
            <p className="text-gray-700 ml-8">{interview.jobTitle}</p>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <CalendarIcon size={20} className="text-gray-600" />
                <h3 className="font-semibold text-gray-900">Date</h3>
              </div>
              <p className="text-gray-700 ml-8">{formatDate(interview.date)}</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <Clock size={20} className="text-gray-600" />
                <h3 className="font-semibold text-gray-900">Time</h3>
              </div>
              <p className="text-gray-700 ml-8">{formatTime(interview.time)}</p>
            </div>
          </div>

          {/* Duration */}
          {interview.durationMinutes && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <Clock size={20} className="text-gray-600" />
                <h3 className="font-semibold text-gray-900">Duration</h3>
              </div>
              <p className="text-gray-700 ml-8">{interview.durationMinutes} minutes</p>
            </div>
          )}

          {/* Type */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              {getTypeIcon()}
              <h3 className="font-semibold text-gray-900">Type</h3>
            </div>
            <p className="text-gray-700 ml-8">{interview.type}</p>
          </div>

          {/* Meeting Link or Address */}
          {interview.type === 'Google Meet' && interview.meetingLink && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <ExternalLink size={20} className="text-gray-600" />
                <h3 className="font-semibold text-gray-900">Meeting Link</h3>
              </div>
              <a
                href={interview.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 hover:text-gray-900 underline ml-8 break-all"
              >
                {interview.meetingLink}
              </a>
            </div>
          )}

          {interview.type === 'In-Person' && interview.notes && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <MapPin size={20} className="text-gray-600" />
                <h3 className="font-semibold text-gray-900">Address</h3>
              </div>
              <p className="text-gray-700 ml-8 whitespace-pre-wrap">{interview.notes.replace(/^Address:\s*/i, '')}</p>
            </div>
          )}

          {/* Interviewer */}
          {interview.interviewer && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <User size={20} className="text-gray-600" />
                <h3 className="font-semibold text-gray-900">Interviewer</h3>
              </div>
              <p className="text-gray-700 ml-8">{interview.interviewer}</p>
            </div>
          )}

          {/* Notes */}
          {interview.notes && interview.type !== 'In-Person' && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <FileText size={20} className="text-gray-600" />
                <h3 className="font-semibold text-gray-900">Notes</h3>
              </div>
              <p className="text-gray-700 ml-8 whitespace-pre-wrap">{interview.notes}</p>
            </div>
          )}

          {/* Status */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-gray-900">Status</h3>
            </div>
            <span className="ml-8 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
              {interview.status}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50/50 rounded-b-2xl flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {onEdit && (
            <Button variant="black" onClick={() => onEdit(interview)}>
              Edit
            </Button>
          )}
          {onDelete && (
            <Button 
              variant="outline" 
              onClick={handleCancel}
              disabled={loading}
            >
              {loading ? 'Canceling...' : 'Cancel Interview'}
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};







