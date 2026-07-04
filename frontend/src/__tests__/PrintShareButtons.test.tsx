const errorToast = vi.fn();
vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn(), success: vi.fn(), error: errorToast, info: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('../utils/apiService', () => ({ apiFetch: vi.fn() }));

import { type Mock } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import PrintShareButtons from '../components/PrintShareButtons';
import { apiFetch } from '../utils/apiService';

const mockApiFetch = apiFetch as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  document.querySelectorAll('iframe').forEach((f) => f.remove());
  // jsdom lacks the object-URL API used to hand the blob to the print iframe.
  (URL as unknown as { createObjectURL: () => string }).createObjectURL = vi.fn(() => 'blob:mock');
  (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PrintShareButtons — print', () => {
  it('prints via the server PDF: fetches it and mounts a print iframe', async () => {
    mockApiFetch.mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob(['%PDF'], { type: 'application/pdf' })) });
    render(<PrintShareButtons recipeId="r1" title="Kuchen" />);

    await userEvent.click(screen.getByLabelText('Drucken'));

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/api/recipe/r1/pdf'));
    await waitFor(() => expect(document.querySelector('iframe')).not.toBeNull());
  });

  // Firefox/iOS can't print an iframe'd PDF, so those open it in a new tab instead.
  it.each([
    ['Firefox', 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0'],
    [
      'iOS',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    ],
  ])('opens the PDF in a new tab on %s instead of an iframe', async (_name, ua) => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua);
    const tab = { location: { href: '' }, close: vi.fn() };
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    mockApiFetch.mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob(['%PDF'], { type: 'application/pdf' })) });
    render(<PrintShareButtons recipeId="r1" title="Kuchen" />);

    await userEvent.click(screen.getByLabelText('Drucken'));

    await waitFor(() => expect(tab.location.href).toBe('blob:mock'));
    expect(openSpy).toHaveBeenCalledWith('', '_blank');
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('shows an error toast when the PDF request fails', async () => {
    mockApiFetch.mockResolvedValue({ ok: false, status: 429 });
    render(<PrintShareButtons recipeId="r1" title="Kuchen" />);

    await userEvent.click(screen.getByLabelText('Drucken'));

    await waitFor(() => expect(errorToast).toHaveBeenCalled());
    expect(document.querySelector('iframe')).toBeNull();
  });
});
