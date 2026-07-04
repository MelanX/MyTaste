vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn(), success: vi.fn(), error: vi.fn(), info: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { type Mock } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SpiceRulesConfig from '../components/SpiceRulesConfig';
import { apiFetch } from '../utils/apiService';

vi.mock('../utils/apiService', () => ({
  apiFetch: vi.fn(),
}));

const mockApiFetch = apiFetch as Mock;

function mockLoad(spice_rules: { spices: string[]; spice_map: Record<string, string[]> }) {
  mockApiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ spice_rules }),
  });
}

describe('SpiceRulesConfig', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it('shows loading state first', () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    render(<SpiceRulesConfig />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('renders titles, spices and alias map after fetch', async () => {
    mockLoad({ spices: ['Salz', 'Pfeffer'], spice_map: { Suppengewürz: ['Salz'] } });
    render(<SpiceRulesConfig />);
    await waitFor(() => expect(screen.getByText('Gewürz-Konfiguration')).toBeInTheDocument());
    expect(screen.getByText('Gewürze')).toBeInTheDocument();
    expect(screen.getByText('Alias')).toBeInTheDocument();
    expect(screen.getAllByText('Salz').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pfeffer').length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue('Suppengewürz')).toBeInTheDocument();
  });

  it('adds a new spice via input + add button', async () => {
    mockLoad({ spices: [], spice_map: {} });
    render(<SpiceRulesConfig />);
    await waitFor(() => screen.getByText('Gewürz-Konfiguration'));
    const input = screen.getByPlaceholderText('Neues Gewürz');
    fireEvent.change(input, { target: { value: 'Kümmel' } });
    // add button is the first button (icon-only)
    const addButton = screen.getAllByRole('button')[0];
    fireEvent.click(addButton);
    await waitFor(() => expect(screen.getByText('Kümmel')).toBeInTheDocument());
  });

  it('removes a spice when its tag is clicked', async () => {
    mockLoad({ spices: ['Salz'], spice_map: {} });
    render(<SpiceRulesConfig />);
    await waitFor(() => screen.getByText('Gewürz-Konfiguration'));
    fireEvent.click(screen.getByText('Salz'));
    await waitFor(() => expect(screen.queryByText('Salz')).not.toBeInTheDocument());
  });

  it('renders alias and save buttons', async () => {
    mockLoad({ spices: [], spice_map: {} });
    render(<SpiceRulesConfig />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Alias hinzufügen/i })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Speichern/i })).toBeInTheDocument();
  });

  it('shows an error message when loading fails', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('boom'));
    render(<SpiceRulesConfig />);
    await waitFor(() => expect(screen.getByText('Failed to load config')).toBeInTheDocument());
  });

  it('PATCHes config-rules on save', async () => {
    mockLoad({ spices: ['Salz'], spice_map: {} });
    mockApiFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    render(<SpiceRulesConfig />);
    await waitFor(() => screen.getByText('Gewürz-Konfiguration'));
    fireEvent.click(screen.getByRole('button', { name: /Speichern/i }));
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/api/config-rules', expect.objectContaining({ method: 'PATCH' })));
  });
});
