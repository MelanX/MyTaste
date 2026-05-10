import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InstructionsEditor from '../components/InstructionsEditor';

function renderEditor(steps: string[] = [''], onChange = jest.fn()) {
    return { onChange, ...render(<InstructionsEditor value={steps} onChange={onChange} />) };
}

describe('InstructionsEditor', () => {
    it('renders a numbered badge for each step', () => {
        renderEditor(['Schritt 1', 'Schritt 2']);
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('renders each step value in an input/textarea', () => {
        renderEditor(['Tomaten schneiden', 'Salzen']);
        expect(screen.getByDisplayValue('Tomaten schneiden')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Salzen')).toBeInTheDocument();
    });

    it('clicking "Schritt hinzufügen" appends an empty step', () => {
        const { onChange } = renderEditor(['Schritt 1']);
        fireEvent.click(screen.getByRole('button', { name: /Schritt hinzufügen/i }));
        expect(onChange).toHaveBeenCalledWith(['Schritt 1', '']);
    });

    it('remove button removes the corresponding step', () => {
        const { onChange } = renderEditor(['Schritt 1', 'Schritt 2']);
        const removeButtons = screen.getAllByRole('button', { name: /entfernen|remove|löschen/i });
        fireEvent.click(removeButtons[0]);
        expect(onChange).toHaveBeenCalledWith(['Schritt 2']);
    });

    it('pressing Enter in a step appends a new empty step', async () => {
        const { onChange } = renderEditor(['Schritt 1']);
        const input = screen.getByDisplayValue('Schritt 1');
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
        expect(onChange).toHaveBeenCalledWith(['Schritt 1', '']);
    });

    it('pressing Backspace on an empty step removes it', async () => {
        const { onChange } = renderEditor(['Schritt 1', '']);
        const inputs = screen.getAllByRole('textbox');
        const lastInput = inputs[inputs.length - 1];
        fireEvent.keyDown(lastInput, { key: 'Backspace', code: 'Backspace' });
        expect(onChange).toHaveBeenCalledWith(['Schritt 1']);
    });

    it('pressing Backspace on a non-empty step does not remove it', () => {
        const { onChange } = renderEditor(['Schritt 1', 'Schritt 2']);
        const inputs = screen.getAllByRole('textbox');
        fireEvent.keyDown(inputs[1], { key: 'Backspace', code: 'Backspace' });
        expect(onChange).not.toHaveBeenCalled();
    });

    it('editing a step calls onChange with updated array', () => {
        const { onChange } = renderEditor(['alt', 'zweiter']);
        const input = screen.getByDisplayValue('alt');
        fireEvent.change(input, { target: { value: 'neu' } });
        expect(onChange).toHaveBeenCalledWith(['neu', 'zweiter']);
    });
});
