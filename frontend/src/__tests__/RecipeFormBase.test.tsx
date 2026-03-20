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

    describe('recipeType pill buttons', () => {
        it('renders all four type pills', () => {
            renderForm();
            for (const label of [ 'Kochen', 'Backen', 'Snack', 'Dessert' ]) {
                expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
            }
        });

        it('clicking a type pill selects it', async () => {
            renderForm();
            const btn = screen.getByRole('button', { name: 'Backen' });
            await userEvent.click(btn);
            expect(btn.className).toMatch(/pillActive/);
        });

        it('clicking selected type pill deselects it', async () => {
            renderForm({
                initial: {
                    title: 'T',
                    instructions: [ 'x' ],
                    ingredient_sections: [],
                    recipeType: 'baking'
                }
            });
            const btn = screen.getByRole('button', { name: 'Backen' });
            expect(btn.className).toMatch(/pillActive/);
            await userEvent.click(btn);
            expect(btn.className).not.toMatch(/pillActive/);
        });

        it('pre-selects the type from initial values', () => {
            renderForm({
                initial: {
                    title: 'T',
                    instructions: [ 'x' ],
                    ingredient_sections: [],
                    recipeType: 'cooking'
                }
            });
            expect(screen.getByRole('button', { name: 'Kochen' }).className).toMatch(/pillActive/);
        });
    });

    describe('dietaryRestrictions pill buttons', () => {
        it('renders all four dietary pills', () => {
            renderForm();
            for (const label of [ 'Vegan', 'Vegetarisch', 'Glutenfrei', 'Laktosefrei' ]) {
                expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
            }
        });

        it('allows selecting multiple dietary pills', async () => {
            renderForm();
            await userEvent.click(screen.getByRole('button', { name: 'Vegan' }));
            await userEvent.click(screen.getByRole('button', { name: 'Glutenfrei' }));
            expect(screen.getByRole('button', { name: 'Vegan' }).className).toMatch(/pillActive/);
            expect(screen.getByRole('button', { name: 'Glutenfrei' }).className).toMatch(/pillActive/);
            expect(screen.getByRole('button', { name: 'Vegetarisch' }).className).not.toMatch(/pillActive/);
        });

        it('deselects a dietary pill on second click', async () => {
            renderForm();
            await userEvent.click(screen.getByRole('button', { name: 'Vegan' }));
            await userEvent.click(screen.getByRole('button', { name: 'Vegan' }));
            expect(screen.getByRole('button', { name: 'Vegan' }).className).not.toMatch(/pillActive/);
        });

        it('pre-selects dietary values from initial', () => {
            renderForm({
                initial: {
                    title: 'T',
                    instructions: [ 'x' ],
                    ingredient_sections: [],
                    dietaryRestrictions: [ 'vegan', 'glutenfree' ]
                }
            });
            expect(screen.getByRole('button', { name: 'Vegan' }).className).toMatch(/pillActive/);
            expect(screen.getByRole('button', { name: 'Glutenfrei' }).className).toMatch(/pillActive/);
            expect(screen.getByRole('button', { name: 'Laktosefrei' }).className).not.toMatch(/pillActive/);
        });
    });
});
