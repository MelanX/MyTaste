import { type Mock } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useBlocker } from 'react-router-dom';
import Config from '../components/Config';

let mockRenameOnDirtyChange: ((dirty: boolean) => void) | undefined;

const mockBlocker = {
  state: 'unblocked' as 'unblocked' | 'blocked' | 'proceeding',
  proceed: vi.fn(),
  reset: vi.fn(),
};

vi.mock('react-router-dom', () => ({
  useBlocker: vi.fn(),
}));

vi.mock('../components/RenameRulesConfig', () => ({
  __esModule: true,
  default: function MockRenameRulesConfig({ onDirtyChange }: { onDirtyChange?: (d: boolean) => void }) {
    mockRenameOnDirtyChange = onDirtyChange;
    return <div data-testid="rename-tab">RenameRulesConfig</div>;
  },
}));

vi.mock('../components/SpiceRulesConfig', () => ({
  __esModule: true,
  default: function MockSpiceRulesConfig() {
    return <div data-testid="spice-tab">SpiceRulesConfig</div>;
  },
}));

vi.mock('../components/BringRulesConfig', () => ({
  __esModule: true,
  default: function MockBringRulesConfig() {
    return <div data-testid="bring-tab">BringRulesConfig</div>;
  },
}));

function renderConfig() {
  window.history.replaceState({}, '', '/config');
  return render(<Config />);
}

const getConfirmButton = () => screen.getByRole('button', { name: /^Trotzdem wechseln$/i });
const getAbbrechenButton = () => screen.getByRole('button', { name: /^Abbrechen$/i });

describe('Config', () => {
  beforeEach(() => {
    mockRenameOnDirtyChange = undefined;
    mockBlocker.state = 'unblocked';
    mockBlocker.proceed.mockClear();
    mockBlocker.reset.mockClear();
    (useBlocker as Mock).mockReturnValue(mockBlocker);
    window.history.replaceState({}, '', '/config');
  });

  it('renders the first tab by default', () => {
    renderConfig();
    expect(screen.getByTestId('rename-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('spice-tab')).not.toBeInTheDocument();
  });

  it('switches tab when clicking a different tab in clean state', () => {
    renderConfig();
    fireEvent.click(screen.getByRole('button', { name: /Gewürzregeln/i }));
    expect(screen.getByTestId('spice-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('rename-tab')).not.toBeInTheDocument();
  });

  it('shows dirty indicator when active tab reports unsaved changes', async () => {
    renderConfig();
    act(() => {
      mockRenameOnDirtyChange?.(true);
    });
    await waitFor(() => {
      expect(screen.getByTestId('dirty-indicator')).toBeInTheDocument();
    });
  });

  it('shows confirmation dialog when switching tabs with unsaved changes', async () => {
    renderConfig();
    act(() => {
      mockRenameOnDirtyChange?.(true);
    });
    fireEvent.click(screen.getByRole('button', { name: /Gewürzregeln/i }));
    await waitFor(() => expect(getConfirmButton()).toBeInTheDocument());
    expect(screen.getByTestId('rename-tab')).toBeInTheDocument();
  });

  it('stays on current tab when clicking "Abbrechen" in dialog', async () => {
    renderConfig();
    act(() => {
      mockRenameOnDirtyChange?.(true);
    });
    fireEvent.click(screen.getByRole('button', { name: /Gewürzregeln/i }));
    await waitFor(() => expect(getAbbrechenButton()).toBeInTheDocument());
    fireEvent.click(getAbbrechenButton());
    expect(screen.getByTestId('rename-tab')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Abbrechen$/i })).not.toBeInTheDocument();
  });

  it('switches tab after confirming the dialog', async () => {
    renderConfig();
    act(() => {
      mockRenameOnDirtyChange?.(true);
    });
    fireEvent.click(screen.getByRole('button', { name: /Gewürzregeln/i }));
    await waitFor(() => expect(getConfirmButton()).toBeInTheDocument());
    fireEvent.click(getConfirmButton());
    await waitFor(() => expect(screen.getByTestId('spice-tab')).toBeInTheDocument());
    expect(screen.queryByTestId('rename-tab')).not.toBeInTheDocument();
  });

  it('does not show dialog when switching tabs with no unsaved changes', () => {
    renderConfig();
    act(() => {
      mockRenameOnDirtyChange?.(false);
    });
    fireEvent.click(screen.getByRole('button', { name: /Gewürzregeln/i }));
    expect(screen.queryByRole('button', { name: /^Trotzdem wechseln$/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('spice-tab')).toBeInTheDocument();
  });

  it('shows dialog when router blocker fires (navigation away from dirty config)', async () => {
    mockBlocker.state = 'blocked';
    renderConfig();
    await waitFor(() => expect(getConfirmButton()).toBeInTheDocument());
    expect(getAbbrechenButton()).toBeInTheDocument();
  });

  it('"Abbrechen" calls blocker.reset() when dialog was triggered by navigation', () => {
    mockBlocker.state = 'blocked';
    renderConfig();
    fireEvent.click(getAbbrechenButton());
    expect(mockBlocker.reset).toHaveBeenCalled();
  });

  it('"Trotzdem wechseln" calls blocker.proceed() when dialog was triggered by navigation', () => {
    mockBlocker.state = 'blocked';
    renderConfig();
    fireEvent.click(getConfirmButton());
    expect(mockBlocker.proceed).toHaveBeenCalled();
  });
});
