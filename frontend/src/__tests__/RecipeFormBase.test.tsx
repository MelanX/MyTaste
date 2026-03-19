import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecipeFormBase from '../components/RecipeForm/RecipeFormBase';

jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock('../utils/api_service', () => ({ apiFetch: jest.fn() }));
jest.mock('../components/ImageUpload', () => () => null);

const defaultProps = {
    submitLabel: 'Speichern',
    onSubmit: jest.fn().mockResolvedValue({ ok: true }),
};

function renderForm(props: Partial<React.ComponentProps<typeof RecipeFormBase>> = {}) {
    return render(<RecipeFormBase { ...defaultProps } { ...props } />);
}

describe('RecipeFormBase', () => {
    it('renders the submit button with the provided label', () => {
        renderForm();
        expect(screen.getByRole('button', { name: 'Speichern' })).toBeInTheDocument();
    });

    it('does not show a delete button when onDelete is not provided', () => {
        renderForm();
        expect(screen.queryByRole('button', { name: /lösche rezept/i })).not.toBeInTheDocument();
    });

    describe('delete confirmation', () => {
        const onDelete = jest.fn().mockResolvedValue({ ok: true });

        beforeEach(() => onDelete.mockReset());

        it('shows the delete button when onDelete is provided', () => {
            renderForm({ onDelete });
            expect(screen.getByRole('button', { name: /lösche rezept/i })).toBeInTheDocument();
        });

        it('clicking delete shows inline confirmation and does not call window.confirm', async () => {
            const confirmSpy = jest.spyOn(window, 'confirm');
            renderForm({ onDelete });
            await userEvent.click(screen.getByRole('button', { name: /lösche rezept/i }));
            expect(confirmSpy).not.toHaveBeenCalled();
            expect(screen.getByText('Bist du sicher?')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /ja, löschen/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /abbrechen/i })).toBeInTheDocument();
            confirmSpy.mockRestore();
        });

        it('clicking Abbrechen dismisses the confirmation', async () => {
            renderForm({ onDelete });
            await userEvent.click(screen.getByRole('button', { name: /lösche rezept/i }));
            await userEvent.click(screen.getByRole('button', { name: /abbrechen/i }));
            expect(screen.queryByText('Bist du sicher?')).not.toBeInTheDocument();
            expect(screen.getByRole('button', { name: /lösche rezept/i })).toBeInTheDocument();
        });

        it('clicking confirm calls onDelete', async () => {
            renderForm({ onDelete });
            await userEvent.click(screen.getByRole('button', { name: /lösche rezept/i }));
            await userEvent.click(screen.getByRole('button', { name: /ja, löschen/i }));
            expect(onDelete).toHaveBeenCalledTimes(1);
        });
    });
});
