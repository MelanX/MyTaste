import React from 'react';
import styles from './styles.module.css';

interface ToastProps {
    message: string | null;
    onDismiss: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => {
    if (!message) return null;
    return (
        <div className={styles.toast} role="alert">
            <i className={`fa-solid fa-circle-exclamation ${styles.icon}`} aria-hidden="true" />
            <div className={styles.body}>
                <div className={styles.title}>Fehler</div>
                <div className={styles.message}>{message}</div>
            </div>
            <button
                className={styles.close}
                onClick={onDismiss}
                aria-label="Schließen"
            >
                <i className="fa-solid fa-xmark" />
            </button>
        </div>
    );
};

export default Toast;
