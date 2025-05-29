import React from 'react';
import styles from './styles.module.css';

export interface ErrorSectionProps {
    /** Main headline (e.g. “Fehler beim Speichern”) */
    title: string | null;
    /**
     * Optional list of details.  Each entry can be a simple string
     * or a JSX node if you need custom formatting.
     */
    details?: Array<string | React.ReactNode>;
}

/**
 * Generic reusable error banner.
 *
 * Usage:
 *   <ErrorSection title="Import fehlgeschlagen" details={errors} />
 */
const ErrorSection: React.FC<ErrorSectionProps> = ({title, details = []}) => {
    if (!title && details.length === 0) return null;

    return (
        <div className={styles.errorSection} role="alert">
            <p className={styles.errorTitle}>{title}</p>

            {details.length > 0 && (
                <ul className={styles.errorList}>
                    {details.map((line, i) => (
                        <li key={i}>{line}</li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default ErrorSection;
