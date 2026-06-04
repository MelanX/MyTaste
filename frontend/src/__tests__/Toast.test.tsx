import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toast from '../components/Toast';

describe('Toast', () => {
  it('renders nothing when message is null', () => {
    const { container } = render(<Toast message={null} onDismiss={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the message and the default error title', () => {
    render(<Toast message="Etwas ist schiefgelaufen" onDismiss={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Etwas ist schiefgelaufen');
    expect(screen.getByText('Fehler')).toBeInTheDocument();
  });

  it('renders the success variant title', () => {
    render(<Toast message="Gespeichert" type="success" onDismiss={() => {}} />);
    expect(screen.getByText('Fertig')).toBeInTheDocument();
  });

  it('renders the info variant title', () => {
    render(<Toast message="Hinweis" type="info" onDismiss={() => {}} />);
    expect(screen.getByText('Info')).toBeInTheDocument();
  });

  it('calls onDismiss when the close button is clicked', async () => {
    const onDismiss = vi.fn();
    render(<Toast message="X" onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole('button', { name: /schließen/i }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('auto-dismisses after 5 seconds', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<Toast message="X" onDismiss={onDismiss} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onDismiss).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
