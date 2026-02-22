import React, { useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'info' | 'error';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'success', 
  isVisible, 
  onClose,
  duration = 3000 
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const bgColor = 'bg-gray-100 border-gray-300';
  const textColor = 'text-gray-800';

  return (
    <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-top-5 fade-in duration-300">
      <div className={`${bgColor} border rounded-lg shadow-xl p-4 min-w-[300px] max-w-md flex items-start gap-3 transform transition-all`}>
        {(type === 'success' || type === 'error' || type === 'info') && <CheckCircle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />}
        <p className={`${textColor} text-sm font-medium flex-1`}>{message}</p>
        <button
          onClick={onClose}
          className={`${textColor} hover:opacity-70 transition-opacity flex-shrink-0`}
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};



