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

const config: Record<ToastType, { border: string; icon: string; title: string }> = {
  success: { border: 'border-l-green-600', icon: '/assets/images/toast-success.png', title: 'Done!'                },
  error:   { border: 'border-l-red-500',   icon: '/assets/images/toast-error.png',   title: 'Something went wrong' },
  info:    { border: 'border-l-amber-500', icon: '/assets/images/toast-warning.png', title: 'Heads up'            },
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const { border, icon, title } = config[toast.type];
  return (
    <div className={`pointer-events-auto bg-white rounded-xl shadow-lg border border-gray-200 border-l-[5px] ${border} w-[420px] max-w-[calc(100vw-2.5rem)] px-5 py-4 flex items-start gap-4 animate-in slide-in-from-right-4 fade-in duration-200`}>
      <img src={icon} alt={toast.type} className="w-11 h-11 flex-shrink-0 object-contain" />
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-[15px] font-bold text-gray-900 leading-tight">{title}</p>
        <p className="text-[13px] text-gray-500 leading-snug mt-1 line-clamp-3">{toast.message}</p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0 mt-0.5"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
};
