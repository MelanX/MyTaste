import React from 'react';

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
const ErrorSection: React.FC<ErrorSectionProps> = ({ title, details = [] }) => {
  if (!title && details.length === 0) return null;

  return (
    <div className="mt-4 rounded-md border-2 border-danger-bright bg-danger-bg px-4 py-3 text-[0.9rem] text-danger-strong" role="alert">
      <p className="m-0 font-semibold">{title}</p>

      {details.length > 0 && (
        <ul className="mt-4 mb-0 list-disc pl-5">
          {details.map((line, i) => (
            <li key={i} className="my-2">
              {line}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ErrorSection;
