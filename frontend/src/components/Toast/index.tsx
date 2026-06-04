import React, { useEffect } from 'react';
import styles from './styles.module.css';

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
const CLASS_MAP: Record<string, string> = {
  error: styles.toast,
  success: `${styles.toast} ${styles.toastSuccess}`,
  info: `${styles.toast} ${styles.toastInfo}`,
};

const Toast: React.FC<ToastProps> = ({ message, onDismiss, type = 'error' }) => {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [message, onDismiss]);

  if (!message) return null;
  return (
    <div className={CLASS_MAP[type]} role="alert">
      <i className={`fa-solid ${ICONS[type]} ${styles.icon}`} aria-hidden="true" />
      <div className={styles.body}>
        <div className={styles.title}>{TITLES[type]}</div>
        <div className={styles.message}>{message}</div>
      </div>
      <button className={styles.close} onClick={onDismiss} aria-label="Schließen">
        <i className="fa-solid fa-xmark" />
      </button>
    </div>
  );
};

export default Toast;
