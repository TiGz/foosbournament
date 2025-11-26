import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, Loader2, X } from 'lucide-react';
import { Toast } from '../types';

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const DEFAULT_DURATIONS: Record<Toast['type'], number> = {
  success: 5000,
  error: 8000,
  info: 5000,
  loading: 0, // Loading toasts don't auto-dismiss
};

const TOAST_STYLES: Record<Toast['type'], { bg: string; border: string; icon: React.ReactNode }> = {
  success: {
    bg: 'bg-green-900/90',
    border: 'border-green-500',
    icon: <CheckCircle className="w-5 h-5 text-green-400" />,
  },
  error: {
    bg: 'bg-red-900/90',
    border: 'border-red-500',
    icon: <XCircle className="w-5 h-5 text-red-400" />,
  },
  info: {
    bg: 'bg-cyan-900/90',
    border: 'border-cyan-500',
    icon: <Info className="w-5 h-5 text-cyan-400" />,
  },
  loading: {
    bg: 'bg-foos-panel/90',
    border: 'border-foos-brand',
    icon: <Loader2 className="w-5 h-5 text-foos-brand animate-spin" />,
  },
};

interface ToastItemProps {
  toast: Toast;
  onRemove: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);
  const styles = TOAST_STYLES[toast.type];
  const duration = toast.duration ?? DEFAULT_DURATIONS[toast.type];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  useEffect(() => {
    if (isExiting) {
      const timer = setTimeout(onRemove, 300);
      return () => clearTimeout(timer);
    }
  }, [isExiting, onRemove]);

  const handleClose = () => {
    setIsExiting(true);
  };

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm
        shadow-lg min-w-[280px] max-w-[400px]
        transition-all duration-300 ease-out
        ${styles.bg} ${styles.border}
        ${isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
      `}
    >
      <div className="flex-shrink-0">
        {styles.icon}
      </div>
      <p className="flex-1 text-sm text-slate-100 font-medium">
        {toast.message}
      </p>
      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4 text-slate-400" />
      </button>
    </div>
  );
};

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

export default ToastContainer;
