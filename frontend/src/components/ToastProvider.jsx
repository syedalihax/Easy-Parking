import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

const toastLabel = {
  success: 'Success',
  error: 'Error',
  info: 'Notice',
};

const toastStyles = {
  success: {
    accent: 'bg-emerald-100 text-emerald-700',
    bar: 'bg-emerald-500',
    icon: '✓',
  },
  error: {
    accent: 'bg-red-100 text-red-700',
    bar: 'bg-red-500',
    icon: '!',
  },
  info: {
    accent: 'bg-sky-100 text-sky-700',
    bar: 'bg-sky-500',
    icon: 'i',
  },
};

function ToastViewport({ toasts }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[min(92vw,360px)] flex-col gap-3">
      {toasts.map((toast) => {
        const accent = toastStyles[toast.type] || toastStyles.info;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.18)] transition-all duration-200 ${toast.closing ? 'animate-[toast-out_220ms_ease-in_forwards]' : 'animate-[toast-in_220ms_ease-out]'}`}
          >
            <div className="flex items-start gap-3 p-3.5 pr-4">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${accent.accent}`}>
                {accent.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{toastLabel[toast.type] || 'Notice'}</p>
                <p className="mt-1 text-sm leading-5 text-slate-600">{toast.message}</p>
              </div>
            </div>
            <div className="h-1 w-full overflow-hidden bg-slate-100">
              <div
                className={`h-full ${accent.bar}`}
                style={{
                  width: '100%',
                  animation: `toast-progress ${toast.duration}ms linear forwards`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback(({ type = 'info', message = '', duration = 3000 }) => {
    if (!message) return;

    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

    setToasts((current) => [...current, { id, type, message, duration, closing: false }]);

    window.setTimeout(() => {
      setToasts((current) => current.map((toast) => (toast.id === id ? { ...toast, closing: true } : toast)));
    }, Math.max(duration - 220, 0));

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, duration);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
