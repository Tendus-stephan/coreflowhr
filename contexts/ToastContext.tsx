import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_TOASTS = 5;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = `toast-${++counterRef.current}`;
    setToasts(prev => {
      const next = [...prev, { id, message, type }];
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });
    const duration = type === 'error' ? 5000 : 4000;
    setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  const value: ToastContextValue = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 items-end pointer-events-none">
          {toasts.map(toast => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

const config: Record<ToastType, { border: string; icon: string }> = {
  success: { border: 'border-l-green-600', icon: '/assets/images/toast-success.png' },
  error:   { border: 'border-l-red-500',   icon: '/assets/images/toast-error.png'   },
  info:    { border: 'border-l-amber-500', icon: '/assets/images/toast-warning.png' },
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const { border, icon } = config[toast.type];
  return (
    <div className={`pointer-events-auto bg-white rounded-lg shadow-sm border border-gray-200 border-l-[3px] ${border} max-w-[340px] w-fit px-3 py-2.5 flex items-center gap-2.5 animate-in slide-in-from-right-4 fade-in duration-200`}>
      <img src={icon} alt={toast.type} className="w-5 h-5 flex-shrink-0 object-contain" />
      <p className="text-[13px] text-gray-800 flex-1 min-w-0 leading-snug line-clamp-2">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0 ml-1"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
};
