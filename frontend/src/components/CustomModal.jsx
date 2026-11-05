import { useEffect } from 'react';

function CustomModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'OK',
  cancelText = 'Cancel',
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCancel?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm" role="presentation">
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_22px_60px_rgba(15,23,42,0.26)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-modal-title"
      >
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600">Confirmation</p>
          <h3 id="custom-modal-title" className="mt-2 text-xl font-bold text-slate-900">{title}</h3>
        </div>

        <p className="text-sm leading-6 text-slate-600">{message}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomModal;
