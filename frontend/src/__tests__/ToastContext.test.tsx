import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from '../context/ToastContext';

function Trigger() {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.success('Gespeichert')}>ok</button>
      <button onClick={() => toast.error('Kaputt')}>fail</button>
    </div>
  );
}

const renderWithProvider = () =>
  render(
    <ToastProvider>
      <Trigger />
    </ToastProvider>,
  );

describe('ToastContext', () => {
  it('shows nothing until a toast is triggered', () => {
    renderWithProvider();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows a success toast when triggered', async () => {
    const user = userEvent.setup();
    renderWithProvider();
    await user.click(screen.getByText('ok'));
    expect(screen.getByText('Gespeichert')).toBeInTheDocument();
    expect(screen.getByText('Fertig')).toBeInTheDocument(); // success variant title
  });

  it('replaces the current toast with a newer one', async () => {
    const user = userEvent.setup();
    renderWithProvider();
    await user.click(screen.getByText('ok'));
    await user.click(screen.getByText('fail'));
    expect(screen.getByText('Kaputt')).toBeInTheDocument();
    expect(screen.queryByText('Gespeichert')).toBeNull();
  });

  it('can be dismissed', async () => {
    const user = userEvent.setup();
    renderWithProvider();
    await user.click(screen.getByText('ok'));
    await user.click(screen.getByLabelText('Schließen'));
    expect(screen.queryByText('Gespeichert')).toBeNull();
  });

  it('throws when useToast is used outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Bad() {
      useToast();
      return null;
    }
    expect(() => render(<Bad />)).toThrow(/useToast/);
    spy.mockRestore();
  });
});
