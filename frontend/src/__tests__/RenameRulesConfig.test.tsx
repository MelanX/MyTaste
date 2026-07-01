import { type Mock } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RenameRulesConfig from '../components/RenameRulesConfig';
import { apiFetch } from '../utils/apiService';

vi.mock('../utils/apiService', () => ({
  apiFetch: vi.fn(),
}));

// FromPillInput renders an input + clickable pills; keep the real one so the
// "Von" field still exposes a textbox, but it is also separately tested.

const mockApiFetch = apiFetch as Mock;

function mockLoad(rename_rules: Array<{ from: string[]; to: string }>) {
  mockApiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ rename_rules }),
  });
}

describe('RenameRulesConfig', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it('shows loading state first', () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    render(<RenameRulesConfig />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders the heading and loaded rules after fetch', async () => {
    mockLoad([{ from: ['Ei'], to: 'Eier' }]);
    render(<RenameRulesConfig />);
    await waitFor(() => expect(screen.getByText('Umbenennungsregeln Konfiguration')).toBeInTheDocument());
    expect(screen.getByText('Ei')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Eier')).toBeInTheDocument();
    expect(screen.getByText('Von')).toBeInTheDocument();
    expect(screen.getByText('Zu')).toBeInTheDocument();
  });

  it('renders add and save buttons', async () => {
    mockLoad([]);
    render(<RenameRulesConfig />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Regel hinzufügen/i })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Speichern/i })).toBeInTheDocument();
  });

  it('adds a new empty rule row when clicking "Regel hinzufügen"', async () => {
    mockLoad([]);
    render(<RenameRulesConfig />);
    await waitFor(() => screen.getByRole('button', { name: /Regel hinzufügen/i }));
    fireEvent.click(screen.getByRole('button', { name: /Regel hinzufügen/i }));
    // a new "Zu" text input appears
    expect(screen.getAllByText('Zu').length).toBe(1);
    expect(screen.getAllByText('Von').length).toBe(1);
  });

  it('shows an error message when loading fails', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('boom'));
    render(<RenameRulesConfig />);
    await waitFor(() => expect(screen.getByText('Failed to load config')).toBeInTheDocument());
  });

  it('PATCHes config-rules on save', async () => {
    mockLoad([{ from: ['Ei'], to: 'Eier' }]);
    mockApiFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    render(<RenameRulesConfig />);
    await waitFor(() => screen.getByText('Umbenennungsregeln Konfiguration'));
    fireEvent.click(screen.getByRole('button', { name: /Speichern/i }));
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/api/config-rules', expect.objectContaining({ method: 'PATCH' })));
  });
});
