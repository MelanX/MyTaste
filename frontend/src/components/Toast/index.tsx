import React, { useEffect } from 'react';

interface ToastProps {
  message: string | null;
  onDismiss: () => void;
  type?: 'error' | 'success' | 'info';
}

const ICONS = {
  error: 'fa-circle-exclamation',
  success: 'fa-circle-check',
  info: 'fa-circle-info',
};
const TITLES = {
  error: 'Fehler',
  success: 'Fertig',
  info: 'Info',
};

const BASE_TOAST =
  'toast-slide-in fixed bottom-5 right-5 z-[9999] flex max-w-[min(90vw,26rem)] items-start gap-4 rounded-lg border-l-4 p-[1rem_1.1rem] shadow-[0_4px_20px_rgba(0,0,0,0.15)]';

const VARIANT_MAP: Record<string, string> = {
  error: 'bg-danger-bg border-l-danger',
  success: 'bg-success-bg border-l-success',
  info: 'bg-info-bg border-l-info',
};

const ICON_COLOR: Record<string, string> = {
  error: 'text-danger',
  success: 'text-success',
  info: 'text-info',
};

const Toast: React.FC<ToastProps> = ({ message, onDismiss, type = 'error' }) => {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [message, onDismiss]);

  if (!message) return null;
  return (
    <>
      <style>
        {
          '@keyframes toastSlideIn{from{opacity:0;transform:translateX(0.75rem)}to{opacity:1;transform:translateX(0)}}.toast-slide-in{animation:toastSlideIn 0.2s ease-out}'
        }
      </style>
      <div className={`${BASE_TOAST} ${VARIANT_MAP[type]}`} role="alert">
        <i className={`fa-solid ${ICONS[type]} ${ICON_COLOR[type]} mt-[0.1rem] flex-shrink-0 text-[1.15rem]`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="mb-1 text-[0.95rem] font-semibold text-fg">{TITLES[type]}</div>
          <div className="break-words text-[0.85rem] text-fg-muted">{message}</div>
        </div>
        <button
          className="mt-[0.15rem] flex-shrink-0 cursor-pointer border-none bg-transparent p-0 text-[0.8rem] leading-none text-fg-subtle hover:text-fg"
          onClick={onDismiss}
          aria-label="Schließen"
        >
          <i className="fa-solid fa-xmark" />
        </button>
      </div>
    </>
  );
};

export default Toast;
