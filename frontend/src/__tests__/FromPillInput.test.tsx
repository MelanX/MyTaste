import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import FromPillInput from '../components/FromPillInput';

function renderInput(value: string[], onChange = vi.fn()) {
  return { onChange, ...render(<FromPillInput value={value} onChange={onChange} />) };
}

describe('FromPillInput', () => {
  it('renders existing pills from value prop', () => {
    renderInput(['Ei', 'Eier']);
    expect(screen.getByText('Ei')).toBeInTheDocument();
    expect(screen.getByText('Eier')).toBeInTheDocument();
  });

  it('renders pills below input', () => {
    renderInput(['Ei']);
    const pill = screen.getByText('Ei');
    const input = screen.getByRole('textbox');
    expect(input.compareDocumentPosition(pill) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('commits on comma key and clears input', () => {
    const { onChange } = renderInput([]);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Ei' } });
    fireEvent.keyDown(input, { key: ',' });
    expect(onChange).toHaveBeenCalledWith(['Ei']);
  });

  it('does not commit empty string on comma', () => {
    const { onChange } = renderInput([]);
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: ',' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('commits on Enter key', () => {
    const { onChange } = renderInput([]);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Eier' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['Eier']);
  });

  it('trims whitespace when committing', () => {
    const { onChange } = renderInput([]);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '  Ei  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['Ei']);
  });

  it('does not commit whitespace-only input', () => {
    const { onChange } = renderInput([]);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('backspace on empty input moves last pill back to input without losing characters', () => {
    const { onChange } = renderInput(['Ei', 'Eier']);
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Backspace' });
    expect(onChange).toHaveBeenCalledWith(['Ei']);
    expect(input).toHaveValue('Eier');
  });

  it('backspace on empty input does nothing when no pills', () => {
    const { onChange } = renderInput([]);
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Backspace' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('backspace on non-empty input does not affect pills', () => {
    const { onChange } = renderInput(['Ei']);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Eie' } });
    fireEvent.keyDown(input, { key: 'Backspace' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clicking a pill loads it into input for editing', () => {
    const { onChange } = renderInput(['Ei', 'Eier']);
    fireEvent.click(screen.getByText('Ei'));
    expect(onChange).toHaveBeenCalledWith(['Eier']);
    expect(screen.getByRole('textbox')).toHaveValue('Ei');
  });

  it('ctrl+click deletes pill without loading into input', () => {
    const { onChange } = renderInput(['Ei', 'Eier']);
    act(() => {
      fireEvent.keyDown(document, { key: 'Control', ctrlKey: true });
    });
    fireEvent.click(screen.getByText('Ei'));
    expect(onChange).toHaveBeenCalledWith(['Eier']);
    expect(screen.getByRole('textbox')).toHaveValue('');
    act(() => {
      fireEvent.keyUp(document, { key: 'Control', ctrlKey: false });
    });
  });

  it('shift+click deletes pill without loading into input', () => {
    const { onChange } = renderInput(['Ei', 'Eier']);
    act(() => {
      fireEvent.keyDown(document, { key: 'Shift', shiftKey: true });
    });
    fireEvent.click(screen.getByText('Eier'));
    expect(onChange).toHaveBeenCalledWith(['Ei']);
    expect(screen.getByRole('textbox')).toHaveValue('');
    act(() => {
      fireEvent.keyUp(document, { key: 'Shift', shiftKey: false });
    });
  });

  it('pressing space on empty input is ignored', () => {
    renderInput([]);
    const input = screen.getByRole('textbox');
    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    input.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('blur with non-empty input auto-commits', () => {
    const { onChange } = renderInput([]);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Ei' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(['Ei']);
  });

  it('blur with empty input does not call onChange', () => {
    const { onChange } = renderInput([]);
    const input = screen.getByRole('textbox');
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
  });
});
