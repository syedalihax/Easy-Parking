import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);
const TOAST_MIN_DURATION = 3000;
const TOAST_CLOSE_DURATION = 220;

const toastLabel = {
  success: 'Success',
  error: 'Error',
  info: 'Notice',
};

const toastStyles = {
  success: {
    accent: 'bg-emerald-100 text-emerald-700',
    bar: 'bg-emerald-600 shadow-[0_0_10px_rgba(5,150,105,0.8)]',
    icon: '✓',
  },
  error: {
    accent: 'bg-red-100 text-red-700',
    bar: 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)]',
    icon: '!',
  },
  info: {
    accent: 'bg-sky-100 text-sky-700',
    bar: 'bg-sky-600 shadow-[0_0_10px_rgba(2,132,199,0.8)]',
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
            className={`pointer-events-auto relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.18)] transition-all duration-200 ${toast.closing ? 'animate-[toast-out_220ms_ease-in_forwards]' : 'animate-[toast-in_220ms_ease-out]'}`}
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
            <div className="absolute inset-x-0 bottom-0 h-[4px] overflow-hidden rounded-b-2xl bg-slate-200">
              <div
                className={`h-full w-full ${accent.bar}`}
                style={{
                  transformOrigin: 'left center',
                  animation: `toast-progress ${toast.duration}ms linear forwards`,
                  boxShadow: toast.type === 'success' ? '0 0 12px rgba(5,150,105,0.8)' : toast.type === 'error' ? '0 0 12px rgba(220,38,38,0.8)' : '0 0 12px rgba(2,132,199,0.8)',
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
  const timersRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const currentTimers = timersRef.current.get(id);
    if (currentTimers) {
      currentTimers.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.delete(id);
    }
  }, []);

  const closeToast = useCallback((id) => {
    setToasts((current) => current.map((toast) => (toast.id === id ? { ...toast, closing: true } : toast)));
  }, []);

  const showToast = useCallback(({ type = 'info', message = '', duration = TOAST_MIN_DURATION }) => {
    if (!message) return;

    const safeDuration = Math.max(duration, TOAST_MIN_DURATION);
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

    setToasts((current) => [...current, { id, type, message, duration: safeDuration, closing: false }]);

    const closeTimer = window.setTimeout(() => {
      closeToast(id);
    }, safeDuration);

    const removeTimer = window.setTimeout(() => {
      removeToast(id);
    }, safeDuration + TOAST_CLOSE_DURATION);

    const existingTimers = timersRef.current.get(id);
    if (existingTimers) {
      existingTimers.forEach((timer) => window.clearTimeout(timer));
    }
    timersRef.current.set(id, [closeTimer, removeTimer]);
  }, [closeToast, removeToast]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timers) => {
        timers.forEach((timer) => window.clearTimeout(timer));
      });
      timersRef.current.clear();
    };
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
