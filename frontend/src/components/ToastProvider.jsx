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
    tone: 'success',
    icon: '✓',
  },
  error: {
    tone: 'error',
    icon: '!',
  },
  info: {
    tone: 'info',
    icon: 'i',
  },
};

function ToastViewport({ toasts }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[72px] z-[120] flex w-[min(92vw,360px)] flex-col gap-3 px-3 md:inset-x-auto md:right-4 md:left-auto md:top-4 md:w-[min(92vw,360px)] md:px-0">
      {toasts.map((toast) => {
        const accent = toastStyles[toast.type] || toastStyles.info;

        return (
          <div
            key={toast.id}
            className={`toast pointer-events-auto relative overflow-hidden transition-all duration-200 ${toast.closing ? 'animate-[toast-out_220ms_ease-in_forwards]' : 'animate-[toast-in_220ms_ease-out]'}`}
          >
            <div className="flex items-start gap-3 p-3.5 pe-4">
              <div className={`toast-mark toast-mark--${accent.tone}`}>
                {accent.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="toast-title">{toastLabel[toast.type] || 'Notice'}</p>
                <p className="toast-message">{toast.message}</p>
              </div>
            </div>
            <div className="toast-track">
              <div
                className={`toast-bar toast-bar--${accent.tone}`}
                style={{
                  width: '100%',
                  animation: `toast-progress ${toast.duration}ms linear forwards`,
                  willChange: 'width',
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
