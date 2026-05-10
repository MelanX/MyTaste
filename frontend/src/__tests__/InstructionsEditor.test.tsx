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

    it('Ctrl+B wraps selected text with **bold**', () => {
        const { onChange } = renderEditor(['Tomaten schneiden']);
        const input = screen.getByDisplayValue('Tomaten schneiden') as HTMLTextAreaElement;
        input.setSelectionRange(0, 7);
        fireEvent.keyDown(input, { key: 'b', ctrlKey: true });
        expect(onChange).toHaveBeenCalledWith(['**Tomaten** schneiden']);
    });

    it('Ctrl+I wraps selected text with *italic*', () => {
        const { onChange } = renderEditor(['Tomaten schneiden']);
        const input = screen.getByDisplayValue('Tomaten schneiden') as HTMLTextAreaElement;
        input.setSelectionRange(8, 17);
        fireEvent.keyDown(input, { key: 'i', ctrlKey: true });
        expect(onChange).toHaveBeenCalledWith(['Tomaten *schneiden*']);
    });

    it('Ctrl+U wraps selected text with __underline__', () => {
        const { onChange } = renderEditor(['Tomaten schneiden']);
        const input = screen.getByDisplayValue('Tomaten schneiden') as HTMLTextAreaElement;
        input.setSelectionRange(0, 7);
        fireEvent.keyDown(input, { key: 'u', ctrlKey: true });
        expect(onChange).toHaveBeenCalledWith(['__Tomaten__ schneiden']);
    });

    it('Ctrl+B without selection does not call onChange', () => {
        const { onChange } = renderEditor(['Text']);
        const input = screen.getByDisplayValue('Text') as HTMLTextAreaElement;
        input.setSelectionRange(2, 2);
        fireEvent.keyDown(input, { key: 'b', ctrlKey: true });
        expect(onChange).not.toHaveBeenCalled();
    });

    it('Ctrl+B on already-bold text removes bold markers (toggle off)', () => {
        const { onChange } = renderEditor(['**Tomaten** schneiden']);
        const input = screen.getByDisplayValue('**Tomaten** schneiden') as HTMLTextAreaElement;
        input.setSelectionRange(2, 9); // select 'Tomaten' inside **...**
        fireEvent.keyDown(input, { key: 'b', ctrlKey: true });
        expect(onChange).toHaveBeenCalledWith(['Tomaten schneiden']);
    });

    it('Ctrl+I on already-italic text removes italic markers (toggle off)', () => {
        const { onChange } = renderEditor(['*kursiv*']);
        const input = screen.getByDisplayValue('*kursiv*') as HTMLTextAreaElement;
        input.setSelectionRange(1, 7); // select 'kursiv' inside *...*
        fireEvent.keyDown(input, { key: 'i', ctrlKey: true });
        expect(onChange).toHaveBeenCalledWith(['kursiv']);
    });

    it('Ctrl+U on already-underlined text removes underline markers (toggle off)', () => {
        const { onChange } = renderEditor(['__unter__']);
        const input = screen.getByDisplayValue('__unter__') as HTMLTextAreaElement;
        input.setSelectionRange(2, 7); // select 'unter' inside __...__
        fireEvent.keyDown(input, { key: 'u', ctrlKey: true });
        expect(onChange).toHaveBeenCalledWith(['unter']);
    });

    it('Ctrl+I does not toggle off when inside ** bold markers', () => {
        // Selecting 'bold' inside **bold** should ADD italic, creating ***bold***
        const { onChange } = renderEditor(['**bold**']);
        const input = screen.getByDisplayValue('**bold**') as HTMLTextAreaElement;
        input.setSelectionRange(2, 6); // select 'bold' (inside **)
        fireEvent.keyDown(input, { key: 'i', ctrlKey: true });
        expect(onChange).toHaveBeenCalledWith(['***bold***']);
    });

    it('Ctrl+I removes italic from ***text*** leaving **text** (toggle off)', () => {
        const { onChange } = renderEditor(['***bold***']);
        const input = screen.getByDisplayValue('***bold***') as HTMLTextAreaElement;
        input.setSelectionRange(3, 7); // select 'bold' inside ***
        fireEvent.keyDown(input, { key: 'i', ctrlKey: true });
        expect(onChange).toHaveBeenCalledWith(['**bold**']);
    });

    it('Ctrl+B removes bold from ***text*** leaving *text* (toggle off)', () => {
        const { onChange } = renderEditor(['***bold***']);
        const input = screen.getByDisplayValue('***bold***') as HTMLTextAreaElement;
        input.setSelectionRange(3, 7); // select 'bold' inside ***
        fireEvent.keyDown(input, { key: 'b', ctrlKey: true });
        expect(onChange).toHaveBeenCalledWith(['*bold*']);
    });
});
