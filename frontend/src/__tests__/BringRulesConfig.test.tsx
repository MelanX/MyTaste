import { type Mock } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BringRulesConfig from '../components/BringRulesConfig';
import { apiFetch } from '../utils/apiService';

vi.mock('../utils/apiService', () => ({
  apiFetch: vi.fn(),
}));

const mockApiFetch = apiFetch as Mock;

function mockLoad(bring_rules: Array<{ from: string[]; to: string }>) {
  mockApiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ bring_rules }),
  });
}

describe('BringRulesConfig', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it('shows loading state first', () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    render(<BringRulesConfig />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders the heading and loaded rules after fetch', async () => {
    mockLoad([{ from: ['Zwiebel'], to: 'Zwiebeln' }]);
    render(<BringRulesConfig />);
    await waitFor(() => expect(screen.getByText('Bring Vereinheitlichungsregeln')).toBeInTheDocument());
    expect(screen.getByText('Zwiebel')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Zwiebeln')).toBeInTheDocument();
    expect(screen.getByText('Von')).toBeInTheDocument();
    expect(screen.getByText('Zu')).toBeInTheDocument();
  });

  it('renders add and save buttons', async () => {
    mockLoad([]);
    render(<BringRulesConfig />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Regel hinzufügen/i })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Speichern/i })).toBeInTheDocument();
  });

  it('adds a new empty rule row when clicking "Regel hinzufügen"', async () => {
    mockLoad([]);
    render(<BringRulesConfig />);
    await waitFor(() => screen.getByRole('button', { name: /Regel hinzufügen/i }));
    fireEvent.click(screen.getByRole('button', { name: /Regel hinzufügen/i }));
    expect(screen.getAllByText('Von').length).toBe(1);
    expect(screen.getAllByText('Zu').length).toBe(1);
  });

  it('shows an error message when loading fails', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('boom'));
    render(<BringRulesConfig />);
    await waitFor(() => expect(screen.getByText('Failed to load config')).toBeInTheDocument());
  });

  it('PATCHes config-rules on save', async () => {
    mockLoad([{ from: ['Zwiebel'], to: 'Zwiebeln' }]);
    mockApiFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    render(<BringRulesConfig />);
    await waitFor(() => screen.getByText('Bring Vereinheitlichungsregeln'));
    fireEvent.click(screen.getByRole('button', { name: /Speichern/i }));
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/api/config-rules', expect.objectContaining({ method: 'PATCH' })));
  });
});
