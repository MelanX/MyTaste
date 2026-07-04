import React, { useState } from 'react';
import { apiFetch } from '../../utils/apiService';
import { useToast } from '../../context/ToastContext';

interface Props {
  recipeId: string;
  title: string;
  className?: string;
  /** 'button' = coloured app buttons (desktop); 'plain' = bare icons like the edit pencil (mobile). */
  variant?: 'button' | 'plain';
}

const VARIANT: Record<'button' | 'plain', string> = {
  button:
    'flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded border-none bg-accent text-[1.05rem] text-white transition-colors hover:bg-accent-dark disabled:cursor-default disabled:opacity-50',
  plain:
    'flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center border-none bg-transparent p-0 text-[1.1rem] text-accent transition-colors hover:text-accent-dark disabled:opacity-50',
};

const sanitize = (s: string): string => s.replace(/[^a-z0-9äöüß\-_ ]/gi, '').trim() || 'rezept';

/** Browsers that can't drive print() on a hidden iframe'd PDF, so we instead open the
 * PDF in a new tab and let the user print from the browser's own viewer:
 *  - iOS/iPadOS Safari — has no window.print() at all. iPadOS 13+ reports as
 *    "Macintosh", so also treat touch-capable Macs as iOS.
 *  - Firefox family (incl. LibreWolf) — no-ops print() on an iframe'd PDF, and its
 *    top-level PDF viewer never fires a load event we could hook, so auto-print isn't
 *    reachable either — opening the tab is the best we can do.
 * Chromium / desktop Safari print inline via the iframe (see printViaIframe). */
const needsNewTabPrint = (): boolean => {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document);
  return isIOS || /firefox/i.test(ua);
};

/** Load the PDF blob into a hidden iframe and invoke the browser print dialog on it.
 * The blob URL / iframe are kept alive until `afterprint` (or a safety timeout) so
 * the print preview can still read them. */
const printViaIframe = (blob: Blob): void => {
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    URL.revokeObjectURL(url);
    iframe.remove();
  };
  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (!win) return cleanup();
    win.addEventListener('afterprint', cleanup);
    win.focus();
    win.print();
    setTimeout(cleanup, 60000); // safety net if afterprint never fires
  };
  iframe.src = url;
  document.body.appendChild(iframe);
};

/** Print / Save-as-PDF buttons for a recipe. Both use the server-rendered PDF
 * (GET /api/recipe/:id/pdf): Print loads it into a hidden iframe, or a new tab on
 * Firefox/iOS which can't print iframe'd PDFs (see printMode). Save downloads it. */
const PrintShareButtons: React.FC<Props> = ({ recipeId, title, className, variant = 'button' }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const btn = VARIANT[variant];

  const fetchPdf = async (): Promise<Blob | null> => {
    const res = await apiFetch(`/api/recipe/${recipeId}/pdf`);
    if (!res.ok) {
      toast.error(res.status === 429 ? 'Zu viele PDF-Anfragen. Bitte kurz warten.' : 'PDF konnte nicht erstellt werden');
      return null;
    }
    return res.blob();
  };

  const download = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitize(title)}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handlePrint = async () => {
    if (busy) return;
    setBusy(true);
    // Open the target tab synchronously (before the async fetch) so the popup
    // blocker doesn't reject it. Chromium/desktop Safari print inline via iframe.
    const newTab = needsNewTabPrint() ? window.open('', '_blank') : null;
    try {
      const blob = await fetchPdf();
      if (!blob) {
        newTab?.close();
        return;
      }
      if (newTab) {
        const url = URL.createObjectURL(blob);
        newTab.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else {
        printViaIframe(blob);
      }
    } catch {
      newTab?.close();
      toast.error('PDF konnte nicht erstellt werden');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await fetchPdf();
      if (blob) download(blob);
    } catch {
      toast.error('PDF konnte nicht erstellt werden');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`no-print flex items-center gap-2 print:hidden ${className ?? ''}`}>
      <button type="button" className={btn} onClick={handlePrint} disabled={busy} title="Drucken" aria-label="Drucken">
        <i className="fa-solid fa-print" />
      </button>
      <button type="button" className={btn} onClick={handleSave} disabled={busy} title="Als PDF speichern" aria-label="Als PDF speichern">
        <i className="fa-solid fa-file-pdf" />
      </button>
    </div>
  );
};

export default PrintShareButtons;
