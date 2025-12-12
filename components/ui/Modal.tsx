import React, { useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  titleId: string;
  children: React.ReactNode;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({ open, onClose, titleId, children, className = '' }) => {
  const backdropRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement;
    const firstFocusable = backdropRef.current?.querySelector<HTMLElement>(
      'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      ref={backdropRef}
    >
      <div className={`w-full max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-xl ${className}`}>
        {children}
        <button
          type="button"
          className="sr-only"
          onFocus={(event) => {
            // keep focus inside modal
            const focusable = backdropRef.current?.querySelectorAll<HTMLElement>(
              'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
            );
            focusable?.[0]?.focus();
            event.preventDefault();
          }}
        >
          focus trap helper
        </button>
      </div>
    </div>
  );
};

export default Modal;
