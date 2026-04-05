import React from 'react';
import styles from './styles.module.css';

interface ToastProps {
    message: string | null;
    onDismiss: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => {
    if (!message) return null;
    return (
        <div
            className={styles.toast}
            role="alert"
            onClick={onDismiss}
        >
            {message}
            <span className={styles.dismiss}>✕</span>
        </div>
    );
};

export default Toast;
