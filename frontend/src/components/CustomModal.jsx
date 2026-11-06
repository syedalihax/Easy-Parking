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
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-modal-title"
      >
        <div className="mb-4">
          <p className="modal-eyebrow">Confirmation</p>
          <h3 id="custom-modal-title" className="modal-title">{title}</h3>
        </div>

        <p className="modal-message">{message}</p>

        <div className="modal-actions">
          <button
            type="button"
            onClick={onCancel}
            className="secondary-button"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="primary-button"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomModal;
