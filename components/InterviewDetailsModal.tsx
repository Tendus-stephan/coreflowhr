import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Interview } from '../types';
import { X, Calendar as CalendarIcon, Clock, Video, Phone, MapPin, User, Briefcase, FileText, ExternalLink } from 'lucide-react';
import { Button } from './ui/Button';
import { api } from '../services/api';
import { toUserError } from '../utils/edgeFunctionError';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';

interface InterviewDetailsModalProps {
  interview: Interview | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  onDelete?: () => void;
  onEdit?: (interview: Interview) => void;
  readOnly?: boolean;
}

export const InterviewDetailsModal: React.FC<InterviewDetailsModalProps> = ({
  interview,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onEdit,
  readOnly = false
}) => {
  const toast = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

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
    const ok = await confirm({
      title: 'Cancel this interview?',
      description: 'This action cannot be undone.',
      confirmLabel: 'Cancel Interview',
      variant: 'destructive',
    });
    if (!ok) return;

    setLoading(true);
    try {
      await api.interviews.cancel(interview.id, 'Cancelled by user');
      onDelete?.();
      onUpdate?.();
      onClose();
    } catch (error: any) {
      console.error('Error cancelling interview:', error);
      toast.error(toUserError(error, 'Failed to cancel the interview. Please try again.'));
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
          <h2 className="text-2xl font-bold text-gray-900">
            {interview.jobTitle && interview.candidateName
              ? `Interview: ${interview.jobTitle} – ${interview.candidateName}`
              : interview.jobTitle
                ? `Interview: ${interview.jobTitle}`
                : 'Interview Details'}
          </h2>
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

          {/* Calendar sync failed - retry */}
          {interview.calendarSyncStatus === 'failed' && !readOnly && (
            <div className="bg-white border border-gray-100 border-l-[3px] border-l-amber-500 rounded-lg px-3 py-2.5 flex items-start gap-2.5">
              <img src="/assets/images/toast-warning.png" alt="" className="w-5 h-5 flex-shrink-0 object-contain mt-0.5" />
              <div className="flex-1">
                <p className="text-[13px] font-bold text-gray-900 leading-tight">Calendar sync failed</p>
                <p className="text-[12px] text-gray-500 mt-0.5 mb-3">{interview.calendarSyncError || 'Could not sync to Google Calendar.'}</p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={syncing}
                  onClick={async () => {
                    setSyncing(true);
                    try {
                      await api.interviews.syncToCalendar(interview.id, 'create');
                      onUpdate?.();
                    } catch (e) {
                      console.error('Retry sync failed:', e);
                    } finally {
                      setSyncing(false);
                    }
                  }}
                >
                  {syncing ? 'Syncing...' : 'Retry sync'}
                </Button>
              </div>
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
          {!readOnly && onEdit && (
            <Button variant="black" onClick={() => onEdit(interview)}>
              Edit
            </Button>
          )}
          {!readOnly && onDelete && (
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







